import React, { useState, useEffect, useRef } from "react";
import { FOOD_PRESETS, CATEGORY_LABELS } from "../data/foodPresets";
import { FoodPreset, FoodLog, MealRoutine } from "../types";
import { getEmojiForFoodName } from "../utils/emojiHelper";
import { useDragScroll } from "../utils/useDragScroll";
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
} from "lucide-react";
import { searchFoodAPI, ParsedFoodResult } from "../services/fatsecretApi";
import { dbService } from "../services/dbService";

interface MealLoggerProps {
  onAddLog: (log: Omit<FoodLog, "userId">) => void;
  dateStr: string;
  onOpenCopyModal?: () => void;
  onApplyRoutine?: (routine: MealRoutine) => void;
  activeMealTime?: string | null;
  userId?: string;
}

export default function MealLogger({
  onAddLog,
  dateStr,
  onOpenCopyModal,
  onApplyRoutine,
  activeMealTime,
  userId,
}: MealLoggerProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("recent");
  const [activePreset, setActivePreset] = useState<FoodPreset | null>(null);

  // Custom Food state or active adjustments
  const [customEmoji, setCustomEmoji] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string>("");
  const [currentGrams, setCurrentGrams] = useState<number>(100);
  const [currentCalories, setCurrentCalories] = useState<number>(120);
  const [currentCarbs, setCurrentCarbs] = useState<number>(0);
  const [currentProtein, setCurrentProtein] = useState<number>(26);
  const [currentFat, setCurrentFat] = useState<number>(1.5);

  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // FatSecret integration state
  const [isFatSecretMode, setIsFatSecretMode] = useState<boolean>(false);
  const [fatSecretResults, setFatSecretResults] = useState<ParsedFoodResult[]>(
    [],
  );
  const [isSearchingFS, setIsSearchingFS] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

          const matchesSearch = isFatSecretMode
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
          setRecentFoods(FOOD_PRESETS.slice(0, 8));
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
        initialList = FOOD_PRESETS.slice(0, 8);
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
    const saved = localStorage.getItem("diet_routines");
    if (saved) {
      try {
        setRoutines(JSON.parse(saved));
      } catch (e) {}
    }
  }, [showRoutineList]);

  useEffect(() => {
    if (!isFatSecretMode) return;
    const term = searchTerm.trim();
    const isValid = /^[a-zA-Z0-9\sㄱ-ㅎㅏ-ㅣ가-힣]*$/.test(term);

    if (!term || !isValid) {
      setFatSecretResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performFatSecretSearch(term);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, isFatSecretMode]);

  const [fatSecretError, setFatSecretError] = useState<string | null>(null);

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
      } else if (err.message === "Failed to fetch") {
        setFatSecretError(
          "네트워크 오류 (또는 서버 재시작 중)입니다. 다시 시도해주세요.",
        );
      } else if (err.message && err.message.includes("400 Bad Request")) {
        setFatSecretError(
          "FatSecret 인증 실패 (invalid_client). Client ID / Secret 값이 올바른지 확인해주세요.",
        );
      } else {
        setFatSecretError(`검색 중 오류: ${err.message}`);
      }
      setFatSecretResults([]);
    }
    setIsSearchingFS(false);
  };

  const handleSelectFatSecretResult = (food: ParsedFoodResult) => {
    setActivePreset(null);
    setCustomEmoji(null);
    setIsCustomMode(true); // Entering custom adjustment mode for global food

    setCustomName(
      food.brand_name ? `[${food.brand_name}] ${food.name}` : food.name,
    );
    setCurrentGrams(food.serving_weight_grams);
    setCurrentCalories(food.calories);
    setCurrentCarbs(food.carbs);
    setCurrentProtein(food.protein);
    setCurrentFat(food.fat);

    // Clear search state to go to the UI to adjust values
    setSearchTerm("");
    setFatSecretResults([]);
    setIsDropdownOpen(false);
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
  };

  const handleGramsChange = (newGrams: number) => {
    const oldGrams = currentGrams;
    if (oldGrams <= 0 || newGrams <= 0) {
      setCurrentGrams(newGrams);
      return;
    }
    setCurrentGrams(newGrams);
    const scale = newGrams / oldGrams;

    setCurrentCalories(Math.max(0, Math.round(currentCalories * scale)));
    setCurrentCarbs(Math.max(0, Math.round(currentCarbs * scale)));
    setCurrentProtein(Math.max(0, Math.round(currentProtein * scale)));
    setCurrentFat(Math.max(0, Math.round(currentFat * scale)));
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

    onAddLog({
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
    });

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
                className="text-[10.5px] font-extrabold text-[#64748B] bg-[#F1F5F9] py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#E2E8F0] cursor-pointer transition-all flex items-center justify-center gap-1"
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
              className="flex gap-2 items-center relative"
              ref={searchContainerRef}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder={
                    isFatSecretMode ? "전 세계 음식 검색..." : "로컬 검색"
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full h-10 border border-[#E2E8F0] rounded-xl pl-9 pr-10 bg-[#F8FAFC] focus:bg-white text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] font-[#1E293B]"
                />
                {searchTerm && !isSearchingFS && (
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
                {isSearchingFS && (
                  <div className="absolute right-3 top-3 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}

                {/* FatSecret Dropdown Floating Layer */}
                {isFatSecretMode && isDropdownOpen && searchTerm.trim() && (
                  <div className="absolute top-full left-0 w-full z-50 mt-1">
                    {!/^[a-zA-Z0-9\sㄱ-ㅎㅏ-ㅣ가-힣]*$/.test(
                      searchTerm.trim(),
                    ) ? (
                      <div className="text-center p-4 text-xs text-red-500 bg-white rounded-xl border border-neutral-200 shadow-xl font-bold">
                        한국어, 영어, 숫자만 검색 가능합니다.
                      </div>
                    ) : fatSecretError ? (
                      <div className="text-center p-4 text-xs text-red-500 bg-white rounded-xl border border-neutral-200 shadow-xl font-bold">
                        {fatSecretError}
                      </div>
                    ) : fatSecretResults.length > 0 ? (
                      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white max-h-[300px] overflow-y-auto shadow-xl">
                        {fatSecretResults.map((result, idx) => (
                          <button
                            key={`${result.id}-${idx}`}
                            onClick={() => handleSelectFatSecretResult(result)}
                            className="w-full flex flex-col items-start p-3 border-b border-neutral-100 last:border-0 hover:bg-blue-50 transition-colors text-left"
                          >
                            <p className="text-xs font-bold text-neutral-800">
                              {result.brand_name && (
                                <span className="text-blue-500 mr-1">
                                  [{result.brand_name}]
                                </span>
                              )}
                              {result.name}
                            </p>
                            <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                              {result.serving_desc} • {result.calories}kcal • C:
                              {result.carbs}g P:{result.protein}g F:{result.fat}
                              g
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      !isSearchingFS && (
                        <div className="text-center p-4 text-xs text-neutral-500 bg-white rounded-xl border border-neutral-200 shadow-xl">
                          검색 결과가 없습니다.
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Feature Toggle */}
              <div className="flex items-center gap-1.5 shrink-0 px-1">
                <span
                  className={`text-[10px] font-bold ${isFatSecretMode ? "text-blue-500" : "text-neutral-400"}`}
                >
                  FatSecret
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !isFatSecretMode;
                    setIsFatSecretMode(nextMode);
                    setFatSecretResults([]);
                    setIsDropdownOpen(true);
                  }}
                  className={`w-9 h-5 rounded-full relative transition-colors ${isFatSecretMode ? "bg-blue-500" : "bg-neutral-200"} cursor-pointer`}
                >
                  <div
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ease-in-out ${isFatSecretMode ? "left-[18px]" : "left-[3px]"}`}
                  />
                </button>
              </div>
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
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="flex items-center gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:bg-white hover:border-[#3B82F6] hover:shadow-xs cursor-pointer active:scale-98 transition-all justify-between text-left"
                  id={`preset-${preset.id}`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <div
                      className="flex-shrink-0 w-8 h-8 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-center text-base"
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
                      <p className="text-[9px] sm:text-[9.5px] text-[#64748B] font-mono leading-none">
                        {preset.baseGrams}
                        {preset.servingUnit} · {preset.baseCalories}kcal
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
            </div>
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
                    const newEmoji = window.prompt(
                      "음식 아이콘 이모지를 설정하세요 (예: 🥩, 🍎):",
                      currentIcon,
                    );
                    if (newEmoji && newEmoji.trim().length > 0) {
                      setCustomEmoji(newEmoji.trim().charAt(0));
                    }
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

            <div className="flex flex-col gap-2 mt-1">
              <NumberAdjuster
                value={currentCalories}
                onChange={setCurrentCalories}
                label="에너지"
                unit="kcal"
                min={0}
                max={5000}
                stepDecimal={0}
              />
              <NumberAdjuster
                value={currentCarbs}
                onChange={setCurrentCarbs}
                label="탄수화물"
                unit="g"
                min={0}
                max={500}
                stepDecimal={0}
              />
              <NumberAdjuster
                value={currentProtein}
                onChange={setCurrentProtein}
                label="단백질"
                unit="g"
                min={0}
                max={500}
                stepDecimal={0}
              />
              <NumberAdjuster
                value={currentFat}
                onChange={setCurrentFat}
                label="지방"
                unit="g"
                min={0}
                max={500}
                stepDecimal={0}
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

            {(() => {
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
                <button
                  type="button"
                  onClick={handleSaveMeal}
                  disabled={!activePreset && !customName.trim()}
                  className="w-full h-11 bg-gradient-to-r from-[#0EA5E9] to-[#3B82F6] hover:brightness-105 text-white rounded-xl text-xs font-extrabold mt-2 transition-all active:scale-98 disabled:opacity-50 touch-manipulation cursor-pointer flex items-center justify-center gap-1.5 shadow-md font-bold"
                  id="btn-add-to-diet-submit"
                >
                  <Check className="w-4 h-4 text-white" />
                  {getMealTimeLabel(activeMealTime)} 식단에 추가하기
                </button>
              );
            })()}

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
    </div>
  );
}
