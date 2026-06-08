import React, { useState, useEffect } from 'react';

interface NumberAdjusterProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  stepDecimal?: number; // Decimals to fix (e.g. 1 for bodyfat, 0 for carbs)
}

export default function NumberAdjuster({
  value,
  onChange,
  label,
  unit = '',
  min = 0,
  max = 99999,
  stepDecimal = 1
}: NumberAdjusterProps) {

  const formatValue = (val: number) => {
    if (stepDecimal === 0) return Math.floor(val).toString();
    return val.toFixed(stepDecimal);
  };
  
  const [localValue, setLocalValue] = useState<string>(formatValue(value));

  useEffect(() => {
    setLocalValue(formatValue(value));
  }, [value, stepDecimal]);

  const handleAdjust = (amount: number) => {
    const rawVal = value + amount;
    // Round to avoid floating point precision issues (e.g. 0.1 + 0.2 = 0.30000004)
    const factor = Math.pow(10, stepDecimal);
    const rounded = Math.round(rawVal * factor) / factor;
    const bounded = Math.max(min, Math.min(max, rounded));
    onChange(bounded);
    setLocalValue(formatValue(bounded));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    const rawVal = parseFloat(e.target.value);
    if (!isNaN(rawVal)) {
      const factor = Math.pow(10, stepDecimal);
      const rounded = Math.round(rawVal * factor) / factor;
      if (rounded >= min && rounded <= max) {
        onChange(rounded);
      }
    }
  };

  const handleBlur = () => {
    let rawVal = parseFloat(localValue);
    if (isNaN(rawVal)) {
      rawVal = value;
    }
    const factor = Math.pow(10, stepDecimal);
    const rounded = Math.round(rawVal * factor) / factor;
    const bounded = Math.max(min, Math.min(max, rounded));
    onChange(bounded);
    setLocalValue(formatValue(bounded));
  };

  return (
    <div className="flex flex-col p-3 bg-white border border-[#E2E8F0] dark:bg-slate-800 dark:border-slate-700 rounded-2xl shadow-xs transition-all w-full">
      <div className="flex justify-between items-center mb-2">
        {label && <span className="text-[11px] font-bold text-[#64748B] dark:text-neutral-400 tracking-tight">{label}</span>}
        <div className="flex items-baseline">
          <input
            type="number"
            inputMode="decimal"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-16 text-right text-base font-black text-[#3B82F6] bg-transparent outline-none focus:bg-[#EFF6FF] dark:focus:bg-slate-700 rounded transition-colors"
          />
          <span className="text-[11px] font-bold text-[#94A3B8] ml-1">{unit}</span>
        </div>
      </div>

      <div className="flex gap-1.5 w-full">
        <button
          type="button"
          onClick={() => handleAdjust(-10)}
          className="flex-1 h-10 flex items-center justify-center text-[13px] font-extrabold text-slate-500 bg-[#F1F5F9] dark:bg-slate-700 hover:bg-[#E2E8F0] dark:hover:bg-slate-600 rounded-xl active:scale-95 transition-all outline-none touch-manipulation cursor-pointer"
        >
          -10
        </button>
        <button
          type="button"
          onClick={() => handleAdjust(stepDecimal > 0 ? -1 : -1)}
          className="flex-1 h-10 flex items-center justify-center text-[13px] font-extrabold text-slate-500 bg-[#F1F5F9] dark:bg-slate-700 hover:bg-[#E2E8F0] dark:hover:bg-slate-600 rounded-xl active:scale-95 transition-all outline-none touch-manipulation cursor-pointer"
        >
          -1
        </button>
        
        {stepDecimal > 0 && (
          <button
            type="button"
            onClick={() => handleAdjust(-0.1)}
            className="flex-1 h-10 flex items-center justify-center text-[13px] font-extrabold text-slate-500 bg-[#F1F5F9] dark:bg-slate-700 hover:bg-[#E2E8F0] dark:hover:bg-slate-600 rounded-xl active:scale-95 transition-all outline-none touch-manipulation cursor-pointer"
          >
            -0.1
          </button>
        )}
        
        {stepDecimal > 0 && (
          <button
            type="button"
            onClick={() => handleAdjust(0.1)}
            className="flex-1 h-10 flex items-center justify-center text-[13px] font-extrabold text-[#3B82F6] bg-[#EFF6FF] dark:bg-blue-900/40 hover:bg-[#DBEAFE] rounded-xl active:scale-95 transition-all outline-none touch-manipulation cursor-pointer"
          >
            +0.1
          </button>
        )}

        <button
          type="button"
          onClick={() => handleAdjust(1)}
          className="flex-1 h-10 flex items-center justify-center text-[13px] font-extrabold text-[#3B82F6] bg-[#EFF6FF] dark:bg-blue-900/40 hover:bg-[#DBEAFE] rounded-xl active:scale-95 transition-all outline-none touch-manipulation cursor-pointer"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => handleAdjust(10)}
          className="flex-1 h-10 flex items-center justify-center text-[13px] font-extrabold text-[#3B82F6] bg-[#EFF6FF] dark:bg-blue-900/40 hover:bg-[#DBEAFE] rounded-xl active:scale-95 transition-all outline-none touch-manipulation cursor-pointer"
        >
          +10
        </button>
      </div>
    </div>
  );
}
