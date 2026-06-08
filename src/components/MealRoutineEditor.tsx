import React, { useState, useEffect } from 'react';
import { MealTime, MealRoutine } from '../types';
import { Plus, Trash2, Save, ShoppingBag, Sunrise, Sun, Moon, Cookie } from 'lucide-react';
import NumberAdjuster from './NumberAdjuster';

interface Props {
  onApplyRoutine: (routine: MealRoutine) => void;
}

export default function MealRoutineEditor({ onApplyRoutine }: Props) {
  const [routines, setRoutines] = useState<MealRoutine[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Routine State
  const [routineName, setRoutineName] = useState('');
  const [targetMeal, setTargetMeal] = useState<MealTime>('breakfast');
  const [currentFoods, setCurrentFoods] = useState<MealRoutine['foods']>([]);
  
  // Quick Add Input
  const [foodName, setFoodName] = useState('');
  const [foodGrams, setFoodGrams] = useState(100);
  const [foodCals, setFoodCals] = useState(0);
  const [foodCarbs, setFoodCarbs] = useState(0);
  const [foodProtein, setFoodProtein] = useState(0);
  const [foodFat, setFoodFat] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('diet_routines');
    if (saved) {
      try {
        setRoutines(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveToCommon = (newRoutines: MealRoutine[]) => {
    setRoutines(newRoutines);
    localStorage.setItem('diet_routines', JSON.stringify(newRoutines));
  };

  const handleCreateNewRoutine = () => {
    if (!routineName.trim() || currentFoods.length === 0) return;
    const newRoutine: MealRoutine = {
      id: Date.now().toString(),
      name: routineName,
      mealTime: targetMeal,
      foods: currentFoods
    };
    saveToCommon([...routines, newRoutine]);
    setIsCreating(false);
    setRoutineName('');
    setCurrentFoods([]);
  };

  const handleDeleteRoutine = (id: string) => {
    saveToCommon(routines.filter(r => r.id !== id));
  };

  const handleAddFoodTemp = () => {
    if (!foodName) return;
    setCurrentFoods([
      ...currentFoods,
      {
        name: foodName,
        grams: foodGrams,
        calories: foodCals,
        carbs: foodCarbs,
        protein: foodProtein,
        fat: foodFat
      }
    ]);
    setFoodName('');
    setFoodGrams(100);
    setFoodCals(0);
    setFoodCarbs(0);
    setFoodProtein(0);
    setFoodFat(0);
  };

  const deleteTempFood = (index: number) => {
    const newF = [...currentFoods];
    newF.splice(index, 1);
    setCurrentFoods(newF);
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs">
        <h2 className="text-sm font-extrabold text-[#1E293B] mb-4">내 식단 루틴 관리</h2>

        {isCreating ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-[#64748B] block mb-1">루틴 이름</label>
              <input
                type="text"
                value={routineName}
                onChange={e => setRoutineName(e.target.value)}
                placeholder="예: 다이어트 아침 정식"
                className="w-full text-xs h-10 border border-[#E2E8F0] rounded-xl px-3 font-semibold focus:border-[#3B82F6] outline-none"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-[#64748B] block mb-1.5">시간대</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'breakfast', label: '아침', icon: '☀️' },
                  { id: 'lunch', label: '점심', icon: '🌤️' },
                  { id: 'dinner', label: '저녁', icon: '🌙' },
                  { id: 'snack', label: '간식', icon: '🍪' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setTargetMeal(m.id as MealTime)}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-colors ${
                      targetMeal === m.id 
                        ? 'border-[#3B82F6] bg-[#EFF6FF] text-[#3B82F6]' 
                        : 'border-[#E2E8F0] text-[#64748B] hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl mb-1">{m.icon}</span>
                    <span className="text-[11px] font-extrabold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] space-y-3 shadow-inner">
              <h3 className="text-xs font-bold text-[#1E293B]">음식 구성품 추가</h3>
              {currentFoods.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {currentFoods.map((f, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-sm">
                      <div>
                        <p className="font-extrabold text-[#1E293B]">{f.name}</p>
                        <p className="text-[10px] text-[#64748B] font-mono mt-0.5">{f.grams}g / {f.calories}kcal</p>
                      </div>
                      <button onClick={() => deleteTempFood(i)} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className="border-t border-[#E2E8F0] pt-2.5 text-[11px] font-bold text-center text-[#64748B]">
                    총 칼로리: <span className="text-[#3B82F6]">{currentFoods.reduce((a, b) => a + b.calories, 0)} kcal</span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="음식명 (ex: 닭가슴살)"
                    value={foodName}
                    onChange={e => setFoodName(e.target.value)}
                    className="flex-1 text-xs h-10 border border-[#E2E8F0] rounded-xl px-3 outline-none focus:border-[#3B82F6] transition-colors"
                  />
                  <input
                    type="number"
                    placeholder="g"
                    value={foodGrams || ''}
                    onChange={e => setFoodGrams(Number(e.target.value))}
                    className="w-16 text-xs h-10 border border-[#E2E8F0] rounded-xl px-2 text-center outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="kcal" value={foodCals || ''} onChange={e => setFoodCals(Number(e.target.value))} className="flex-1 w-0 text-xs h-10 border border-[#E2E8F0] rounded-xl px-3 outline-none focus:border-[#3B82F6]"/>
                  <input type="number" placeholder="탄(g)" value={foodCarbs || ''} onChange={e => setFoodCarbs(Number(e.target.value))} className="w-14 text-xs h-10 border border-[#E2E8F0] text-[#3B82F6] font-bold rounded-xl px-1 text-center outline-none focus:border-[#3B82F6]"/>
                  <input type="number" placeholder="단(g)" value={foodProtein || ''} onChange={e => setFoodProtein(Number(e.target.value))} className="w-14 text-xs h-10 border border-[#E2E8F0] text-emerald-500 font-bold rounded-xl px-1 text-center outline-none focus:border-emerald-500"/>
                  <input type="number" placeholder="지(g)" value={foodFat || ''} onChange={e => setFoodFat(Number(e.target.value))} className="w-14 text-xs h-10 border border-[#E2E8F0] text-rose-500 font-bold rounded-xl px-1 text-center outline-none focus:border-rose-500"/>
                </div>
                <button onClick={handleAddFoodTemp} className="w-full h-10 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors active:scale-95">음식 보관함에 담기</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setIsCreating(false)} className="flex-1 h-10 border border-[#E2E8F0] text-[#64748B] font-bold rounded-xl text-xs">취소</button>
              <button onClick={handleCreateNewRoutine} className="flex-1 h-10 bg-[#3B82F6] text-white font-bold rounded-xl text-xs">루틴 저장</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {routines.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#94A3B8]">
                등록된 식단 루틴이 없습니다.
              </div>
            ) : (
              routines.map(r => (
                <div key={r.id} className="flex flex-col items-center justify-between p-3 border border-[#E2E8F0] dark:border-slate-700 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 hover:border-[#3B82F6] transition-colors relative">
                  <div className="flex w-full justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#1E293B] dark:text-white flex items-center gap-1.5">
                        {r.mealTime === 'breakfast' && <Sunrise className="w-3.5 h-3.5 text-amber-500" />}
                        {r.mealTime === 'lunch' && <Sun className="w-3.5 h-3.5 text-orange-500" />}
                        {r.mealTime === 'dinner' && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                        {r.mealTime === 'snack' && <Cookie className="w-3.5 h-3.5 text-pink-500" />}
                        {r.name}
                      </h4>
                      <p className="text-[10px] text-[#64748B] mt-0.5 font-mono">총 {r.foods.length}종 / {r.foods.reduce((a, b) => a + b.calories, 0)} kcal</p>
                    </div>
                    <button onClick={() => handleDeleteRoutine(r.id)} className="text-[#94A3B8] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <button 
                    onClick={() => onApplyRoutine(r)}
                    className="w-full text-xs bg-[#3B82F6] text-white font-bold h-8 rounded-lg shadow-xs hover:bg-blue-600 active:scale-95 transition-all"
                  >
                    오늘 식단으로 복사하기
                  </button>
                </div>
              ))
            )}
            
            <button
              onClick={() => setIsCreating(true)}
              className="w-full h-10 border-2 border-dashed border-[#E2E8F0] dark:border-slate-700 text-[#3B82F6] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> 새 루틴 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
