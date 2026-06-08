import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { HealthRecord } from '../types';

interface TrendChartProps {
  records: HealthRecord[];
  targetWeight: number;
}

type MetricType = 'all' | 'weight' | 'muscle' | 'fat' | 'fatPct';

export default function TrendChart({ records, targetWeight }: TrendChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('all');

  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-50 border border-neutral-150 border-dashed rounded-2xl h-[240px]">
        <p className="text-sm text-neutral-400 font-medium">아직 체성분 기록이 없습니다.</p>
        <p className="text-xs text-neutral-400/80 mt-1">오늘의 체중과 체성분을 기록해 보세요!</p>
      </div>
    );
  }

  // Sort records chronological: oldest first for chart line
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );

  // Map to chart format
  const chartData = sortedRecords.map(rec => {
    const d = new Date(rec.loggedAt);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      fullDate: d.toLocaleDateString(),
      weight: rec.weight,
      muscle: rec.skeletalMuscleMass || null,
      fat: rec.bodyFatMass || null,
      fatPct: rec.bodyFatPercentage || null,
    };
  });

  const getCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 border border-neutral-100 rounded-xl shadow-lg text-xs leading-5">
          <p className="font-bold text-neutral-800 mb-1">{payload[0].payload.fullDate}</p>
          {payload.map((entry: any) => {
            let label = '';
            let unit = '';
            let color = entry.color;
            if (entry.name === 'weight') { label = '체중'; unit = 'kg'; }
            else if (entry.name === 'muscle') { label = '골격근량'; unit = 'kg'; }
            else if (entry.name === 'fat') { label = '체지방량'; unit = 'kg'; }
            else if (entry.name === 'fatPct') { label = '체지방률'; unit = '%'; }

            return (
              <p key={entry.name} style={{ color }} className="font-medium font-mono">
                {label}: {entry.value} {unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-neutral-150 rounded-2xl p-4 shadow-xs">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-neutral-800">체성분 변화 차트</h3>
          {targetWeight > 0 && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
              목표: {targetWeight}kg
            </span>
          )}
        </div>

        {/* Metric selection tabs to prevent overlapping graphs on narrow phones */}
        <div className="flex flex-wrap gap-1 bg-neutral-100/70 p-0.5 rounded-lg">
          {(
            [
              { id: 'all', name: '전체' },
              { id: 'weight', name: '체중' },
              { id: 'muscle', name: '골격근' },
              { id: 'fat', name: '체지방' },
              { id: 'fatPct', name: '지방률%' }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMetric(tab.id)}
              className={`flex-1 text-[11px] font-medium py-1.5 px-1 rounded-md transition-all touch-manipulation cursor-pointer text-center ${
                activeMetric === tab.id
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/50'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id={`tab-metric-${tab.id}`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#888' }} 
              axisLine={false} 
              tickLine={false}
              dy={5}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#888' }} 
              axisLine={false} 
              tickLine={false}
              domain={['auto', 'auto']}
              dx={5}
            />
            <Tooltip content={getCustomTooltip} />
            
            {/* Target Weight Reference Line */}
            {activeMetric === 'weight' || activeMetric === 'all' ? (
              <ReferenceLine 
                y={targetWeight} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                label={{ value: `목표 ${targetWeight}kg`, fill: '#10b981', position: 'top', fontSize: 9, fontWeight: 'bold' }} 
              />
            ) : null}

            {/* Weights Line */}
            {(activeMetric === 'weight' || activeMetric === 'all') && (
              <Line
                type="monotone"
                dataKey="weight"
                name="weight"
                stroke="#1e293b" // slate-800
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Muscle Line */}
            {(activeMetric === 'muscle' || activeMetric === 'all') && (
              <Line
                type="monotone"
                dataKey="muscle"
                name="muscle"
                stroke="#2563eb" // blue-600
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Fat Mass Line */}
            {(activeMetric === 'fat' || activeMetric === 'all') && (
              <Line
                type="monotone"
                dataKey="fat"
                name="fat"
                stroke="#dc2626" // red-600
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Fat Percentage Line */}
            {(activeMetric === 'fatPct' || activeMetric === 'all') && (
              <Line
                type="monotone"
                dataKey="fatPct"
                name="fatPct"
                stroke="#d97706" // amber-600
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 justify-center mt-3 flex-wrap">
        {(activeMetric === 'weight' || activeMetric === 'all') && (
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-slate-800 rounded-sm" />
            <span className="text-[10px] font-medium text-neutral-500">체중 (kg)</span>
          </div>
        )}
        {(activeMetric === 'muscle' || activeMetric === 'all') && (
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-blue-600 rounded-sm" />
            <span className="text-[10px] font-medium text-neutral-500">골격근량 (kg)</span>
          </div>
        )}
        {(activeMetric === 'fat' || activeMetric === 'all') && (
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-red-600 rounded-sm" />
            <span className="text-[10px] font-medium text-neutral-500">체지방량 (kg)</span>
          </div>
        )}
        {(activeMetric === 'fatPct' || activeMetric === 'all') && (
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-amber-600 rounded-sm" />
            <span className="text-[10px] font-medium text-neutral-500">체지방률 (%)</span>
          </div>
        )}
      </div>
    </div>
  );
}
