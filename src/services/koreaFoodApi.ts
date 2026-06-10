import { ParsedFoodResult } from "./fatsecretApi";

export const KOREA_API_ERROR_CODES: Record<string, string> = {
  "Unauthorized": "API 인증키가 존재하지 않거나 유효하지 않습니다. 공공데이터포털에서 발급받은 인증키 정보를 확인해 주세요.",
  "Forbidden": "API 서비스에 대한 신청내역이 확인되지 않습니다. 해당 API의 활용신청 여부와 승인 상태를 확인해 주세요.",
  "API not found": "API 서비스가 존재하지 않습니다. 호출 URL에 오타가 없는지, 폐기된 API는 아닌지 확인해 주세요.",
  "Error forwarding request to backend server": "기관 API 서버와의 연결에 실패했습니다. 일시적인 네트워크 오류일 수 있으니 잠시 후 다시 시도해 주세요.",
  "Error receiving response from backend server": "기관 API 서버로부터 응답을 받지 못했습니다. 문제가 계속될 경우, '관리부서 전화번호' 혹은 '오류신고 및 문의'를 통해 제공기관에 문의바랍니다.",
  "API rate limit exceeded": "현재 많은 사용자가 API를 호출하고 있어, 서버의 최대 동시 요청 수를 초과하였습니다. 잠시 후 다시 호출해주시기 바랍니다.",
  "API token quota exceeded": "API 서비스의 일일 호출 허용량을 초과하였습니다. 초기화된 이후 다시 이용 바랍니다.",
  "Unexpected error": "일시적인 시스템 오류가 발생하였습니다. 문제가 반복될 경우 활용지원센터로 문의바랍니다."
};

export async function searchKoreaFoodAPI(query: string): Promise<ParsedFoodResult[]> {
  const response = await fetch(`/api/korea/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `식약처 API Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error === "credentials_not_set") {
    throw new Error("credentials_not_set");
  }
  if (data.error === "auth_error") {
    throw new Error(data.message || "auth_error");
  }

  const items = data?.body?.items;
  let itemsList: any[] = [];
  if (items) {
    if (Array.isArray(items)) {
      itemsList = items;
    } else if (items.item && Array.isArray(items.item)) {
      itemsList = items.item;
    } else if (items.item) {
      itemsList = [items.item];
    } else {
      itemsList = [items];
    }
  }

  const parsedItems = itemsList.map((item: any) => {
    const parseNumber = (str: string) => {
      if (!str) return 0;
      return parseFloat(str.toString().replace(/,/g, "")) || 0;
    };
    
    let name = item.FOOD_NM_KR || "알 수 없는 식품";
    const brand = item.MAKER_NM || "";
    name = name.replace(/_/g, " ");
    if (brand) {
         name += ` ${brand}`;
    }
    
    const servingSizeRaw = item.SERVING_SIZE || "100g";
    const servingSize = parseFloat(servingSizeRaw) || 100;
    
    const calories = parseNumber(item.AMT_NUM1);
    const protein = parseNumber(item.AMT_NUM3);
    const fat = parseNumber(item.AMT_NUM4);
    const carbs = parseNumber(item.AMT_NUM6);
    
    return {
      id: `kr-${item.FOOD_CD || item.NUM || Math.random().toString(36).substr(2, 9)}`,
      name,
      brand_name: brand,
      calories,
      protein,
      carbs,
      fat,
      serving_desc: `Per ${servingSizeRaw}`,
      serving_weight_grams: servingSize
    };
  });

  // Sort results to prioritize exact or closer matches
  parsedItems.sort((a, b) => {
    const aNameRaw = a.name.replace(a.brand_name || "", "").trim();
    const bNameRaw = b.name.replace(b.brand_name || "", "").trim();
    
    const q = query.trim();
    
    // 1. Exact match (e.g. searching "딸기" and finding "딸기")
    const aExact = aNameRaw === q || aNameRaw.replace(/,\s*생것/g, '') === q;
    const bExact = bNameRaw === q || bNameRaw.replace(/,\s*생것/g, '') === q;
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;
    
    // 2. Starts with query (e.g. "딸기, 생것")
    const aStarts = aNameRaw.startsWith(q);
    const bStarts = bNameRaw.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;

    // 3. Includes word alone (split by space)
    const aIncludesWord = aNameRaw.split(" ").includes(q);
    const bIncludesWord = bNameRaw.split(" ").includes(q);
    if (aIncludesWord && !bIncludesWord) return -1;
    if (bIncludesWord && !aIncludesWord) return 1;
    
    // 4. Prioritize natural foods (usually have no brand name)
    const aHasBrand = !!a.brand_name && a.brand_name !== "식약처";
    const bHasBrand = !!b.brand_name && b.brand_name !== "식약처";
    if (!aHasBrand && bHasBrand) return -1;
    if (aHasBrand && !bHasBrand) return 1;

    // 5. Fallback length (shorter names first, "딸기 생것" before "딸기 쿠키초코잼")
    return aNameRaw.length - bNameRaw.length;
  });

  return parsedItems;
}

export async function lookupBarcodeAPI(barcode: string): Promise<{ product: ParsedFoodResult | null; message?: string }> {
  const response = await fetch(`/api/food/barcode?code=${encodeURIComponent(barcode)}`);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `바코드 API Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error === "credentials_not_set") {
    return {
      product: data.product,
      message: data.message
    };
  }

  if (data.error === "auth_error") {
    throw new Error(data.message || "auth_error");
  }

  return {
    product: data.product,
    message: data.message
  };
}
