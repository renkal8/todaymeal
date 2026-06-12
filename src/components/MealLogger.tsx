import React, { useState, useEffect, useRef } from "react";
import { FOOD_PRESETS, CATEGORY_LABELS } from "../data/foodPresets";
import { FoodPreset, FoodLog, MealRoutine } from "../types";
import { getEmojiForFoodName } from "../utils/emojiHelper";
import { useDragScroll } from "../utils/useDragScroll";
import { EMOJI_CATEGORIES } from "../App";
import NumberAdjuster from "./NumberAdjuster";
import {
  Search,
  Plus,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Globe,
  Trash2,
  Minus,
  Barcode,
  QrCode,
  Lock,
  Unlock,
} from "lucide-react";
import { searchFoodAPI, searchBarcodeAPI, ParsedFoodResult } from "../services/fatsecretApi";
import { searchKoreaFoodAPI, KOREA_API_ERROR_CODES } from "../services/koreaFoodApi";
import { searchFoodQRAPI } from "../services/foodqrApi";
import { dbService } from "../services/dbService";


interface MealLoggerProps {
  onAddLog: (log: Omit<FoodLog, "userId">) => void;
  onMultiSave?: (newLogs: Omit<FoodLog, "userId">[], logsToUpdate: FoodLog[], logsToDelete: string[]) => void;
  existingLogs?: FoodLog[];
  dateStr: string;
  onOpenCopyModal?: () => void;
  onApplyRoutine?: (routine: MealRoutine) => void;
  activeMealTime?: string | null;
  userId?: string;
}

export default function MealLogger({
  onAddLog,
  onMultiSave,
  existingLogs = [],
  dateStr,
  onOpenCopyModal,
  onApplyRoutine,
  activeMealTime,
  userId,
}: MealLoggerProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("recent");
  const [activePreset, setActivePreset] = useState<FoodPreset | null>(null);

  type CartItem = Omit<FoodLog, "userId"> & { id?: string; isDeleted?: boolean; isNew?: boolean; tempId?: string };
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCartItems(existingLogs.map(log => ({ ...log })));
  }, [existingLogs]);

  // Custom Food state or active adjustments
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);
  const [isEmojiPopupOpen, setIsEmojiPopupOpen] = useState<boolean>(false);
  const [tempEmoji, setTempEmoji] = useState<string>("");
  const [activeEmojiTab, setActiveEmojiTab] = useState<string>("fruit");
  const [customName, setCustomName] = useState<string>("");
  const [currentGrams, setCurrentGrams] = useState<number>(100);
  const [currentCalories, setCurrentCalories] = useState<number>(120);
  const [currentCarbs, setCurrentCarbs] = useState<number>(0);
  const [currentProtein, setCurrentProtein] = useState<number>(26);
  const [currentFat, setCurrentFat] = useState<number>(1.5);

  const [baseGrams, setBaseGrams] = useState<number>(100);
  const [baseCalories, setBaseCalories] = useState<number>(120);
  const [baseCarbs, setBaseCarbs] = useState<number>(0);
  const [baseProtein, setBaseProtein] = useState<number>(26);
  const [baseFat, setBaseFat] = useState<number>(1.5);
  const [isMacrosLocked, setIsMacrosLocked] = useState<boolean>(true);

  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Advanced search states (Local, Barcode, FatSecret, Korea Food Safety)
  const [searchMode, setSearchMode] = useState<"local" | "barcode" | "fatsecret" | "korea" | "foodqr">("local");
  
  // Backward compatibility flag
  const isFatSecretMode = searchMode === "fatsecret";

  const [fatSecretResults, setFatSecretResults] = useState<ParsedFoodResult[]>([]);
  const [isSearchingFS, setIsSearchingFS] = useState<boolean>(false);
  const [fatSecretError, setFatSecretError] = useState<string | null>(null);

  // Korea Food Safety state
  const [koreaResults, setKoreaResults] = useState<ParsedFoodResult[]>([]);
  const [isSearchingKorea, setIsSearchingKorea] = useState<boolean>(false);
  const [koreaError, setKoreaError] = useState<string | null>(null);

  // Local Offline DB state
  const [localDbResults, setLocalDbResults] = useState<any[]>([]);
  const [isSearchingLocalDb, setIsSearchingLocalDb] = useState<boolean>(false);
  const [localDbError, setLocalDbError] = useState<string | null>(null);

  // FoodQR state
  const [foodqrResults, setFoodqrResults] = useState<ParsedFoodResult[]>([]);
  const [isSearchingFoodqr, setIsSearchingFoodqr] = useState<boolean>(false);
  const [foodqrError, setFoodqrError] = useState<string | null>(null);

  // Barcode state
  const [barcodeResult, setBarcodeResult] = useState<ParsedFoodResult | null>(null);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState<boolean>(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeWarning, setBarcodeWarning] = useState<string | null>(null);
  
  // Scanner instance
  const html5QrCodeRef = useRef<any>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     let isMounted = true;
     if (isDropdownOpen && (searchMode === "barcode" || searchMode === "foodqr")) {
        import("html5-qrcode").then(({ Html5Qrcode }) => {
          if (!isMounted) return;
          const html5QrCode = new Html5Qrcode("scanner-reader");
          html5QrCodeRef.current = html5QrCode;
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            (decodedText: string) => {
               setSearchTerm(decodedText);
               const s = html5QrCodeRef.current;
               if (s) s.stop().then(() => s.clear()).catch(console.error);
            },
            () => { /* handle failure silently */ }
          ).then(() => {
              // Started successfully
              if (!isMounted && html5QrCodeRef.current) {
                 // Component unmounted while camera was starting
                 html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
              }
          }).catch((err: any) => {
              console.warn("Camera start failed", err);
          });
        });
     }

     return () => {
         isMounted = false;
         if (html5QrCodeRef.current) {
             const scanner = html5QrCodeRef.current;
             try {
                scanner.stop()
                  .then(() => scanner.clear())
                  .catch((e: any) => console.warn("Failed to stop scanner", e));
             } catch(e) {
                console.warn(e);
             }
             html5QrCodeRef.current = null;
         }
     };
  }, [searchMode, isDropdownOpen]);

  const mainCategoryDrag = useDragScroll();
  const subCategoryDrag = useDragScroll();
  const subSubCategoryDrag = useDragScroll();

  const [recentFoods, setRecentFoods] = useState<FoodPreset[]>([]);
  const [routines, setRoutines] = useState<MealRoutine[]>([]);
  const [showRoutineList, setShowRoutineList] = useState<boolean>(false);

  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedNoodleSub, setSelectedNoodleSub] = useState<
    "all" | "ramen" | "guksu" | "buckwheat_etc"
  >("all");
  const [customCategory, setCustomCategory] = useState<string>("custom");

  // Reset subcategory when main category changes
  useEffect(() => {
    setSelectedSubCategory("all");
    setSelectedNoodleSub("all");
  }, [selectedCategory]);

  // Reset noodle sub-filter when subcategory changes
  useEffect(() => {
    setSelectedNoodleSub("all");
  }, [selectedSubCategory]);

  const scrollCategories = (direction: "left" | "right") => {
    if (mainCategoryDrag.scrollRef.current) {
      const scrollAmount = direction === "left" ? -150 : 150;
      mainCategoryDrag.scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Scroll window to top when MealLogger mounts so user is instantly at the addition screen
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Filter presets based on category and search
  const userCustomPresets = recentFoods.filter(
    (f) => f.id.startsWith("recent-") || f.category === "custom",
  );
  const allAvailablePresets = [...userCustomPresets, ...FOOD_PRESETS];

  const filteredPresets =
    selectedCategory === "recent" && !searchTerm
      ? recentFoods
      : allAvailablePresets.filter((p) => {
          const activeCategory =
            selectedCategory === "recent" ? "all" : selectedCategory;

          let matchesCategory = false;
          if (activeCategory === "all") {
            matchesCategory = true;
          } else if (activeCategory === "carbs") {
            matchesCategory = p.category === "carbs" || p.category === "bread";
          } else if (activeCategory === "meat") {
            matchesCategory = [
              "beef",
              "pork",
              "meat_etc",
              "chicken_egg",
            ].includes(p.category);
          } else {
            matchesCategory = p.category === activeCategory;
          }

          let matchesSubCategory = true;
          if (activeCategory === "carbs" && selectedSubCategory !== "all") {
            const nameLower = p.name.toLowerCase();
            if (selectedSubCategory === "rice") {
              matchesSubCategory =
                p.category === "carbs" &&
                !nameLower.includes("파스타") &&
                !nameLower.includes("면") &&
                !nameLower.includes("식빵") &&
                !nameLower.includes("베이글") &&
                !nameLower.includes("빵") &&
                !nameLower.includes("라면") &&
                !nameLower.includes("짜파게티") &&
                !nameLower.includes("사발면") &&
                !nameLower.includes("국수") &&
                !nameLower.includes("냉면");
            } else if (selectedSubCategory === "pasta") {
              matchesSubCategory = nameLower.includes("파스타");
            } else if (selectedSubCategory === "noodle") {
              const isNoodle =
                (p.category === "carbs" || p.category === "etc_meal") &&
                (nameLower.includes("면") ||
                  nameLower.includes("라면") ||
                  nameLower.includes("짜파게티") ||
                  nameLower.includes("사발면") ||
                  nameLower.includes("국수") ||
                  nameLower.includes("냉면") ||
                  nameLower.includes("두부면") ||
                  nameLower.includes("불닭") ||
                  nameLower.includes("비빔면") ||
                  nameLower.includes("너구리") ||
                  nameLower.includes("소바") ||
                  nameLower.includes("우동") ||
                  nameLower.includes("곤약") ||
                  nameLower.includes("컵누들") ||
                  nameLower.includes("소컵")) &&
                !nameLower.includes("파스타");

              if (!isNoodle) {
                matchesSubCategory = false;
              } else if (selectedNoodleSub !== "all") {
                if (selectedNoodleSub === "ramen") {
                  matchesSubCategory =
                    nameLower.includes("라면") ||
                    nameLower.includes("짜파게티") ||
                    nameLower.includes("사발면") ||
                    nameLower.includes("불닭") ||
                    nameLower.includes("비빔면") ||
                    nameLower.includes("너구리") ||
                    nameLower.includes("컵누들") ||
                    nameLower.includes("소컵");
                } else if (selectedNoodleSub === "guksu") {
                  matchesSubCategory =
                    nameLower.includes("국수") ||
                    nameLower.includes("칼국수") ||
                    nameLower.includes("우동") ||
                    nameLower.includes("소면") ||
                    nameLower.includes("사리");
                } else if (selectedNoodleSub === "buckwheat_etc") {
                  matchesSubCategory =
                    nameLower.includes("메밀") ||
                    nameLower.includes("냉면") ||
                    nameLower.includes("소바") ||
                    nameLower.includes("곤약") ||
                    nameLower.includes("미역국수");
                }
              }
            } else if (selectedSubCategory === "bread") {
              matchesSubCategory =
                p.category === "bread" ||
                nameLower.includes("빵") ||
                nameLower.includes("베이글") ||
                nameLower.includes("식빵") ||
                nameLower.includes("크루아상") ||
                nameLower.includes("바게트");
            }
          } else if (
            activeCategory === "meat" &&
            selectedSubCategory !== "all"
          ) {
            matchesSubCategory = p.category === selectedSubCategory;
          }

          const matchesSearch = searchMode !== "local"
            ? true
            : p.name.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesCategory && matchesSubCategory && matchesSearch;
        });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setSearchMode("local");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!userId) {
      try {
        const stored = localStorage.getItem("recent_logged_foods");
        if (stored) {
          setRecentFoods(JSON.parse(stored));
        } else {
          setRecentFoods([]);
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const userStorageKey = `recent_logged_foods_${userId}`;
    let initialList: FoodPreset[] = [];
    try {
      const stored = localStorage.getItem(userStorageKey);
      if (stored) {
        initialList = JSON.parse(stored);
        setRecentFoods(initialList);
      } else {
        initialList = [];
        setRecentFoods(initialList);
      }
    } catch (err) {
      console.error(err);
    }

    let active = true;
    const fetchAndMerge = async () => {
      try {
        const dbItems = await dbService.getRecentFoods(userId);
        if (!active) return;

        if (dbItems && dbItems.length > 0) {
          const formattedDbItems: FoodPreset[] = dbItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            icon: item.icon,
            baseCalories: item.baseCalories,
            baseCarbs: item.baseCarbs,
            baseProtein: item.baseProtein,
            baseFat: item.baseFat,
            servingUnit: item.servingUnit || "g",
            baseGrams: item.baseGrams,
          }));

          setRecentFoods((prev) => {
            const localOnly = prev.filter(
              (p) =>
                !formattedDbItems.some(
                  (db) => db.name.toLowerCase() === p.name.toLowerCase(),
                ),
            );
            const finalMerged = [...formattedDbItems, ...localOnly].slice(
              0,
              100,
            );

            try {
              localStorage.setItem(userStorageKey, JSON.stringify(finalMerged));
            } catch (e) {
              console.error(e);
            }
            return finalMerged;
          });
        }
      } catch (err) {
        console.error("Failed to fetch and merge recent foods from DB", err);
      }
    };

    fetchAndMerge();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const loadRoutines = async () => {
      try {
        const data = await dbService.getMealRoutines(userId);
        if (data && data.length > 0) {
          setRoutines(data);
        } else {
          // fallback to picking up old local storage and syncing it up to firebase
          const saved = localStorage.getItem("diet_routines");
          if (saved) {
             const parsed = JSON.parse(saved);
             if (parsed.length > 0) {
               await dbService.saveMealRoutines(userId, parsed);
               setRoutines(parsed);
             }
          }
        }
      } catch (e) {
        console.error("Failed to load routines", e);
      }
    };
    loadRoutines();
  }, [userId, showRoutineList]);

  // Advanced multi-mode search triggering effect
  useEffect(() => {
    const term = searchTerm.trim();
    
    // Clear results if search term is empty
    if (!term) {
      setFatSecretResults([]);
      setKoreaResults([]);
      setLocalDbResults([]);
      setBarcodeResult(null);
      setBarcodeError(null);
      setBarcodeWarning(null);
      return;
    }

    if (searchMode === "local") {
      const timer = setTimeout(() => {
        performLocalDbSearch(term);
      }, 400);
      return () => clearTimeout(timer);
    }

    // Barcode Search
    if (searchMode === "barcode") {
      let validBarcode = term;
      const gtinMatch = term.match(/(880\d{10})/);
      if (gtinMatch) {
        validBarcode = gtinMatch[1];
      } else {
        const isDigits = /^\d+$/.test(term);
        if (!isDigits) {
          setBarcodeError("바코드는 숫자만 포함하거나 올바른 형식이어야 합니다.");
          setBarcodeResult(null);
          return;
        }
      }
      setBarcodeError(null);
      
      const timer = setTimeout(() => {
        performBarcodeSearch(validBarcode);
      }, 600);

      return () => clearTimeout(timer);
    }

    // FatSecret Search
    if (searchMode === "fatsecret") {
      const isValid = /^[a-zA-Z0-9\sㄱ-ㅎㅏ-ㅣ가-힣]*$/.test(term);
      if (!isValid) {
        setFatSecretResults([]);
        return;
      }
      const timer = setTimeout(() => {
        performFatSecretSearch(term);
      }, 500);

      return () => clearTimeout(timer);
    }

    // FoodQR Search
    if (searchMode === "foodqr") {
      const timer = setTimeout(() => {
        performFoodqrSearch(term);
      }, 500);

      return () => clearTimeout(timer);
    }
    if (searchMode === "korea") {
      const isValid = /^[a-zA-Z0-9\sㄱ-ㅎㅏ-ㅣ가-힣\-]*$/.test(term);
      if (!isValid) {
        setKoreaResults([]);
        return;
      }
      const timer = setTimeout(() => {
        performKoreaSearch(term);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, searchMode]);

  const performFatSecretSearch = async (query: string) => {
    setIsSearchingFS(true);
    setFatSecretError(null);
    try {
      const results = await searchFoodAPI(query);
      setFatSecretResults(results);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("credentials are not set")) {
        setFatSecretError(
          "FatSecret API 키가 설정되지 않았습니다. (.env.example 확인)",
        );
      } else if (err.message && (err.message.includes("Invalid IP address detected") || err.message.includes("IP 제한"))) {
        const ipMatch = err.message.match(/SERVER_IP=([^\s]+)/);
        const ipInfo = ipMatch ? ` 현재 서버 IP: ${ipMatch[1]}` : "";
        setFatSecretError(`FatSecret IP 제한 오류 — FatSecret 콘솔에 이 IP를 추가해주세요.${ipInfo}`);
      } else if (err.message === "Failed to fetch") {
        setFatSecretError(
          "네트워크 오류 (또는 서버 재시작 중)입니다. 다시 시도해주세요.",
        );
      } else if (err.message && (err.message.includes("invalid_client") || err.message.includes("400"))) {
        setFatSecretError(
          "FatSecret 인증 실패 (invalid_client). Client ID / Secret 값이 올바른지 확인해 주세요.",
        );
      } else {
        setFatSecretError(`검색 중 오류: ${err.message}`);
      }
      setFatSecretResults([]);
    }
    setIsSearchingFS(false);
  };

  const performKoreaSearch = async (query: string) => {
    setIsSearchingKorea(true);
    setKoreaError(null);
    try {
      const results = await searchKoreaFoodAPI(query);
      setKoreaResults(results);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("credentials_not_set")) {
        setKoreaError(
          "식약처 API 키가 설정되지 않았습니다. (.env.example 확인)",
        );
      } else if (err.message && err.message.includes("키가 올바르지 않거나 승인되지 않았습니다")) {
        setKoreaError(KOREA_API_ERROR_CODES["Unauthorized"] || err.message);
      } else {
        const matchingCode = Object.keys(KOREA_API_ERROR_CODES).find(k => err.message.includes(k));
        if (matchingCode) {
          setKoreaError(KOREA_API_ERROR_CODES[matchingCode]);
        } else {
          setKoreaError(`검색 중 오류: ${err.message}`);
        }
      }
      setKoreaResults([]);
    }
    setIsSearchingKorea(false);
  };

  const performLocalDbSearch = async (query: string) => {
    setIsSearchingLocalDb(true);
    setLocalDbError(null);
    try {
      const res = await fetch(`/api/localdb/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Local DB error");
      const data = await res.json();
      setLocalDbResults(data);
    } catch (e: any) {
      console.error(e);
      setLocalDbError("로컬 DB 검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearchingLocalDb(false);
    }
  };

  const performBarcodeSearch = async (code: string) => {
    setIsSearchingBarcode(true);
    setBarcodeError(null);
    setBarcodeWarning(null);
    try {
      const resp = await searchBarcodeAPI(code);
      if (resp) {
        setBarcodeResult(resp);
      } else {
        setBarcodeResult(null);
        setBarcodeError("바코드 검색결과가 없습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setBarcodeError(`바코드 검색 실패: ${err.message}`);
      setBarcodeResult(null);
    }
    setIsSearchingBarcode(false);
  };

  const performFoodqrSearch = async (query: string) => {
    setIsSearchingFoodqr(true);
    setFoodqrError(null);
    try {
      let searchQuery = query;
      // Extract GTIN (880... 13 digits) if the scanned string is a URL containing it
      const gtinMatch = query.match(/(880\d{10})/);
      if (gtinMatch) {
        searchQuery = gtinMatch[1];
        // Forward it to Barcode scan mode to get perfect nutrient detail directly!
        setSearchMode("barcode");
        setSearchTerm(searchQuery);
        return performBarcodeSearch(searchQuery);
      }

      const results = await searchFoodQRAPI(searchQuery);
      setFoodqrResults(results);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("credentials_not_set")) {
        setFoodqrError("식약처 API 키(KOREA_FOOD_API_KEY)가 설정되지 않았습니다.");
      } else if (err.message && err.message.includes("키가 올바르지 않거나 승인되지 않았습니다")) {
        setFoodqrError(KOREA_API_ERROR_CODES["Unauthorized"] || err.message);
      } else {
        const matchingCode = Object.keys(KOREA_API_ERROR_CODES).find(k => err.message.includes(k));
        if (matchingCode) {
          setFoodqrError(KOREA_API_ERROR_CODES[matchingCode]);
        } else {
          setFoodqrError(`검색 중 오류: ${err.message}`);
        }
      }
      setFoodqrResults([]);
    } finally {
      setIsSearchingFoodqr(false);
    }
  };

  const handleSelectSearchResult = (food: ParsedFoodResult) => {
    setActivePreset(null);
    setCustomEmoji(null);
    setIsCustomMode(true); // Entering custom adjustment mode for global food

    let nameStr = food.name;
    // Remove trailing tags to make it clean
    nameStr = nameStr.replace(/\s*\(식약처\)/g, "")
                     .replace(/\s*📱푸드QR/g, "")
                     .replace(/\s*\(FatS\)/g, "")
                     .replace(/\s*\(OFF\)/g, "");

    let bName = food.brand_name;
    if (bName) {
      // Escape regex special characters in brand name
      const safeBrand = bName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      nameStr = nameStr.replace(new RegExp(`\\s*${safeBrand}$`), "");
    }
    nameStr = nameStr.trim();
                     
    setCustomName(nameStr);
    
    setCurrentGrams(food.serving_weight_grams);
    setCurrentCalories(food.calories);
    setCurrentCarbs(food.carbs);
    setCurrentProtein(food.protein);
    setCurrentFat(food.fat);
    
    setBaseGrams(food.serving_weight_grams || 100);
    setBaseCalories(food.calories);
    setBaseCarbs(food.carbs);
    setBaseProtein(food.protein);
    setBaseFat(food.fat);
    setIsMacrosLocked(true);

    // Clear search state to go to the UI to adjust values
    setSearchTerm("");
    setFatSecretResults([]);
    setKoreaResults([]);
    setFoodqrResults([]);
    setBarcodeResult(null);
    setBarcodeWarning(null);
    setIsDropdownOpen(false);
    setSearchMode("local");
  };

  const handleSelectPreset = (preset: FoodPreset) => {
    setActivePreset(preset);
    setCustomEmoji(null);
    setIsCustomMode(false);
    // Initialize adjustment weights relative to baseGrams (usually 100g)
    setCurrentGrams(preset.baseGrams);
    setCurrentCalories(preset.baseCalories);
    setCurrentCarbs(preset.baseCarbs);
    setCurrentProtein(preset.baseProtein);
    setCurrentFat(preset.baseFat);

    setBaseGrams(preset.baseGrams || 100);
    setBaseCalories(preset.baseCalories);
    setBaseCarbs(preset.baseCarbs);
    setBaseProtein(preset.baseProtein);
    setBaseFat(preset.baseFat);
    setIsMacrosLocked(true);
  };

  const handleGramsChange = (newGrams: number) => {
    setCurrentGrams(newGrams);
    if (isMacrosLocked && baseGrams > 0) {
      const scale = newGrams / baseGrams;
      setCurrentCalories(Math.max(0, Math.round(baseCalories * scale)));
      setCurrentCarbs(Math.max(0, Math.round(baseCarbs * scale)));
      setCurrentProtein(Math.max(0, Math.round(baseProtein * scale)));
      setCurrentFat(Math.max(0, Math.round(baseFat * scale)));
    }
  };

  const handleDeleteRecentFood = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedList = recentFoods.filter((item) => item.id !== id);
      setRecentFoods(updatedList);

      const storageKey = userId
        ? `recent_logged_foods_${userId}`
        : "recent_logged_foods";
      localStorage.setItem(storageKey, JSON.stringify(updatedList));

      if (userId) {
        dbService.deleteRecentFood(userId, id).catch((err) => {
          console.error("Error deleting recent food from DB:", err);
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInitializeCustom = () => {
    setActivePreset(null);
    setCustomEmoji(null);
    setIsCustomMode(true);
    setCustomName("");
    setCustomCategory("custom");
    setCurrentGrams(100);
    setCurrentCalories(100);
    setCurrentCarbs(15);
    setCurrentProtein(5);
    setCurrentFat(2);

    setBaseGrams(100);
    setBaseCalories(100);
    setBaseCarbs(15);
    setBaseProtein(5);
    setBaseFat(2);
    setIsMacrosLocked(false);
  };

  const handleSaveMeal = () => {
    const name = activePreset
      ? activePreset.name
      : customName.trim() || "일반 건강식";
    const category = activePreset ? activePreset.category : customCategory;

    const cleanGrams = Math.max(1, Math.round(currentGrams));
    const cleanCalories = Math.max(0, Math.round(currentCalories));
    const cleanCarbs = Math.max(0, Math.round(currentCarbs));
    const cleanProtein = Math.max(0, Math.round(currentProtein));
    const cleanFat = Math.max(0, Math.round(currentFat));

    const resolvedIcon =
      customEmoji || activePreset?.icon || getEmojiForFoodName(name);

    const newLogItem = {
      dateStr,
      name,
      category,
      icon: resolvedIcon,
      grams: cleanGrams,
      calories: cleanCalories,
      carbs: cleanCarbs,
      protein: cleanProtein,
      fat: cleanFat,
      createdAt: new Date().toISOString(),
      isNew: true,
      tempId: `temp-${Date.now()}`
    };

    setCartItems(prev => [...prev, newLogItem]);

    // Save to recently added list with userId separation
    const newRecentItem = {
      id:
        activePreset?.id && !activePreset.id.startsWith("recent-")
          ? activePreset.id
          : `recent-${Date.now()}`,
      name,
      category,
      icon: resolvedIcon,
      baseCalories: cleanCalories,
      baseCarbs: cleanCarbs,
      baseProtein: cleanProtein,
      baseFat: cleanFat,
      servingUnit: activePreset?.servingUnit || "g",
      baseGrams: cleanGrams,
    };

    try {
      const storageKey = userId
        ? `recent_logged_foods_${userId}`
        : "recent_logged_foods";
      const stored = localStorage.getItem(storageKey);
      let recentList: any[] = stored ? JSON.parse(stored) : [];
      // Remove duplicates by name
      recentList = recentList.filter(
        (item: any) => item.name.toLowerCase() !== name.toLowerCase(),
      );
      recentList.unshift(newRecentItem);
      if (recentList.length > 100) {
        recentList = recentList.slice(0, 100);
      }
      localStorage.setItem(storageKey, JSON.stringify(recentList));
      setRecentFoods(recentList);

      if (userId) {
        dbService.saveRecentFood(userId, newRecentItem).catch((err) => {
          console.error("Error saving recent food to DB:", err);
        });
      }
    } catch (e) {
      console.error(e);
    }

    // Close drawers/panels
    setActivePreset(null);
    setIsCustomMode(false);
    setSearchTerm("");
  };

  const handleFinalSave = () => {
    if (onMultiSave) {
      const newLogs = cartItems.filter(c => c.isNew && !c.isDeleted).map(({ id, isDeleted, isNew, tempId, ...rest }) => rest);
      // Let's assume all existing logs that are not deleted might be updated, App.tsx will diff or just update
      const updatedLogs = cartItems.filter(c => !c.isNew && !c.isDeleted);
      const deletedLogIds = cartItems.filter(c => !c.isNew && c.isDeleted && c.id).map(c => c.id as string);
      
      onMultiSave(newLogs as any[], updatedLogs as any[], deletedLogIds);
    }
  };

  const getMealTimeLabel = (mealKey: string | null | undefined) => {
    if (!mealKey) return "오늘";
    const defaultLabels: Record<string, string> = {
      breakfast: "아침",
      lunch: "점심",
      dinner: "저녁",
      snack: "간식",
    };
    return defaultLabels[mealKey] || mealKey;
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs">
      {!activePreset && !isCustomMode ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
              식단 추가
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setShowRoutineList(!showRoutineList)}
                className={`text-[10.5px] font-extrabold py-2 rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  showRoutineList
                    ? "bg-[#16A34A] text-white border-[#16A34A] shadow-xs"
                    : "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0] hover:bg-[#DCFCE7]"
                }`}
              >
                <span>📋</span> 루틴 불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenCopyModal) onOpenCopyModal();
                }}
                className="text-[10.5px] font-extrabold text-[#0F172A] bg-[#F1F5F9] py-2 rounded-xl border border-neutral-300 hover:bg-[#E2E8F0] cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                <span>📋</span> 기록 복사하기
              </button>
              <button
                type="button"
                onClick={handleInitializeCustom}
                className="text-[11px] font-extrabold text-[#3B82F6] bg-[#EFF6FF] py-2 rounded-xl border border-[#DBEAFE] hover:bg-[#DBEAFE]/50 cursor-pointer transition-all flex items-center justify-center gap-1"
                id="btn-custom-meal"
              >
                <span>✨</span> 직접 등록
              </button>
            </div>
          </div>

          {/* Routine List Dropdown Panel */}
          {showRoutineList && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 animate-in fade-in slide-in-from-top-2 duration-250">
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-[11px] font-extrabold text-[#16A34A] flex items-center gap-1">
                  <span>📋</span> 마이 식단 루틴 목록
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRoutineList(false)}
                  className="text-[9px] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded text-neutral-500 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  닫기
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto">
                {routines.length === 0 ? (
                  <div className="text-center py-5 bg-white rounded-lg border border-dashed border-[#BBF7D0] text-[11px] text-neutral-500 font-medium leading-relaxed">
                    저장된 식단 루틴이 없습니다.
                    <br />
                    하단{" "}
                    <span className="font-extrabold text-[#16A34A]">
                      [루틴]
                    </span>{" "}
                    탭에서 루틴을 먼저 추가해보세요!
                  </div>
                ) : (
                  routines.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center p-2 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#16A34A] transition-all cursor-pointer shadow-2xs group"
                      onClick={() => {
                        if (onApplyRoutine) {
                          onApplyRoutine(r);
                          setShowRoutineList(false);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[11px] font-extrabold text-neutral-800 flex items-center gap-1.5 truncate">
                          <span className="text-xs">
                            {r.mealTime === "breakfast"
                              ? "☀️"
                              : r.mealTime === "lunch"
                                ? "🌤️"
                                : r.mealTime === "dinner"
                                  ? "🌙"
                                  : "🍿"}
                          </span>
                          <span className="truncate">{r.name}</span>
                          <span className="text-[9px] text-[#16A34A] bg-[#E8F5E9] px-1.5 py-0.2 rounded font-medium shrink-0">
                            {r.mealTime === "breakfast"
                              ? "아침"
                              : r.mealTime === "lunch"
                                ? "점심"
                                : r.mealTime === "dinner"
                                  ? "저녁"
                                  : "간식"}
                          </span>
                        </p>
                        <p className="text-[9px] text-neutral-500 font-mono mt-0.5 truncate">
                          음식 {r.foods.length}개 · 총{" "}
                          {r.foods.reduce((sum, f) => sum + f.calories, 0)}kcal
                          (탄:
                          {Math.round(
                            r.foods.reduce((sum, f) => sum + f.carbs, 0),
                          )}
                          g 단:
                          {Math.round(
                            r.foods.reduce((sum, f) => sum + f.protein, 0),
                          )}
                          g 지:
                          {Math.round(
                            r.foods.reduce((sum, f) => sum + f.fat, 0),
                          )}
                          g)
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-[10px] font-black text-[#16A34A] bg-[#E8F5E9] group-hover:bg-[#16A34A] group-hover:text-white px-2 py-1 rounded transition-colors shrink-0"
                      >
                        가져오기
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div
              className="flex flex-col gap-2 relative w-full"
              ref={searchContainerRef}
            >
              {/* Toggles Group: DB Toggles & Mode Buttons in a single box */}
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border border-[#E2E8F0] rounded-xl">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode(searchMode === "barcode" ? "local" : "barcode");
                      setSearchTerm("");
                      setIsDropdownOpen(true);
                    }}
                    className={`p-1.5 px-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                      searchMode === "barcode"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-neutral-500 border-neutral-200"
                    }`}
                  >
                    <Barcode className="w-3.5 h-3.5" /> 바코드
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode(searchMode === "foodqr" ? "local" : "foodqr");
                      setSearchTerm("");
                      setIsDropdownOpen(true);
                    }}
                    className={`p-1.5 px-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                      searchMode === "foodqr"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-neutral-500 border-neutral-200"
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" /> QR
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      onClick={() => {
                        setSearchMode(searchMode === "fatsecret" ? "local" : "fatsecret");
                        setIsDropdownOpen(true);
                      }}
                      className={`text-[10px] font-extrabold cursor-pointer select-none transition-colors ${
                        searchMode === "fatsecret" ? "text-emerald-600" : "text-neutral-400"
                      }`}
                    >
                      FatS
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchMode(searchMode === "fatsecret" ? "local" : "fatsecret");
                        setIsDropdownOpen(true);
                      }}
                      className={`w-7 h-4 rounded-full relative transition-colors ${
                        searchMode === "fatsecret" ? "bg-emerald-500" : "bg-neutral-200"
                      } cursor-pointer`}
                    >
                      <div
                        className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ease-in-out ${
                          searchMode === "fatsecret" ? "left-[15px]" : "left-[3px]"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      onClick={() => {
                        setSearchMode(searchMode === "korea" ? "local" : "korea");
                        setIsDropdownOpen(true);
                      }}
                      className={`text-[10px] font-extrabold cursor-pointer select-none transition-colors ${
                        searchMode === "korea" ? "text-blue-500" : "text-neutral-400"
                      }`}
                    >
                      식약처
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchMode(searchMode === "korea" ? "local" : "korea");
                        setIsDropdownOpen(true);
                      }}
                      className={`w-7 h-4 rounded-full relative transition-colors ${
                        searchMode === "korea" ? "bg-blue-500" : "bg-neutral-200"
                      } cursor-pointer`}
                    >
                      <div
                        className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ease-in-out ${
                          searchMode === "korea" ? "left-[15px]" : "left-[3px]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative w-full">
                <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder={
                    searchMode === "barcode"
                      ? "바코드 번호 입력 (예: 8801043014794)"
                      : searchMode === "fatsecret"
                      ? "FatSecret 검색"
                      : searchMode === "korea"
                      ? "식약처 검색..."
                      : searchMode === "foodqr"
                      ? "QR 코드 제품검색..."
                      : "로컬 검색"
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full h-10 border border-[#E2E8F0] rounded-xl pl-9 pr-10 bg-[#F8FAFC] focus:bg-white text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] font-[#1E293B]"
                />
                {searchTerm && !isSearchingFS && !isSearchingKorea && !isSearchingBarcode && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-3 top-3 p-0 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {(isSearchingFS || isSearchingKorea || isSearchingBarcode || isSearchingFoodqr) && (
                  <div className="absolute right-3 top-3 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
              </div>

              {/* Advanced Search Dropdown Floating Layers */}
              {/* NOTE: Placed directly inside searchContainerRef with w-full to match container width! */}
              {isDropdownOpen && (searchTerm.trim() || searchMode === "barcode" || searchMode === "foodqr") && (
                <div className="absolute top-full -left-4 w-[calc(100%+32px)] sm:left-0 sm:w-full z-[100] mt-4 shadow-2xl px-4 sm:px-0">
                  {/* BARCODE MODE DROPDOWN */}
                  {searchMode === "barcode" && (
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl p-3 max-h-[70vh] sm:max-h-[600px] overflow-y-auto">
                      <div id="scanner-reader" className="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[200px]"></div>
                      {isSearchingBarcode ? (
                        <div className="flex items-center justify-center gap-1.5 p-6 text-xs text-[#3B82F6] font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          바코드 제품 정보 및 영양성분 조회 중...
                        </div>
                      ) : barcodeError ? (
                        <div className="text-center p-4 text-xs text-red-500 font-bold bg-red-50 rounded-lg">
                          {barcodeError}
                        </div>
                      ) : barcodeResult ? (
                        <div className="flex flex-col gap-2">
                          <div className="bg-blue-100/50 border border-blue-200 p-2.5 rounded-lg">
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">바코드 조회 성공</p>
                            {barcodeWarning && (
                              <p className="text-[9px] text-[#D97706] mt-0.5 font-semibold">⚠️ {barcodeWarning}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectSearchResult(barcodeResult)}
                            className="w-full flex flex-col items-start p-3 bg-neutral-50 hover:bg-blue-50 rounded-lg border border-neutral-100 text-left transition-colors"
                          >
                            <p className="text-xs font-black text-neutral-800">
                              {barcodeResult.brand_name && (
                                <span className="text-blue-500 mr-1">
                                  [{barcodeResult.brand_name}]
                                </span>
                              )}
                              {barcodeResult.name}
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                              {barcodeResult.serving_desc} • {barcodeResult.calories}kcal • 탄:{barcodeResult.carbs}g 단:{barcodeResult.protein}g 지:{barcodeResult.fat}g
                            </p>
                            <div className="w-full text-center text-[10px] text-blue-600 bg-white border border-blue-200 py-1 rounded mt-2.5 font-bold hover:bg-blue-600 hover:text-white transition-colors">
                              이 식품 가져오기
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-neutral-500">
                          바코드 번호를 정확하게 입력하세요. (880으로 시작하는 13자리 번호)
                        </div>
                      )}
                    </div>
                  )}

                  {/* FOODQR DROPDOWN */}
                  {searchMode === "foodqr" && (
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl p-3 max-h-[70vh] sm:max-h-[600px] overflow-y-auto">
                      <div id="scanner-reader" className="w-full rounded-xl overflow-hidden mb-3 bg-black min-h-[200px]"></div>
                      {isSearchingFoodqr ? (
                        <div className="flex items-center justify-center gap-1.5 p-6 text-xs text-purple-500 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          푸드QR 데이터 로딩 중...
                        </div>
                      ) : foodqrError ? (
                        <div className="text-center p-4 text-xs text-red-500 font-bold bg-white">
                          {foodqrError}
                        </div>
                      ) : foodqrResults.length > 0 ? (
                        <div className="grid grid-cols-1 divide-y divide-neutral-100">
                           {foodqrResults.map((result, idx) => (
                             <button
                               key={`${result.id}-${idx}`}
                               onClick={() => handleSelectSearchResult(result)}
                               className="w-full flex flex-col items-start p-4 hover:bg-purple-50 transition-colors text-left group gap-1"
                             >
                                <p className="text-sm font-bold text-neutral-800 truncate w-full">
                                  {result.name}
                                </p>
                                <p className="text-[11px] text-neutral-500 font-mono w-full">
                                  {result.serving_desc} • {result.calories}kcal
                                </p>
                                <p className="text-[11.5px] text-neutral-700 font-bold font-mono mt-0.5 w-full">
                                  탄: {result.carbs}g / 단: {result.protein}g / 지: {result.fat}g
                                </p>
                             </button>
                           ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-white flex flex-col items-center">
                          <p className="text-xs font-bold text-neutral-500">푸드QR 검색 결과 없음</p>
                          <p className="text-[10px] text-neutral-400 mt-1">다른 제품명으로 검색해보세요.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* KOREA FOOD SAFETY (식약처) DROPDOWN */}
                  {searchMode === "korea" && (
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl max-h-[70vh] sm:max-h-[600px] overflow-y-auto">
                      {isSearchingKorea ? (
                        <div className="flex items-center justify-center gap-1.5 p-6 text-xs text-blue-500 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          식약처 영양성분 공공데이터 로딩 중...
                        </div>
                      ) : koreaError ? (
                        <div className="text-center p-4 text-xs text-red-500 font-bold bg-white">
                          {koreaError}
                        </div>
                      ) : koreaResults.length > 0 ? (
                        <div className="grid grid-cols-1 divide-y divide-neutral-100">
                       {koreaResults.map((result, idx) => (
                             <button
                               key={`${result.id}-${idx}`}
                               onClick={() => handleSelectSearchResult(result)}
                               className="w-full flex flex-col items-start p-4 hover:bg-blue-50 transition-colors text-left group gap-1"
                             >
                                <p className="text-sm font-bold text-neutral-800 truncate w-full">
                                  {result.name}
                                </p>
                                <p className="text-[11px] text-neutral-500 font-mono w-full">
                                  {result.serving_desc} • {result.calories}kcal
                                </p>
                                <p className="text-[11.5px] text-neutral-700 font-bold font-mono mt-0.5 w-full">
                                  탄: {result.carbs}g / 단: {result.protein}g / 지: {result.fat}g
                                </p>
                             </button>
                           ))}
                        </div>
                      ) : (
                        !isSearchingKorea && (
                          <div className="text-center p-6 text-xs text-neutral-500 bg-white">
                            검색 결과가 없거나 API 설정 대기 중입니다.
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* FATSECRET DROPDOWN */}
                  {searchMode === "fatsecret" && (
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-xl max-h-[70vh] sm:max-h-[600px] overflow-y-auto">
                      {isSearchingFS ? (
                        <div className="flex items-center justify-center gap-1.5 p-6 text-xs text-emerald-500 font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          FatSecret 전 세계 음식 조회 중...
                        </div>
                      ) : fatSecretError ? (
                        <div className="text-center p-4 text-xs text-red-500 font-bold bg-white">
                          {fatSecretError}
                        </div>
                      ) : fatSecretResults.length > 0 ? (
                        <div className="grid grid-cols-1 divide-y divide-neutral-100">
                          {fatSecretResults.map((result, idx) => (
                            <button
                              key={`${result.id}-${idx}`}
                              onClick={() => handleSelectSearchResult(result)}
                              className="w-full flex flex-col items-start p-4 hover:bg-emerald-50 transition-colors text-left group gap-1"
                            >
                                <p className="text-sm font-bold text-neutral-800 truncate w-full">
                                  {result.brand_name && (
                                    <span className="text-emerald-600 mr-1.5 text-xs">
                                      [{result.brand_name}]
                                    </span>
                                  )}
                                  {result.name}
                                </p>
                                <p className="text-[11px] text-neutral-500 font-mono w-full truncate">
                                  {result.serving_desc} • {result.calories}kcal
                                 </p>
                                 <p className="text-[11.5px] text-neutral-700 font-bold font-mono mt-0.5 w-full">
                                   탄: {result.carbs}g / 단: {result.protein}g / 지: {result.fat}g
                                </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        !isSearchingFS && (
                          <div className="text-center p-6 text-xs text-neutral-500 bg-white">
                            검색 결과가 없습니다.
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <>
            {/* Horizontal Category Pill Selector (Draggable, hides scrollbar) */}
            <div className="relative flex items-center -mx-4">
              <div
                ref={mainCategoryDrag.scrollRef}
                {...mainCategoryDrag.handlers}
                className="flex-1 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar px-4 cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (mainCategoryDrag.dragMoved) return;
                    setSelectedCategory("recent");
                  }}
                  className={`flex-shrink-0 whitespace-nowrap text-[11px] font-bold px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    selectedCategory === "recent"
                      ? "bg-[#3B82F6] text-white shadow-xs"
                      : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  ⏱️ 최근 추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (mainCategoryDrag.dragMoved) return;
                    setSelectedCategory("all");
                  }}
                  className={`flex-shrink-0 whitespace-nowrap text-[11px] font-bold px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-[#3B82F6] text-white shadow-xs"
                      : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  전체 보기
                </button>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (mainCategoryDrag.dragMoved) return;
                      setSelectedCategory(key);
                    }}
                    className={`flex-shrink-0 whitespace-nowrap text-[11px] font-bold px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      selectedCategory === key
                        ? "bg-[#3B82F6] text-white shadow-xs"
                        : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* If selectedCategory is 'carbs', show sub-category selector */}
            {selectedCategory === "carbs" && (
              <div className="flex flex-col gap-2 mb-3.5 px-1">
                <div
                  className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar px-2 cursor-grab active:cursor-grabbing select-none"
                  ref={subCategoryDrag.scrollRef}
                  {...subCategoryDrag.handlers}
                >
                  {[
                    { id: "all", label: "🌾 전체" },
                    { id: "rice", label: "🍚 밥/곡물" },
                    { id: "pasta", label: "🍝 파스타" },
                    { id: "noodle", label: "🍜 면류" },
                    { id: "bread", label: "🍞 빵" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        if (subCategoryDrag.dragMoved) return;
                        setSelectedSubCategory(sub.id as any);
                      }}
                      className={`flex-shrink-0 whitespace-nowrap text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer border ${
                        selectedSubCategory === sub.id
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-white border-neutral-200 text-neutral-600 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Sub-subcategory for noodles (라면 / 국수 / 메밀) */}
                {selectedSubCategory === "noodle" && (
                  <div
                    className="flex gap-1 overflow-x-auto px-2 py-1 mt-1 animate-in slide-in-from-top-1 duration-200 cursor-grab active:cursor-grabbing select-none no-scrollbar"
                    ref={subSubCategoryDrag.scrollRef}
                    {...subSubCategoryDrag.handlers}
                  >
                    {[
                      { id: "all", label: "🍜 면전체" },
                      { id: "ramen", label: "🌶️ 라면류" },
                      { id: "guksu", label: "🥢 국수/우동" },
                      { id: "buckwheat_etc", label: "🌾 메밀/냉면/기타" },
                    ].map((subSub) => (
                      <button
                        key={subSub.id}
                        type="button"
                        onClick={() => {
                          if (subSubCategoryDrag.dragMoved) return;
                          setSelectedNoodleSub(subSub.id as any);
                        }}
                        className={`flex-shrink-0 whitespace-nowrap text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-all border cursor-pointer ${
                          selectedNoodleSub === subSub.id
                            ? "bg-red-500 text-white border-red-500 shadow-xs"
                            : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        {subSub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* If selectedCategory is 'meat', show sub-category selector */}
            {selectedCategory === "meat" && (
              <div className="flex flex-col gap-2 mb-3.5 px-1">
                <div
                  className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar px-2 cursor-grab active:cursor-grabbing select-none"
                  ref={subCategoryDrag.scrollRef}
                  {...subCategoryDrag.handlers}
                >
                  {[
                    { id: "all", label: "🥩 고기전체" },
                    { id: "beef", label: "🐂 소고기" },
                    { id: "pork", label: "🐖 돼지고기" },
                    { id: "chicken_egg", label: "🐔 닭고기/계란" },
                    { id: "meat_etc", label: "🍖 오리/기타" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        if (subCategoryDrag.dragMoved) return;
                        setSelectedSubCategory(sub.id);
                      }}
                      className={`flex-shrink-0 whitespace-nowrap text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer border ${
                        selectedSubCategory === sub.id
                          ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                          : "bg-white border-neutral-200 text-neutral-600 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Food Presets Click Grid (Zero photorealism, high touch contrast) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
              {filteredPresets.length === 0 && (
                <div className="text-center py-6 col-span-1 sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-neutral-400 font-medium">
                    {selectedCategory === "recent"
                      ? "최근 등록된 음식이 없습니다."
                      : "일치하는 음식이 없습니다."}
                  </p>
                </div>
              )}
              {filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                  className="flex items-start gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:bg-white hover:border-[#3B82F6] hover:shadow-xs cursor-pointer active:scale-98 transition-all justify-between text-left"
                  id={`preset-${preset.id}`}
                >
                  <div className="min-w-0 flex-1 flex items-start gap-2">
                    <div
                      className="flex-shrink-0 w-8 h-8 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-center text-base mt-0.5"
                      id={`icon-cnt-${preset.id}`}
                    >
                      {preset.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[10.5px] sm:text-[11px] font-black text-[#1E293B] tracking-tight leading-tight line-clamp-2 mb-0.5"
                        title={preset.name}
                      >
                        {preset.name}
                      </p>
                      <p className="text-[9.5px] sm:text-[10px] text-[#64748B] font-mono leading-tight mt-0.5">
                        {preset.baseGrams}{preset.servingUnit} · {preset.baseCalories}kcal
                      </p>
                      <p className="text-[9.5px] sm:text-[10px] text-[#1E293B] font-bold font-mono leading-tight mt-0.5">
                        탄:{preset.baseCarbs}g / 단:{preset.baseProtein}g / 지:{preset.baseFat}g
                      </p>
                    </div>
                  </div>
                  {selectedCategory === "recent" ? (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRecentFood(preset.id, e)}
                      className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer border border-slate-200"
                      title="최근 목록에서 제외"
                    >
                      <Minus className="w-3 h-3 stroke-[3]" />
                    </button>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] mr-0.5 flex-shrink-0" />
                  )}
                </div>
              ))}

              {/* Custom Quick Add Option Card */}
              <button
                type="button"
                onClick={() => {
                  setActivePreset(null);
                  setCustomEmoji(null);
                  setIsCustomMode(true);
                  setCustomName(searchTerm || "");
                  setCustomCategory("custom");
                  setCurrentGrams(100);
                  setCurrentCalories(120);
                  setCurrentCarbs(15);
                  setCurrentProtein(5);
                  setCurrentFat(2);
                }}
                className="flex items-center gap-2 p-2 bg-[#F1F5F9]/60 border border-dashed border-[#CBD5E1] rounded-xl hover:bg-white hover:border-[#3B82F6] hover:shadow-xs cursor-pointer active:scale-98 transition-all text-left"
                id="btn-inline-custom-add"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-center justify-center text-base">
                  ✨
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-extrabold text-[#3B82F6] leading-tight line-clamp-1 pr-1">
                    커스텀 음식 추가
                  </p>
                  <p className="text-[9px] text-[#64748B] font-bold mt-0.5 leading-none">
                    직접 영양 성분 입력 ✍️
                  </p>
                </div>
              </button>
              {/* Local DB Offline Search Results */}
              {searchTerm && searchMode === "local" && (isSearchingLocalDb || localDbError || localDbResults.length > 0) && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-4 border-t border-neutral-200 pt-3">
                  <p className="text-xs font-bold text-neutral-800 mb-2 flex items-center gap-1.5">
                    🗂️ 오프라인 DB 검색 (약 2만개)
                    {isSearchingLocalDb && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                  </p>
                  
                  {localDbError && (
                    <div className="text-xs text-red-500 font-medium py-2">{localDbError}</div>
                  )}
                  
                  {localDbResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                       {localDbResults.map((res: any) => (
                          <div
                            key={res.id}
                            onClick={() => handleSelectSearchResult({
                               id: res.id,
                               name: res.name,
                               serving_desc: res.serving_desc,
                               serving_weight_grams: res.weight_g,
                               calories: res.calories,
                               protein: res.protein,
                               fat: res.fat,
                               carbs: res.carbs,
                            })}
                            className="flex items-start gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:bg-white hover:border-[#3B82F6] hover:shadow-xs cursor-pointer active:scale-98 transition-all justify-between text-left"
                          >
                             <div className="min-w-0 flex-1">
                                <p className="text-[10.5px] sm:text-[11px] font-black text-[#1E293B] tracking-tight leading-tight line-clamp-2 mb-0.5">
                                  {res.name}
                                </p>
                                <p className="text-[9.5px] sm:text-[10px] text-[#64748B] font-mono leading-tight">
                                  {res.serving_desc} · {res.calories}kcal
                                </p>
                                <p className="text-[9.5px] sm:text-[10px] text-[#1E293B] font-bold font-mono mt-0.5 leading-tight">
                                  탄:{res.carbs}g / 단:{res.protein}g / 지:{res.fat}g
                                </p>
                             </div>
                             <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] mr-0.5 mt-1 sm:mt-1.5 flex-shrink-0" />
                          </div>
                       ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MULTI_ADD CART section */}
            {cartItems.filter(c => !c.isDeleted).length > 0 && (
              <div className="mt-2 pt-4 border-t border-[#E2E8F0] space-y-2 animate-in fade-in duration-300">
                <div className="flex justify-between items-end pb-1">
                  <h4 className="text-xs font-bold text-slate-700">
                    {activeMealTime ? `${getMealTimeLabel(activeMealTime)} 식사 목록` : "추가될 음식 목록"} ({cartItems.filter(c => !c.isDeleted).length}개)
                  </h4>
                  <button onClick={handleFinalSave} className="h-8 px-4 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                    저장 및 닫기
                  </button>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {cartItems.map((item, idx) => !item.isDeleted && (
                    <div key={item.tempId || item.id || idx} className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none">{item.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{item.grams}g • {item.calories}kcal</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (item.isNew) {
                            setCartItems(prev => prev.filter((_, i) => i !== idx));
                          } else {
                            setCartItems(prev => {
                              const copy = [...prev];
                              copy[idx].isDeleted = true;
                              return copy;
                            });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        </div>
      ) : (
        /* Adjust Details Frame */
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-250">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
            <div className="flex items-center gap-1.5 w-full justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="text-base flex-shrink-0 cursor-pointer hover:scale-110 transition-transform block"
                  title="아이콘 이모지 변경"
                  onClick={() => {
                    const currentIcon =
                      customEmoji ||
                      (activePreset
                        ? activePreset.icon
                        : getEmojiForFoodName(customName));
                    setTempEmoji(currentIcon);
                    setIsEmojiPopupOpen(true);
                  }}
                >
                  {customEmoji ||
                    (activePreset
                      ? activePreset.icon
                      : getEmojiForFoodName(customName))}
                </span>
                <span className="text-xs font-black text-[#1E293B] truncate">
                  {activePreset
                    ? `${activePreset.name} 추가하기`
                    : "커스텀 음식 추가하기"}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleSaveMeal}
                  disabled={!activePreset && !customName.trim()}
                  className="text-[11px] font-black text-white bg-[#3B82F6] hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePreset(null);
                    setCustomEmoji(null);
                    setIsCustomMode(false);
                  }}
                  className="p-1 text-neutral-400 hover:text-[#1E293B] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!activePreset && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] block mb-1">
                    식품 명칭
                  </label>
                  <input
                    type="text"
                    placeholder="예: 편의점 단백질 치킨롤"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full h-10 border border-[#E2E8F0] rounded-xl px-3 bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#3B82F6] font-[#1E293B]"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <label className="text-[10px] font-extrabold text-[#64748B] block mb-1">
                    식품 분류 (카테고리)
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full h-10 border border-[#E2E8F0] rounded-xl px-3 bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#3B82F6] font-extrabold text-[#1E293B] cursor-pointer"
                  >
                    <option value="custom">✨ 직접 입력/커스텀</option>
                    <option value="carbs">🌾 곡물류/밥</option>
                    <option value="bread">🍞 빵류</option>
                    <option value="beef">🐂 소고기류</option>
                    <option value="pork">🐖 돼지고기류</option>
                    <option value="chicken_egg">🐔 닭고기/계란</option>
                    <option value="meat_etc">🍖 오리/기타육류</option>
                    <option value="seafood">🐟 수산물</option>
                    <option value="veg_nut">🥗 채소/견과</option>
                    <option value="fruit">🍎 과일</option>
                    <option value="dairy_drink">🥛 유제품/음료</option>
                    <option value="eating_out">🍔 외식/프랜차이즈</option>
                    <option value="etc_meal">🍜 기타 식사</option>
                  </select>
                </div>
              </div>
            )}

            {/* Mass Adjuster */}
            <NumberAdjuster
              value={currentGrams}
              onChange={handleGramsChange}
              label="1인분/양"
              unit={activePreset ? activePreset.servingUnit : "g"}
              min={1}
              max={2000}
              stepDecimal={0}
            />

            <div className="flex flex-col gap-2 mt-1 relative">
              <div className="flex items-center justify-between mt-2 mb-1 px-1">
                <span className="text-xs font-bold text-neutral-500">영양성분 상세 (자동스케일)</span>
                <button
                  type="button"
                  onClick={() => {
                     // If we are unlocking, we treat current as new base just to be safe
                     if (isMacrosLocked) {
                        setBaseGrams(currentGrams || 100);
                        setBaseCalories(currentCalories);
                        setBaseCarbs(currentCarbs);
                        setBaseProtein(currentProtein);
                        setBaseFat(currentFat);
                     }
                     setIsMacrosLocked(!isMacrosLocked);
                  }}
                  className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${isMacrosLocked ? 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200' : 'bg-red-50 text-red-500 border border-red-200'}`}
                >
                  {isMacrosLocked ? "🔒 변경 잠금 풀기" : "🔓 수정 가능 모드"}
                </button>
              </div>

              <NumberAdjuster
                value={currentCalories}
                onChange={(v) => { setCurrentCalories(v); setBaseCalories(v/(currentGrams/baseGrams||1)); }}
                label="에너지"
                unit="kcal"
                min={0}
                max={5000}
                stepDecimal={0}
                disabled={isMacrosLocked}
              />
              <NumberAdjuster
                value={currentCarbs}
                onChange={(v) => { setCurrentCarbs(v); setBaseCarbs(v/(currentGrams/baseGrams||1)); }}
                label="탄수화물"
                unit="g"
                min={0}
                max={500}
                stepDecimal={0}
                disabled={isMacrosLocked}
              />
              <NumberAdjuster
                value={currentProtein}
                onChange={(v) => { setCurrentProtein(v); setBaseProtein(v/(currentGrams/baseGrams||1)); }}
                label="단백질"
                unit="g"
                min={0}
                max={500}
                stepDecimal={0}
                disabled={isMacrosLocked}
              />
              <NumberAdjuster
                value={currentFat}
                onChange={(v) => { setCurrentFat(v); setBaseFat(v/(currentGrams/baseGrams||1)); }}
                label="지방"
                unit="g"
                min={0}
                max={500}
                stepDecimal={0}
                disabled={isMacrosLocked}
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mt-1.5">
              <p className="text-[10px] font-extrabold text-[#64748B] block mb-2 tracking-tight">
                🔎 예상 실시간 칼로리 배율 (영양 밸런스)
              </p>
              <div className="flex gap-3 justify-between items-center text-xs font-mono text-neutral-700">
                <div className="text-center flex-1 py-1 bg-white border border-[#E2E8F0] rounded-lg">
                  <p className="text-[9px] text-[#64748B] font-sans font-bold">
                    탄수화물
                  </p>
                  <p className="font-extrabold mt-0.5 text-blue-500">
                    {Math.round(currentCarbs * 4)} kcal
                  </p>
                </div>
                <div className="text-center flex-1 py-1 bg-white border border-[#E2E8F0] rounded-lg">
                  <p className="text-[9px] text-[#64748B] font-sans font-bold">
                    단백질
                  </p>
                  <p className="font-extrabold mt-0.5 text-emerald-500">
                    {Math.round(currentProtein * 4)} kcal
                  </p>
                </div>
                <div className="text-center flex-1 py-1 bg-white border border-[#E2E8F0] rounded-lg">
                  <p className="text-[9px] text-[#64748B] font-sans font-bold">
                    지방
                  </p>
                  <p className="font-extrabold mt-0.5 text-red-500">
                    {Math.round(currentFat * 9)} kcal
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveMeal}
              disabled={!activePreset && !customName.trim()}
              className="w-full h-11 bg-gradient-to-r from-[#0EA5E9] to-[#3B82F6] hover:brightness-105 text-white rounded-xl text-xs font-extrabold mt-2 transition-all active:scale-98 disabled:opacity-50 touch-manipulation cursor-pointer flex items-center justify-center gap-1.5 shadow-md font-bold"
              id="btn-add-to-diet-submit"
            >
              <Check className="w-4 h-4 text-white" />
              항목 담기
            </button>

            {activePreset &&
              (activePreset.id.startsWith("recent-") ||
                activePreset.category === "custom") && (
                <button
                  type="button"
                  onClick={(e) => {
                    handleDeleteRecentFood(activePreset.id, e);
                    setActivePreset(null);
                    setIsCustomMode(false);
                  }}
                  className="w-full h-11 border-2 border-dashed border-red-200 hover:border-red-300 hover:bg-red-50 text-red-500 rounded-xl text-xs font-black mt-2.5 transition-all text-center flex items-center justify-center gap-2 cursor-pointer duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />이 커스텀 음식
                  삭제하기
                </button>
              )}
          </div>
        </div>
      )}

      {/* Custom Emoji Picker Popup Modal */}
      {isEmojiPopupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl flex flex-col p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                음식 아이콘 설정
              </h3>
              <button
                type="button"
                onClick={() => setIsEmojiPopupOpen(false)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category tabs with scroll */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none no-scrollbar">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveEmojiTab(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                    activeEmojiTab === cat.id
                      ? "bg-[#3B82F6] border-[#3B82F6] text-white"
                      : "bg-neutral-50 dark:bg-slate-900 border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Grid of presets inside selected category */}
            <div className="grid grid-cols-6 gap-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
              {(EMOJI_CATEGORIES.find((c) => c.id === activeEmojiTab)?.emojis || []).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setTempEmoji(emoji);
                  }}
                  className={`text-xl p-2 rounded-xl border hover:bg-neutral-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer ${
                    tempEmoji === emoji
                      ? "border-[#3B82F6] bg-blue-50/50 dark:bg-blue-950/30"
                      : "border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2 items-center mb-4">
              <input
                type="text"
                maxLength={4}
                value={tempEmoji}
                onChange={(e) => setTempEmoji(e.target.value.trim())}
                placeholder="직접 입력 (이모지)"
                className="flex-1 h-9 border border-neutral-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900 rounded-lg px-2 text-xs font-bold text-center focus:outline-none focus:border-[#3B82F6] dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 text-xs font-black">
              <button
                type="button"
                onClick={() => setIsEmojiPopupOpen(false)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#64748B] dark:text-neutral-200 rounded-lg transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const char = tempEmoji.trim().charAt(0) || "✨";
                  setCustomEmoji(char);
                  setIsEmojiPopupOpen(false);
                }}
                className="flex-1 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
