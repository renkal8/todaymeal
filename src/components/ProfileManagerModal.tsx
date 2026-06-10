import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { dbService } from "../services/dbService";
import { calculateBMR, calculateTDEE, calculateMacros } from "../utils/dietCalculator";
import { X, Plus, Trash2, Edit2, Check, User, Sparkles } from "lucide-react";

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  mainProfile: UserProfile | null;
  subProfiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onRefreshProfiles: () => Promise<void> | void;
  showToast: (msg: string) => void;
}

export default function ProfileManagerModal({
  isOpen,
  onClose,
  userId,
  mainProfile,
  subProfiles,
  activeProfileId,
  onSelectProfile,
  onRefreshProfiles,
  showToast,
}: ProfileManagerModalProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingSubProfileId, setEditingSubProfileId] = useState<string | null>(null);

  // Form Fields
  const [displayName, setDisplayName] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [age, setAge] = useState<number>(28);
  const [height, setHeight] = useState<number>(164);
  const [currentWeight, setCurrentWeight] = useState<number>(64.0);
  const [targetWeight, setTargetWeight] = useState<number>(55.0);
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState<number>(24.0);
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number>(28.0);
  const [activityLevel, setActivityLevel] = useState<UserProfile["activityLevel"]>("light");
  const [goalType, setGoalType] = useState<UserProfile["goalType"]>("cut");
  const [weeklyWeightLossTarget, setWeeklyWeightLossTarget] = useState<number>(500);
  const [dietDurationWeeks, setDietDurationWeeks] = useState<number>(8);
  
  const [saving, setSaving] = useState(false);

  // Reset form to defaults
  const resetForm = () => {
    setDisplayName("");
    setGender("female");
    setAge(28);
    setHeight(164);
    setCurrentWeight(64.0);
    setTargetWeight(55.0);
    setSkeletalMuscleMass(24.0);
    setBodyFatPercentage(28.0);
    setActivityLevel("light");
    setGoalType("cut");
    setWeeklyWeightLossTarget(500);
    setDietDurationWeeks(8);
    setEditingSubProfileId(null);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    const ADJECTIVES = ["건강한", "날렵한", "꾸준한", "행복한", "멋진", "활기찬", "튼튼한", "가벼운"];
    const NOUNS = ["호랑이", "토끼", "거북이", "코끼리", "사자", "펭귄", "다람쥐", "고양이"];
    const randAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    setDisplayName(`${randAdj} ${randNoun}`);
    setView("form");
  };

  const handleOpenEditForm = (profile: UserProfile) => {
    setEditingSubProfileId(profile.subProfileId || null);
    setDisplayName(profile.displayName || "");
    setGender(profile.gender);
    setAge(profile.age);
    setHeight(profile.height);
    setCurrentWeight(profile.currentWeight);
    setTargetWeight(profile.targetWeight);
    setSkeletalMuscleMass(profile.skeletalMuscleMass || 24.0);
    setBodyFatPercentage(profile.bodyFatPercentage || 28.0);
    setActivityLevel(profile.activityLevel);
    setGoalType(profile.goalType);
    setWeeklyWeightLossTarget(profile.weeklyWeightLossTarget || 500);
    setDietDurationWeeks(profile.dietDurationWeeks || 8);
    setView("form");
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      alert("프로필 이름을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      // 1. Calculate BMR
      const { bmr } = calculateBMR({
        weight: currentWeight,
        height,
        age,
        gender,
        bodyFatPercentage: bodyFatPercentage > 0 ? bodyFatPercentage : undefined,
        skeletalMuscleMass: skeletalMuscleMass > 0 ? skeletalMuscleMass : undefined,
      });

      // 2. Calculate TDEE
      const tdee = calculateTDEE(bmr, activityLevel);

      // 3. Calorie Target by Goal
      let targetCalories = tdee;
      if (goalType === "cut") {
        const deficit = weeklyWeightLossTarget * 1.1;
        targetCalories = tdee - deficit;
      } else if (goalType === "bulk") {
        targetCalories = tdee + 300;
      }

      const safetyFloor = gender === "female" ? 1200 : 1500;
      if (targetCalories < safetyFloor) {
        targetCalories = safetyFloor;
      }

      // 4. Calculate macronutrient goals
      const { carbs, protein, fat } = calculateMacros(targetCalories, goalType, currentWeight);

      const targetCaloriesInt = Math.round(targetCalories);

      const profilePayload: Omit<UserProfile, "userId"> = {
        displayName,
        gender,
        age,
        height,
        currentWeight,
        targetWeight,
        skeletalMuscleMass: skeletalMuscleMass > 0 ? skeletalMuscleMass : undefined,
        bodyFatPercentage: bodyFatPercentage > 0 ? bodyFatPercentage : undefined,
        bodyFatMass: bodyFatPercentage > 0 ? (currentWeight * bodyFatPercentage) / 100 : undefined,
        activityLevel,
        goalType,
        targetCalories: targetCaloriesInt,
        targetCarbs: carbs,
        targetProtein: protein,
        targetFat: fat,
        weeklyUpdateEnabled: true,
        weeklyUpdateDay: 0,
        weeklyWeightLossTarget,
        dietStartDate: new Date().toISOString().substring(0, 10),
        dietDurationWeeks,
        updatedAt: new Date().toISOString(),
      };

      if (editingSubProfileId === "main") {
        // Save main user profile
        await dbService.saveUserProfile(userId, profilePayload);
        showToast("기본 프로필이 업데이트되었습니다.");
      } else if (editingSubProfileId) {
        // Save existing sub-profile
        await dbService.saveSubProfile(userId, editingSubProfileId, profilePayload);
        showToast(`'${displayName}' 프로필이 업데이트되었습니다.`);
      } else {
        // Create new sub-profile
        const newSubId = `profile_${Date.now()}`;
        await dbService.saveSubProfile(userId, newSubId, profilePayload);
        showToast(`새 프로필 '${displayName}'이 추가되었습니다.`);
      }

      await onRefreshProfiles();
      setView("list");
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("프로필 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!window.confirm(`정말로 '${name}' 프로필을 삭제하시겠습니까? 관련 데이터가 모두 삭제되지는 않으나, 해당 프로필 기록에 접근할 수 없습니다.`)) {
      return;
    }
    try {
      await dbService.deleteSubProfile(userId, id);
      if (activeProfileId === id) {
        onSelectProfile("main");
      }
      showToast(`'${name}' 프로필이 삭제되었습니다.`);
      await onRefreshProfiles();
    } catch (err) {
      console.error(err);
      alert("프로필 삭제에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end p-2 pb-6">
      <div className="bg-white border text-[#1E293B] border-[#E2E8F0] shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] w-full max-w-lg mx-auto transform transition-all animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <h2 className="font-extrabold text-[#1E293B] text-sm">
            {view === "list" ? "프로필 계정 관리" : editingSubProfileId ? "프로필 정보 수정" : "새 프로필 정보 등록"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-[#F1F5F9] rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {view === "list" ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-1">
                사용자마다 체중 기록, 식사 기록, 단식 기록을 완전히 개별적으로 관리할 수 있어 서브 프로필 용도로 활용하기 좋습니다.
              </p>

              {/* Profile list items */}
              <div className="flex flex-col gap-2">
                {/* Main Profile item */}
                {mainProfile && (
                  <div
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      activeProfileId === "main"
                        ? "border-[#3B82F6] bg-blue-50/50"
                        : "border-[#E2E8F0] bg-white hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectProfile("main");
                        onClose();
                      }}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-xs text-[#1E293B]">
                            {mainProfile.displayName || "기본 프로필"}
                          </p>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black">
                            기본
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          체중 {mainProfile.currentWeight}kg · 목표 {mainProfile.targetCalories}kcal
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSubProfileId("main");
                          handleOpenEditForm(mainProfile);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Profiles items */}
                {subProfiles.map((sub) => (
                  <div
                    key={sub.subProfileId}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      activeProfileId === sub.subProfileId
                        ? "border-[#3B82F6] bg-blue-50/50"
                        : "border-[#E2E8F0] bg-white hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectProfile(sub.subProfileId!);
                        onClose();
                      }}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-extrabold text-xs text-[#1E293B]">
                          {sub.displayName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          체중 {sub.currentWeight}kg · 목표 {sub.targetCalories}kcal
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditForm(sub)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(sub.subProfileId!, sub.displayName || "서브")}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <button
                onClick={handleOpenCreateForm}
                className="w-full h-12 mt-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-[#CBD5E1] rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#3B82F6]" />
                <span>새로운 프로필 추가하기</span>
              </button>
            </div>
          ) : (
            /* Creation Form */
            <div className="flex flex-col gap-4">
              {/* Profile Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-[#1E293B]">프로필 이름 *</label>
                <input
                  type="text"
                  placeholder="예: 가족 1, 벌크업 계정"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] px-4 rounded-xl text-xs font-bold focus:border-[#3B82F6] focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-[#1E293B]">성별</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`h-11 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      gender === "female"
                        ? "bg-[#EFF6FF] border-[#3B82F6] text-[#3B82F6]"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-500"
                    }`}
                  >
                    여성 👩🏻
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`h-11 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      gender === "male"
                        ? "bg-[#EFF6FF] border-[#3B82F6] text-[#3B82F6]"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-500"
                    }`}
                  >
                    남성 👨🏻
                  </button>
                </div>
              </div>

              {/* Specs: Age, Height, Weight */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#1E293B]">나이 (세)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Math.max(1, parseInt(e.target.value) || 0))}
                    className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] text-center rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#1E293B]">신장 (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Math.max(50, parseInt(e.target.value) || 0))}
                    className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] text-center rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#1E293B]">체중 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(Math.max(10, parseFloat(e.target.value) || 0))}
                    className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] text-center rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Skeletal Muscle / Body Fat Percentage (Optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#1E293B]">골격근량 (kg, 선택)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="미입력 가능"
                    value={skeletalMuscleMass || ""}
                    onChange={(e) => setSkeletalMuscleMass(parseFloat(e.target.value) || 0)}
                    className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] text-center rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#1E293B]">체지방률 (%, 선택)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="미입력 가능"
                    value={bodyFatPercentage || ""}
                    onChange={(e) => setBodyFatPercentage(parseFloat(e.target.value) || 0)}
                    className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] text-center rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Goal Weight */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-[#1E293B]">목표 체중 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(Math.max(10, parseFloat(e.target.value) || 0))}
                  className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] px-4 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Goal Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-[#1E293B]">목표 타겟</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cut", title: "지방 컷팅 🔥" },
                    { id: "maintain", title: "체중 유지 ⚖️" },
                    { id: "bulk", title: "린매스 업 💪" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoalType(g.id as any)}
                      className={`h-11 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        goalType === g.id
                          ? "bg-[#EFF6FF] border-[#3B82F6] text-[#3B82F6]"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-500"
                      }`}
                    >
                      {g.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-[#1E293B]">평소 활동량</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                  className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] px-3 rounded-xl text-xs font-bold focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="sedentary">비활동적 (운동 없음, 정적인 직장생활)</option>
                  <option value="light">가벼운 활동 (주 1~3회 가벼운 운동)</option>
                  <option value="moderate">보통 활동 (주 3~5회 보통 강도 운동)</option>
                  <option value="active">활동적 (주 6~7회 강도 높은 운동)</option>
                  <option value="very_active">매우 활동적 (선수급 운동, 강한 육체 업무)</option>
                </select>
              </div>

              {/* Weekly Loss/Gain Speed */}
              {goalType === "cut" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-[#1E293B]">주간 추천 감량 감량폭 (g)</label>
                  <select
                    value={weeklyWeightLossTarget}
                    onChange={(e) => setWeeklyWeightLossTarget(parseInt(e.target.value) || 500)}
                    className="h-11 bg-[#F8FAFC] border border-[#E2E8F0] px-3 rounded-xl text-xs font-bold focus:outline-none focus:border-[#3B82F6]"
                  >
                    <option value="200">초급 페이스 (주당 -200g - 🌿 완만함)</option>
                    <option value="300">이지 페이스 (주당 -300g - 🌱 부담없음)</option>
                    <option value="500">기본 페이스 (주당 -500g - ⭐ 추천 정석)</option>
                    <option value="700">스피드 페이스 (주당 -700g - 🔥 다소 타이트)</option>
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  목록으로 돌아가기
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveProfile}
                  className="flex-1 h-12 bg-[#3B82F6] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>설정 완료 및 저장</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
