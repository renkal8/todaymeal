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

export async function searchBarcodeAPI(barcode: string): Promise<ParsedFoodResult | null> {
  // 1. Try FatSecret (V3) using barcode
  const response = await fetch(`/api/fatsecret/barcode?barcode=${encodeURIComponent(barcode)}`);
  if (response.ok) {
    const data = await response.json();
    if (!data.error && data.food && data.food.servings && data.food.servings.serving) {
        const food = data.food;
        let servingsArray = food.servings.serving;
        if (!Array.isArray(servingsArray)) {
            servingsArray = [servingsArray];
        }
        const serving = servingsArray[0]; // first serving
        
        return {
           id: `fs-bc-${food.food_id}`,
           name: `${food.food_name} (FatS)`,
           brand_name: food.brand_name || 'FatSecret',
           calories: parseFloat(serving.calories) || 0,
           fat: parseFloat(serving.fat) || 0,
           carbs: parseFloat(serving.carbohydrate) || 0,
           protein: parseFloat(serving.protein) || 0,
           serving_desc: serving.measurement_description ? `Per ${serving.metric_serving_amount}${serving.metric_serving_unit}` : '100g',
           serving_weight_grams: parseFloat(serving.metric_serving_amount) || 100
        };
    }
  }

  // 2. Try Open Food Facts
  try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      if (offRes.ok) {
          const offData = await offRes.json();
          if (offData && offData.product && offData.product.nutriments) {
              const nut = offData.product.nutriments;
              const product_name = offData.product.product_name_ko || offData.product.product_name || `바코드: ${barcode}`;
              const brands = offData.product.brands || offData.product.brand_owner || 'OFF';
              
              return {
                  id: `off-${barcode}`,
                  name: `${product_name} (OFF)`,
                  brand_name: brands,
                  calories: nut['energy-kcal_100g'] || nut['energy-kcal_serving'] || nut['energy-kcal_value'] || nut['energy-kcal'] || 0,
                  fat: nut['fat_100g'] || nut['fat_serving'] || nut['fat_value'] || nut['fat'] || 0,
                  carbs: nut['carbohydrates_100g'] || nut['carbohydrates_serving'] || nut['carbohydrates_value'] || nut['carbohydrates'] || 0,
                  protein: nut['proteins_100g'] || nut['proteins_serving'] || nut['proteins_value'] || nut['proteins'] || 0,
                  serving_desc: 'Per 100g',
                  serving_weight_grams: 100
              }
          }
      }
  } catch (err) {
      console.error(err);
  }
  
  return null;
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
  
  if (data && data.error) {
    throw new Error(data.error.message || "FatSecret API Error");
  }
  
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
      
      const calMatch = desc.match(/(?:Calories|열량|칼로리|에너지)[:]?\s*([\d.]+)\s*kcal/i);
      const fatMatch = desc.match(/(?:Fat|지방)[:]?\s*([\d.]+)\s*g/i);
      const carbsMatch = desc.match(/(?:Carbs|탄수|탄수화물)[:]?\s*([\d.]+)\s*g/i);
      const protMatch = desc.match(/(?:Protein|단백질)[:]?\s*([\d.]+)\s*g/i);
      
      if (calMatch) calories = parseFloat(calMatch[1]);
      if (fatMatch) fat = parseFloat(fatMatch[1]);
      if (carbsMatch) carbs = parseFloat(carbsMatch[1]);
      if (protMatch) protein = parseFloat(protMatch[1]);

      let servingWeightGrams = 100;
      const servingMatch = desc.match(/(?:(?:1회|일회)\s*제공량|Per|당)[^\d]*([\d.]+)\s*g(?:당)?/i);
      if (servingMatch) servingWeightGrams = parseFloat(servingMatch[1]);
      else if (!desc.includes('100g') && !desc.includes('100 g')) servingWeightGrams = 100;

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
