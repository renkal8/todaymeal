import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { FoodLog } from '../types';
import { X, Search, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';

interface CopyMealsModalProps {
  userId: string;
  currentDate: string;
  onCopy: (foods: Omit<FoodLog, 'id' | 'createdAt' | 'userId'>[]) => void;
  onClose: () => void;
}

export default function CopyMealsModal({ userId, currentDate, onCopy, onClose }: CopyMealsModalProps) {
  const [sourceDate, setSourceDate] = useState<string>(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await dbService.getDayFoodLogs(userId, sourceDate);
        setLogs(data);
        // Clear selection when date changes
        setSelectedLogs(new Set());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, sourceDate]);

  const toggleLog = (id: string) => {
    const newSet = new Set(selectedLogs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLogs(newSet);
  };

  const shiftSourceDate = (days: number) => {
    const d = new Date(sourceDate);
    d.setDate(d.getDate() + days);
    setSourceDate(d.toISOString().split('T')[0]);
  };

  const handleCopy = () => {
    const selected = logs.filter(log => selectedLogs.has(log.id as string));
    const toCopy = selected.map(log => ({
      name: log.name,
      category: log.category,
      grams: log.grams,
      calories: log.calories,
      carbs: log.carbs,
      protein: log.protein,
      fat: log.fat,
      // Target current date and same meal time
      dateStr: currentDate,
      mealTime: log.mealTime, 
    }));
    onCopy(toCopy);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end p-2 pb-6">
      <div className="bg-white border text-[#1E293B] border-[#E2E8F0] shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh] w-full max-w-lg mx-auto transform transition-all animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <h2 className="font-extrabold text-[#1E293B] text-sm">이전 기록 복사하기</h2>
          <button onClick={onClose} className="p-2 bg-[#F1F5F9] rounded-full text-slate-500 hover:text-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between border border-[#E2E8F0] rounded-xl mb-4 bg-slate-50 p-1">
            <button
              onClick={() => shiftSourceDate(-1)}
              className="p-2 hover:bg-white text-slate-500 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input 
              type="date"
              value={sourceDate}
              onChange={(e) => setSourceDate(e.target.value)}
              className="bg-transparent font-bold text-center appearance-none focus:outline-none"
            />
            <button
              onClick={() => shiftSourceDate(1)}
              className="p-2 hover:bg-white text-slate-500 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[50vh] pr-1">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-[#94A3B8] text-sm font-bold">
                선택한 날짜에 기록된 식단이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-4">
                {logs.map(log => (
                  <button
                    key={log.id}
                    onClick={() => toggleLog(log.id as string)}
                    className={`flex items-center text-left justify-between p-3 rounded-xl border transition-all ${
                      selectedLogs.has(log.id as string) 
                        ? 'border-[#3B82F6] bg-[#EFF6FF]' 
                        : 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#64748B] mb-1">
                        {log.mealTime === 'breakfast' ? '아침' : 
                         log.mealTime === 'lunch' ? '점심' : 
                         log.mealTime === 'dinner' ? '저녁' : '간식'}
                      </span>
                      <p className="font-extrabold text-[#1E293B] text-sm">{log.name}</p>
                      <p className="text-[10px] text-[#64748B] font-mono mt-0.5">{log.grams}g / {log.calories}kcal</p>
                    </div>
                    <div>
                      {selectedLogs.has(log.id as string) 
                        ? <CheckCircle2 className="w-6 h-6 text-[#3B82F6]" /> 
                        : <Circle className="w-6 h-6 text-[#CBD5E1]" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] p-4 bg-white">
          <button
            onClick={handleCopy}
            disabled={selectedLogs.size === 0}
            className="w-full h-12 flex items-center justify-center font-extrabold text-sm text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl disabled:bg-[#94A3B8] disabled:opacity-50 transition-colors shadow-sm"
          >
            선택한 {selectedLogs.size}개 일괄 복사하기
          </button>
        </div>
      </div>
    </div>
  );
}
