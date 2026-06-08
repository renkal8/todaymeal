import { UserProfile, HealthRecord } from '../types';

/**
 * Calculates Lean Body Mass (LBM) in kg
 */
export function calculateLBM(weight: number, bodyFatPercentage?: number, skeletalMuscleMass?: number): number {
  if (bodyFatPercentage && bodyFatPercentage > 0) {
    return weight * (1 - bodyFatPercentage / 100);
  }
  if (skeletalMuscleMass && skeletalMuscleMass > 0) {
    // skeletal muscle mass estimation of LBM ~ SMM * 1.85 (implied structure)
    // but fall back to standard estimation if body fat is missing
    const estimatedFatPct = 20; // Default estimate
    return weight * (1 - estimatedFatPct / 100);
  }
  return weight * 0.8; // default 20% bodyfat
}

/**
 * Calculates BMR (Basal Metabolic Rate) using Katch-McArdle or Mifflin-St Jeor
 */
export function calculateBMR(params: {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  bodyFatPercentage?: number;
  skeletalMuscleMass?: number;
}): { bmr: number; formulaUsed: string } {
  const { weight, height, age, gender, bodyFatPercentage, skeletalMuscleMass } = params;

  if (bodyFatPercentage && bodyFatPercentage > 0) {
    const lbm = calculateLBM(weight, bodyFatPercentage);
    const bmr = 370 + (21.6 * lbm);
    return { bmr, formulaUsed: 'Katch-McArdle (체성분 기반)' };
  }

  // Fallback to Mifflin-St Jeor
  const baseBmr = (10 * weight) + (6.25 * height) - (5 * age);
  const bmr = gender === 'male' ? baseBmr + 5 : baseBmr - 161;
  return { bmr, formulaUsed: 'Mifflin-St Jeor (신체 스펙 기반)' };
}

/**
 * Maps activity levels to multipliers
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,       // No exercise, desk job
  light: 1.375,         // Weekly 1-3 times light workouts
  moderate: 1.55,       // Weekly 3-5 times moderate workouts
  active: 1.725,        // Weekly 6-7 times high intense workouts
  very_active: 1.9,     // Athlete level, heavy physical work daily
};

/**
 * Calculates base TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: keyof typeof ACTIVITY_MULTIPLIERS): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Computes macronutrients in grams (c/p/f) based on calories and goalType
 */
export function calculateMacros(calories: number, goalType: 'cut' | 'maintain' | 'bulk', weight: number): {
  carbs: number;
  protein: number;
  fat: number;
} {
  // Protein: High priority during cuts (2.0g per kg), Moderate during maintain (1.6g per kg), Bulk (1.8g per kg)
  // Let's ensure high-protein for satiety and tissue retention
  let targetProteinGrams = Math.round(weight * (goalType === 'cut' ? 2.0 : goalType === 'bulk' ? 1.8 : 1.6));
  
  // Caloric value of protein: 4 kcal/g
  let proteinCal = targetProteinGrams * 4;

  // If protein calories exceed 40% of total calories, restrict slightly to avoid safety issues
  if (proteinCal > calories * 0.45) {
    targetProteinGrams = Math.round((calories * 0.35) / 4);
    proteinCal = targetProteinGrams * 4;
  }

  // Fat: Standard 20% to 30% of total calories
  let fatPct = goalType === 'cut' ? 0.25 : goalType === 'bulk' ? 0.20 : 0.25;
  let targetFatGrams = Math.round((calories * fatPct) / 9);

  // Carbs: The remainder of calorie budget
  let carbCal = calories - (proteinCal + (targetFatGrams * 9));
  let targetCarbsGrams = Math.round(carbCal / 4);

  if (targetCarbsGrams < 50) {
    // Guard against dangerous zero-carb diets unless intended
    targetCarbsGrams = 50;
    // Recalculate fat/protein to balance
    const remCal = calories - (targetCarbsGrams * 4);
    targetProteinGrams = Math.round((remCal * 0.5) / 4);
    targetFatGrams = Math.round((remCal * 0.5) / 9);
  }

  return {
    carbs: targetCarbsGrams,
    protein: targetProteinGrams,
    fat: targetFatGrams,
  };
}

/**
 * Runs metabolic dynamic calibration feedback based on actual weight changes
 */
export interface FeedbackResult {
  recommendedCalories: number;
  recommendedCarbs: number;
  recommendedProtein: number;
  recommendedFat: number;
  weightDelta: number; // weight change in kg
  daysElapsed: number;
  feedbackMessage: string;
  adjustmentAmount: number; // kcal adjustment applied
}

export function generateWeeklyFeedback(
  profile: UserProfile,
  records: HealthRecord[]
): FeedbackResult {
  const defaultResult: FeedbackResult = {
    recommendedCalories: profile.targetCalories,
    recommendedCarbs: profile.targetCarbs,
    recommendedProtein: profile.targetProtein,
    recommendedFat: profile.targetFat,
    weightDelta: 0,
    daysElapsed: 0,
    feedbackMessage: '체중 피드백을 진행하려면 최근 1주일간의 건강 데이터 기록이 필요합니다.',
    adjustmentAmount: 0
  };

  if (!records || records.length < 2) {
    return {
      ...defaultResult,
      feedbackMessage: '충분한 체중 기록이 축적되지 않았습니다. 최소 2회 이상의 기록이 필요합니다.'
    };
  }

  // Sort chronological: oldest loggedAt first
  const sorted = [...records].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const timeDiff = new Date(newest.loggedAt).getTime() - new Date(oldest.loggedAt).getTime();
  const days = Math.round(timeDiff / (1000 * 60 * 60 * 24));

  if (days < 3) {
    return {
      ...defaultResult,
      daysElapsed: days,
      feedbackMessage: `기록 수집 기간이 짧습니다(현재 ${days}일). 3일 이상 축적된 후 자동 재조정 알고리즘이 가동됩니다.`
    };
  }

  const weightDelta = newest.weight - oldest.weight; // Positive = gain, Negative = loss
  let adjustment = 0;
  let msg = '';

  const goal = profile.goalType;

  if (goal === 'cut') {
    // Recommended safe weight loss: 0.3kg ~ 0.8kg per week
    // Scale expectations to elapsed days
    const expectedWeeks = days / 7;
    const expectedLossMin = 0.3 * expectedWeeks; // e.g. 0.3kg
    const expectedLossMax = 0.8 * expectedWeeks; // e.g. 0.8kg

    const actualLoss = -weightDelta; // positive loss

    if (actualLoss >= expectedLossMin && actualLoss <= expectedLossMax) {
      adjustment = 0;
      msg = `💡 완벽한 감량 피드백: ${days}일 동안 총 ${actualLoss.toFixed(2)}kg의 건강한 체중 감량이 감지되었습니다. 목표 감량 지표에 적합하므로 현재 칼로리와 최적 매크로 비율을 유지합니다.`;
    } else if (actualLoss < expectedLossMin) {
      // Weight loss too slow or gained
      adjustment = -100; // Trim daily goal by 100 kcal
      msg = `⚠️ 대사 정체기 대응: ${days}일 동안의 감량 결과(${actualLoss.toFixed(2)}kg 감량)가 주당 목표(0.3kg~0.8kg)보다 부족합니다. 대사 활성 및 안전 극대화를 위해 일일 권장 에너지를 -100kcal 조정하고, 탄단지 구성을 재정립합니다.`;
    } else {
      // Weight loss too fast (muscle loss danger)
      adjustment = 100; // Increase slightly
      msg = `⚠️ 급격한 감량 감지: ${days}일 동안 무려 ${actualLoss.toFixed(2)}kg이 감량되었습니다. 너무 빠른 속도는 근손실 및 요요를 유발하므로 근육 보존을 활성화하기 위해 목표치를 +100kcal 늘리고 탄수화물/단백질 공급을 높입니다.`;
    }
  } else if (goal === 'bulk') {
    // Recommended safe muscle weight gain: 0.1kg ~ 0.3kg per week
    const expectedWeeks = days / 7;
    const expectedGainMin = 0.1 * expectedWeeks;
    const expectedGainMax = 0.3 * expectedWeeks;

    if (weightDelta >= expectedGainMin && weightDelta <= expectedGainMax) {
      adjustment = 0;
      msg = `💡 안정적인 증량 피드백: ${days}일 동안 ${weightDelta.toFixed(2)}kg의 체중 증가가 일어났습니다. 근육 성장을 보조하는 훌륭한 속도이므로 현 식단을 유지합니다.`;
    } else if (weightDelta < expectedGainMin) {
      // Gained too slowly or lost weight
      adjustment = 150; // Increase daily caloric goals
      msg = `⚠️ 벌크 마크업 증가: 질량 증가 속도(${weightDelta.toFixed(2)}kg 증가)가 평균 기대에 미치지 못했습니다. 보조 근합성 환경 조성을 위해 일일 전력을 +150kcal 보정하여 일정을 단축합니다.`;
    } else {
      // Gained too fast (fat gain risk)
      adjustment = -100; // Restrict slightly
      msg = `⚠️ 과도한 지방 축적 경고: 일 기준 증가율(${weightDelta.toFixed(2)}kg 증가)이 너무 빠릅니다. 과도한 체지방량 합성을 제한하기 위해 일일 에너지를 -100kcal 차단 배정합니다.`;
    }
  } else {
    // Goal: Maintain (stay within +/- 0.5kg)
    if (Math.abs(weightDelta) <= 0.5) {
      adjustment = 0;
      msg = `💡 홀딩 안정화 피드백: 현재 체중 변동치(${weightDelta.toFixed(2)}kg)가 안정한 평형 상태를 유지하고 있습니다. 일일 성벽 칼로리를 그대로 지탱합니다.`;
    } else if (weightDelta > 0.5) {
      adjustment = -100;
      msg = `⚠️ 중량 증가 알림: 안전 대역폭을 벗어난 체중 증가(${weightDelta.toFixed(2)}kg 상승)를 제한하기 위해 목표 에너지를 -100kcal 살며시 수축합니다.`;
    } else {
      adjustment = 100;
      msg = `⚠️ 중량 감소 알림: 유지 대역 하향 이탈(${weightDelta.toFixed(2)}kg 하락)에서 신체 밸런스를 보호하고자 보급률을 +100kcal 추가 처방합니다.`;
    }
  }

  // Boundary clamp: Calories should not go below unsafe levels (Male: 1500, Female: 1200)
  const minLimit = profile.gender === 'female' ? 1200 : 1500;
  const maxLimit = 4000;
  
  let finalCal = Math.max(minLimit, Math.min(maxLimit, profile.targetCalories + adjustment));
  
  // If the recalculation returns exactly same due to clamp
  if (finalCal === profile.targetCalories && adjustment !== 0) {
    msg += ` (⚠️ 영양 균형 유지를 위한 안전 하한선인 ${minLimit}kcal 대역 이하로의 추가 감량은 차단되었습니다)`;
    adjustment = 0;
  }

  // Recalculate macro breakdown for the adjusted calories
  const adjMacros = calculateMacros(finalCal, profile.goalType, newest.weight);

  return {
    recommendedCalories: finalCal,
    recommendedCarbs: adjMacros.carbs,
    recommendedProtein: adjMacros.protein,
    recommendedFat: adjMacros.fat,
    weightDelta,
    daysElapsed: days,
    feedbackMessage: msg,
    adjustmentAmount: adjustment
  };
}
