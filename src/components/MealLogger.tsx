import React, { useState } from 'react';
import { FOOD_PRESETS, CATEGORY_LABELS } from '../data/foodPresets';
import { FoodPreset, FoodLog } from '../types';
import NumberAdjuster from './NumberAdjuster';
import { Search, Plus, Sparkles, X, ChevronRight, Check } from 'lucide-react';

interface MealLoggerProps {
  onAddLog: (log: Omit<FoodLog, 'userId'>) => void;
  dateStr: string;
}

export default function MealLogger({ onAddLog, dateStr }: MealLoggerProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePreset, setActivePreset] = useState<FoodPreset | null>(null);
  
  // Custom Food state or active adjustments
  const [customName, setCustomName] = useState<string>('');
  const [currentGrams, setCurrentGrams] = useState<number>(100);
  const [currentCalories, setCurrentCalories] = useState<number>(120);
  const [currentCarbs, setCurrentCarbs] = useState<number>(0);
  const [currentProtein, setCurrentProtein] = useState<number>(26);
  const [currentFat, setCurrentFat] = useState<number>(1.5);

  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Filter presets based on category and search
  const filteredPresets = FOOD_PRESETS.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectPreset = (preset: FoodPreset) => {
    setActivePreset(preset);
    setIsCustomMode(false);
    // Initialize adjustment weights relative to baseGrams (usually 100g)
    setCurrentGrams(preset.baseGrams);
    setCurrentCalories(preset.baseCalories);
    setCurrentCarbs(preset.baseCarbs);
    setCurrentProtein(preset.baseProtein);
    setCurrentFat(preset.baseFat);
  };

  const handleGramsChange = (newGrams: number) => {
    if (!activePreset) return;
    setCurrentGrams(newGrams);
    // Scale macros proportionally
    const scale = newGrams / activePreset.baseGrams;
    setCurrentCalories(Math.round(activePreset.baseCalories * scale));
    setCurrentCarbs(Math.round(activePreset.baseCarbs * scale * 10) / 10);
    setCurrentProtein(Math.round(activePreset.baseProtein * scale * 10) / 10);
    setCurrentFat(Math.round(activePreset.baseFat * scale * 10) / 10);
  };

  const handleInitializeCustom = () => {
    setActivePreset(null);
    setIsCustomMode(true);
    setCustomName('');
    setCurrentGrams(100);
    setCurrentCalories(100);
    setCurrentCarbs(15);
    setCurrentProtein(5);
    setCurrentFat(2);
  };

  const handleSaveMeal = () => {
    const name = activePreset ? activePreset.name : customName.trim() || '일반 건강식';
    const category = activePreset ? activePreset.category : 'custom';

    onAddLog({
      dateStr,
      name,
      category,
      grams: currentGrams,
      calories: currentCalories,
      carbs: currentCarbs,
      protein: currentProtein,
      fat: currentFat,
      createdAt: new Date().toISOString()
    });

    // Close drawers/panels
    setActivePreset(null);
    setIsCustomMode(false);
    setSearchTerm('');
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs">
      {!activePreset && !isCustomMode ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#1E293B]">식단 신속 추가</h3>
            <button
              onClick={handleInitializeCustom}
              className="text-[11px] font-extrabold text-[#3B82F6] bg-[#EFF6FF] px-2.5 py-1 rounded-lg border border-[#DBEAFE] hover:bg-[#DBEAFE]/50 cursor-pointer transition-all"
              id="btn-custom-meal"
            >
              ✨ 직접 기입 등록
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="음식 카테고리 기입 또는 속성 필터..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 border border-[#E2E8F0] rounded-xl pl-9 pr-4 bg-[#F8FAFC] focus:bg-white text-xs text-[#1E293B] focus:outline-none focus:border-[#3B82F6] font-[#1E293B]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 p-0.5 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Horizontal Category Pill Selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrolls-none -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              전체 보기
            </button>
            {Object.entries(CATEGORY_LABELS)
              .filter(([key]) => key !== 'custom')
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    selectedCategory === key
                      ? 'bg-[#3B82F6] text-white shadow-xs'
                      : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {label}
                </button>
              ))}
          </div>

          {/* Food Presets Click Grid (Zero photorealism, high touch contrast) */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="flex items-center gap-2.5 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:bg-white hover:border-[#3B82F6] hover:shadow-xs cursor-pointer active:scale-98 transition-all justify-between text-left"
                id={`preset-${preset.id}`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-center text-base" id={`icon-cnt-${preset.id}`}>
                    {preset.category === 'meat' ? '🍖' :
                     preset.category === 'fish' ? '🐟' :
                     preset.category === 'carbs' ? '🍠' :
                     preset.category === 'veg' ? '🥗' :
                     preset.category === 'dairy' ? '🥛' :
                     preset.category === 'nuts' ? '🥑' : '🥤'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold text-[#1E293B] tracking-tight truncate">{preset.name}</p>
                    <p className="text-[9px] text-[#64748B] font-mono mt-0.5">
                      {preset.baseGrams}{preset.servingUnit} / {preset.baseCalories}kcal
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] mr-0.5 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Adjust Details Frame */
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-250">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
            <div className="flex items-center gap-1.5 w-full justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">
                  {activePreset ? (
                    activePreset.category === 'meat' ? '🍖' :
                    activePreset.category === 'fish' ? '🐟' :
                    activePreset.category === 'carbs' ? '🍠' :
                    activePreset.category === 'veg' ? '🥗' :
                    activePreset.category === 'dairy' ? '🥛' :
                    activePreset.category === 'nuts' ? '🥑' : '🥤'
                  ) : '✨'}
                </span>
                <span className="text-xs font-black text-[#1E293B]">
                  {activePreset ? `${activePreset.name} 정밀 영양 정보 조정` : '음식 신규 수작업 추가'}
                </span>
              </div>
              <button
                onClick={() => {
                  setActivePreset(null);
                  setIsCustomMode(false);
                }}
                className="p-1 text-neutral-400 hover:text-[#1E293B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!activePreset && (
              <div>
                <label className="text-[10px] font-extrabold text-[#64748B] block mb-1">식품 명칭</label>
                <input
                  type="text"
                  placeholder="예: 편의점 단백질 치킨롤"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full h-10 border border-[#E2E8F0] rounded-xl px-3 bg-[#F8FAFC] text-xs focus:outline-none focus:border-[#3B82F6] font-[#1E293B]"
                />
              </div>
            )}

            {/* Mass Adjuster */}
            <NumberAdjuster
              value={currentGrams}
              onChange={activePreset ? handleGramsChange : setCurrentGrams}
              label={activePreset ? `중량 (${activePreset.servingUnit === 'g' ? '그램 수' : '개수/회수'})` : '전체 중량 (g)'}
              unit={activePreset ? activePreset.servingUnit : 'g'}
              min={1}
              max={2000}
              stepDecimal={0}
            />

            <div className="grid grid-cols-2 gap-2 mt-1">
              <NumberAdjuster
                value={currentCalories}
                onChange={setCurrentCalories}
                label="에너지 (열량)"
                unit="kcal"
                min={0}
                max={5000}
                stepDecimal={0}
              />
              <NumberAdjuster
                value={currentCarbs}
                onChange={setCurrentCarbs}
                label="탄수화물 (C)"
                unit="g"
                min={0}
                max={500}
                stepDecimal={1}
              />
              <NumberAdjuster
                value={currentProtein}
                onChange={setCurrentProtein}
                label="단백질 (P)"
                unit="g"
                min={0}
                max={500}
                stepDecimal={1}
              />
              <NumberAdjuster
                value={currentFat}
                onChange={setCurrentFat}
                label="지방 (F)"
                unit="g"
                min={0}
                max={500}
                stepDecimal={1}
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 mt-1.5">
              <p className="text-[10px] font-extrabold text-[#64748B] block mb-2 tracking-tight">🔎 예상 실시간 칼로리 배율 (영양 밸런스)</p>
              <div className="flex gap-3 justify-between items-center text-xs font-mono text-neutral-700">
                <div className="text-center flex-1 py-1 bg-white border border-[#E2E8F0] rounded-lg">
                  <p className="text-[9px] text-[#64748B] font-sans font-bold">탄수화물</p>
                  <p className="font-extrabold mt-0.5 text-blue-500">{Math.round(currentCarbs * 4)} kcal</p>
                </div>
                <div className="text-center flex-1 py-1 bg-white border border-[#E2E8F0] rounded-lg">
                  <p className="text-[9px] text-[#64748B] font-sans font-bold">단백질</p>
                  <p className="font-extrabold mt-0.5 text-emerald-500">{Math.round(currentProtein * 4)} kcal</p>
                </div>
                <div className="text-center flex-1 py-1 bg-white border border-[#E2E8F0] rounded-lg">
                  <p className="text-[9px] text-[#64748B] font-sans font-bold">지방</p>
                  <p className="font-extrabold mt-0.5 text-red-500">{Math.round(currentFat * 9)} kcal</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveMeal}
              disabled={!activePreset && !customName.trim()}
              className="w-full h-11 bg-gradient-to-r from-[#0EA5E9] to-[#3B82F6] hover:brightness-105 text-white rounded-xl text-xs font-extrabold mt-2 transition-all active:scale-98 disabled:opacity-50 touch-manipulation cursor-pointer flex items-center justify-center gap-1.5 shadow-md font-bold"
              id="btn-add-to-diet-submit"
            >
              <Check className="w-4 h-4 text-white" />
              오늘 식단에 추가하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
