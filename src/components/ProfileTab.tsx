import React from "react";
import { Info, User as UserIcon, Plus, ChevronLeft } from "lucide-react";
import { UserProfile } from "../types";
import ProfileForm from "./ProfileForm";

interface ProfileTabProps {
  profile: UserProfile;
  user: any; // Firebase User auth state
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  handleSaveProfile: (profile: Omit<UserProfile, "userId">) => Promise<void>;
  uiLoading: boolean;
}

export default function ProfileTab({
  profile,
  user,
  isEditingProfile,
  setIsEditingProfile,
  handleSaveProfile,
  uiLoading,
}: ProfileTabProps) {
  return (
    <>
      {!isEditingProfile && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-neutral-150 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 bg-[#3B82F6] text-white rounded-full flex items-center justify-center font-extrabold shadow-sm">
                {profile.displayName?.[0] || user.displayName?.[0] || "U"}
              </div>
              <div>
                <h3 className="text-xs font-black text-neutral-800 dark:text-white">
                  {profile.displayName || user.displayName}
                </h3>
                <p className="text-[10px] text-neutral-400 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Body target parameters */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-neutral-50 dark:bg-slate-800 p-2.5 rounded-xl border border-neutral-150/70 dark:border-slate-700 text-center">
                <span className="text-[10px] text-neutral-400 dark:text-slate-400 font-bold">
                  목표 칼로리
                </span>
                <p className="text-sm font-extrabold text-slate-950 dark:text-white font-mono mt-0.5">
                  {profile.targetCalories} kcal
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-slate-800 p-2.5 rounded-xl border border-neutral-150/70 dark:border-slate-700 text-center">
                <span className="text-[10px] text-neutral-400 dark:text-slate-400 font-bold">
                  목표 몸무게
                </span>
                <p className="text-sm font-extrabold text-slate-950 dark:text-white font-mono mt-0.5">
                  {profile.targetWeight} kg
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-[10px] text-neutral-400 dark:text-slate-400 font-black tracking-wider uppercase mb-0.5">
                매주 권장할 영양 매크로 타겟
              </h4>
              <div className="flex gap-4 items-center justify-between text-xs font-mono font-bold bg-neutral-50 dark:bg-slate-800 p-2.5 border border-neutral-150 dark:border-slate-700 rounded-xl">
                <div className="text-center flex-1">
                  <p className="text-[9px] font-sans font-extrabold text-neutral-400 dark:text-slate-400">
                    탄 (Carbs)
                  </p>
                  <p className="text-[11px] text-neutral-700 dark:text-white mt-0.5">
                    {profile.targetCarbs}g
                  </p>
                </div>
                <div className="text-center flex-1 border-x border-neutral-200 dark:border-slate-700">
                  <p className="text-[9px] font-sans font-extrabold text-neutral-400 dark:text-slate-400">
                    단 (Protein)
                  </p>
                  <p className="text-[11px] text-neutral-700 dark:text-white mt-0.5">
                    {profile.targetProtein}g
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[9px] font-sans font-extrabold text-neutral-400 dark:text-slate-400">
                    지 (Fat)
                  </p>
                  <p className="text-[11px] text-neutral-700 dark:text-white mt-0.5">
                    {profile.targetFat}g
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-100 dark:bg-slate-800 p-3 rounded-xl text-neutral-500 dark:text-slate-300 font-medium text-[10.5px] leading-4.5 flex items-start gap-1.5 border border-neutral-200 dark:border-slate-700">
              <Info className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                본 다이어트 영양 수치는 인바디 검출 값에 대한{" "}
                <strong className="text-neutral-700 dark:text-white">
                  Katch-McArdle 방정식
                </strong>
                을 최우선으로 사용하여 근육 보존 계수를 극대화한 개인 맞춤식 분할입니다.
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="w-full h-10 bg-[#3B82F6] text-white rounded-xl text-xs font-bold font-sans hover:bg-blue-600 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                id="btn-edit-profile-action"
              >
                <UserIcon className="w-4 h-4" /> 내 프로필 편집하기
              </button>
              <button
                onClick={() => {
                  alert("새로운 프로필 추가 기능은 준비중입니다.");
                }}
                className="w-full h-10 bg-white border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold font-sans hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                id="btn-add-profile-action"
              >
                <Plus className="w-4 h-4" /> 프로필 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => setIsEditingProfile(false)}
              className="text-xs font-bold text-neutral-500 flex items-center gap-1 cursor-pointer hover:text-black"
            >
              <ChevronLeft className="w-4 h-4" /> 가이드로 돌아가기
            </button>
          </div>
          <ProfileForm
            initialProfile={profile}
            onSave={handleSaveProfile}
            isLoading={uiLoading}
          />
        </div>
      )}
    </>
  );
}
