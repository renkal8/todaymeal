import React, { useState, useEffect } from "react";
import { useDragScroll } from "../utils/useDragScroll";
import { auth } from "../lib/firebase";
import { dbService } from "../services/dbService";
import { onAuthStateChanged } from "firebase/auth";
import { FastingLog } from "../types";
import {
  Timer,
  Play,
  Square,
  Coffee,
  Flame,
  Calendar,
  Clock,
  Edit2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";

const FASTING_PLANS = [
  { id: "12:12", fast: 12, eat: 12, name: "초보자 (12:12)" },
  { id: "14:10", fast: 14, eat: 10, name: "베이직 (14:10)" },
  { id: "16:8", fast: 16, eat: 8, name: "가장 인기 (16:8)" },
  { id: "11:13", fast: 11, eat: 13, name: "변형 단식 (11:13)" },
  { id: "18:6", fast: 18, eat: 6, name: "하드코어 (18:6)" },
  { id: "20:4", fast: 20, eat: 4, name: "전사 다이어트 (20:4)" },
  { id: "24:0", fast: 24, eat: 0, name: "24시간 플랜 (1일)" },
  { id: "48:0", fast: 48, eat: 0, name: "48시간 플랜 (2일)" },
  { id: "72:0", fast: 72, eat: 0, name: "72시간 플랜 (3일)" },
];

export default function FastingTracker() {
  const [selectedPlan, setSelectedPlan] = useState(FASTING_PLANS[2]); // 기본 16:8
  const [isFasting, setIsFasting] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [userId, setUserId] = useState<string | null>(null);

  // Custom interactive date state
  const [customStartTimeInput, setCustomStartTimeInput] = useState<number>(
    Date.now(),
  );
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const planScroll = useDragScroll();

  // Helper of date-time parts for manual 30-min block adjustments
  const getFastingParts = (ms: number) => {
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hr = d.getHours();
    const min = d.getMinutes() >= 30 ? 30 : 0;
    return {
      dateStr: `${yyyy}-${mm}-${dd}`,
      hour: hr,
      minute: min,
    };
  };

  const handlePartChange = (
    dateVal: string,
    hourVal: number,
    minVal: number,
  ) => {
    const [y, m, d] = dateVal.split("-").map(Number);
    const newDate = new Date(y, m - 1, d, hourVal, minVal, 0, 0);
    const parsedTime = newDate.getTime();
    if (isFasting) {
      setStartTime(parsedTime);
      localStorage.setItem("fasting_start_time", String(parsedTime));
    } else {
      setCustomStartTimeInput(parsedTime);
    }
  };

  // Helper to round to nearest 30 minutes
  const roundToNearest30Minutes = (timeMs: number): number => {
    const coeff = 1000 * 60 * 30; // 30 mins in ms
    return Math.round(timeMs / coeff) * coeff;
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch / Sync fasting logs when userId transitions
  useEffect(() => {
    if (!userId) return;

    const syncFastingWithFirebase = async () => {
      try {
        const activeLog = await dbService.getActiveFastingLog(userId);
        if (activeLog) {
          const stTime = new Date(activeLog.startTime).getTime();
          setStartTime(stTime);
          setCustomStartTimeInput(stTime);
          setIsFasting(true);

          const plan = FASTING_PLANS.find((p) => p.fast === activeLog.targetDuration);
          if (plan) {
            setSelectedPlan(plan);
            localStorage.setItem("fasting_plan_id", plan.id);
          }
          localStorage.setItem("fasting_start_time", String(stTime));
          localStorage.setItem("is_fasting", "true");
        } else {
          // If no active fast on remote but local state exists, synchronize up
          const savedStartTime = localStorage.getItem("fasting_start_time");
          const savedIsFasting = localStorage.getItem("is_fasting") === "true";

          if (savedIsFasting && savedStartTime) {
            const stTime = Number(savedStartTime);
            await dbService.addFastingLog(userId, {
              startTime: new Date(stTime).toISOString(),
              targetDuration: selectedPlan.fast,
              status: "active",
            });
            console.log("[FastingTracker] Uploaded local fasting progress to Firestore");
          } else {
            setIsFasting(false);
            setStartTime(null);
          }
        }
      } catch (error) {
        console.error("[FastingTracker] Firebase sync error:", error);
      }
    };

    syncFastingWithFirebase();
  }, [userId]);

  // Load state from localStorage on init
  useEffect(() => {
    try {
      const savedStartTime = localStorage.getItem("fasting_start_time");
      const savedPlanId = localStorage.getItem("fasting_plan_id");
      const savedIsFasting = localStorage.getItem("is_fasting") === "true";

      if (savedPlanId) {
        const found = FASTING_PLANS.find((p) => p.id === savedPlanId);
        if (found) setSelectedPlan(found);
      }
      if (savedIsFasting && savedStartTime) {
        const st = Number(savedStartTime);
        setStartTime(st);
        setCustomStartTimeInput(st);
        setIsFasting(true);
      } else {
        setCustomStartTimeInput(roundToNearest30Minutes(Date.now()));
      }
    } catch (e) {
      console.error("Failed to load fasting state", e);
    }
  }, []);

  // Timer interval to keep flowing
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculation Logic
  const fastDurationMs = selectedPlan.fast * 60 * 60 * 1000;
  const activeStart = isFasting
    ? startTime || Date.now()
    : customStartTimeInput;
  const targetTime = activeStart + fastDurationMs;
  const msLeft = isFasting
    ? targetTime
      ? Math.max(0, targetTime - now)
      : fastDurationMs
    : fastDurationMs;
  const isCompleted = isFasting && now >= targetTime;

  // Formatting digital representation
  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, "0")} : ${m.toString().padStart(2, "0")} : ${s.toString().padStart(2, "0")}`;
  };

  const formatDateBeautiful = (ms: number) => {
    const d = new Date(ms);
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const hr = d.getHours();
    const min = d.getMinutes();
    const ampm = hr >= 12 ? "오후" : "오전";
    const hour12 = hr % 12 === 0 ? 12 : hr % 12;
    const minStr = min.toString().padStart(2, "0");

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    const dy = weekDays[d.getDay()];

    return `${mm}월 ${dd}일 (${dy}) ${ampm} ${hour12}:${minStr}`;
  };

  // Circular clock SVG maths
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  // Progress ratio calculation
  const elapsedMs = isFasting && startTime ? Math.max(0, now - startTime) : 0;
  const progressPct =
    isFasting && startTime
      ? Math.min(100, (elapsedMs / fastDurationMs) * 100)
      : 0;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  // Toggle handlers
  const handleToggleFasting = async () => {
    if (isFasting) {
      // Trigger elegant non-blocking inline confirmation rather than alert limits
      setShowStopConfirm(true);
    } else {
      // Start Fasting from current or adjusted customStartTimeInput!
      const finalStart = customStartTimeInput;
      setIsFasting(true);
      setStartTime(finalStart);
      localStorage.setItem("fasting_start_time", String(finalStart));
      localStorage.setItem("fasting_plan_id", selectedPlan.id);
      localStorage.setItem("is_fasting", "true");
      setIsEditingStartTime(false);

      if (userId) {
        try {
          await dbService.addFastingLog(userId, {
            startTime: new Date(finalStart).toISOString(),
            targetDuration: selectedPlan.fast,
            status: "active",
          });
          console.log("[FastingTracker] Started fasting on Firestore");
        } catch (error) {
          console.error("Failed to post fasting log to Firestore:", error);
        }
      }
    }
  };

  const handleConfirmStop = async () => {
    setIsFasting(false);
    setStartTime(null);
    setCustomStartTimeInput(Date.now());
    localStorage.removeItem("fasting_start_time");
    localStorage.removeItem("is_fasting");
    setShowStopConfirm(false);
    setIsEditingStartTime(false);

    if (userId) {
      try {
        const activeLog = await dbService.getActiveFastingLog(userId);
        if (activeLog && activeLog.id) {
          await dbService.completeFastingLog(userId, activeLog.id, new Date().toISOString());
          console.log("[FastingTracker] Completed fasting on Firestore");
        }
      } catch (error) {
        console.error("Failed to complete fasting log in Firestore:", error);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* 1. Fasting Plan Selector */}
      <div
        className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[24px] p-4 shadow-xs"
        id="fasting-plan-selector"
      >
        <h3 className="text-sm font-extrabold text-[#1E293B] dark:text-white mb-3 flex items-center gap-1.5">
          <Timer className="w-4 h-4 text-[#3B82F6]" /> 단식 플랜 선택
        </h3>
        <div
          className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 cursor-grab active:cursor-grabbing select-none"
          ref={planScroll.scrollRef}
          {...planScroll.handlers}
        >
          {FASTING_PLANS.map((plan) => (
            <button
              key={plan.id}
              disabled={isFasting}
              onClick={() => {
                if (planScroll.dragMoved) return;
                setSelectedPlan(plan);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                selectedPlan.id === plan.id
                  ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-sm"
                  : "bg-[#F8FAFC] dark:bg-slate-700 text-[#64748B] dark:text-slate-300 border-[#E2E8F0] dark:border-slate-600 hover:bg-[#F1F5F9]"
              } ${isFasting && selectedPlan.id !== plan.id ? "opacity-40 cursor-not-allowed" : ""}`}
              id={`fast-plan-${plan.id.replace(":", "-")}`}
            >
              <span className="whitespace-nowrap">
                {plan.id}{" "}
                <span className="font-medium text-[10px] ml-1 opacity-80">
                  {plan.name}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Start & End Clock Settings Screen */}
      <div
        className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[24px] p-5 shadow-xs"
        id="fasting-time-adjuster"
      >
        <h3 className="text-xs font-extrabold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-[#3B82F6]" /> 단식 목표 시간대 조율
          </span>
          {isFasting && (
            <button
              type="button"
              onClick={() => setIsEditingStartTime(!isEditingStartTime)}
              className="text-[10.5px] font-extrabold text-[#3B82F6] bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
              id="btn-edit-fast-start"
            >
              {isEditingStartTime ? "설정 완료" : "시작 시간 변경 ✍️"}
            </button>
          )}
        </h3>

        {!isFasting || isEditingStartTime ? (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" /> 단식 시작
                  일시 선택 (30분 단위)
                </label>
                <div className="flex gap-2">
                  {/* Date Input */}
                  <input
                    type="date"
                    value={
                      getFastingParts(
                        isFasting
                          ? startTime || Date.now()
                          : customStartTimeInput,
                      ).dateStr
                    }
                    onChange={(e) => {
                      const parts = getFastingParts(
                        isFasting
                          ? startTime || Date.now()
                          : customStartTimeInput,
                      );
                      const targetDate = e.target.value || parts.dateStr;
                      handlePartChange(targetDate, parts.hour, parts.minute);
                    }}
                    className="flex-1 h-11 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-3 bg-[#F8FAFC] dark:bg-slate-900 text-xs font-black focus:outline-none focus:border-[#3B82F6] dark:text-white text-slate-800"
                    id="fasting-date-picker"
                  />
                  {/* Hour Select */}
                  <select
                    value={
                      getFastingParts(
                        isFasting
                          ? startTime || Date.now()
                          : customStartTimeInput,
                      ).hour
                    }
                    onChange={(e) => {
                      const parts = getFastingParts(
                        isFasting
                          ? startTime || Date.now()
                          : customStartTimeInput,
                      );
                      handlePartChange(
                        parts.dateStr,
                        Number(e.target.value),
                        parts.minute,
                      );
                    }}
                    className="w-20 h-11 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-2 bg-[#F8FAFC] dark:bg-slate-900 text-xs font-black focus:outline-none focus:border-[#3B82F6] dark:text-white text-slate-800"
                    id="fasting-hour-picker"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}시
                      </option>
                    ))}
                  </select>
                  {/* Minute Select */}
                  <select
                    value={
                      getFastingParts(
                        isFasting
                          ? startTime || Date.now()
                          : customStartTimeInput,
                      ).minute
                    }
                    onChange={(e) => {
                      const parts = getFastingParts(
                        isFasting
                          ? startTime || Date.now()
                          : customStartTimeInput,
                      );
                      handlePartChange(
                        parts.dateStr,
                        parts.hour,
                        Number(e.target.value),
                      );
                    }}
                    className="w-20 h-11 border border-[#E2E8F0] dark:border-slate-700 rounded-xl px-2 bg-[#F8FAFC] dark:bg-slate-900 text-xs font-black focus:outline-none focus:border-[#3B82F6] dark:text-white text-slate-800"
                    id="fasting-minute-picker"
                  >
                    <option value={0}>00분</option>
                    <option value={30}>30분</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col justify-center p-3 border border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20">
                <p className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400">
                  예정 종료 (목표 {selectedPlan.fast}시간)
                </p>
                <p className="text-xs font-black text-[#1E293B] dark:text-white mt-1">
                  {formatDateBeautiful(targetTime)}
                </p>
                <p className="text-[9px] text-[#64748B] dark:text-slate-400 mt-1 leading-tight">
                  단식을 진행하면 지방 연소 모드가 활성화되어 에너지를 태웁니다.
                </p>
              </div>
            </div>

            {!isFasting && (
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/20 p-2.5 rounded-lg border border-neutral-100 dark:border-slate-800">
                <div className="text-center font-bold">💡 꿀팁:</div>
                <div>
                  어제 밤이나 과거 시점부터 단식을 시작했다면, 위 시계를 돌려
                  시작 시간을 소급 설정할 수 있습니다.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 mt-1.5 animate-in fade-in duration-200">
            <div className="p-3.5 bg-[#FFF1F2] dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950 rounded-[18px]">
              <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1 block">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 단식
                시작 시점
              </p>
              <p className="font-extrabold text-xs text-rose-700 dark:text-rose-300 mt-1.5">
                {formatDateBeautiful(activeStart)}
              </p>
            </div>
            <div className="p-3.5 bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950 rounded-[18px]">
              <p className="text-[10px] font-bold text-[#16A34A] flex items-center gap-1 block">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" /> 단식
                목표 시점
              </p>
              <p className="font-extrabold text-xs text-[#16A34A] mt-1.5">
                {formatDateBeautiful(targetTime)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Circular Visual Indicator Panel */}
      <div
        className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-[24px] p-6 shadow-xs flex flex-col items-center relative overflow-hidden"
        id="fasting-visual-timer"
      >
        {/* Active phase state tag */}
        <div
          className={`mb-6 px-4 py-1.5 rounded-full text-xs font-black shadow-inner flex items-center gap-1.5 transition-colors duration-500 ${
            isFasting
              ? isCompleted
                ? "bg-emerald-100 dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-400"
                : "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
              : "bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400"
          }`}
        >
          {isFasting ? (
            isCompleted ? (
              <>
                <Flame className="w-4 h-4 text-emerald-500 animate-bounce" />{" "}
                목표 달성 완료!
              </>
            ) : (
              <>
                <Timer className="w-4 h-4 animate-pulse" /> 단식 진행 중 (시간
                흘러가는 중)
              </>
            )
          ) : (
            <>
              <Coffee className="w-4 h-4" /> 식사 가능 시간 (타이머 시작 대기)
            </>
          )}
        </div>

        {/* Circular Ring Timer Visualizer */}
        <div className="relative flex items-center justify-center w-64 h-64">
          <svg
            className="absolute w-full h-full transform -rotate-90"
            viewBox="0 0 256 256"
            width="100%"
            height="100%"
          >
            {/* Background ring */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="var(--circle-bg, #F1F5F9)"
              strokeWidth="18"
              fill="transparent"
              className="text-slate-100 dark:text-slate-700"
              style={{ stroke: "currentColor" }}
            />
            {/* Foreground ticking ring */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke={
                isFasting && isCompleted
                  ? "#10B981"
                  : isFasting
                    ? "#3D82F6"
                    : "#EFF6FF"
              }
              strokeWidth="18"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={isFasting ? strokeDashoffset : 0}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Core numerical clock */}
          <div className="absolute flex flex-col items-center justify-center text-center px-4 w-full">
            <span className="text-[9.5px] font-black text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-0.5">
              {isFasting
                ? isCompleted
                  ? "단식 미션 격파!"
                  : "단식 달성까지"
                : "단식 타이머 대기"}
            </span>
            <div
              className={`text-[25px] sm:text-[28px] font-extrabold font-mono tracking-tight transition-colors leading-none my-1 ${
                isFasting && !isCompleted
                  ? "text-[#1E293B] dark:text-white"
                  : isCompleted
                    ? "text-emerald-500"
                    : "text-[#94A3B8] dark:text-[#64748B]"
              }`}
            >
              {formatTime(msLeft)}
            </div>
            <div className="text-[10px] font-extrabold text-[#64748B] dark:text-slate-400 mt-1 flex items-center gap-1 bg-neutral-50 dark:bg-slate-900 border border-neutral-150 dark:border-slate-700/60 px-2 py-0.5 rounded-full select-none leading-none">
              목표:{" "}
              <span className="font-black text-[#3B82F6]">
                {selectedPlan.fast}시간
              </span>
            </div>
          </div>
        </div>

        {/* Start / Cancel action buttons */}
        {!showStopConfirm ? (
          <button
            onClick={handleToggleFasting}
            className={`mt-8 w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white transition-all active:scale-95 shadow-sm cursor-pointer ${
              isFasting
                ? "bg-[#1E293B] hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                : "bg-[#3B82F6] hover:bg-blue-600"
            }`}
            id="btn-trigger-fasting-toggle"
          >
            {isFasting ? (
              <>
                <Square className="w-5 h-5 fill-current" /> 단식 종료하기
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> 지금 설정으로 단식
                시작
              </>
            )}
          </button>
        ) : (
          /* Custom Inline Non-Blocking Stop Confirmation Dialog */
          <div className="mt-6 w-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-950 p-4.5 rounded-2xl flex flex-col gap-3.5 animate-in slide-in-from-top-3 duration-250">
            <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold">
                  🚨 단식을 정말 중단하시겠습니까?
                </p>
                <p className="text-[10px] text-rose-600/80 dark:text-rose-300/80 mt-1 leading-snug">
                  중단하시면 지금까지의 단식 흐름이 중단되고 기록 창이
                  초기화됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleConfirmStop}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all shadow-sm cursor-pointer text-center"
                id="btn-fast-confirm-quit"
              >
                네, 종료합니다
              </button>
              <button
                type="button"
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 h-10 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-extrabold rounded-xl hover:bg-slate-300 transition-all cursor-pointer text-center"
                id="btn-fast-confirm-cancel"
              >
                아니오, 계속할게요
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
