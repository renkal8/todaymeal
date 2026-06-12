import React, { useState, useEffect, useRef } from "react";
import { MealTime, MealRoutine, FoodPreset } from "../types";
import { useDragScroll } from "../utils/useDragScroll";
import { getEmojiForFoodName } from "../utils/emojiHelper";
import {
  Plus,
  Trash2,
  Sunrise,
  Sun,
  Moon,
  Cookie,
  Search,
  X,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import NumberAdjuster from "./NumberAdjuster";
import { FOOD_PRESETS, CATEGORY_LABELS } from "../data/foodPresets";
import { searchFoodAPI, ParsedFoodResult } from "../services/fatsecretApi";
import { dbService } from "../services/dbService";

interface Props {
  userId?: string;
  onApplyRoutine: (routine: MealRoutine) => void;
}

export default function MealRoutineEditor({ userId, onApplyRoutine }: Props) {
  const [routines, setRoutines] = useState<MealRoutine[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);

  // New Routine State
  const [routineName, setRoutineName] = useState("");
  const [targetMeal, setTargetMeal] = useState<MealTime>("breakfast");
  const [currentFoods, setCurrentFoods] = useState<MealRoutine["foods"]>([]);

  // Custom Food state or active adjustments
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const categoryScroll = useDragScroll();
  const [activePreset, setActivePreset] = useState<FoodPreset | null>(null);

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
  const [fatSecretError, setFatSecretError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter presets based on category and search
  const filteredPresets = FOOD_PRESETS.filter((p) => {
    let matchesCategory = false;
    if (selectedCategory === "all") {
      matchesCategory = true;
    } else if (selectedCategory === "carbs") {
      matchesCategory = p.category === "carbs" || p.category === "bread";
    } else if (selectedCategory === "meat") {
      matchesCategory = ["beef", "pork", "meat_etc", "chicken_egg"].includes(
        p.category,
      );
    } else {
      matchesCategory = p.category === selectedCategory;
    }
    const matchesSearch = isFatSecretMode
      ? true
      : p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (!userId) return;
    const fetchRoutines = async () => {
      try {
        const data = await dbService.getMealRoutines(userId);
        setRoutines(data);
      } catch (e) {
        console.error("Failed to load routines inside editor", e);
      }
    };
    fetchRoutines();
  }, [userId]);

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
        setFatSecretError("네트워크 오류입니다. 다시 시도해주세요.");
      } else if (err.message && err.message.includes("400 Bad Request")) {
        setFatSecretError(
          "FatSecret 인증 실패. API 자격 증명을 확인해 주세요.",
        );
      } else {
        setFatSecretError(`검색 오류: ${err.message}`);
      }
      setFatSecretResults([]);
    }
    setIsSearchingFS(false);
  };

  const handleSelectFatSecretResult = (food: ParsedFoodResult) => {
    setActivePreset(null);
    setIsCustomMode(true);

    setCustomName(
      food.brand_name ? `[${food.brand_name}] ${food.name}` : food.name,
    );
    setCurrentGrams(food.serving_weight_grams);
    setCurrentCalories(food.calories);
    setCurrentCarbs(food.carbs);
    setCurrentProtein(food.protein);
    setCurrentFat(food.fat);

    setSearchTerm("");
    setFatSecretResults([]);
    setIsDropdownOpen(false);
  };

  const handleSelectPreset = (preset: FoodPreset) => {
    setActivePreset(preset);
    setIsCustomMode(false);
    setCurrentGrams(preset.baseGrams);
    setCurrentCalories(preset.baseCalories);
    setCurrentCarbs(preset.baseCarbs);
    setCurrentProtein(preset.baseProtein);
    setCurrentFat(preset.baseFat);
  };

  const handleGramsChange = (newGrams: number) => {
    if (!activePreset) return;
    setCurrentGrams(newGrams);
    const scale = newGrams / activePreset.baseGrams;
    setCurrentCalories(Math.round(activePreset.baseCalories * scale));
    setCurrentCarbs(Math.round(activePreset.baseCarbs * scale * 10) / 10);
    setCurrentProtein(Math.round(activePreset.baseProtein * scale * 10) / 10);
    setCurrentFat(Math.round(activePreset.baseFat * scale * 10) / 10);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveToCommon = async (newRoutines: MealRoutine[]) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (userId) {
        await dbService.saveMealRoutines(userId, newRoutines);
      } else {
        localStorage.setItem("diet_routines", JSON.stringify(newRoutines));
      }
      setRoutines(newRoutines); // 저장 성공 후에만 상태 업데이트
      return true;
    } catch (e) {
      console.error("루틴 저장 실패:", e);
      setSaveError("저장에 실패했습니다. 다시 시도해주세요.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim() || currentFoods.length === 0) return;
    
    let success = false;
    if (editingRoutineId) {
      const updated = routines.map(r => r.id === editingRoutineId ? {
        ...r,
        name: routineName,
        mealTime: targetMeal,
        foods: currentFoods,
      } : r);
      success = await saveToCommon(updated);
    } else {
      const newRoutine: MealRoutine = {
        id: Date.now().toString(),
        name: routineName,
        mealTime: targetMeal,
        foods: currentFoods,
      };
      success = await saveToCommon([...routines, newRoutine]);
    }

    // 저장 성공 시에만 폼 닫기
    if (success) {
      setIsCreating(false);
      setEditingRoutineId(null);
      setRoutineName("");
      setCurrentFoods([]);
    }
  };

  const startEditing = (routine: MealRoutine) => {
    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setTargetMeal(routine.mealTime);
    setCurrentFoods([...routine.foods]);
    setIsCreating(true);
  };

  const handleDeleteRoutine = (id: string) => {
    saveToCommon(routines.filter((r) => r.id !== id));
  };

  const handleAddFoodTemp = () => {
    const name = activePreset
      ? activePreset.name
      : customName.trim() || "일반 건강식";
    const icon = activePreset ? activePreset.icon : getEmojiForFoodName(name);
    setCurrentFoods([
      ...currentFoods,
      {
        name,
        icon,
        grams: currentGrams,
        calories: currentCalories,
        carbs: currentCarbs,
        protein: currentProtein,
        fat: currentFat,
      },
    ]);

    // Reset back to selection view
    setActivePreset(null);
    setIsCustomMode(false);
    setSearchTerm("");
    setCustomName("");
  };

  const deleteTempFood = (index: number) => {
    const newF = [...currentFoods];
    newF.splice(index, 1);
    setCurrentFoods(newF);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs">
        <h2 className="text-sm font-extrabold text-[#1E293B] mb-4">
          내 식단 루틴 관리
        </h2>

        {isCreating ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-[#64748B] block mb-1">
                루틴 이름
              </label>
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="예: 다이어트 아침 정식"
                className="w-full text-xs h-10 border border-[#E2E8F0] rounded-xl px-3 font-semibold focus:border-[#3B82F6] outline-none bg-[#F8FAFC]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#64748B] block mb-1.5">
                시간대
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "breakfast", label: "아침", icon: "☀️" },
                  { id: "lunch", label: "점심", icon: "🌤️" },
                  { id: "dinner", label: "저녁", icon: "🌙" },
                  { id: "snack", label: "간식", icon: "🍪" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTargetMeal(m.id as MealTime)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-colors cursor-pointer ${
                      targetMeal === m.id
                        ? "border-[#3B82F6] bg-[#EFF6FF] text-[#3B82F6]"
                        : "border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl mb-1">{m.icon}</span>
                    <span className="text-[11px] font-extrabold">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] space-y-3 shadow-inner">
              <h3 className="text-xs font-bold text-[#1E293B]">음식 추가</h3>
              {currentFoods.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {currentFoods.map((f, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-sm animate-in fade-in duration-200"
                    >
                      <div>
                        <p className="font-extrabold text-[#1E293B]">
                          {f.name}
                        </p>
                        <p className="text-[10px] text-[#64748B] font-mono mt-0.5">
                          {f.grams}g / {f.calories}kcal • 탄:{f.carbs}g 단:
                          {f.protein}g 지:{f.fat}g
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTempFood(i)}
                        className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-[#E2E8F0] pt-2.5 text-[11px] font-bold text-center text-[#64748B]">
                    총 칼로리:{" "}
                    <span className="text-[#3B82F6]">
                      {currentFoods.reduce((a, b) => a + b.calories, 0)} kcal
                    </span>
                  </div>
                </div>
              )}

              {!activePreset && !isCustomMode ? (
                // Selector / Search area
                <div className="flex flex-col gap-3 pt-1 border-t border-[#E2E8F0]/60">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-[#64748B]">
                      새 구성품 선택
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreset(null);
                        setIsCustomMode(true);
                        setCustomName("");
                        setCurrentGrams(100);
                        setCurrentCalories(100);
                        setCurrentCarbs(15);
                        setCurrentProtein(5);
                        setCurrentFat(2);
                      }}
                      className="text-[10px] font-extrabold text-[#3B82F6] bg-[#EFF6FF] px-2 py-0.5 rounded-md border border-[#DBEAFE] hover:bg-[#DBEAFE]/50 transition-all cursor-pointer"
                    >
                      ✨ 직접입력
                    </button>
                  </div>

                  <div
                    className="flex gap-2 items-center relative"
                    ref={searchContainerRef}
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-neutral-400" />
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
                        className="w-full h-10 border border-[#E2E8F0] rounded-xl pl-9 pr-10 bg-white text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6]"
                      />
                      {searchTerm && !isSearchingFS && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setIsDropdownOpen(false);
                          }}
                          className="absolute right-3 top-3 p-0 text-neutral-400 hover:text-neutral-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSearchingFS && (
                        <div className="absolute right-3 top-3 text-blue-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </div>
                      )}

                      {/* FatSecret Dropdown Floating Layer */}
                      {isFatSecretMode &&
                        isDropdownOpen &&
                        searchTerm.trim() && (
                          <div className="absolute top-full left-0 w-full z-50 mt-1 max-h-[220px] overflow-y-auto border border-neutral-200 rounded-xl bg-white shadow-xl">
                            {!/^[a-zA-Z0-9\sㄱ-ㅎㅏ-ㅣ가-힣]*$/.test(
                              searchTerm.trim(),
                            ) ? (
                              <div className="text-center p-3 text-[11px] text-red-500 font-bold">
                                한국어, 영어, 숫자만 검색 가능합니다.
                              </div>
                            ) : fatSecretError ? (
                              <div className="text-center p-3 text-[11px] text-red-500 font-bold">
                                {fatSecretError}
                              </div>
                            ) : fatSecretResults.length > 0 ? (
                              <div className="flex flex-col">
                                {fatSecretResults.map((result, idx) => (
                                  <button
                                    key={`${result.id}-${idx}`}
                                    type="button"
                                    onClick={() =>
                                      handleSelectFatSecretResult(result)
                                    }
                                    className="w-full flex flex-col items-start p-2.5 border-b border-neutral-100 last:border-0 hover:bg-blue-50 transition-colors text-left cursor-pointer"
                                  >
                                    <p className="text-[11px] font-bold text-neutral-800">
                                      {result.brand_name && (
                                        <span className="text-blue-500 mr-1">
                                          [{result.brand_name}]
                                        </span>
                                      )}
                                      {result.name}
                                    </p>
                                    <p className="text-[9px] text-neutral-500 mt-0.5 font-mono">
                                      {result.serving_desc} • {result.calories}
                                      kcal • C:{result.carbs}g P:
                                      {result.protein}g F:{result.fat}g
                                    </p>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              !isSearchingFS && (
                                <div className="text-center p-3 text-[11px] text-neutral-500">
                                  검색 결과가 없습니다.
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </div>

                    {/* FatSecret Toggle Switch */}
                    <div className="flex items-center gap-1 shrink-0 bg-white border border-[#E2E8F0] px-2 py-2 rounded-xl">
                      <span
                        className={`text-[9px] font-bold ${isFatSecretMode ? "text-blue-500" : "text-neutral-400"}`}
                      >
                        FS
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsFatSecretMode(!isFatSecretMode);
                          setSearchTerm("");
                          setFatSecretResults([]);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-7 h-4 rounded-full relative transition-colors ${isFatSecretMode ? "bg-blue-500" : "bg-neutral-200"} cursor-pointer`}
                      >
                        <div
                          className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[3px] transition-all duration-200 ease-in-out ${isFatSecretMode ? "left-[15px]" : "left-[3px]"}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Category Pill Selector */}
                  <div
                    className="flex gap-1 overflow-x-auto pb-1 scrolls-none cursor-grab active:cursor-grabbing select-none"
                    ref={categoryScroll.scrollRef}
                    {...categoryScroll.handlers}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (categoryScroll.dragMoved) return;
                        setSelectedCategory("all");
                      }}
                      className={`flex-shrink-0 whitespace-nowrap text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                        selectedCategory === "all"
                          ? "bg-[#3B82F6] text-white shadow-xs"
                          : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
                      }`}
                    >
                      전체 보기
                    </button>
                    {Object.entries(CATEGORY_LABELS)
                      .filter(([key]) => key !== "custom")
                      .map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (categoryScroll.dragMoved) return;
                            setSelectedCategory(key);
                          }}
                          className={`flex-shrink-0 whitespace-nowrap text-[10px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                            selectedCategory === key
                              ? "bg-[#3B82F6] text-white shadow-xs"
                              : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-slate-50"
                          }`}
                        >
                          {label.split(" ")[1] || label}
                        </button>
                      ))}
                  </div>

                  {/* Preset Grid List */}
                  <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                    {filteredPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="flex items-center gap-1.5 p-1.5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#3B82F6] transition-all text-left truncate cursor-pointer"
                      >
                        <span className="text-sm bg-slate-50 border border-[#E2E8F0] w-6 h-6 flex items-center justify-center rounded">
                          {preset.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-neutral-800 truncate">
                            {preset.name}
                          </p>
                          <p className="text-[8px] text-neutral-500 font-mono">
                            {preset.baseGrams}g / {preset.baseCalories}kcal
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Adjuster / Fine-tuning block
                <div className="flex flex-col gap-3 border-t border-[#E2E8F0]/60 pt-3 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-1.5">
                    <span className="text-[11px] font-black text-[#1E293B] flex items-center gap-1">
                      <span>
                        {activePreset
                          ? activePreset.icon
                          : getEmojiForFoodName(customName)}
                      </span>
                      <span>
                        {activePreset
                          ? `${activePreset.name} 세부 구성 조정`
                          : "직접 직접 입력"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePreset(null);
                        setIsCustomMode(false);
                      }}
                      className="text-neutral-400 hover:text-neutral-600 text-[11px] font-semibold cursor-pointer"
                    >
                      취소
                    </button>
                  </div>

                  {!activePreset && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B]">
                        식품명
                      </label>
                      <input
                        type="text"
                        placeholder="음식명 (ex: 닭가슴살 볶음)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full text-xs h-9 border border-[#E2E8F0] bg-white rounded-xl px-3 outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                  )}

                  <NumberAdjuster
                    value={currentGrams}
                    onChange={
                      activePreset ? handleGramsChange : setCurrentGrams
                    }
                    label="량 (Amount)"
                    unit={activePreset ? activePreset.servingUnit : "g"}
                    min={1}
                    max={2000}
                    stepDecimal={0}
                  />

                  <div className="grid grid-cols-2 gap-2">
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
                      stepDecimal={1}
                    />
                    <NumberAdjuster
                      value={currentProtein}
                      onChange={setCurrentProtein}
                      label="단백질"
                      unit="g"
                      min={0}
                      max={500}
                      stepDecimal={1}
                    />
                    <NumberAdjuster
                      value={currentFat}
                      onChange={setCurrentFat}
                      label="지방"
                      unit="g"
                      min={0}
                      max={500}
                      stepDecimal={1}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFoodTemp}
                    disabled={!activePreset && !customName.trim()}
                    className="w-full h-10 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> 음식 담기
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingRoutineId(null);
                  }}
                  className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-50"
                  disabled={isSaving}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoutine}
                  disabled={!routineName.trim() || currentFoods.length === 0 || isSaving}
                  className="flex-1 h-10 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-55 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      저장 중...
                    </>
                  ) : editingRoutineId ? (
                    "루틴 수정완료"
                  ) : (
                    "루틴 생성"
                  )}
                </button>
              </div>
              {saveError && (
                <p className="text-[11px] text-red-500 text-center font-bold mt-1">
                  {saveError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {routines.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#94A3B8]">
                등록된 식단 루틴이 없습니다.
              </div>
            ) : (
              routines.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col items-center justify-between p-3.5 border border-[#E2E8F0] dark:border-slate-700 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 hover:border-[#3B82F6] transition-colors relative"
                >
                  <div className="flex w-full justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#1E293B] dark:text-white flex items-center gap-1.5">
                        {r.mealTime === "breakfast" && (
                          <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        {r.mealTime === "lunch" && (
                          <Sun className="w-3.5 h-3.5 text-orange-500" />
                        )}
                        {r.mealTime === "dinner" && (
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        {r.mealTime === "snack" && (
                          <Cookie className="w-3.5 h-3.5 text-pink-500" />
                        )}
                        {r.name}
                      </h4>
                      <p className="text-[10px] text-[#64748B] mt-0.5 font-mono">
                        총 {r.foods.length}종 /{" "}
                        {r.foods.reduce((a, b) => a + b.calories, 0)} kcal
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEditing(r)}
                        className="text-[#94A3B8] hover:text-blue-500 p-1"
                      >
                        <span className="text-xs">✏️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(r.id)}
                        className="text-[#94A3B8] hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyRoutine(r)}
                    className="w-full text-xs bg-[#3B82F6] text-white font-bold h-8 rounded-lg shadow-xs hover:bg-blue-600 active:scale-95 transition-all cursor-pointer"
                  >
                    오늘 식단으로 복사하기
                  </button>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setRoutineName("");
                setCurrentFoods([]);
                setActivePreset(null);
                setIsCustomMode(false);
                setSearchTerm("");
              }}
              className="w-full h-10 border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 text-[#3B82F6] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 새 루틴 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
