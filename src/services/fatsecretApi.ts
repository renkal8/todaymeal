// WARNING: Using VITE_ prefixed environment variables exposes these secrets to the browser.
// This is typically not recommended for API keys and secrets, but doing so to fulfill
// the explicit user request for client-side VITE_ environment variables.
// In a real production application, use server-side endpoints (e.g. /api/*) to 
// handle API requests so secrets remain hidden.

export interface ParsedFoodResult {
  id: string;
  name: string;
  brand_name?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_desc: string;
  serving_weight_grams: number;
}

export async function searchFoodAPI(query: string): Promise<ParsedFoodResult[]> {
  const response = await fetch(`/api/fatsecret/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (errData.error) {
      if (errData.error.includes("credentials are not set")) {
        throw new Error("credentials are not set");
      }
      throw new Error(errData.error);
    }
    throw new Error(`FatSecret API Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data || !data.foods || !data.foods.food) {
      return [];
  }

  let foodsArray = data.foods.food;
  if (!Array.isArray(foodsArray)) {
      foodsArray = [foodsArray];
  }
  
  return foodsArray.map((food: any) => {
      const desc = food.food_description || '';
      
      let calories = 0, fat = 0, carbs = 0, protein = 0;
      
      const calMatch = desc.match(/Calories:\s*([\d.]+)\s*kcal/i);
      const fatMatch = desc.match(/Fat:\s*([\d.]+)\s*g/i);
      const carbsMatch = desc.match(/Carbs:\s*([\d.]+)\s*g/i);
      const protMatch = desc.match(/Protein:\s*([\d.]+)\s*g/i);
      
      if (calMatch) calories = parseFloat(calMatch[1]);
      if (fatMatch) fat = parseFloat(fatMatch[1]);
      if (carbsMatch) carbs = parseFloat(carbsMatch[1]);
      if (protMatch) protein = parseFloat(protMatch[1]);

      let servingWeightGrams = 100;
      const servingMatch = desc.match(/Per\s+([\d.]+)\s*g/i);
      if (servingMatch) servingWeightGrams = parseFloat(servingMatch[1]);
      else if (!desc.includes('100g')) servingWeightGrams = 100;

      return {
          id: food.food_id,
          name: food.food_name,
          brand_name: food.brand_name || '',
          calories,
          fat,
          carbs,
          protein,
          serving_desc: desc.split('-')[0]?.trim() || 'Per serving',
          serving_weight_grams: servingWeightGrams
      };
  });
}
