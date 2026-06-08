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
  category: 'meat' | 'fish' | 'carbs' | 'veg' | 'dairy' | 'nuts' | 'shake' | 'custom';
  icon: string;
  // Nutrition values per 100g (or per serving)
  baseCalories: number;
  baseCarbs: number;
  baseProtein: number;
  baseFat: number;
  servingUnit: string; // "g" or "개" or "회"
  baseGrams: number; // usually 100
}

export interface MealRoutine {
  id: string;
  name: string;
  mealTime: MealTime;
  foods: {
    name: string;
    grams: number;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  }[];
}
