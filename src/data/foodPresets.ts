import { FoodPreset } from '../types';

export const FOOD_PRESETS: FoodPreset[] = [
  // --- MEAT / PROTEIN ---
  {
    id: 'p_chicken_breast',
    name: '닭가슴살',
    category: 'meat',
    icon: 'Drumstick',
    baseCalories: 120,
    baseCarbs: 0,
    baseProtein: 26,
    baseFat: 1.5,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_beef',
    name: '소고기 우둔살/설도',
    category: 'meat',
    icon: 'Beef',
    baseCalories: 150,
    baseCarbs: 0,
    baseProtein: 22,
    baseFat: 7,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_pork',
    name: '돼지 안심',
    category: 'meat',
    icon: 'Beef',
    baseCalories: 125,
    baseCarbs: 0,
    baseProtein: 21,
    baseFat: 4,
    servingUnit: 'g',
    baseGrams: 100
  },
  // --- FISH / SEAFOOD ---
  {
    id: 'p_salmon',
    name: '연어 (생)',
    category: 'fish',
    icon: 'Fish',
    baseCalories: 161,
    baseCarbs: 0,
    baseProtein: 20,
    baseFat: 8.5,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_white_fish',
    name: '흰살생선 (틸라피아)',
    category: 'fish',
    icon: 'Fish',
    baseCalories: 96,
    baseCarbs: 0,
    baseProtein: 20.1,
    baseFat: 1.7,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_shrimp',
    name: '자숙 새우',
    category: 'fish',
    icon: 'Fish',
    baseCalories: 99,
    baseCarbs: 0.2,
    baseProtein: 24,
    baseFat: 0.3,
    servingUnit: 'g',
    baseGrams: 100
  },
  // --- CARBOHYDRATES ---
  {
    id: 'p_brown_rice',
    name: '현미밥',
    category: 'carbs',
    icon: 'Apple', // standard fallback
    baseCalories: 150,
    baseCarbs: 33,
    baseProtein: 3,
    baseFat: 1,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_sweet_potato',
    name: '찐 고구마',
    category: 'carbs',
    icon: 'Apple',
    baseCalories: 130,
    baseCarbs: 31,
    baseProtein: 1.5,
    baseFat: 0.2,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_oatmeal',
    name: '오트밀 (퀘이커)',
    category: 'carbs',
    icon: 'Apple',
    baseCalories: 380,
    baseCarbs: 67,
    baseProtein: 13,
    baseFat: 6.5,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_whole_bread',
    name: '통밀식빵',
    category: 'carbs',
    icon: 'Apple',
    baseCalories: 75,
    baseCarbs: 13.5,
    baseProtein: 3.5,
    baseFat: 1,
    servingUnit: '장',
    baseGrams: 1
  },
  // --- VEGETABLES ---
  {
    id: 'p_salad',
    name: '모둠 샐러드 채소',
    category: 'veg',
    icon: 'Salad',
    baseCalories: 18,
    baseCarbs: 3.5,
    baseProtein: 1.2,
    baseFat: 0.1,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_broccoli',
    name: '데친 브로콜리',
    category: 'veg',
    icon: 'Salad',
    baseCalories: 28,
    baseCarbs: 4.5,
    baseProtein: 2.5,
    baseFat: 0.2,
    servingUnit: 'g',
    baseGrams: 100
  },
  {
    id: 'p_tomato',
    name: '방울토마토',
    category: 'veg',
    icon: 'Salad',
    baseCalories: 16,
    baseCarbs: 3.5,
    baseProtein: 0.8,
    baseFat: 0.1,
    servingUnit: 'g',
    baseGrams: 100
  },
  // --- DAIRY / EGGS ---
  {
    id: 'p_egg',
    name: '삶은 계란',
    category: 'dairy',
    icon: 'Egg',
    baseCalories: 75,
    baseCarbs: 0.4,
    baseProtein: 6.2,
    baseFat: 5.3,
    servingUnit: '개',
    baseGrams: 1
  },
  {
    id: 'p_greek_yogurt',
    name: '그릭 요거트 (무가당)',
    category: 'dairy',
    icon: 'Milk',
    baseCalories: 90,
    baseCarbs: 4,
    baseProtein: 10,
    baseFat: 4,
    servingUnit: 'g',
    baseGrams: 100
  },
  // --- SHAKES / NUTS ---
  {
    id: 'p_protein_shake',
    name: '단백질 쉐이크',
    category: 'shake',
    icon: 'Milk',
    baseCalories: 120,
    baseCarbs: 3,
    baseProtein: 23,
    baseFat: 1.5,
    servingUnit: '스쿱',
    baseGrams: 1
  },
  {
    id: 'p_almonds',
    name: '아몬드',
    category: 'nuts',
    icon: 'Egg',
    baseCalories: 60,
    baseCarbs: 2,
    baseProtein: 2.1,
    baseFat: 5.2,
    servingUnit: '알',
    baseGrams: 10
  },
  {
    id: 'p_avocado',
    name: '아보카도',
    category: 'nuts',
    icon: 'Apple',
    baseCalories: 160,
    baseCarbs: 8.5,
    baseProtein: 2,
    baseFat: 14.7,
    servingUnit: 'g',
    baseGrams: 100
  }
];

export const CATEGORY_LABELS = {
  meat: '🍖 고기류',
  fish: '🐟 해산물',
  carbs: '🍠 탄수화물',
  veg: '🥗 채소류',
  dairy: '🥚 에그/유제품',
  nuts: '🥑 견과/지방',
  shake: '🥤 보충제/음료',
  custom: '✨ 직접 입력'
};
