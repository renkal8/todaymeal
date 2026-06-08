import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

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
      model: "gemini-3.5-flash",
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

async function getFatSecretToken(): Promise<string> {
  const clientId = (process.env.VITE_FATSECRET_CLIENT_ID || process.env.FATSECRET_CLIENT_ID || "").trim();
  const clientSecret = (process.env.VITE_FATSECRET_CLIENT_SECRET || process.env.FATSECRET_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("FatSecret API credentials are not set in environment variables. VITE_FATSECRET_CLIENT_ID and VITE_FATSECRET_CLIENT_SECRET must be set.");
  }

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

  // API to fetch foods
  app.get("/api/fatsecret/search", async (req, res) => {
    try {
      const originalQuery = req.query.q as string;
      if (!originalQuery) {
        return res.status(400).json({ error: "Missing query parameter" });
      }

      let searchQuery = originalQuery;
      let isTranslated = false;
      // Intelligently check if query contains Korean; if so, translate to English for awesome match rates
      if (hasKorean(originalQuery)) {
        const translatedText = await translateFoodQuery(originalQuery);
        if (translatedText && translatedText !== originalQuery) {
          searchQuery = translatedText;
          isTranslated = true;
        }
      }

      const token = await getFatSecretToken();
      
      let searchUrl = `${FATSECRET_API_URL}?method=foods.search&search_expression=${encodeURIComponent(searchQuery)}&format=json`;
      
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
      
      // FALLBACK SAFEGUARD: If translating returned 0 results, retry with original Korean query
      const hasResults = data && data.foods && data.foods.food;
      if (!hasResults && isTranslated) {
        console.log(`[FatSecret API] Search with translated "${searchQuery}" returned 0 results. Retrying with original "${originalQuery}"`);
        const fallbackUrl = `${FATSECRET_API_URL}?method=foods.search&search_expression=${encodeURIComponent(originalQuery)}&format=json`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData && fallbackData.foods && fallbackData.foods.food) {
            data = fallbackData;
            searchQuery = originalQuery;
          }
        }
      }
      
      // Let the client know the original and translated terms so it can be transparent
      if (data && data.foods) {
        data.translatedQuery = searchQuery;
        data.originalQuery = originalQuery;
      }

      res.json(data);
    } catch (err: any) {
      console.error("/api/fatsecret/search error:", err);
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
