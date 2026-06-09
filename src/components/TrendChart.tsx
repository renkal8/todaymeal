import React, { useState, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Calendar,
  Settings2,
} from "lucide-react";
import { HealthRecord, UserProfile } from "../types";

interface TrendChartProps {
  records: HealthRecord[];
  profile: UserProfile;
}

type TimeHorizon = "3M" | "6M" | "12M" | "ALL" | "YEARLY";

export default function TrendChart({ records, profile }: TrendChartProps) {
  const [period, setPeriod] = useState<TimeHorizon>("3M");
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    weight: true,
    muscle: false,
    fat: false,
    fatPct: false,
    expected: true,
  });

  // Custom date range state
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3); // 3M default
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const startWeightRecOrigin = [...records]
      .sort(
        (a, b) =>
          new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
      )
      .find((r) => r.weight > 0);
    const startOriginTime = profile.dietStartDate
      ? new Date(profile.dietStartDate).getTime()
      : startWeightRecOrigin
        ? new Date(startWeightRecOrigin.loggedAt).getTime()
        : Date.now();
    const durationMs = (profile.dietDurationWeeks ?? 8) * 7 * 86400000;
    const dietEndMs = startOriginTime + durationMs;
    const d = new Date(Math.max(Date.now(), dietEndMs));
    return d.toISOString().split("T")[0];
  });

  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);

  const [tempStartDate, setTempStartDate] = useState<string>(startDate);
  const [tempEndDate, setTempEndDate] = useState<string>(endDate);

  const [calendarViewDateStart, setCalendarViewDateStart] = useState<Date>(
    new Date(startDate),
  );
  const [calendarViewDateEnd, setCalendarViewDateEnd] = useState<Date>(
    new Date(endDate),
  );

  const renderCalendar = (
    viewDate: Date,
    setViewDate: (d: Date) => void,
    selectedDate: string,
    onSelectDate: (d: string) => void,
    minDate?: string,
    maxDate?: string,
  ) => {
    return (
      <div className="w-56 bg-white border border-neutral-200 shadow-xl rounded-xl p-2 z-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1),
                )
              }
              className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-lg"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
                )
              }
              className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="font-extrabold text-[11px] text-neutral-800">
            {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
          </span>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
                )
              }
              className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-lg"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setViewDate(
                  new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1),
                )
              }
              className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-lg"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-bold text-neutral-500 mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {Array.from({ length: 42 }).map((_, i) => {
            const firstDay = new Date(
              viewDate.getFullYear(),
              viewDate.getMonth(),
              1,
            ).getDay();
            const daysInMonth = new Date(
              viewDate.getFullYear(),
              viewDate.getMonth() + 1,
              0,
            ).getDate();

            const dayNum = i - firstDay + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
            const dStr = isCurrentMonth
              ? `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
              : "";
            const isSelected = isCurrentMonth && selectedDate === dStr;

            let disabled = false;
            if (isCurrentMonth) {
              if (minDate && dStr < minDate) disabled = true;
              if (maxDate && dStr > maxDate) disabled = true;
            }

            return (
              <div
                key={i}
                className="aspect-square flex items-center justify-center p-0.5"
              >
                {isCurrentMonth && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectDate(dStr)}
                    className={`w-full h-full flex items-center justify-center rounded-lg transition-colors cursor-pointer text-[10px] font-semibold ${
                      isSelected
                        ? "bg-[#3B82F6] text-white shadow-sm"
                        : disabled
                          ? "text-neutral-300 opacity-50 cursor-not-allowed"
                          : "bg-transparent text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {dayNum}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-50 border border-neutral-150 border-dashed rounded-2xl h-[240px]">
        <p className="text-sm text-neutral-400 font-medium">
          아직 체성분 기록이 없습니다.
        </p>
        <p className="text-xs text-neutral-400/80 mt-1">
          오늘의 체중과 체성분을 기록해 보세요!
        </p>
      </div>
    );
  }

  // Sort records chronological: oldest first for chart line
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
  );

  // Group records based on period
  type GroupedData = {
    [key: string]: {
      sum: any;
      count: number;
      maxTime: number;
      displayLabel: string;
      fullDate: string;
    };
  };
  const grouped: GroupedData = {};

  let groupingFormat = "DAILY";
  if (period === "YEARLY") groupingFormat = "YEARLY";
  else if (period === "ALL") groupingFormat = "MONTHLY";
  else if (period === "12M" || period === "6M") groupingFormat = "DAILY";

  // Helper to generate grouping keys
  const getGroupKeyInfos = (d: Date, format: string) => {
    let key = "";
    let displayLabel = "";
    let fullDate = "";

    if (format === "DAILY") {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      key = `${yyyy}-${mm}-${dd}`;
      displayLabel = `${mm}-${dd}`; // MM-DD
      fullDate = key;
    } else if (format === "WEEKLY") {
      const year = d.getFullYear();
      const firstDay = new Date(year, 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDay.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
      key = `${year}-W${weekNum}`;
      displayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      fullDate = `${year}년 ${weekNum}주차`;
    } else if (format === "MONTHLY") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      displayLabel = `${d.getMonth() + 1}월`;
      fullDate = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    } else if (format === "YEARLY") {
      key = `${d.getFullYear()}`;
      displayLabel = `${d.getFullYear()}년`;
      fullDate = `${d.getFullYear()}년`;
    } else {
      key = d.toISOString().split("T")[0];
      displayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      fullDate = d.toLocaleDateString();
    }
    return { key, displayLabel, fullDate };
  };

  const stTime = new Date(startDate).getTime();
  const edTime = new Date(endDate).getTime() + 86399999;

  // Pre-fill dummy bins across the active date range to maintain proportional axis scale and draw future expectations
  for (let currentMs = stTime; currentMs <= edTime; currentMs += 86400000) {
    const d = new Date(currentMs);
    const { key, displayLabel, fullDate } = getGroupKeyInfos(d, groupingFormat);
    if (!grouped[key]) {
      grouped[key] = {
        sum: { weight: 0, muscle: 0, fat: 0, fatPct: 0 },
        count: 0,
        maxTime: d.getTime(), // we will use the actual maxTime of records if any, otherwise this dummy time
        displayLabel,
        fullDate,
      };
    } else {
      grouped[key].maxTime = Math.max(grouped[key].maxTime, d.getTime());
    }
  }

  sortedRecords.forEach((rec) => {
    const d = new Date(rec.loggedAt);
    const dTime = d.getTime();
    if (dTime < stTime || dTime > edTime) return;

    const { key } = getGroupKeyInfos(d, groupingFormat);

    if (!grouped[key]) return; // Should be impossible because we pre-filled

    grouped[key].sum.weight += rec.weight || 0;
    grouped[key].sum.muscle += rec.skeletalMuscleMass || 0;
    grouped[key].sum.fat += rec.bodyFatMass || 0;
    grouped[key].sum.fatPct += rec.bodyFatPercentage || 0;
    grouped[key].count += 1;
    grouped[key].maxTime = Math.max(grouped[key].maxTime, d.getTime());
  });

  const startWeightRec = sortedRecords.find((r) => r.weight > 0);
  const startWeight =
    profile.currentWeight ||
    startWeightRec?.weight ||
    profile.targetWeight ||
    70;

  // Find absolute diet start date if available, or fallback to the first record ever
  const globalFirstRecord = [...records]
    .sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
    )
    .find((r) => r.weight > 0);
  const startWeightTime = profile.dietStartDate
    ? new Date(profile.dietStartDate).getTime()
    : globalFirstRecord
      ? new Date(globalFirstRecord.loggedAt).getTime()
      : Date.now();

  const weeklyTargetGrams = profile.weeklyWeightLossTarget ?? 500;
  const isGaining = profile.goalType === "bulk";
  const dailyTargetLossKg = weeklyTargetGrams / 1000 / 7;

  let prevYear: number | null = null;
  const chartData = Object.values(grouped)
    .sort((a, b) => a.maxTime - b.maxTime)
    .map((g) => {
      const daysSinceStart = Math.max(
        0,
        (g.maxTime - startWeightTime) / 86400000,
      );
      let expectedWeightChange = dailyTargetLossKg * daysSinceStart;
      if (!isGaining) {
        expectedWeightChange = -expectedWeightChange;
      }

      let expected = startWeight + expectedWeightChange;

      if (!isGaining && expected < profile.targetWeight)
        expected = profile.targetWeight;
      if (isGaining && expected > profile.targetWeight)
        expected = profile.targetWeight;
      if (profile.goalType === "maintain") expected = profile.targetWeight;

      // Build the date label dynamically: Year appears only on change or first item,
      // and date is formatted simply.
      const entryDate = new Date(g.maxTime);
      const y = entryDate.getFullYear();
      const m = entryDate.getMonth() + 1;
      const d = entryDate.getDate();

      let label = "";
      if (groupingFormat === "DAILY") {
        label = `${m}/${d}`;
      } else if (groupingFormat === "WEEKLY") {
        // displayLabel is like '42주차'
        label = g.displayLabel;
      } else if (groupingFormat === "MONTHLY") {
        label = `${m}월`;
      } else {
        label = `${y}년`;
      }

      // prepend year if it changed
      if (prevYear !== y && groupingFormat !== "YEARLY") {
        label = `${y}년 ${label}`;
        prevYear = y;
      }

      return {
        date: label,
        fullDate: g.fullDate,
        weight:
          g.sum.weight > 0 ? Number((g.sum.weight / g.count).toFixed(1)) : null,
        muscle:
          g.sum.muscle > 0 ? Number((g.sum.muscle / g.count).toFixed(1)) : null,
        fat: g.sum.fat > 0 ? Number((g.sum.fat / g.count).toFixed(1)) : null,
        fatPct:
          g.sum.fatPct > 0 ? Number((g.sum.fatPct / g.count).toFixed(1)) : null,
        expected: expected,
      };
    });

  const getCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 border border-neutral-100 rounded-xl shadow-lg text-xs leading-5">
          <p className="font-bold text-[#1E293B] mb-1">
            {payload[0].payload.fullDate}
          </p>
          {payload.map((entry: any) => {
            let label = "";
            let unit = "";
            let color = entry.color;
            if (entry.name === "weight") {
              label = "체중";
              unit = "kg";
            } else if (entry.name === "muscle") {
              label = "골격근량";
              unit = "kg";
            } else if (entry.name === "fat") {
              label = "체지방량";
              unit = "kg";
            } else if (entry.name === "fatPct") {
              label = "체지방률";
              unit = "%";
            } else if (entry.name === "expected") {
              label = "체중예상";
              unit = "kg";
            }

            return (
              <p
                key={entry.name}
                style={{ color }}
                className="font-extrabold font-mono text-[11px]"
              >
                {label}:{" "}
                {typeof entry.value === "number"
                  ? entry.value.toFixed(1)
                  : entry.value}
                {unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const toggleLine = (metric: string) => {
    setVisibleLines((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const handlePeriodChange = (p: TimeHorizon) => {
    setPeriod(p);
    const startWeightRecOrigin = [...records]
      .sort(
        (a, b) =>
          new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
      )
      .find((r) => r.weight > 0);
    const startOriginTime = profile.dietStartDate
      ? new Date(profile.dietStartDate).getTime()
      : startWeightRecOrigin
        ? new Date(startWeightRecOrigin.loggedAt).getTime()
        : Date.now();
    const durationMs = (profile.dietDurationWeeks ?? 8) * 7 * 86400000;
    const dietEndMs = startOriginTime + durationMs;
    const end = new Date(Math.max(Date.now(), dietEndMs));
    const start = new Date();

    if (p === "3M") {
      start.setMonth(start.getMonth() - 3);
    } else if (p === "6M") {
      start.setMonth(start.getMonth() - 6);
    } else if (p === "12M") {
      start.setFullYear(start.getFullYear() - 1);
    } else if (p === "ALL" || p === "YEARLY") {
      // Find the earliest record or default to 3 years
      const sorted = [...records].sort(
        (a, b) =>
          new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
      );
      if (sorted.length > 0) {
        start.setTime(new Date(sorted[0].loggedAt).getTime() - 86400000); // 1 day before earliest
      } else {
        start.setFullYear(start.getFullYear() - 3);
      }
    }
    const newStartStr = start.toISOString().split("T")[0];
    const newEndStr = end.toISOString().split("T")[0];
    setStartDate(newStartStr);
    setEndDate(newEndStr);
    setTempStartDate(newStartStr);
    setTempEndDate(newEndStr);
    setCalendarViewDateStart(new Date(newStartStr));
    setCalendarViewDateEnd(new Date(newEndStr));
  };

  return (
    <div className="bg-white border border-neutral-150 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col gap-3 mb-4">
        {/* Title and Controls Row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 relative">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-neutral-800 whitespace-nowrap">
              목표차트
            </h3>
            {profile.targetWeight > 0 && (
              <span className="bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded border border-emerald-100 text-[10px] whitespace-nowrap">
                목표체중 {profile.targetWeight}kg
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 relative">
            {/* Period groupings */}
            <div className="flex bg-neutral-100 dark:bg-slate-800 rounded-lg p-1 border border-neutral-200 dark:border-slate-700">
              {(["3M", "6M", "12M", "ALL", "YEARLY"] as TimeHorizon[]).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors font-semibold ${
                      period === p
                        ? "bg-white dark:bg-slate-700 text-neutral-800 dark:text-white shadow-xs"
                        : "text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {p === "3M"
                      ? "최근"
                      : p === "6M"
                        ? "6개월"
                        : p === "12M"
                          ? "12개월"
                          : p === "ALL"
                            ? "전체"
                            : "연도별"}
                  </button>
                ),
              )}
            </div>

            <button
              onClick={() => {
                if (!isDateRangeOpen) {
                  setTempStartDate(startDate);
                  setTempEndDate(endDate);
                }
                setIsDateRangeOpen(!isDateRangeOpen);
                setIsCalendarPopupOpen(false);
              }}
              className={`flex items-center gap-1 border px-2 py-1 rounded-lg transition-colors font-semibold text-[10px] whitespace-nowrap ${
                isDateRangeOpen
                  ? "border-[#3B82F6] bg-[#EFF6FF] text-[#3B82F6]"
                  : "border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-neutral-600 dark:text-slate-300 hover:bg-neutral-100"
              }`}
            >
              <Calendar className="w-3 h-3" /> 기간설정
            </button>
          </div>
        </div>

        {/* Date Range Selection Panel */}
        {isDateRangeOpen && (
          <div className="flex flex-col gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-neutral-600">
                조회 기간 상세 설정
              </span>
              <button
                onClick={() => {
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  setIsDateRangeOpen(false);
                }}
                className="bg-[#3B82F6] hover:bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition-colors shadow-sm active:scale-95"
              >
                확인
              </button>
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-4">
              <div className="flex flex-col gap-1 items-center">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] bg-blue-50 px-2 py-1 rounded-md">
                  시작일{" "}
                  <span className="font-mono font-medium text-neutral-600 ml-1">
                    {tempStartDate}
                  </span>
                </span>
                {renderCalendar(
                  calendarViewDateStart,
                  setCalendarViewDateStart,
                  tempStartDate,
                  (d) => {
                    setTempStartDate(d);
                    setCalendarViewDateStart(new Date(d));
                  },
                  undefined,
                  tempEndDate,
                )}
              </div>
              <div className="hidden md:flex items-center justify-center">
                <span className="text-neutral-300 font-bold">~</span>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] bg-blue-50 px-2 py-1 rounded-md">
                  종료일{" "}
                  <span className="font-mono font-medium text-neutral-600 ml-1">
                    {tempEndDate}
                  </span>
                </span>
                {renderCalendar(
                  calendarViewDateEnd,
                  setCalendarViewDateEnd,
                  tempEndDate,
                  (d) => {
                    setTempEndDate(d);
                    setCalendarViewDateEnd(new Date(d));
                  },
                  tempStartDate,
                  undefined,
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-neutral-400 font-bold text-center">
          💡 아래 범례 버튼을 누르면 그래프 선을 켜고 끌 수 있습니다.
        </p>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f1f1"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#888" }}
              axisLine={false}
              tickLine={false}
              dy={5}
              minTickGap={25}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#888" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              dx={5}
            />
            <Tooltip content={getCustomTooltip} />

            {/* Target Weight Reference Line */}
            {(visibleLines.weight || visibleLines.expected) &&
            profile.targetWeight > 0 ? (
              <ReferenceLine
                y={profile.targetWeight}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: `목표체중 ${profile.targetWeight}kg`,
                  fill: "#10b981",
                  position: "top",
                  fontSize: 9,
                  fontWeight: "bold",
                }}
              />
            ) : null}

            {/* Expected Line (예상곡선) - Thicker, Indigo line */}
            {visibleLines.expected && (
              <Line
                type="linear"
                dataKey="expected"
                name="expected"
                stroke="#6366f1"
                strokeWidth={3.5}
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}

            {/* Weights Line */}
            {visibleLines.weight && (
              <Line
                type="monotone"
                dataKey="weight"
                name="weight"
                stroke="#1e293b" // slate-800
                strokeWidth={2}
                connectNulls={true}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Muscle Line */}
            {visibleLines.muscle && (
              <Line
                type="monotone"
                dataKey="muscle"
                name="muscle"
                stroke="#2563eb" // blue-600
                strokeWidth={2}
                connectNulls={true}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Fat Mass Line */}
            {visibleLines.fat && (
              <Line
                type="monotone"
                dataKey="fat"
                name="fat"
                stroke="#dc2626" // red-600
                strokeWidth={2}
                connectNulls={true}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Fat Percentage Line */}
            {visibleLines.fatPct && (
              <Line
                type="monotone"
                dataKey="fatPct"
                name="fatPct"
                stroke="#d97706" // amber-600
                strokeWidth={1.5}
                connectNulls={true}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend Controls - Flexible layout with centered symmetric distribution */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-4 border-t border-neutral-100 pt-3">
        <button
          type="button"
          onClick={() => toggleLine("weight")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap text-[10.5px] ${
            visibleLines.weight
              ? "border-slate-800 bg-slate-50 text-slate-900 font-extrabold shadow-xs"
              : "border-neutral-200 bg-white text-neutral-400 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#1e293b]" />
          <span>체중 (kg)</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLine("expected")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap text-[10.5px] ${
            visibleLines.expected
              ? "border-indigo-600 bg-indigo-50/60 text-indigo-700 font-extrabold shadow-xs"
              : "border-neutral-200 bg-white text-neutral-400 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
          <span>체중예상 (kg)</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLine("muscle")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap text-[10.5px] ${
            visibleLines.muscle
              ? "border-blue-600 bg-blue-50 text-blue-700 font-extrabold shadow-xs"
              : "border-neutral-200 bg-white text-neutral-400 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          <span>골격근 (kg)</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLine("fat")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap text-[10.5px] ${
            visibleLines.fat
              ? "border-red-600 bg-red-50 text-red-700 font-extrabold shadow-xs"
              : "border-neutral-200 bg-white text-neutral-400 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
          <span>체지방 (kg)</span>
        </button>

        <button
          type="button"
          onClick={() => toggleLine("fatPct")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap text-[10.5px] ${
            visibleLines.fatPct
              ? "border-amber-600 bg-amber-50 text-amber-700 font-extrabold shadow-xs"
              : "border-neutral-200 bg-white text-neutral-400 font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#d97706]" />
          <span>체지방률 (%)</span>
        </button>
      </div>
    </div>
  );
}
