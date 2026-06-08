import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { calculateBMR, calculateTDEE, calculateMacros } from '../utils/dietCalculator';
import { Sparkles, User, Dumbbell, Scale, Activity } from 'lucide-react';
import NumberAdjuster from './NumberAdjuster';

interface ProfileFormProps {
  initialProfile?: UserProfile | null;
  onSave: (profile: Omit<UserProfile, 'userId'>) => void;
  isLoading?: boolean;
}

export default function ProfileForm({
  initialProfile,
  onSave,
  isLoading = false
}: ProfileFormProps) {
  // Setup fields with defaults or initial values
  const [displayName, setDisplayName] = useState<string>(() => {
    if (initialProfile?.displayName) return initialProfile.displayName;
    const ADJECTIVES = ['건강한', '날렵한', '꾸준한', '행복한', '멋진', '활기찬', '튼튼한', '가벼운'];
    const NOUNS = ['호랑이', '토끼', '거북이', '코끼리', '사자', '펭귄', '다람쥐', '고양이'];
    const randAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${randAdj} ${randNoun}`;
  });
  const [gender, setGender] = useState<'male' | 'female'>(initialProfile?.gender || 'female');
  const [age, setAge] = useState<number>(initialProfile?.age || 28);
  const [height, setHeight] = useState<number>(initialProfile?.height || 164);
  const [currentWeight, setCurrentWeight] = useState<number>(initialProfile?.currentWeight || 64.0);
  const [targetWeight, setTargetWeight] = useState<number>(initialProfile?.targetWeight || 55.0);
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState<number>(initialProfile?.skeletalMuscleMass || 24.0);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number>(initialProfile?.bodyFatPercentage || 28.0);
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(initialProfile?.activityLevel || 'light');
  const [goalType, setGoalType] = useState<UserProfile['goalType']>(initialProfile?.goalType || 'cut');

  // Manual Macro & Calorie Tracking
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [liveCalories, setLiveCalories] = useState<number>(initialProfile?.targetCalories || 2000);
  const [liveCarbs, setLiveCarbs] = useState<number>(initialProfile?.targetCarbs || 200);
  const [liveProtein, setLiveProtein] = useState<number>(initialProfile?.targetProtein || 150);
  const [liveFat, setLiveFat] = useState<number>(initialProfile?.targetFat || 50);

  // Recalculate auto-values whenever core stats change
  useEffect(() => {
    if (manualMode) return;
    
    // 1. Calculate BMR
    const { bmr } = calculateBMR({
      weight: currentWeight,
      height,
      age,
      gender,
      bodyFatPercentage: bodyFatPercentage > 0 ? bodyFatPercentage : undefined,
      skeletalMuscleMass: skeletalMuscleMass > 0 ? skeletalMuscleMass : undefined
    });

    // 2. Calculate TDEE
    const tdee = calculateTDEE(bmr, activityLevel);

    // 3. Calorie Target by Goal
    let targetCalories = tdee;
    if (goalType === 'cut') {
      targetCalories = tdee - 500;
    } else if (goalType === 'bulk') {
      targetCalories = tdee + 300;
    }

    // Safety margins (Male: 1500, Female: 1200)
    const safetyFloor = gender === 'female' ? 1200 : 1500;
    if (targetCalories < safetyFloor) {
      targetCalories = safetyFloor;
    }

    // 4. Calculate macronutrient goals
    const { carbs, protein, fat } = calculateMacros(targetCalories, goalType, currentWeight);
    
    setLiveCalories(targetCalories);
    setLiveCarbs(carbs);
    setLiveProtein(protein);
    setLiveFat(fat);
  }, [gender, age, height, currentWeight, bodyFatPercentage, skeletalMuscleMass, activityLevel, goalType, manualMode]);

  // Adjust macros helper
  const handleMacroChange = (type: 'carbs'|'protein'|'fat', newVal: number) => {
    let c = liveCarbs, p = liveProtein, f = liveFat;
    if (type === 'carbs') c = newVal;
    if (type === 'protein') p = newVal;
    if (type === 'fat') f = newVal;
    setLiveCarbs(c);
    setLiveProtein(p);
    setLiveFat(f);
    setLiveCalories(Math.round(c * 4 + p * 4 + f * 9));
  };
  
  const handleCaloriesChange = (newVal: number) => {
    setLiveCalories(newVal);
    // Auto-adjust macros proportionally based on current ratios or default ratios
    const totalCurrentSec = liveCarbs * 4 + liveProtein * 4 + liveFat * 9;
    if (totalCurrentSec > 0) {
      setLiveCarbs(Math.round((liveCarbs * 4 / totalCurrentSec) * newVal / 4));
      setLiveProtein(Math.round((liveProtein * 4 / totalCurrentSec) * newVal / 4));
      setLiveFat(Math.round((liveFat * 9 / totalCurrentSec) * newVal / 9));
    }
  };

  const getDietTypeDescription = () => {
    const totalCal = liveCarbs * 4 + liveProtein * 4 + liveFat * 9;
    if (totalCal <= 0) return '설정 오류';
    
    const carbPct = (liveCarbs * 4) / totalCal;
    const proteinPct = (liveProtein * 4) / totalCal;
    const fatPct = (liveFat * 9) / totalCal;

    if (carbPct < 0.20 && fatPct > 0.50) return '🥩 저탄고지 (키토제닉)';
    if (carbPct <= 0.40 && proteinPct >= 0.30) return '💪 저탄수화물 고단백 (감량 추천)';
    if (carbPct >= 0.40 && carbPct <= 0.55 && proteinPct >= 0.20 && proteinPct <= 0.35) return '⚖️ 스탠다드 밸런스 (정석 유지)';
    if (carbPct > 0.55) return '🍚 고탄수화물 (벌크업/강도 높은 운동)';
    return '✨ 맞춤형 커스텀 비율';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let cleanDisplayName = displayName.trim();
    if (!cleanDisplayName) {
      alert("프로필 이름을 입력해주세요.");
      return;
    }

    onSave({
      displayName: cleanDisplayName,
      gender,
      age,
      height,
      currentWeight,
      targetWeight,
      skeletalMuscleMass: skeletalMuscleMass > 0 ? skeletalMuscleMass : undefined,
      bodyFatPercentage: bodyFatPercentage > 0 ? bodyFatPercentage : undefined,
      activityLevel,
      goalType,
      targetCalories: liveCalories,
      targetCarbs: liveCarbs,
      targetProtein: liveProtein,
      targetFat: liveFat,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 bg-white border border-[#E2E8F0] rounded-[24px] shadow-xs">
      <div className="text-center mb-1">
        <div className="mx-auto w-10 h-10 bg-gradient-to-br from-[#0EA5E9] to-[#3B82F6] rounded-xl flex items-center justify-center text-white mb-2 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-base font-extrabold text-[#1E293B] tracking-tight">
          {initialProfile ? '맞춤 프로필 설정' : '맞춤 프로필 설정'}
        </h3>
        <p className="text-xs text-[#64748B] mt-0.5 leading-4">
          나만의 맞춤형 다이어트 식단을 시작해보세요.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile Name */}
        <div>
          <label className="text-xs font-bold text-[#64748B] block mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> 프로필명
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 건강한 토끼"
              className="flex-1 text-xs h-10 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] px-3 font-bold text-[#1E293B] focus:outline-none focus:border-[#3B82F6] touch-manipulation"
              required
            />
            <button
              type="button"
              onClick={() => {
                const ADJECTIVES = ['건강한', '날렵한', '꾸준한', '행복한', '멋진', '활기찬', '튼튼한', '가벼운'];
                const NOUNS = ['호랑이', '토끼', '거북이', '코끼리', '사자', '펭귄', '다람쥐', '고양이'];
                setDisplayName(`${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`);
              }}
              className="px-3 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl whitespace-nowrap transition-colors border border-[#E2E8F0]"
            >
              랜덤생성
            </button>
          </div>
        </div>

        {/* Gender Choice */}
        <div>
          <label className="text-xs font-bold text-[#64748B] block mb-1.5">성별</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`py-2 px-3 h-10 rounded-xl border font-bold text-xs transition-all touch-manipulation cursor-pointer ${
                gender === 'male'
                  ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-xs'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              남성
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`py-2 px-3 h-10 rounded-xl border font-bold text-xs transition-all touch-manipulation cursor-pointer ${
                gender === 'female'
                  ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-xs'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              여성
            </button>
          </div>
        </div>

        {/* Goal Choice */}
        <div>
          <label className="text-xs font-bold text-[#64748B] block mb-1.5">다이어트 지향 목표</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'cut', name: '체지방 감량 다이어트' },
              { id: 'maintain', name: '유지어터' },
              { id: 'bulk', name: '근육량 벌크업' }
            ].map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalType(g.id as any)}
                className={`py-1.5 px-1 rounded-xl border text-center font-bold text-[10.5px] leading-3.5 transition-all h-11 flex items-center justify-center cursor-pointer ${
                  goalType === g.id
                    ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-xs'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Core parameters via Touch UX Number Adjusters */}
        <div className="flex flex-col gap-3 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
          <span className="text-xs font-extrabold text-[#1E293B] flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-[#64748B]" /> 기본 신체 정보
          </span>
          
          <NumberAdjuster
            value={age}
            onChange={setAge}
            label="나이"
            unit="세"
            min={15}
            max={100}
            stepDecimal={0}
          />

          <NumberAdjuster
            value={height}
            onChange={setHeight}
            label="신장 (키)"
            unit="cm"
            min={100}
            max={230}
            stepDecimal={0}
          />
        </div>

        {/* Weight Parameters */}
        <div className="flex flex-col gap-3 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
          <span className="text-xs font-extrabold text-[#1E293B] flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-[#64748B]" /> 인바디/체성분 정보
          </span>

          <NumberAdjuster
            value={currentWeight}
            onChange={setCurrentWeight}
            label="현재 무게"
            unit="kg"
            min={30}
            max={200}
            stepDecimal={1}
          />

          <NumberAdjuster
            value={targetWeight}
            onChange={setTargetWeight}
            label="목표 무게"
            unit="kg"
            min={30}
            max={200}
            stepDecimal={1}
          />

          <NumberAdjuster
            value={skeletalMuscleMass}
            onChange={setSkeletalMuscleMass}
            label="골격근량"
            unit="kg"
            min={0}
            max={100}
            stepDecimal={1}
          />

          <NumberAdjuster
            value={bodyFatPercentage}
            onChange={setBodyFatPercentage}
            label="체지방률"
            unit="%"
            min={0}
            max={60}
            stepDecimal={1}
          />
        </div>

        {/* Activity Level Selector */}
        <div>
          <label className="text-xs font-bold text-[#64748B] flex items-center gap-1 mb-1.5">
            <Activity className="w-3.5 h-3.5 text-[#94A3B8]" /> 일상 생활 및 활동 지수 선택
          </label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as any)}
            className="w-full text-xs h-10 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] px-3 font-semibold text-[#1E293B] focus:outline-none focus:border-[#3B82F6] touch-manipulation cursor-pointer"
          >
            <option value="sedentary">비활동적 (사무직업, 숨쉬기만 실시 - TDEE x1.2)</option>
            <option value="light">가벼운 활동 (생활 운동 주 1~3회 - TDEE x1.375)</option>
            <option value="moderate">보통의 활동 (근력 훈련 주 3~5회 - TDEE x1.55)</option>
            <option value="active">격렬한 활동 (매일 스포츠 연습, 강도 높음 - TDEE x1.725)</option>
            <option value="very_active">초인적 활동 (선수권 대비, 건설 현장 중노동 - TDEE x1.9)</option>
          </select>
        </div>

        {/* Real-time Macros View & Editing */}
        <div className="flex flex-col gap-3 bg-[#EFF6FF] p-4 rounded-2xl border border-[#DBEAFE] mt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-[#1E293B] flex items-center gap-1">
              영양 목표 세부 설정
            </span>
            <button
              type="button"
              onClick={() => setManualMode(!manualMode)}
              className="text-[10px] font-bold text-[#3B82F6] hover:underline cursor-pointer"
            >
              {manualMode ? '자동 계산으로 복귀' : '직접 커스텀하기'}
            </button>
          </div>
          
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
            <span>현재 설정 다이어트 타입: </span>
            <span className="text-[#3B82F6] font-extrabold pl-2 text-right break-words">{getDietTypeDescription()}</span>
          </div>

          {!manualMode ? (
            <div className="text-center font-mono font-black text-2xl text-[#1E293B] py-2">
              {liveCalories} <span className="text-sm font-bold text-[#64748B] font-sans">kcal</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#64748B]">목표 칼로리:</label>
              <input 
                type="number"
                value={liveCalories}
                onChange={(e) => handleCaloriesChange(Number(e.target.value))}
                className="w-full text-right font-mono font-black text-lg text-[#1E293B] h-10 border border-[#DBEAFE] rounded-xl px-3 bg-white focus:outline-none focus:border-[#3B82F6]"
              />
              <span className="text-xs font-bold text-[#64748B]">kcal</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded-xl text-center flex flex-col items-center border ${manualMode ? 'bg-[#F8FAFC] border-[#DBEAFE]' : 'bg-white border-[#E2E8F0]'}`}>
              <span className="text-[10px] text-[#64748B] font-bold">탄수화물 (g)</span>
              {manualMode ? (
                <input 
                  type="number" 
                  value={liveCarbs} 
                  onChange={(e) => handleMacroChange('carbs', Number(e.target.value))}
                  className="w-full text-center text-[#3B82F6] font-extrabold text-sm mt-1 outline-none font-mono bg-transparent" 
                />
              ) : (
                <span className="text-sm font-extrabold text-[#3B82F6] font-mono mt-1">{liveCarbs}</span>
              )}
            </div>
            <div className={`p-2 rounded-xl text-center flex flex-col items-center border ${manualMode ? 'bg-[#F8FAFC] border-[#DBEAFE]' : 'bg-white border-[#E2E8F0]'}`}>
              <span className="text-[10px] text-[#64748B] font-bold">단백질 (g)</span>
              {manualMode ? (
                <input 
                  type="number" 
                  value={liveProtein} 
                  onChange={(e) => handleMacroChange('protein', Number(e.target.value))}
                  className="w-full text-center text-[#10B981] font-extrabold text-sm mt-1 outline-none font-mono bg-transparent" 
                />
              ) : (
                <span className="text-sm font-extrabold text-[#10B981] font-mono mt-1">{liveProtein}</span>
              )}
            </div>
            <div className={`p-2 rounded-xl text-center flex flex-col items-center border ${manualMode ? 'bg-[#F8FAFC] border-[#DBEAFE]' : 'bg-white border-[#E2E8F0]'}`}>
              <span className="text-[10px] text-[#64748B] font-bold">지방 (g)</span>
              {manualMode ? (
                <input 
                  type="number" 
                  value={liveFat} 
                  onChange={(e) => handleMacroChange('fat', Number(e.target.value))}
                  className="w-full text-center text-[#F43F5E] font-extrabold text-sm mt-1 outline-none font-mono bg-transparent" 
                />
              ) : (
                <span className="text-sm font-extrabold text-[#F43F5E] font-mono mt-1">{liveFat}</span>
              )}
            </div>
          </div>
        </div>

      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 bg-gradient-to-r from-[#0EA5E9] to-[#3B82F6] text-white text-xs font-extrabold rounded-xl hover:brightness-105 active:scale-98 transition-all disabled:opacity-50 touch-manipulation shadow-md flex items-center justify-center cursor-pointer mt-2"
        id="btn-save-profile"
      >
        {isLoading ? '처리 중...' : '프로필 만들기'}
      </button>
    </form>
  );
}
