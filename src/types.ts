export interface UserProfile {
  userId: string;
  subProfileId?: string; // For multi-profile support
  displayName?: string; // multi-profile name
  gender: 'male' | 'female';
  age: number;
  height: number;
  currentWeight: number;
  targetWeight: number;
  skeletalMuscleMass?: number;
  bodyFatMass?: number;
  bodyFatPercentage?: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goalType: 'cut' | 'maintain' | 'bulk';
  targetCalories: number;
  targetCarbs: number; // in grams
  targetProtein: number; // in grams
  targetFat: number; // in grams
  weeklyUpdateEnabled?: boolean;
  weeklyUpdateDay?: number; // 0 for Sunday, 1 for Monday, etc.
  weeklyWeightLossTarget?: number; // in grams per week (e.g. 500 for standard)
  dietStartDate?: string;
  dietDurationWeeks?: number;
  mealOrder?: string[];
  customNames?: Record<string, string>;
  updatedAt: string;
}

export interface HealthRecord {
  id?: string;
  userId: string;
  subProfileId?: string;
  weight: number;
  skeletalMuscleMass?: number;
  bodyFatMass?: number;
  bodyFatPercentage?: number;
  loggedAt: string; // ISO string
}

export type MealTime = string;

export interface FoodLog {
  id?: string;
  userId: string;
  subProfileId?: string;
  dateStr: string; // YYYY-MM-DD
  mealTime?: MealTime;
  name: string;
  category: string;
  icon?: string;
  grams: number;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  createdAt: string; // ISO string
}

export interface FastingLog {
  id?: string;
  userId: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string, optional
  targetDuration: number; // in hours (e.g. 16, 14, 12, etc.)
  status: 'active' | 'completed';
}

export interface FoodPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  // Nutrition values per 100g (or per serving)
  baseCalories: number;
  baseCarbs: number;
  baseProtein: number;
  baseFat: number;
  servingUnit: string; // "g" or "개" or "회"
  baseGrams: number; // usually 100
}

export interface RecentFood extends FoodPreset {
  updatedAt?: string;
}

export interface MealRoutine {
  id: string;
  name: string;
  mealTime: MealTime;
  foods: {
    name: string;
    icon?: string;
    grams: number;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  }[];
}
