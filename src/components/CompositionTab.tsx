import React, { useState } from "react";
import { Plus, Upload, Trash2 } from "lucide-react";
import { HealthRecord } from "../types";
import NumberAdjuster from "./NumberAdjuster";

interface CompositionTabProps {
  records: HealthRecord[];
  isAddingComp: boolean;
  setIsAddingComp: (val: boolean) => void;
  editingCompId: string | null;
  setEditingCompId: (val: string | null) => void;
  compDate: string;
  setCompDate: (val: string) => void;
  compWeight: number;
  setCompWeight: (val: number) => void;
  compMuscle: number;
  setCompMuscle: (val: number) => void;
  compFatPct: number;
  setCompFatPct: (val: number) => void;
  handleInbodyUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdateHealthRecord: () => void;
  handleAddHealthRecord: () => void;
  handleEditRecord: (rec: HealthRecord) => void;
  handleDeleteRecord: (id: string) => void;
  uiLoading: boolean;
}

export default function CompositionTab({
  records,
  isAddingComp,
  setIsAddingComp,
  editingCompId,
  setEditingCompId,
  compDate,
  setCompDate,
  compWeight,
  setCompWeight,
  compMuscle,
  setCompMuscle,
  compFatPct,
  setCompFatPct,
  handleInbodyUpload,
  handleUpdateHealthRecord,
  handleAddHealthRecord,
  handleEditRecord,
  handleDeleteRecord,
  uiLoading,
}: CompositionTabProps) {
  const [expandedSection, setExpandedSection] = useState<"recent" | string>("recent");
  const [viewLimit, setViewLimit] = useState<number>(20);

  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const recentRecords = records.filter(r => new Date(r.loggedAt).getTime() >= threeMonthsAgo.getTime());
  const olderRecords = records.filter(r => new Date(r.loggedAt).getTime() < threeMonthsAgo.getTime());
  const olderYears = Array.from(new Set(olderRecords.map(r => new Date(r.loggedAt).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));

  const sections = [
    { id: "recent", title: "최근 3개월 기록 히스토리", count: recentRecords.length, data: recentRecords },
    ...olderYears.map(year => {
      const yearRecords = olderRecords.filter(r => new Date(r.loggedAt).getFullYear().toString() === year);
      return { id: year, title: `${year}년 기록 히스토리`, count: yearRecords.length, data: yearRecords };
    })
  ].filter(s => s.count > 0);

  const handleToggleSection = (id: string) => {
    if (expandedSection === id) {
      setExpandedSection("");
    } else {
      setExpandedSection(id);
      setViewLimit(20);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Add body record panel clicker button */}
      {!isAddingComp ? (
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={() => setIsAddingComp(true)}
            className="flex-1 flex items-center justify-center gap-1 bg-slate-900 text-white h-11 text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-98 transition-all hover:bg-slate-800"
            id="btn-open-bodycomp-form"
          >
            <Plus className="w-4 h-4 text-[#3B82F6]" /> 직접 등록
          </button>
          <label className="flex-1 flex items-center justify-center gap-1 bg-neutral-100 text-[#1E293B] border border-[#E2E8F0] h-11 text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-98 transition-all hover:bg-neutral-200">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleInbodyUpload}
            />
            <Upload className="w-4 h-4 text-[#1E293B]" /> 인바디 데이터 업로드
          </label>
        </div>
      ) : (
        <div className="bg-white border border-neutral-150 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
            <span className="text-xs font-extrabold text-neutral-800">
              {editingCompId ? "체성분 기록 수정" : "체성분 신규 등록"}
            </span>
            <button
              onClick={() => {
                setIsAddingComp(false);
                setEditingCompId(null);
              }}
              className="text-neutral-400 hover:text-neutral-600 text-xs font-semibold cursor-pointer"
            >
              취소
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-neutral-700">
                측정 일자
              </label>
              <input
                type="date"
                value={compDate}
                onChange={(e) => setCompDate(e.target.value)}
                className="w-full text-xs h-10 border border-neutral-200 rounded-xl px-3 outline-none focus:border-[#3B82F6] transition-colors"
              />
            </div>

            <NumberAdjuster
              value={compWeight}
              onChange={setCompWeight}
              label="체중 (Weight)"
              unit="kg"
              min={30}
              max={200}
              stepDecimal={1}
            />

            <NumberAdjuster
              value={compMuscle}
              onChange={setCompMuscle}
              label="골격근량 (SMM)"
              unit="kg"
              min={5}
              max={80}
              stepDecimal={1}
            />

            <NumberAdjuster
              value={compFatPct}
              onChange={setCompFatPct}
              label="체지방률 (BFP)"
              unit="%"
              min={3}
              max={60}
              stepDecimal={1}
            />

            <p className="text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded-lg leading-4">
              💡 <strong>안내:</strong> 인바디 등록 후 일주일간은
              체성분이 크게 변하지 않으므로 잦은 변경을 권장하지 않습니다.
              <br />* 체성분을 등록해도 <strong>1일 목표 칼로리</strong>
              는 바로 변경되지 않으며, 프로필 [주간 자동 칼로리 갱신]
              설정에 따라 지정된 요일에 갱신됩니다.
            </p>

            <button
              onClick={editingCompId ? handleUpdateHealthRecord : handleAddHealthRecord}
              disabled={uiLoading}
              className="w-full h-11 bg-slate-900 text-white text-xs font-extrabold rounded-xl hover:bg-slate-800 transition-all active:scale-98 cursor-pointer shadow-sm"
              id="submit-bodycomp-btn"
            >
              {editingCompId ? "수정 사항 저장" : "체성분 등록"}
            </button>
          </div>
        </div>
      )}

      {/* Composition histories log */}
      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 mt-2">
        {records.length === 0 ? (
          <div className="p-8 text-center bg-white border border-neutral-150 rounded-2xl">
            <p className="text-xs text-neutral-400 font-medium">
              아직 등록된 기록이 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((section) => {
              const isExpanded = expandedSection === section.id;
              const displayedRecords = section.data.slice(0, isExpanded ? viewLimit : 0);

              return (
                <div key={section.id} className="bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                  <button
                    onClick={() => handleToggleSection(section.id)}
                    className="w-full flex justify-between items-center p-4 bg-white hover:bg-neutral-50 transition-colors text-left"
                  >
                    <span className="text-xs font-bold text-neutral-700">
                      {section.title} ({section.count})
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-neutral-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="p-3 flex flex-col gap-2 border-t border-neutral-100">
                      {displayedRecords.map((rec) => {
                        const d = new Date(rec.loggedAt);
                        return (
                          <div
                            key={rec.id}
                            className="bg-white border border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] rounded-xl p-3.5 flex justify-between items-center"
                            id={`record-item-${rec.id}`}
                          >
                            <div>
                              <p className="text-neutral-800 font-extrabold text-xs">
                                {d.toLocaleDateString()}
                              </p>
                              <div className="flex gap-3 text-[10.5px] mt-1.5 font-mono text-neutral-500 font-medium tracking-tight">
                                <span>
                                  체중:{" "}
                                  <strong className="text-neutral-700">
                                    {rec.weight}kg
                                  </strong>
                                </span>
                                {rec.skeletalMuscleMass && (
                                  <span>
                                    골격근:{" "}
                                    <strong className="text-neutral-700">
                                      {rec.skeletalMuscleMass}kg
                                    </strong>
                                  </span>
                                )}
                                {rec.bodyFatPercentage && (
                                  <span>
                                    지방률:{" "}
                                    <strong className="text-neutral-700">
                                      {rec.bodyFatPercentage}%
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleEditRecord(rec)}
                                className="p-2 text-neutral-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                id={`btn-edit-record-${rec.id}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec.id!)}
                                className="p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                id={`btn-del-record-${rec.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Pagination Button */}
                      {section.count > viewLimit && (
                        <button
                          onClick={() => setViewLimit((v) => v + 20)}
                          className="w-full py-3 mt-1 bg-white border border-neutral-200 text-neutral-600 text-[11px] font-bold rounded-xl hover:bg-neutral-50 transition-colors shadow-sm"
                        >
                          + 20개 더 보기 ({viewLimit} / {section.count})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

