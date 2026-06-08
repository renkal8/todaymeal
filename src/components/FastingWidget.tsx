import React, { useState, useEffect } from 'react';
import { Timer, Power, CheckCircle, Clock } from 'lucide-react';
import { FastingLog } from '../types';

interface FastingWidgetProps {
  activeFast: FastingLog | null;
  onStartFast: (targetHours: number) => void;
  onEndFast: (fastingId: string) => void;
}

const FAST_PLANS = [
  { hours: 16, eating: 8, name: '16:8 단식', desc: '체지방 감량 최적화' },
  { hours: 14, eating: 10, name: '14:10 단식', desc: '초보자 및 일상용' },
  { hours: 12, eating: 12, name: '12:12 단식', desc: '건강 유지 및 웰니스' }
];

export default function FastingWidget({
  activeFast,
  onStartFast,
  onEndFast
}: FastingWidgetProps) {
  const [selectedPlan, setSelectedPlan] = useState<number>(16);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in seconds
  const [timerString, setTimerString] = useState<string>('00:00:00');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeFast) {
      const calculateElapsed = () => {
        const start = new Date(activeFast.startTime).getTime();
        const now = Date.now();
        const elapsedSecs = Math.max(0, Math.floor((now - start) / 1000));
        setElapsedTime(elapsedSecs);

        const hrs = Math.floor(elapsedSecs / 3600);
        const mins = Math.floor((elapsedSecs % 3600) / 60);
        const secs = elapsedSecs % 60;
        
        setTimerString(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      };

      calculateElapsed();
      interval = setInterval(calculateElapsed, 1000);
    } else {
      setTimerString('00:00:00');
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeFast]);

  const targetSecs = (activeFast?.targetDuration || selectedPlan) * 3600;
  const progressPercent = Math.min(100, (elapsedTime / targetSecs) * 100);

  return (
    <div className={`transition-all duration-300 rounded-[24px] p-5 shadow-xs border ${
      activeFast 
        ? 'bg-gradient-to-br from-[#0EA5E9] to-[#3B82F6] text-white border-transparent' 
        : 'bg-white border-[#E2E8F0] text-[#1E293B]'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${activeFast ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
            <Timer className={`w-4.5 h-4.5 ${activeFast ? 'text-white' : 'text-emerald-400'}`} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${activeFast ? 'text-white' : 'text-[#1E293B]'}`}>간헐적 단식 위젯</h3>
            <p className={`text-[10px] ${activeFast ? 'text-white/80' : 'text-neutral-400'}`}>대사 활성화 및 체지방 연소 보조</p>
          </div>
        </div>
        {activeFast ? (
          <span className="text-[10px] bg-white/20 text-white backdrop-blur-xs px-2.5 py-0.5 rounded-full font-extrabold animate-pulse">
            진행중
          </span>
        ) : (
          <span className="text-[10px] bg-[#EFF6FF] text-[#3B82F6] border border-[#DBEAFE] px-2.5 py-0.5 rounded-full font-bold">
            공복 대기 중
          </span>
        )}
      </div>

      {activeFast ? (
        <div className="flex flex-col items-center py-2.5">
          {/* Radial progress simulator */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-white/10"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-white transition-all duration-1000 ease-out"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * progressPercent) / 100}
                strokeLinecap="round"
              />
            </svg>

            <div className="text-center z-10 flex flex-col items-center">
              <span className="text-[10px] text-white/70 font-bold tracking-wider">ELAPSED</span>
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight my-0.5">
                {timerString}
              </span>
              <span className="text-[10px] text-white/80 font-medium">
                목표 {activeFast.targetDuration}시간 ({progressPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEndFast(activeFast.id!)}
            className="mt-5 w-full flex items-center justify-center gap-1.5 h-10 bg-white text-[#3B82F6] hover:bg-white/95 rounded-xl text-xs font-bold transition-all touch-manipulation shadow-xs cursor-pointer active:scale-98"
            id="btn-end-fast"
          >
            <Power className="w-3.5 h-3.5" />
            단식 종료 (매크로 식사 시작)
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-1.5">
            {FAST_PLANS.map((plan) => (
              <button
                key={plan.hours}
                onClick={() => setSelectedPlan(plan.hours)}
                className={`flex flex-col p-2.5 items-center justify-center rounded-xl border text-center transition-all cursor-pointer ${
                  selectedPlan === plan.hours
                    ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-sm font-bold'
                    : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]'
                }`}
                id={`btn-fast-plan-${plan.hours}`}
              >
                <span className="text-xs font-bold">{plan.name}</span>
                <span className={`text-[9px] mt-0.5 ${selectedPlan === plan.hours ? 'text-[#DBEAFE]' : 'text-neutral-400'}`}>
                  단식 {plan.hours}h : 식사 {plan.eating}h
                </span>
              </button>
            ))}
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[11px] text-neutral-500 flex items-start gap-1.5 leading-4">
            <Clock className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-neutral-700">{selectedPlan}시간 공복 플랜: </span>
              {FAST_PLANS.find(p => p.hours === selectedPlan)?.desc}. 체지방 연소를 촉진하고 호르몬 수치를 초기화하는데 기여합니다.
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartFast(selectedPlan)}
            className="w-full flex items-center justify-center gap-1.5 h-10 bg-[#3B82F6] hover:bg-[#2563eb] text-white rounded-xl text-xs font-bold active:scale-98 transition-all touch-manipulation shadow-xs cursor-pointer"
            id="btn-start-fast"
          >
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            지금부터 공복 단식 시작
          </button>
        </div>
      )}
    </div>
  );
}
