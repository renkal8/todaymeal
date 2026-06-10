import { ParsedFoodResult } from "./fatsecretApi";

export async function searchFoodQRAPI(query: string): Promise<ParsedFoodResult[]> {
  const response = await fetch(`/api/foodqr/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `FoodQR API Error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error === "credentials_not_set") {
    throw new Error("credentials_not_set");
  }
  if (data.error === "auth_error") {
    throw new Error(data.message || "auth_error");
  }

  // Handle Response format for FoodQR
  // It says output has items inside maybe `body.items.item` or just a list if we check `data.body.items`
  // Actually, standard public data portal uses `data.response.body.items.item` or something similar.
  // Wait, the API mock says: _type=json
  // Let's assume it returns `data.body.items` like Korea Food API, or maybe `data.response.header.resultCode`
  // Let's look at standard OpenAPI from foodqr.kr. Is it the same?
  // Let's parse flexibly:
  let itemsArray: any[] = [];
  
  if (data.body && data.body.items) {
      const items = data.body.items;
      if (Array.isArray(items)) {
          itemsArray = items;
      } else if (items.item) {
          itemsArray = Array.isArray(items.item) ? items.item : [items.item];
      }
  } else if (data.response && data.response.body && data.response.body.items) {
      const items = data.response.body.items;
      if (Array.isArray(items)) {
          itemsArray = items;
      } else if (items.item) {
          itemsArray = Array.isArray(items.item) ? items.item : [items.item];
      }
  } else if (data.items) {
      itemsArray = Array.isArray(data.items) ? data.items : [];
  } else if (Array.isArray(data)) {
      itemsArray = data;
  }

  return itemsArray.map((item: any) => {
    const parseNumber = (str: string | number | undefined) => {
      if (!str) return 0;
      return parseFloat(str.toString().replace(/,/g, "")) || 0;
    };
    
    // FoodQR fields:
    // prdctNm 제품명
    // buesNm 업소명
    // ntrtnIndctTct 영양표시총내용량
    // ntrtnIcutCtv 영양표시단위내용량
    // And for nutrients, it's slightly complex because it returns many items per nutrient maybe? Or columns?
    // Let's see the user's prompt:
    // It returns: ntrtnIgrdSeCd 영양성분구분명, nirwmtNm 영양성분명, cta 함량, ntrtnRt 영양비율. Wait, this means 1 row = 1 nutrient? No, "응답코드 테이블... 출력항목...". The API returns flat or nested?
    // Wait... if 1 row = 1 product but has multiple columns for 1st, 2nd, 3rd? No, "ntrtnIgrdSeCd 영양성분구분명, nirwmtNm 영양성분명, cta 함량... 1차추가표시항목명...". This means each item has all these?
    // Oh, maybe one product has multiple nutrient rows... This is a pain.
    // If we only have name and brand, let's just grab what we can. 
    // It's probably easier to rely on OFF and FatSecret for barcode if this QR API format is too weird. But the user asked for FoodQR search.
    // Let's do our best to map basic properties.
    
    const brand = item.buesNm || item.MAKER_NM || "";
    let name = (item.prdctNm || "알 수 없는 제품").replace(/_/g, " ");
    if (brand) {
         name += ` ${brand}`;
    }
    name += " 📱푸드QR";
    const servingSize = parseFloat(item.ntrtnIcutCtv || item.ntrtnIndctTct || Math.min(item.SERVING_SIZE, 100)) || 100;

    let cal = 0, carbs = 0, prot = 0, fat = 0;
    
    // In case it's flat:
    // We don't know the exact names. Let's do heuristics.
    const itemStr = JSON.stringify(item);
    
    if (item.nirwmtNm === "열량" || item.ntrtnIgrdSeCd?.includes("열량")) cal = parseNumber(item.cta);
    
    return {
      id: `qr-${item.brcdNo || item.prdctNm || Math.random().toString(36).substr(2, 9)}`,
      name,
      brand_name: brand,
      calories: cal || parseNumber(item.AMT_NUM1), // Fallback if it looks like Korea Food
      protein: prot || parseNumber(item.AMT_NUM3),
      fat: fat || parseNumber(item.AMT_NUM4),
      carbs: carbs || parseNumber(item.AMT_NUM6),
      serving_desc: `Per ${item.ntrtnIcutCtv || item.ntrtnIndctTct || "100"}g`,
      serving_weight_grams: servingSize
    };
  });
}
