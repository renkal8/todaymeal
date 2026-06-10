import express from "express";
import path from "path";
import fs from "fs";
import Papa from "papaparse";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

// Local Food DB Load
interface LocalFoodItem {
  id: string; // generate from index
  name: string;
  serving_desc: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  weight_g: number;
}
let localFoodsData: LocalFoodItem[] = [];

function getRealisticServingWeight(name: string, total_weight: number): number {
  if (total_weight <= 350) {
    return total_weight > 0 ? total_weight : 100;
  }
  const nameLower = name.toLowerCase();
  if (nameLower.includes("찌개") || nameLower.includes("국") || nameLower.includes("탕") || nameLower.includes("전골") || nameLower.includes("해장국")) {
    return 350; // standard soup/stew portion
  }
  if (nameLower.includes("죽") || nameLower.includes("카레") || nameLower.includes("짜장") || nameLower.includes("하이라이스")) {
    return 300;
  }
  if (nameLower.includes("볶음밥") || nameLower.includes("덮밥") || nameLower.includes("비빔밥") || nameLower.includes("컵밥")) {
    return 250; // standard meal portion
  }
  if (nameLower.includes("떡볶이") || nameLower.includes("면") || nameLower.includes("우동") || nameLower.includes("라면") || nameLower.includes("소바") || nameLower.includes("국수") || nameLower.includes("짜장면") || nameLower.includes("짬뽕") || nameLower.includes("파스타")) {
    return 350;
  }
  if (nameLower.includes("만두") || nameLower.includes("치킨") || nameLower.includes("피자") || nameLower.includes("돈가스") || nameLower.includes("족발") || nameLower.includes("보쌈") || nameLower.includes("갈비")) {
    return 200;
  }
  if (nameLower.includes("식빵") || nameLower.includes("모닝빵")) {
    return 100;
  }
  if (nameLower.includes("과자") || nameLower.includes("쿠키") || nameLower.includes("칩") || nameLower.includes("스낵")) {
    return 50;
  }
  return 200;
}

try {
  const csvFilePath = path.join(process.cwd(), "src", "foods.csv");
  if (fs.existsSync(csvFilePath)) {
    const csvContent = fs.readFileSync(csvFilePath, "utf-8");
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Group the items by normalized name to eliminate duplicates
        const groups: { [key: string]: { name: string; items: any[] } } = {};
        
        results.data.forEach((row: any) => {
          const rawName = (row["식품명"] || "").trim();
          if (!rawName) return;
          
          const normKey = rawName.toLowerCase().replace(/\s+/g, "");
          if (!groups[normKey]) {
            groups[normKey] = {
              name: rawName,
              items: []
            };
          }
          groups[normKey].items.push(row);
        });

        // Loop over the groups and calculate realistic averaged values
        const parsedList: LocalFoodItem[] = [];
        let idx = 0;

        Object.keys(groups).forEach((key) => {
          const group = groups[key];
          const count = group.items.length;
          
          let sum_ref_weight = 0;
          let sum_total_weight = 0;
          let sum_calories = 0;
          let sum_protein = 0;
          let sum_fat = 0;
          let sum_carbs = 0;

          group.items.forEach((row: any) => {
            const ref_weight = parseFloat((row["영양성분함량기준량"] || "100").replace(/[^0-9.]/g, "")) || 100;
            const total_weight = parseFloat((row["식품중량"] || "100").replace(/[^0-9.]/g, "")) || 100;
            const calories = parseFloat(row["에너지(kcal)"]) || 0;
            const protein = parseFloat(row["단백질(g)"]) || 0;
            const fat = parseFloat(row["지방(g)"]) || 0;
            const carbs = parseFloat(row["탄수화물(g)"]) || 0;

            sum_ref_weight += ref_weight;
            sum_total_weight += total_weight;
            sum_calories += calories;
            sum_protein += protein;
            sum_fat += fat;
            sum_carbs += carbs;
          });

          const avg_ref_weight = sum_ref_weight / count || 100;
          const avg_total_weight = sum_total_weight / count || 100;
          const avg_calories = sum_calories / count;
          const avg_protein = sum_protein / count;
          const avg_fat = sum_fat / count;
          const avg_carbs = sum_carbs / count;

          // Determine realistic single portion serving weight
          const serving_weight = getRealisticServingWeight(group.name, avg_total_weight);
          const multiplier = serving_weight / avg_ref_weight;

          // Scale nutrients to realistic serving weight rather than 100g/ml standards
          const scaled_calories = Math.round(avg_calories * multiplier * 10) / 10;
          const scaled_protein = Math.round(avg_protein * multiplier * 100) / 100;
          const scaled_fat = Math.round(avg_fat * multiplier * 100) / 100;
          const scaled_carbs = Math.round(avg_carbs * multiplier * 100) / 100;

          // Intuitively display portion description
          let serving_desc = "";
          if (avg_total_weight <= 350) {
            serving_desc = `1회 제공량 (${Math.round(serving_weight)}g)`;
          } else {
            serving_desc = `1인분 (${Math.round(serving_weight)}g / 총 ${Math.round(avg_total_weight)}g)`;
          }

          parsedList.push({
            id: `localdb-${idx++}`,
            name: group.name,
            serving_desc,
            calories: scaled_calories,
            protein: scaled_protein,
            fat: scaled_fat,
            carbs: scaled_carbs,
            weight_g: Math.round(serving_weight)
          });
        });

        localFoodsData = parsedList;
        console.log(`Successfully consolidated and loaded ${localFoodsData.length} food items from local DB.`);
      }
    });
  } else {
    console.warn("foods.csv not found. Local offline search DB disabled.");
  }
} catch (err) {
  console.error("Error loading local foods DB:", err);
}

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

// Regular expression to detect Korean characters
function hasKorean(text: string): boolean {
  return /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g.test(text);
}

const KOREAN_FOOD_DICTIONARY: Record<string, string> = {
  // Fruits
  '사과': 'apple',
  '바나나': 'banana',
  '딸기': 'strawberry',
  '포도': 'grape',
  '블루베리': 'blueberry',
  '수박': 'watermelon',
  '오렌지': 'orange',
  '복숭아': 'peach',
  '토마토': 'tomato',
  '방울토마토': 'cherry tomato',
  '아보카도': 'avocado',
  '망고': 'mango',
  '키위': 'kiwi',
  '참외': 'melon',
  '배': 'pear',
  '감': 'persimmon',
  '체리': 'cherry',
  '파인애플': 'pineapple',
  
  // Vegetables
  '브로콜리': 'broccoli',
  '양상추': 'lettuce',
  '샐러드': 'salad',
  '양파': 'onion',
  '당근': 'carrot',
  '오이': 'cucumber',
  '양배추': 'cabbage',
  '마늘': 'garlic',
  '시금치': 'spinach',
  '버섯': 'mushroom',
  '고추': 'chili',
  '대파': 'scallion',
  '파': 'green onion',
  '상추': 'lettuce',
  '파프리카': 'bell pepper',
  '피망': 'bell pepper',
  '단호박': 'kabochasquash',
  '호박': 'pumpkin',
  '아스파라거스': 'asparagus',
  
  // Carbs & Grains
  '고구마': 'sweet potato',
  '감자': 'potato',
  '밥': 'rice',
  '흰밥': 'white rice',
  '쌀밥': 'white rice',
  '현미밥': 'brown rice',
  '현미': 'brown rice',
  '잡곡밥': 'mixed grain rice',
  '햇반': 'instant rice',
  '식빵': 'bread',
  '호밀빵': 'rye bread',
  '통밀빵': 'whole wheat bread',
  '오트밀': 'oatmeal',
  '귀리': 'oatmeal',
  '떡': 'rice cake',
  '시리얼': 'cereal',
  '콘플레이크': 'cornflakes',
  '곤약': 'konjac',
  '파스타': 'pasta',
  '스파게티': 'spaghetti',
  '국수': 'noodle',
  '면': 'noodle',
  '베이글': 'bagel',
  
  // Protein - Meats & Seafood & Eggs
  '소고기': 'beef',
  '돼지고기': 'pork',
  '삼겹살': 'pork belly',
  '목살': 'pork shoulder',
  '닭고기': 'chicken',
  '닭가슴살': 'chicken breast',
  '닭가슴': 'chicken breast',
  '닭안심': 'chicken tender',
  '닭다리': 'chicken drumstick',
  '닭다리살': 'chicken thigh',
  '계란': 'egg',
  '달걀': 'egg',
  '계란흰자': 'egg white',
  '달걀흰자': 'egg white',
  '삶은계란': 'boiled egg',
  '삶은달걀': 'boiled egg',
  '계란후라이': 'fried egg',
  '계란프라이': 'fried egg',
  '고등어': 'mackerel',
  '연어': 'salmon',
  '참치': 'tuna',
  '참치캔': 'canned tuna',
  '두부': 'tofu',
  '회': 'sashimi',
  '광어': 'halibut',
  '오징어': 'squid',
  '새우': 'shrimp',
  '소세지': 'sausage',
  '소시지': 'sausage',
  
  // Dairy & Shake
  '우유': 'milk',
  '저지방 우유': 'low fat milk',
  '두유': 'soy milk',
  '요거트': 'yogurt',
  '요구르트': 'yogurt',
  '그릭 요거트': 'greek yogurt',
  '그릭요거트': 'greek yogurt',
  '치즈': 'cheese',
  '모짜렐라': 'mozzarella',
  '단백질 쉐이크': 'protein shake',
  '단백질쉐이크': 'protein shake',
  '프로틴': 'protein powder',
  '프로틴 파우더': 'protein powder',
  '단백질바': 'protein bar',
  '프로틴바': 'protein bar',
  
  // Korean Food
  '김치': 'kimchi',
  '김치찌개': 'kimchi stew',
  '된장찌개': 'soybean paste stew',
  '비빔밥': 'bibimbap',
  '김밥': 'gimbap',
  '떡볶이': 'tteokbokki',
  '삼계탕': 'ginseng chicken soup',
  '만두': 'dumpling',
  '불고기': 'bulgogi',
  '갈비': 'galbi',
  '제육볶음': 'spicy stir-fried pork',
  '미역국': 'seaweed soup',
  '순두부': 'soft tofu',
  '찌개': 'stew',
  '양념치킨': 'yangnyeom chicken',
  
  // Snacks / Fast Food / Drinks
  '라면': 'ramen',
  '불닭': 'buldak',
  '짜장면': 'jjajangmyeon',
  '치킨': 'fried chicken',
  '피자': 'pizza',
  '햄버거': 'hamburger',
  '버거': 'burger',
  '샌드위치': 'sandwich',
  '서브웨이': 'subway sandwich',
  '핫도그': 'hotdog',
  '땅콩': 'peanut',
  '아몬드': 'almond',
  '호두': 'walnut',
  '견과류': 'mixed nuts',
  '올리브유': 'olive oil',
  '버터': 'butter',
  '커피': 'coffee',
  '아메리카노': 'americano',
  '라떼': 'latte',
  '녹차': 'green tea',
  '홍차': 'black tea',
  '탄산수': 'sparkling water',
  '콜라': 'cola',
  '제로콜라': 'zero coke',
  '제로 콜라': 'zero coke',
  '사이다': 'sprite',
  '펩시': 'pepsi',
  '커클랜드': 'kirkland',
};

function localTranslate(koreanQuery: string): string {
  const query = koreanQuery.trim();
  
  // Case A: Perfect exact match of the whole query
  if (KOREAN_FOOD_DICTIONARY[query]) {
    return KOREAN_FOOD_DICTIONARY[query];
  }
  
  // Case B: Partial match of fragments from the dictionary
  const matches: string[] = [];
  const sortedKeys = Object.keys(KOREAN_FOOD_DICTIONARY).sort((a, b) => b.length - a.length);
  
  let remainder = query;
  for (const key of sortedKeys) {
    if (remainder.includes(key)) {
      matches.push(KOREAN_FOOD_DICTIONARY[key]);
      remainder = remainder.replace(new RegExp(key, 'g'), ' ').trim();
    }
  }
  
  if (matches.length > 0) {
    return matches.join(' ');
  }
  
  return query; // fallback if nothing matches at all
}

// Seamless query translation from Korean to English for robust FatSecret global database matching
async function translateFoodQuery(koreanQuery: string): Promise<string> {
  const stripped = koreanQuery.trim();
  if (!stripped) return stripped;

  // 1. First, check if there's a local translation match to make it lightning fast and 100% reliable
  const localMatch = localTranslate(stripped);
  
  if (localMatch !== stripped) {
    console.log(`[Local Dictionary] Translated "${koreanQuery}" -> "${localMatch}"`);
    return localMatch;
  }

  // Single-character or incomplete syllable prefixes should bypass dynamic translation to avoid sluggishness/wrong results
  if (stripped.length <= 1) {
    return stripped;
  }

  // 2. If no local match, try Gemini translation as a dynamic backup
  try {
    const prompt = `Translate the following Korean food search term into 1-3 optimal English keywords optimized for searching in a global food nutrition database (like FatSecret).
Make it search-friendly, e.g. "사과" to "apple", "닭가슴살" to "chicken breast", "햇반" to "instant cooked rice".
Return ONLY the English search keywords with no surrounding punctuation, quotes, or additional explanations.
Query: "${stripped}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    const translated = response.text?.trim().replace(/['"‘“’]/g, '');
    if (translated && translated !== stripped) {
      console.log(`[Gemini Translator] Translated "${koreanQuery}" -> "${translated}"`);
      return translated;
    }
  } catch (error) {
    console.error("[Gemini Translator] Error translating query (using offline fallback model):", error);
  }
  
  return localMatch;
}

// 서버의 현재 외부 공인 IP를 조회 (여러 서비스 순차 시도)
async function getServerPublicIP(): Promise<string> {
  const services = [
    "https://api.ipify.org?format=json",
    "https://api4.my-ip.io/ip.json",
    "https://checkip.amazonaws.com",
  ];
  for (const url of services) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const text = await res.text();
      // JSON 형태({ "ip": "..." }) 또는 plain text 모두 처리
      try {
        const json = JSON.parse(text);
        const ip = json.ip || json.IPv4 || json.query;
        if (ip) return ip.trim();
      } catch {
        const plain = text.trim();
        if (plain) return plain;
      }
    } catch {
      // 다음 서비스로
    }
  }
  return "IP 조회 실패";
}

async function getFatSecretToken(): Promise<string> {
  // Platform secrets and environment variables prioritized
  const clientId = (process.env.FATSECRET_CLIENT_ID || process.env.VITE_FATSECRET_CLIENT_ID || "").trim();
  const clientSecret = (process.env.FATSECRET_CLIENT_SECRET || process.env.VITE_FATSECRET_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("FatSecret API credentials are not set in environment variables. FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET must be set.");
  }

  // Force cache bypass if there was a previous error that got stuck or expired
  if (cachedToken && Date.now() < tokenExpiryTime) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=basic'
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    cachedToken = null;

    // IP 제한 에러인 경우 현재 서버 IP를 함께 알려줌
    if (response.status === 403 || errText.includes("Invalid IP") || errText.includes("ip_restriction")) {
      const serverIP = await getServerPublicIP();
      throw new Error(`Invalid IP address detected. SERVER_IP=${serverIP}`);
    }

    throw new Error(`Failed to obtain token: ${response.status} ${errText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;
  
  return cachedToken!;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to fetch foods from uploaded foods.csv
  app.get("/api/localdb/search", (req, res) => {
    try {
      const q = (req.query.q as string || "").trim().toLowerCase();
      if (!q) {
        return res.json([]);
      }
      
      const qTokens = q.split(" ").filter(t => t.length > 0);
      
      // Simple filter logic: find words in name
      let matched = localFoodsData.filter(item => {
         if (!item.name) return false;
         const nameLower = item.name.toLowerCase();
         // All tokens must match
         return qTokens.every(t => nameLower.includes(t));
      });
      
      // Sort: exact matches first, then shorter names first
      matched.sort((a, b) => {
         const aName = a.name.toLowerCase();
         const bName = b.name.toLowerCase();
         if (aName === q && bName !== q) return -1;
         if (bName === q && aName !== q) return 1;
         
         const aStarts = aName.startsWith(q);
         const bStarts = bName.startsWith(q);
         if (aStarts && !bStarts) return -1;
         if (bStarts && !aStarts) return 1;
         
         return a.name.length - b.name.length;
      });
      
      // Return top 50
      res.json(matched.slice(0, 50));
    } catch (err: any) {
      console.error("/api/localdb/search error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API to fetch food by barcode
  app.get("/api/fatsecret/barcode", async (req, res) => {
    try {
      const barcode = req.query.barcode as string;
      if (!barcode) {
        return res.status(400).json({ error: "Missing barcode parameter" });
      }

      const token = await getFatSecretToken();
      
      let searchUrl = `${FATSECRET_API_URL}?method=food.find_id_for_barcode&barcode=${encodeURIComponent(barcode)}&format=json`;
      
      let response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `FatSecret returned ${response.status}` });
      }

      let data = await response.json();
      
      if (data && data.food_id && data.food_id.value) {
         // Found ID for barcode, now get food details
         const foodId = data.food_id.value;
         const getUrl = `${FATSECRET_API_URL}?method=food.get.v3&food_id=${foodId}&format=json&region=KR&language=ko`;
         let getRes = await fetch(getUrl, {
           method: 'GET',
           headers: { 'Authorization': `Bearer ${token}` }
         });
         if (getRes.ok) {
             let getData = await getRes.json();
             return res.json(getData);
         }
      }
      
      // If not found or error, just return data (which might have error)
      res.json(data);
    } catch (err: any) {
      console.error("/api/fatsecret/barcode error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API to fetch foods
  app.get("/api/fatsecret/search", async (req, res) => {
    try {
      const originalQuery = req.query.q as string;
      if (!originalQuery) {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      const token = await getFatSecretToken();
      
      let searchUrl = `${FATSECRET_API_URL}?method=foods.search&search_expression=${encodeURIComponent(originalQuery)}&format=json&region=KR&language=ko`;
      
      let response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`FatSecret API Error: ${response.status}`);
      }

      let data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("/api/fatsecret/search error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // API for FoodQR
  app.get("/api/foodqr/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      const apiKey = (process.env.KOREA_FOOD_API_KEY || process.env.VITE_KOREA_FOOD_API_KEY || "").trim();
      if (!apiKey) {
        return res.json({
          error: "credentials_not_set",
          message:
            "API 키가 설정되지 않았습니다. .env 파일에 KOREA_FOOD_API_KEY를 설정하세요.",
        });
      }

      let url = `https://foodqr.kr/openapi/service/qr1008/F008?accessKey=${apiKey}&prdctNm=${encodeURIComponent(q)}&_type=json&numOfRows=30&pageNo=1`;
      
      let response = await fetch(url);
      if (!response.ok) {
        url = `https://foodqr.kr/openapi/service/qr1008/F008?accessKey=${encodeURIComponent(apiKey)}&prdctNm=${encodeURIComponent(q)}&_type=json&numOfRows=30&pageNo=1`;
        response = await fetch(url);
        if (!response.ok) {
           console.log("FoodQR API fetch failed:", response.status, await response.text());
           return res.json({ error: "auth_error", message: `푸드QR API 호출 에러: ${response.status}`});
        }
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.json({ error: "parse_error", message: "푸드QR API 응답 파싱 실패" });
      }
      res.json(data);
    } catch (err: any) {
       console.error("/api/foodqr/search error:", err);
       res.json({ error: err.message });
    }
  });

  // API for Ministry of Food and Drug Safety (식약처) nutrient search
  app.get("/api/korea/search", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      const apiKey = (process.env.KOREA_FOOD_API_KEY || process.env.VITE_KOREA_FOOD_API_KEY || "").trim();
      if (!apiKey) {
        return res.json({ 
          error: "credentials_not_set",
          message: "식약처 API 서비스 키가 설정되지 않았습니다.",
          body: { items: [] }
        });
      }

      let url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${apiKey}&FOOD_NM_KR=${encodeURIComponent(q)}&type=json&numOfRows=100&pageNo=1`;
      
      let response = await fetch(url);
      if (!response.ok) {
        // Fallback to encodeURIComponent if the key was a decoding key
        url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${encodeURIComponent(apiKey)}&FOOD_NM_KR=${encodeURIComponent(q)}&type=json&numOfRows=100&pageNo=1`;
        response = await fetch(url);
        if (!response.ok) {
           console.log("Korea API fetch failed:", response.status, await response.text());
           return res.json({ 
             error: "auth_error",
             message: "식약처 API 호출 에러: 키가 올바르지 않거나 승인되지 않았습니다.",
             body: { items: [] } 
           });
        }
      }

      const getFallbackUrl = (page: number) => {
         return `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${encodeURIComponent(apiKey)}&FOOD_NM_KR=${encodeURIComponent(q)}&type=json&numOfRows=100&pageNo=${page}`;
      };

      const pagesToFetch = [2, 3];
      const additionalResponses = await Promise.all(pagesToFetch.map(p => fetch(getFallbackUrl(p)).catch(() => null)));
      const additionalData = await Promise.all(additionalResponses.map(r => r && r.ok ? r.json() : null));

      let data = await response.json();
      
      let allItems: any[] = [];
      
      const mergeItems = (d: any) => {
         if (d && d.body && d.body.items) {
           const items = d.body.items;
           if (Array.isArray(items)) allItems.push(...items);
           else if (items.item && Array.isArray(items.item)) allItems.push(...items.item);
           else if (items.item) allItems.push(items.item);
           else allItems.push(items);
         }
      };

      mergeItems(data);
      additionalData.forEach(d => {
         if (d) mergeItems(d);
      });

      if (data.body) {
         data.body.items = allItems;
      }
      
      res.json(data);
    } catch (err: any) {
      console.error("/api/korea/search error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/korea/search-test", async (req, res) => {
    try {
      const q = req.query.q as string;
      const apiKey = (process.env.KOREA_FOOD_API_KEY || "").trim();
      let url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${apiKey}&FOOD_NM_KR=${encodeURIComponent(q)}&DB_GRP_NM=${encodeURIComponent('농·축산물')}&type=json&numOfRows=100&pageNo=1`;
      let response = await fetch(url);
      if (!response.ok) {
        url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${encodeURIComponent(apiKey)}&FOOD_NM_KR=${encodeURIComponent(q)}&DB_GRP_NM=${encodeURIComponent('농축산물')}&type=json&numOfRows=100&pageNo=1`;
        response = await fetch(url);
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API for barcode lookup & automatic nutrient extraction
  app.get("/api/food/barcode", async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).json({ error: "Missing code parameter" });
      }

      // MOCK BARCODES FOR ZERO-CONFIG DEMO & PERFECT UX
      const MOCK_BARCODES: Record<string, { name: string; brand: string; calories: number; carbs: number; protein: number; fat: number; servingSize: number }> = {
        "8801043014794": { name: "신라면 120g", brand: "농심", calories: 500, carbs: 79, protein: 10, fat: 16, servingSize: 120 },
        "8801007079210": { name: "CJ 햇반 210g", brand: "CJ제일제당", calories: 315, carbs: 70, protein: 5, fat: 1.5, servingSize: 210 },
        "8801111197116": { name: "하림 닭가슴살 오리지널 110g", brand: "하림", calories: 125, carbs: 0, protein: 26, fat: 1.5, servingSize: 110 },
        "8801056020027": { name: "몬스터 에너지 355ml", brand: "코카콜라", calories: 168, carbs: 41, protein: 0, fat: 0, servingSize: 355 },
        "8801382124503": { name: "셀렉스 프로틴 드링크 125ml", brand: "매일유업", calories: 95, carbs: 9, protein: 8, fat: 2.5, servingSize: 125 },
        "8801094013404": { name: "코카콜라 제로 250ml", brand: "코카콜라", calories: 0, carbs: 0, protein: 0, fat: 0, servingSize: 250 },
      };

      if (MOCK_BARCODES[code]) {
        const p = MOCK_BARCODES[code];
        return res.json({
          source: "mock",
          product: {
            id: `barcode-${code}`,
            name: p.name,
            brand_name: p.brand,
            calories: p.calories,
            carbs: p.carbs,
            protein: p.protein,
            fat: p.fat,
            serving_desc: `Per ${p.servingSize}g`,
            serving_weight_grams: p.servingSize
          }
        });
      }

      const apiKey = (process.env.KOREA_FOOD_API_KEY || process.env.VITE_KOREA_FOOD_API_KEY || "").trim();
      if (!apiKey) {
        return res.json({
          error: "credentials_not_set",
          message: "식약처 API 서비스 키가 설정되지 않아서 데모용 바코드만 검색할 수 있습니다. (8801043014794, 8801007079210, 8801111197116, 8801094013404 등)",
          product: null
        });
      }

      let barcodeUrl = `http://apis.data.go.kr/1471000/FsnIdNmInfoService01/getFsnIdNmList01?serviceKey=${apiKey}&brcd_no=${encodeURIComponent(code)}&type=json`;
      let response = await fetch(barcodeUrl);
      if (!response.ok) {
        barcodeUrl = `http://apis.data.go.kr/1471000/FsnIdNmInfoService01/getFsnIdNmList01?serviceKey=${encodeURIComponent(apiKey)}&brcd_no=${encodeURIComponent(code)}&type=json`;
        response = await fetch(barcodeUrl);
        if (!response.ok) {
          console.log("Korea Barcode API failed:", response.status, await response.text());
          return res.json({ 
             error: "auth_error",
             message: "식약처 API(바코드) 호출 에러: 키가 올바르지 않거나 승인되지 않았습니다.",
             product: null 
           });
        }
      }

      const data = await response.json();
      const items = data?.body?.items;
      let itemsList: any[] = [];
      if (items) {
        if (Array.isArray(items)) itemsList = items;
        else if (items.item && Array.isArray(items.item)) itemsList = items.item;
        else if (items.item) itemsList = [items.item];
        else itemsList = [items];
      }

      if (itemsList.length === 0) {
        return res.json({ product: null, message: "식약처 DB에 등록되지 않은 바코드입니다." });
      }

      const item = itemsList[0];
      const productName = item.PRDT_NM || item.prdt_nm || "알 수 없는 바코드 상품";
      const brandName = item.MAKR_NAME || item.makr_name || "";

      // Real API Call: 2. 제품명을 활용해 영양성분 정보 조회
      let nutritionUrl = `http://apis.data.go.kr/1471000/FoodNtrIrdntInfoService1/getFoodNtrItdntList?serviceKey=${apiKey}&desc_kor=${encodeURIComponent(productName)}&type=json&numOfRows=1`;
      let nutrResponse = await fetch(nutritionUrl);
      if (!nutrResponse.ok) {
        nutritionUrl = `http://apis.data.go.kr/1471000/FoodNtrIrdntInfoService1/getFoodNtrItdntList?serviceKey=${encodeURIComponent(apiKey)}&desc_kor=${encodeURIComponent(productName)}&type=json&numOfRows=1`;
        nutrResponse = await fetch(nutritionUrl);
      }
      
      let calories = 0, carbs = 0, protein = 0, fat = 0, servingSize = 100;

      if (nutrResponse.ok) {
        const nutrData = await nutrResponse.json();
        const nutrItems = nutrData?.body?.items;
        let nutrList: any[] = [];
        if (nutrItems) {
          if (Array.isArray(nutrItems)) nutrList = nutrItems;
          else if (nutrItems.item && Array.isArray(nutrItems.item)) nutrList = nutrItems.item;
          else if (nutrItems.item) nutrList = [nutrItems.item];
          else nutrList = [nutrItems];
        }

        if (nutrList.length > 0) {
          const nutr = nutrList[0];
          calories = parseFloat(nutr.NUTR_CONT1) || 0;
          carbs = parseFloat(nutr.NUTR_CONT2) || 0;
          protein = parseFloat(nutr.NUTR_CONT3) || 0;
          fat = parseFloat(nutr.NUTR_CONT4) || 0;
          servingSize = parseFloat(nutr.SERV_SIZE) || 100;
        }
      }

      res.json({
        source: "api",
        product: {
          id: `barcode-${code}`,
          name: productName,
          brand_name: brandName,
          calories,
          carbs,
          protein,
          fat,
          serving_desc: `Per ${servingSize}g`,
          serving_weight_grams: servingSize
        }
      });
    } catch (err: any) {
      console.error("/api/food/barcode error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Since express v4, we can use *
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
