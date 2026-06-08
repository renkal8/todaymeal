import React, { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './lib/firebase';
import { dbService } from './services/dbService';
import { UserProfile, HealthRecord, FoodLog, FastingLog } from './types';
import { generateWeeklyFeedback } from './utils/dietCalculator';
import { Reorder, useDragControls } from 'motion/react';

// Clean UI Components
import FastingWidget from './components/FastingWidget';
import ProfileForm from './components/ProfileForm';
import MealLogger from './components/MealLogger';
import TrendChart from './components/TrendChart';
import NumberAdjuster from './components/NumberAdjuster';
import CopyMealsModal from './components/CopyMealsModal';
import FastingTracker from './components/FastingTracker';

// Lucide Icons
import {
  Sparkles,
  User as UserIcon,
  LogOut,
  TrendingUp,
  Beef,
  Plus,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  CheckCircle2,
  Lock,
  Scale,
  Smile,
  Timer,
  Moon,
  Sun,
  Sunrise,
  Cookie,
  ArrowUp,
  ArrowDown,
  Menu,
  ListRestart,
  Edit2,
  X,
  Check
} from 'lucide-react';

import MealRoutineEditor from './components/MealRoutineEditor';

interface MealGroupItemProps {
  key?: string;
  groupKey: string;
  foodLogs: FoodLog[];
  customName?: string;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  handleDeleteFoodLog: (id: string) => Promise<void> | void;
  onStartEditFoodLog?: (log: FoodLog) => void;
  setActiveMealTime: (id: any) => void;
}

// Meal Group Component using Framer Motion Reorder explicitly to allow only snack dragging
function MealGroupItem({ 
  groupKey, foodLogs, customName, onRename, onDelete, handleDeleteFoodLog, onStartEditFoodLog, setActiveMealTime 
}: MealGroupItemProps) {
  const isCustom = !['breakfast', 'lunch', 'dinner', 'snack'].includes(groupKey);
  const getGroupInfo = (key: string) => {
    const defaultGroups: Record<string, { id: string, title: string, icon: string }> = {
      'breakfast': { id: 'breakfast', title: '아침 식사', icon: '☀️' },
      'lunch': { id: 'lunch', title: '점심 식사', icon: '🍲' },
      'dinner': { id: 'dinner', title: '저녁 식사', icon: '🌙' },
      'snack': { id: 'snack', title: '간식', icon: '🍪' }
    };
    if (defaultGroups[key]) return defaultGroups[key];
    if (key.startsWith('meal_')) return { id: key, title: customName || `추가 식사 ${key.split('_')[1]}`, icon: '🍱' };
    if (key.startsWith('snack_')) return { id: key, title: customName || `추가 간식 ${key.split('_')[1]}`, icon: '🧁' };
    return { id: key, title: customName || '식사', icon: '🍽️' };
  };

  const group = getGroupInfo(groupKey);
  const isSnack = groupKey.includes('snack');
  
  const groupLogs = foodLogs.filter(log => log.mealTime === group.id || (!log.mealTime && group.id === 'snack'));
  const groupCals = groupLogs.reduce((sum, item) => sum + item.calories, 0);
  
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={groupKey}
      id={groupKey}
      dragListener={false}
      dragControls={controls}
      className={`bg-white dark:bg-slate-900 border ${isSnack ? 'border-[#3B82F6] z-10' : 'border-[#E2E8F0] dark:border-slate-800'} rounded-[20px] shadow-xs overflow-hidden`}
    >
      <div className={`flex justify-between items-center p-3.5 bg-[#F8FAFC] dark:bg-slate-800/50 border-b ${isSnack ? 'border-[#DBEAFE] dark:border-slate-700' : 'border-[#F1F5F9] dark:border-slate-800'}`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-lg w-8 h-8 bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-[#E2E8F0] dark:border-slate-700">
             {group.icon}
          </div>
          {isCustom ? (
            <input 
              type="text" 
              value={group.title}
              onChange={(e) => onRename(groupKey, e.target.value)}
              className="text-sm font-black text-[#1E293B] dark:text-white bg-transparent border-none outline-none w-24 focus:border-b focus:border-blue-500" 
            />
          ) : (
            <span className="text-sm font-black text-[#1E293B] dark:text-white ml-1">{group.title}</span>
          )}
          {groupCals > 0 && <span className="text-xs font-extrabold text-[#3B82F6] font-mono ml-1">{groupCals} kcal</span>}
        </div>
        
        <div className="flex items-center gap-1">
          {isCustom && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDelete(groupKey)} 
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {(isSnack || isCustom) && (
             <div 
               className="cursor-grab active:cursor-grabbing p-1 text-[#3B82F6] hover:text-blue-700 rounded touch-none" 
               onPointerDown={(e) => controls.start(e)}
             >
                <Menu className="w-5 h-5" />
             </div>
          )}
          <button
            onClick={() => setActiveMealTime(group.id as any)}
            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-full text-[#3B82F6] hover:bg-[#EFF6FF] dark:hover:bg-slate-700 cursor-pointer shadow-sm active:scale-95 transition-all ml-1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-2 flex flex-col gap-1.5">
        {groupLogs.length === 0 ? (
          <div 
            onClick={() => setActiveMealTime(group.id as any)}
            className="flex flex-col items-center justify-center py-5 px-4 bg-slate-50/50 dark:bg-slate-800/10 rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-800 hover:border-[#3B82F6] hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30 cursor-pointer transition-all duration-200"
          >
            <p className="text-xs text-[#94A3B8] font-bold">아직 등록된 음식이 없어요.</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMealTime(group.id as any);
              }}
              className="mt-2.5 px-3.5 py-1.5 bg-white dark:bg-slate-700 text-[#3B82F6] border border-[#E2E8F0] dark:border-slate-600 rounded-xl text-xs font-black shadow-2xs hover:bg-[#EFF6FF] dark:hover:bg-slate-600 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              음식 추가하기
            </button>
          </div>
        ) : (
          <>
            {groupLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-[#F1F5F9] dark:border-slate-800/50 rounded-xl p-3 shadow-xs hover:border-[#E2E8F0] dark:hover:border-slate-700 transition-colors">
                <div className="min-w-0 flex-1 flex items-start gap-2">
                  <span className="text-base select-none mt-0.5">{log.icon || '✨'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-[#1E293B] dark:text-neutral-200 truncate pr-2">{log.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10.5px] font-mono font-bold text-[#64748B] dark:text-slate-400">{log.grams}g</span>
                      <span className="w-1 h-1 rounded-full bg-[#CBD5E1] dark:bg-slate-700" />
                      <span className="text-[10.5px] font-mono font-black text-[#1E293B] dark:text-white">{log.calories} kcal</span>
                    </div>
                    <div className="flex gap-2.5 text-[9px] font-mono font-bold text-[#94A3B8] dark:text-slate-400 mt-1.5">
                      <span>탄 <span className="text-[#3B82F6]">{Math.round(log.carbs)}g</span></span>
                      <span>단 <span className="text-[#10B981]">{Math.round(log.protein)}g</span></span>
                      <span>지 <span className="text-[#F43F5E]">{Math.round(log.fat)}g</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 items-center flex-shrink-0 ml-2">
                  <button
                    onClick={() => onStartEditFoodLog && onStartEditFoodLog(log)}
                    className="p-2 text-[#94A3B8] hover:text-[#3B82F6] rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFoodLog(log.id!)}
                    className="p-2 text-[#94A3B8] hover:text-rose-500 rounded-xl cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setActiveMealTime(group.id as any)}
              className="mt-1 h-10 w-full border border-dashed border-[#E2E8F0] dark:border-slate-700 text-neutral-500 dark:text-slate-400 hover:text-[#3B82F6] hover:border-[#3B82F6] dark:hover:text-[#3B82F6] rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-98"
            >
              <Plus className="w-4 h-4 text-[#3B82F6]" />
              <span>음식 더 추가하기</span>
            </button>
          </>
        )}
      </div>
    </Reorder.Item>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  // Core Data Lists
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [fastingLogs, setFastingLogs] = useState<FastingLog[]>([]);
  const [activeFast, setActiveFast] = useState<FastingLog | null>(null);

  // Calendar
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<Record<string, number>>({});
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  // States
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'composition' | 'profile' | 'routine' | 'fasting'>('dashboard');

  const [mealOrder, setMealOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('mealOrder');
    if (saved) return JSON.parse(saved);
    return ['breakfast', 'lunch', 'dinner', 'snack'];
  });
  const [customNames, setCustomNames] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('customNames');
    if (saved) return JSON.parse(saved);
    return {};
  });
  const [isReorderingMeals, setIsReorderingMeals] = useState<boolean>(false);

  const moveMeal = (index: number, direction: -1 | 1) => {
    const newOrder = [...mealOrder];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[swapIdx];
    newOrder[swapIdx] = temp;
    setMealOrder(newOrder);
    localStorage.setItem('mealOrder', JSON.stringify(newOrder));
  };

  // Interactive Adding Forms
  const [uiLoading, setUiLoading] = useState<boolean>(false);
  const [isAddingComp, setIsAddingComp] = useState<boolean>(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [activeMealTime, setActiveMealTime] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);

  // States for food log editing modal
  const [editingFoodLog, setEditingFoodLog] = useState<FoodLog | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editGrams, setEditGrams] = useState<number>(100);
  const [editCalories, setEditCalories] = useState<number>(0);
  const [editCarbs, setEditCarbs] = useState<number>(0);
  const [editProtein, setEditProtein] = useState<number>(0);
  const [editFat, setEditFat] = useState<number>(0);

  // Quick state for body comp manual adjusts
  const [compWeight, setCompWeight] = useState<number>(64.5);
  const [compMuscle, setCompMuscle] = useState<number>(24.0);
  const [compFatPct, setCompFatPct] = useState<number>(28.0);
  const [compDate, setCompDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Dark Mode Toggle Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        await loadUserData(currentUser.uid);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Logged Foods when Date or User changes
  useEffect(() => {
    if (user && profile) {
      loadDayFoods();
    }
  }, [user, profile, selectedDate]);

  // Load user data from Firestore
  const loadUserData = async (uid: string) => {
    setProfileLoading(true);
    try {
      const prof = await dbService.getUserProfile(uid);
      setProfile(prof);

      if (prof) {
        // Load accompanying history
        const recs = await dbService.getHealthRecords(uid);
        setRecords(recs);

        const fasts = await dbService.getFastingLogs(uid);
        setFastingLogs(fasts);

        const currentActiveFast = await dbService.getActiveFastingLog(uid);
        setActiveFast(currentActiveFast);

        // Prepopulate current stats in body comp form standard sliders
        if (recs.length > 0) {
          setCompWeight(recs[0].weight);
          setCompMuscle(recs[0].skeletalMuscleMass || 24.0);
          setCompFatPct(recs[0].bodyFatPercentage || 28.0);
        } else {
          setCompWeight(prof.currentWeight);
          setCompMuscle(prof.skeletalMuscleMass || 24.0);
          setCompFatPct(prof.bodyFatPercentage || 28.0);
        }

        // Auto Weekly Calibration Check
        if (prof.weeklyUpdateEnabled && prof.weeklyUpdateDay !== undefined) {
          const now = new Date();
          // if today is the designated update day AND the last update was more than 1 day ago (to prevent infinite loops or double updates today)
          const lastUpdate = new Date(prof.updatedAt);
          const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
          if (now.getDay() === prof.weeklyUpdateDay && timeSinceUpdate > 24 * 60 * 60 * 1000) {
            // We need to run calibration.
            const feedback = generateWeeklyFeedback(prof, recs);
            if (feedback && feedback.recommendedCalories !== prof.targetCalories) {
               // Fire and forget update
               dbService.saveUserProfile(uid, {
                 ...prof,
                 targetCalories: feedback.recommendedCalories,
                 targetCarbs: feedback.recommendedCarbs,
                 targetProtein: feedback.recommendedProtein,
                 targetFat: feedback.recommendedFat,
                 updatedAt: now.toISOString()
               }).then(() => {
                 setProfile(prev => prev ? {
                   ...prev,
                   targetCalories: feedback.recommendedCalories,
                   targetCarbs: feedback.recommendedCarbs,
                   targetProtein: feedback.recommendedProtein,
                   targetFat: feedback.recommendedFat,
                   updatedAt: now.toISOString()
                 } : prev);
                 alert('주간 자동 칼로리 갱신이 완료되었습니다. (목표 칼로리가 변경되었습니다)');
               }).catch(console.error);
            } else if (feedback) {
               // Update the timestamp so it doesn't try again today
               dbService.saveUserProfile(uid, {
                 ...prof,
                 updatedAt: now.toISOString()
               }).catch(console.error);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadDayFoods = async () => {
    if (!user) return;
    try {
      const logs = await dbService.getFoodLogs(user.uid, selectedDate);
      setFoodLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user || !isCalendarOpen) return;
    const fetchSummary = async () => {
      const yearMonth = selectedDate.substring(0, 7);
      const summary = await dbService.getMonthFoodSummary(user.uid, yearMonth);
      setMonthlySummary(summary);
    };
    fetchSummary();
  }, [user, isCalendarOpen, selectedDate]);

  // Google Login popup
  const handleGoogleLogin = async () => {
    setUiLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Social login failed:", err);
    } finally {
      setUiLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // Save new profile onboarding
  const handleSaveProfile = async (profileData: Omit<UserProfile, 'userId'>) => {
    if (!user) return;
    setUiLoading(true);
    try {
      await dbService.saveUserProfile(user.uid, profileData);
      
      // Seed first health record if empty
      const existingRecs = await dbService.getHealthRecords(user.uid);
      if (existingRecs.length === 0) {
        await dbService.addHealthRecord(user.uid, {
          weight: profileData.currentWeight,
          skeletalMuscleMass: profileData.skeletalMuscleMass,
          bodyFatPercentage: profileData.bodyFatPercentage,
          bodyFatMass: profileData.bodyFatPercentage && profileData.currentWeight 
            ? (profileData.currentWeight * profileData.bodyFatPercentage) / 100 
            : undefined,
          loggedAt: new Date().toISOString()
        });
      }
      
      await loadUserData(user.uid);
      setIsEditingProfile(false);
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다: ' + (err as Error).message);
    } finally {
      setUiLoading(false);
    }
  };

  // Add Health composition record
  const handleAddHealthRecord = async () => {
    if (!user) return;
    setUiLoading(true);
    try {
      const bfm = (compWeight * compFatPct) / 100;
      await dbService.addHealthRecord(user.uid, {
        weight: compWeight,
        skeletalMuscleMass: compMuscle > 0 ? compMuscle : undefined,
        bodyFatPercentage: compFatPct > 0 ? compFatPct : undefined,
        bodyFatMass: compFatPct > 0 ? bfm : undefined,
        loggedAt: new Date(compDate).toISOString()
      });

      // Update current profile weight synchronously as well
      if (profile) {
        await dbService.saveUserProfile(user.uid, {
          ...profile,
          currentWeight: compWeight,
          skeletalMuscleMass: compMuscle > 0 ? compMuscle : profile.skeletalMuscleMass,
          bodyFatPercentage: compFatPct > 0 ? compFatPct : profile.bodyFatPercentage,
          updatedAt: new Date().toISOString()
        });
      }

      await loadUserData(user.uid);
      setIsAddingComp(false);
      setEditingCompId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUiLoading(false);
    }
  };

  const handleUpdateHealthRecord = async () => {
    if (!user || !editingCompId) return;
    setUiLoading(true);
    try {
      const bfm = (compWeight * compFatPct) / 100;
      await dbService.updateHealthRecord(user.uid, editingCompId, {
        weight: compWeight,
        skeletalMuscleMass: compMuscle > 0 ? compMuscle : undefined,
        bodyFatPercentage: compFatPct > 0 ? compFatPct : undefined,
        bodyFatMass: compFatPct > 0 ? bfm : undefined,
        loggedAt: new Date(compDate).toISOString()
      });

      // Update current profile weight synchronously as well
      if (profile) {
        await dbService.saveUserProfile(user.uid, {
          ...profile,
          currentWeight: compWeight,
          skeletalMuscleMass: compMuscle > 0 ? compMuscle : profile.skeletalMuscleMass,
          bodyFatPercentage: compFatPct > 0 ? compFatPct : profile.bodyFatPercentage,
          updatedAt: new Date().toISOString()
        });
      }

      await loadUserData(user.uid);
      setIsAddingComp(false);
      setEditingCompId(null);
    } catch (err) {
      console.error(err);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setUiLoading(false);
    }
  };

  const handleEditRecord = (rec: HealthRecord) => {
    setEditingCompId(rec.id!);
    setCompWeight(rec.weight);
    setCompMuscle(rec.skeletalMuscleMass || 24);
    setCompFatPct(rec.bodyFatPercentage || 28);
    const d = new Date(rec.loggedAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setCompDate(`${yyyy}-${mm}-${dd}`);
    setIsAddingComp(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRecord = async (recId: string) => {
    if (!user) return;
    try {
      await dbService.deleteHealthRecord(user.uid, recId);
      const recs = await dbService.getHealthRecords(user.uid);
      setRecords(recs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyRoutine = async (routine: any) => {
    if (!user) return;
    setUiLoading(true);
    try {
      const promises = routine.foods.map((food: any) => {
        const logData = {
          dateStr: selectedDate,
          mealTime: routine.mealTime,
          name: food.name,
          category: 'custom',
          icon: food.icon || '✨',
          grams: food.grams,
          calories: food.calories,
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat,
          createdAt: new Date().toISOString()
        };
        return dbService.addFoodLog(user.uid, logData as any);
      });
      await Promise.all(promises);
      await loadDayFoods();
      setActiveTab('meals');
    } catch (err) {
      console.error(err);
      alert('루틴 추가 중 오류가 발생했습니다.');
    } finally {
      setUiLoading(false);
    }
  };

  // Log dietary food
  const handleAddFoodLog = async (logData: Omit<FoodLog, 'userId'>) => {
    if (!user) return;
    try {
      if (activeMealTime) {
        logData.mealTime = activeMealTime;
      } else if (!logData.mealTime) {
        logData.mealTime = 'snack'; // fallback
      }
      await dbService.addFoodLog(user.uid, logData);
      setActiveMealTime(null);
      await loadDayFoods();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFoodLog = async (mealId: string) => {
    if (!user) return;
    try {
      await dbService.deleteFoodLog(user.uid, mealId);
      await loadDayFoods();
    } catch (err) {
      console.error(err);
    }
  };

  // Fasting triggers
  const handleStartFasting = async (hoursPlan: number) => {
    if (!user) return;
    try {
      await dbService.addFastingLog(user.uid, {
        startTime: new Date().toISOString(),
        targetDuration: hoursPlan,
        status: 'active'
      });
      const activeF = await dbService.getActiveFastingLog(user.uid);
      setActiveFast(activeF);
      const listF = await dbService.getFastingLogs(user.uid);
      setFastingLogs(listF);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndFasting = async (fastId: string) => {
    if (!user) return;
    try {
      await dbService.completeFastingLog(user.uid, fastId, new Date().toISOString());
      setActiveFast(null);
      const listF = await dbService.getFastingLogs(user.uid);
      setFastingLogs(listF);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditFoodLog = (log: FoodLog) => {
    setEditingFoodLog(log);
    setEditName(log.name);
    setEditGrams(log.grams);
    setEditCalories(log.calories);
    setEditCarbs(log.carbs);
    setEditProtein(log.protein);
    setEditFat(log.fat);
  };

  const handleSaveEditFoodLog = async () => {
    if (!user || !editingFoodLog || !editingFoodLog.id) return;
    setUiLoading(true);
    try {
      await dbService.updateFoodLog(user.uid, editingFoodLog.id, {
        name: editName,
        grams: editGrams,
        calories: editCalories,
        carbs: editCarbs,
        protein: editProtein,
        fat: editFat
      });
      await loadDayFoods();
      setEditingFoodLog(null);
    } catch (err) {
      console.error(err);
      alert('식품 기록 수정 중 오류가 발생했습니다.');
    } finally {
      setUiLoading(false);
    }
  };

  // AI Calorie Auto-calibration calibration handler
  const handleCalibrateFeedback = async (recFeedback: ReturnType<typeof generateWeeklyFeedback>) => {
    if (!user || !profile) return;
    setUiLoading(true);
    try {
      await dbService.saveUserProfile(user.uid, {
        ...profile,
        targetCalories: recFeedback.recommendedCalories,
        targetCarbs: recFeedback.recommendedCarbs,
        targetProtein: recFeedback.recommendedProtein,
        targetFat: recFeedback.recommendedFat,
        updatedAt: new Date().toISOString()
      });
      await loadUserData(user.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setUiLoading(false);
    }
  };

  // Change date of records
  const shiftDate = (amount: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + amount);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Pre-calculations for nutrition totals
  const totalCaloriesLogged = foodLogs.reduce((sum, item) => sum + item.calories, 0);
  const totalCarbsLogged = foodLogs.reduce((sum, item) => sum + item.carbs, 0);
  const totalProteinLogged = foodLogs.reduce((sum, item) => sum + item.protein, 0);
  const totalFatLogged = foodLogs.reduce((sum, item) => sum + item.fat, 0);

  // Auto Calculations of Weekly Progress Adjuster
  const weeklyFeedbackResult = profile && records.length >= 2 
    ? generateWeeklyFeedback(profile, records) 
    : null;

  if (!authReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="text-xs text-neutral-500 font-medium mt-3">식단 동기화 로드 중...</p>
        </div>
      </div>
    );
  }

  // LOGIN PAGE
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#0EA5E9] to-[#3B82F6]" />
          
          <div className="my-6">
            <div className="mx-auto w-14 h-14 bg-[#3B82F6]/10 text-[#3B82F6] rounded-2xl flex items-center justify-center mb-3">
              <Beef className="w-8 h-8" />
            </div>
            <h1 className="text-lg font-black text-white tracking-tight">오늘의 식단</h1>
            <p className="text-xs text-neutral-400 mt-1 px-4 leading-4">
              나만의 맞춤형 다이어트 일일 식단을 간편하게 기록해보세요.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 text-left text-xs text-neutral-300 leading-5 mb-6 flex flex-col gap-2">
            <div className="flex gap-2">
              <span className="text-[#3B82F6] font-bold">✓</span>
              <span>인바디 체성분 맞춤 최적 대사 칼로리 도출</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#3B82F6] font-bold">✓</span>
              <span>터치 한 번으로 미세 밀리그람 단위 탄단지 수정</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#3B82F6] font-bold">✓</span>
              <span>16:8 간헐적 단식 순환 타이머 시스템 탑재</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#3B82F6] font-bold">✓</span>
              <span>체중 변화를 통한 다음 주 칼로리 가동 피드백</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={uiLoading}
            className="w-full h-11 bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50"
            id="btn-google-login"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.97 1 12 1 7.21 1 3.12 3.76 1.16 7.78l3.82 2.96C5.9 7.55 8.71 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.73-4.92 3.73-8.55z"
              />
              <path
                fill="#FBBC05"
                d="M4.98 14.74c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.16 7.26C.42 8.78 0 10.48 0 12.26s.42 3.48 1.16 5l3.82-2.52z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.02.68-2.33 1.09-4.26 1.09-3.29 0-6.1-2.51-7.02-5.7L1.16 15.13C3.12 19.15 7.21 23 12 23z"
              />
            </svg>
            구글 계정으로 시작하기
          </button>
        </div>
      </div>
    );
  }

  // PROFILE ONBOARDING IF METRICS ARE MISSING
  if (!profile && !profileLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <ProfileForm onSave={handleSaveProfile} isLoading={uiLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-150 py-0 md:py-8">
      {/* Immersive Smartphone container viewport mockup */}
      <div className="max-w-md mx-auto min-h-screen md:min-h-[820px] bg-slate-50 md:rounded-3xl md:shadow-2xl flex flex-col relative pb-20 border border-neutral-200 overflow-hidden">
        
        {/* Brand App Header */}
        <header className="bg-[#3B82F6] text-white px-4 py-4 shrink-0 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 text-white rounded-xl flex items-center justify-center font-black shadow-sm">
              <Beef className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-extrabold tracking-tight">오늘의 식단</h1>
              <div className="flex items-center gap-1 mt-0.5 relative">
                <select 
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors text-[10px] text-[#EFF6FF] border border-[#2563EB] outline-none rounded pl-2 pr-5 py-0.5 appearance-none cursor-pointer font-bold"
                  title="프로필 선택"
                >
                  <option value="main">{profile?.displayName || user.displayName}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[#EFF6FF]">
                  <ArrowDown className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl transition-all border border-transparent shadow-xs cursor-pointer"
              title="다크모드 전환"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl transition-all border border-transparent shadow-xs cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Profile Metrics quick-bar */}
        {profile && (
          <div className="bg-white dark:bg-slate-900 text-slate-600 dark:text-white px-4 pb-3 pt-3 flex items-center justify-between text-xs border-b border-slate-200 dark:border-neutral-800 border-dashed transition-colors shadow-xs z-10">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 dark:text-neutral-400">
              <span>목표 체중:</span>
              <span className="text-[#3B82F6] font-bold">{profile.targetWeight}kg</span>
              <span>|</span>
              <span>오늘의 목표 칼로리:</span>
              <span className="text-[#3B82F6] font-bold">{profile.targetCalories}kcal</span>
            </div>
            <div className="text-[10px] bg-[#3B82F6]/10 text-[#3B82F6] font-bold px-2 py-0.5 rounded border border-[#3B82F6]/20">
              {profile.goalType === 'cut' ? '지방 컷팅 🔥' : profile.goalType === 'bulk' ? '린매스 업 💪' : '체중 고정 ⚖️'}
            </div>
          </div>
        )}

        {/* Main dynamic viewport contents */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          
          {/* TAB 1: DASHBOARD VIEW (NOW INCLUDES MEAL GROUPS AND DATE SELECTOR) */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-4">
              
              {/* Date Selector bar */}
              <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-2.5 rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="p-1 text-[#64748B] hover:text-[#3B82F6] rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="flex items-center gap-1.5 text-[#1E293B] font-extrabold text-xs px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-[#3B82F6]" />
                    <span>{selectedDate === new Date().toISOString().split('T')[0] ? `오늘 (${selectedDate})` : selectedDate}</span>
                  </button>
                  
                  {isCalendarOpen && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 bg-white border border-[#E2E8F0] shadow-xl rounded-2xl p-3 z-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-0.5">
                          <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear() - 1, calendarViewDate.getMonth(), 1))} className="p-1 text-[#94A3B8] hover:bg-slate-50 rounded-lg">
                            <ChevronsLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} className="p-1 text-[#94A3B8] hover:bg-slate-50 rounded-lg">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-extrabold text-xs text-[#1E293B]">
                          {calendarViewDate.getFullYear()}-{String(calendarViewDate.getMonth() + 1).padStart(2, '0')}
                        </span>
                        <div className="flex gap-0.5">
                          <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} className="p-1 text-[#94A3B8] hover:bg-slate-50 rounded-lg">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear() + 1, calendarViewDate.getMonth(), 1))} className="p-1 text-[#94A3B8] hover:bg-slate-50 rounded-lg">
                            <ChevronsRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-[#64748B] mb-1">
                        {['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {Array.from({ length: 42 }).map((_, i) => {
                          const firstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay();
                          const daysInMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate();
                          
                          const dayNum = i - firstDay + 1;
                          const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
                          const dStr = isCurrentMonth ? `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : '';
                          const isSelected = isCurrentMonth && selectedDate === dStr;
                          const cals = isCurrentMonth ? (monthlySummary[dStr] || 0) : 0;
                          
                          return (
                            <div key={i} className="aspect-square flex items-center justify-center p-0.5">
                              {isCurrentMonth && (
                                <button
                                  onClick={() => {
                                    setSelectedDate(dStr);
                                    setIsCalendarOpen(false);
                                  }}
                                  className={`w-full h-full flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                                    isSelected ? 'bg-[#3B82F6] text-white shadow-sm' : cals > 0 ? 'bg-[#EFF6FF] text-[#1E293B]' : 'bg-transparent text-[#94A3B8] hover:bg-slate-50'
                                  } ${cals === 0 && !isSelected ? 'opacity-40' : ''}`}
                                >
                                  <span className="font-bold text-[11px]">{dayNum}</span>
                                  {cals > 0 && <span className="text-[7px] font-mono leading-none rounded-full max-w-full text-center mt-0.5">{cals}</span>}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="p-1 text-[#64748B] hover:text-[#3B82F6] rounded-lg cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Nutritional Calorie Progress Circle */}
              {profile && (
                <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-[#1E293B]">오늘의 총 섭취량</h3>
                    <span className="text-xs text-[#64748B] font-bold font-mono">
                      {totalCaloriesLogged} / {profile.targetCalories} kcal
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-[#F1F5F9] rounded-full h-3 overflow-hidden border border-[#E2E8F0]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        totalCaloriesLogged > profile.targetCalories ? 'bg-rose-500' : 'bg-[#3B82F6]'
                      }`}
                      style={{ width: `${Math.min(100, (totalCaloriesLogged / profile.targetCalories) * 100)}%` }}
                    />
                  </div>

                  {/* Macros details breakdown bars */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {/* Carbs Progress */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-center">
                      <span className="text-[10px] text-[#64748B] font-bold">탄수화물</span>
                      <p className="text-xs font-extrabold text-[#1E293B] font-mono mt-1">
                        {Math.round(totalCarbsLogged)}g / {profile.targetCarbs}g
                      </p>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (totalCarbsLogged / profile.targetCarbs) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Protein Progress */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-center">
                      <span className="text-[10px] text-[#64748B] font-bold">단백질</span>
                      <p className="text-xs font-extrabold text-[#1E293B] font-mono mt-1">
                        {Math.round(totalProteinLogged)}g / {profile.targetProtein}g
                      </p>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (totalProteinLogged / profile.targetProtein) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Fat Progress */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-center">
                      <span className="text-[10px] text-[#64748B] font-bold">지방</span>
                      <p className="text-xs font-extrabold text-[#1E293B] font-mono mt-1">
                        {Math.round(totalFatLogged)}g / {profile.targetFat}g
                      </p>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-rose-400 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (totalFatLogged / profile.targetFat) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MEAL GROUPS UI */}
              <div className="flex flex-col gap-3 mt-1">
                {activeMealTime ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-3 ml-1 text-[#1E293B]">
                      <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                        <Beef className="w-4 h-4 text-[#3B82F6]" />
                        {activeMealTime === 'breakfast' ? '아침 식사' : 
                         activeMealTime === 'lunch' ? '점심 식사' : 
                         activeMealTime === 'dinner' ? '저녁 식사' : '간식'} 추가하기
                      </h3>
                      <button onClick={() => setActiveMealTime(null)} className="text-xs font-bold text-[#64748B] hover:text-[#1E293B] bg-[#F1F5F9] px-3 py-1.5 rounded-full cursor-pointer">
                        취소 및 돌아가기
                      </button>
                    </div>
                    <MealLogger 
                      onAddLog={handleAddFoodLog} 
                      dateStr={selectedDate} 
                      onOpenCopyModal={() => setIsCopyModalOpen(true)}
                      onApplyRoutine={handleApplyRoutine}
                      activeMealTime={activeMealTime}
                    />
                    {isCopyModalOpen && (
                      <CopyMealsModal
                        userId={user.uid}
                        currentDate={selectedDate}
                        onClose={() => setIsCopyModalOpen(false)}
                        onCopy={async (foodsToCopy) => {
                          try {
                            const addPromises = foodsToCopy.map(log => 
                              dbService.addFoodLog(user.uid, { ...log, mealTime: activeMealTime || log.mealTime, createdAt: new Date().toISOString() })
                            );
                            await Promise.all(addPromises);
                            await loadDayFoods();
                            setIsCopyModalOpen(false);
                            setActiveMealTime(null);
                          } catch (err) {
                            console.error('Failed to copy', err);
                          }
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <Reorder.Group 
                      axis="y" 
                      values={mealOrder} 
                      onReorder={(newOrder) => {
                        setMealOrder(newOrder);
                        localStorage.setItem('mealOrder', JSON.stringify(newOrder));
                      }} 
                      className="flex flex-col gap-3 mt-1"
                    >
                      {mealOrder.map((groupKey) => {
                        return <MealGroupItem 
                                  key={groupKey} 
                                  groupKey={groupKey} 
                                  foodLogs={foodLogs} 
                                  customName={customNames[groupKey]}
                                  onRename={(id, newName) => {
                                    const newNames = { ...customNames, [id]: newName };
                                    setCustomNames(newNames);
                                    localStorage.setItem('customNames', JSON.stringify(newNames));
                                  }}
                                  onDelete={(id) => {
                                    const newOrder = mealOrder.filter(k => k !== id);
                                    setMealOrder(newOrder);
                                    localStorage.setItem('mealOrder', JSON.stringify(newOrder));
                                    const newNames = { ...customNames };
                                    delete newNames[id];
                                    setCustomNames(newNames);
                                    localStorage.setItem('customNames', JSON.stringify(newNames));
                                  }}
                                  handleDeleteFoodLog={handleDeleteFoodLog} 
                                  setActiveMealTime={setActiveMealTime} 
                                  onStartEditFoodLog={handleStartEditFoodLog}
                                />;
                      })}
                    </Reorder.Group>
                  </>
                )}
              </div>
              
              {!activeMealTime && (
                <>
                  <div className="flex gap-2 mt-4 px-1">
                    <button 
                      onClick={() => {
                        const nextMealIdx = mealOrder.filter(k => k.startsWith('meal_')).length + 1;
                        const newKey = 'meal_' + nextMealIdx;
                        const newOrder = [...mealOrder, newKey];
                        setMealOrder(newOrder);
                        localStorage.setItem('mealOrder', JSON.stringify(newOrder));
                      }} 
                      className="flex-1 h-12 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-sm rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#1E293B] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all text-[#3B82F6]"
                    >
                      <Plus className="w-4 h-4 text-[#3B82F6]" /> <span className="text-[#1E293B] dark:text-white">식사 추가하기</span>
                    </button>
                    <button 
                      onClick={() => {
                        const nextSnackIdx = mealOrder.filter(k => k.startsWith('snack_')).length + 1;
                        const newKey = 'snack_' + nextSnackIdx;
                        const newOrder = [...mealOrder, newKey];
                        setMealOrder(newOrder);
                        localStorage.setItem('mealOrder', JSON.stringify(newOrder));
                      }} 
                      className="flex-1 h-12 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 shadow-sm rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#1E293B] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4 text-pink-500" /> <span>간식 추가하기</span>
                    </button>
                  </div>

                  {/* Line Trend Chart Metrics */}
                  {profile && (
                    <div className="mt-2">
                      <TrendChart records={records} targetWeight={profile.targetWeight} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: BODY COMPOSITION MANUAL INSERTS */}
          {activeTab === 'composition' && (
            <div className="flex flex-col gap-4">
              
              {/* Add body record panel clicker button */}
              {!isAddingComp ? (
                <button
                  type="button"
                  onClick={() => setIsAddingComp(true)}
                  className="w-full flex items-center justify-center gap-1 bg-slate-900 text-white h-11 text-xs font-bold rounded-xl shadow-xs cursor-pointer active:scale-98 transition-all hover:bg-slate-800"
                  id="btn-open-bodycomp-form"
                >
                  <Plus className="w-4 h-4 text-[#3B82F6]" /> 체성분 (인바디) 등록하기
                </button>
              ) : (
                <div className="bg-white border border-neutral-150 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                    <span className="text-xs font-extrabold text-neutral-800">
                      {editingCompId ? '체성분 기록 수정' : '체성분 신규 등록'}
                    </span>
                    <button
                      onClick={() => { setIsAddingComp(false); setEditingCompId(null); }}
                      className="text-neutral-400 hover:text-neutral-600 text-xs font-semibold cursor-pointer"
                    >
                      취소
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-neutral-700">측정 일자</label>
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
                      💡 <strong>안내:</strong> 인바디 등록 후 일주일간은 체성분이 크게 변하지 않으므로 잦은 변경을 권장하지 않습니다. 
                      <br/>* 체성분을 등록해도 <strong>1일 목표 칼로리</strong>는 바로 변경되지 않으며, 프로필 [주간 자동 칼로리 갱신] 설정에 따라 지정된 요일에 갱신됩니다.
                    </p>

                    <button
                      onClick={editingCompId ? handleUpdateHealthRecord : handleAddHealthRecord}
                      disabled={uiLoading}
                      className="w-full h-11 bg-slate-900 text-white text-xs font-extrabold rounded-xl hover:bg-slate-800 transition-all active:scale-98 cursor-pointer shadow-sm"
                      id="submit-bodycomp-btn"
                    >
                      {editingCompId ? '수정 사항 저장' : '체성분 등록'}
                    </button>
                  </div>
                </div>
              )}

              {/* Composition histories log */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-neutral-500 px-1">기록 히스토리 ({records.length})</h4>
                {records.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-neutral-150 rounded-2xl">
                    <p className="text-xs text-neutral-400 font-medium">아직 등록된 기록이 없습니다.</p>
                  </div>
                ) : (
                  records.map(rec => {
                    const d = new Date(rec.loggedAt);
                    return (
                      <div
                        key={rec.id}
                        className="bg-white border border-neutral-150 rounded-xl p-3.5 flex justify-between items-center"
                        id={`record-item-${rec.id}`}
                      >
                        <div>
                          <p className="text-neutral-800 font-extrabold text-xs">
                            {d.toLocaleDateString()}
                          </p>
                          <div className="flex gap-3 text-[10.5px] mt-1 font-mono text-neutral-600 font-medium">
                            <span>체중: <strong className="text-neutral-800">{rec.weight}kg</strong></span>
                            {rec.skeletalMuscleMass && <span>골격근: <strong className="text-neutral-800">{rec.skeletalMuscleMass}kg</strong></span>}
                            {rec.bodyFatPercentage && <span>지방률: <strong className="text-neutral-800">{rec.bodyFatPercentage}%</strong></span>}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => handleEditRecord(rec)}
                            className="p-1.5 text-neutral-300 hover:text-blue-500 rounded-lg cursor-pointer"
                            id={`btn-edit-record-${rec.id}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(rec.id!)}
                            className="p-1.5 text-neutral-300 hover:text-rose-500 rounded-lg cursor-pointer"
                            id={`btn-del-record-${rec.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ROUTINES */}
          {activeTab === 'routine' && (
            <MealRoutineEditor onApplyRoutine={handleApplyRoutine} />
          )}

          {/* TAB 6: FASTING TRACKER */}
          {activeTab === 'fasting' && (
            <FastingTracker />
          )}

          {/* TAB 4: MY PROFILE / SETTINGS */}
          {activeTab === 'profile' && !isEditingProfile && profile && (
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 border border-neutral-150 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-slate-800 pb-3">
                  <div className="w-10 h-10 bg-[#3B82F6] text-white rounded-full flex items-center justify-center font-extrabold shadow-sm">
                    {profile.displayName?.[0] || user.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-neutral-800 dark:text-white">{profile.displayName || user.displayName}</h3>
                    <p className="text-[10px] text-neutral-400 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>

                {/* Body target parameters */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-neutral-50 dark:bg-slate-800 p-2.5 rounded-xl border border-neutral-150/70 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-neutral-400 dark:text-slate-400 font-bold">목표 칼로리</span>
                    <p className="text-sm font-extrabold text-slate-950 dark:text-white font-mono mt-0.5">{profile.targetCalories} kcal</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-slate-800 p-2.5 rounded-xl border border-neutral-150/70 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-neutral-400 dark:text-slate-400 font-bold">목표 몸무게</span>
                    <p className="text-sm font-extrabold text-slate-950 dark:text-white font-mono mt-0.5">{profile.targetWeight} kg</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] text-neutral-400 dark:text-slate-400 font-black tracking-wider uppercase mb-0.5">매주 권장할 영양 매크로 타겟</h4>
                  <div className="flex gap-4 items-center justify-between text-xs font-mono font-bold bg-neutral-50 dark:bg-slate-800 p-2.5 border border-neutral-150 dark:border-slate-700 rounded-xl">
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-sans font-extrabold text-neutral-400 dark:text-slate-400">탄 (Carbs)</p>
                      <p className="text-[11px] text-neutral-700 dark:text-white mt-0.5">{profile.targetCarbs}g</p>
                    </div>
                    <div className="text-center flex-1 border-x border-neutral-200 dark:border-slate-700">
                      <p className="text-[9px] font-sans font-extrabold text-neutral-400 dark:text-slate-400">단 (Protein)</p>
                      <p className="text-[11px] text-neutral-700 dark:text-white mt-0.5">{profile.targetProtein}g</p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-sans font-extrabold text-neutral-400 dark:text-slate-400">지 (Fat)</p>
                      <p className="text-[11px] text-neutral-700 dark:text-white mt-0.5">{profile.targetFat}g</p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-100 dark:bg-slate-800 p-3 rounded-xl text-neutral-500 dark:text-slate-300 font-medium text-[10.5px] leading-4.5 flex items-start gap-1.5 border border-neutral-200 dark:border-slate-700">
                  <Info className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    본 다이어트 영양 수치는 인바디 검출 값에 대한 <strong className="text-neutral-700 dark:text-white">Katch-McArdle 방정식</strong>을 최우선으로 사용하여 근육 보존 계수를 극대화한 개인 맞춤식 분할입니다.
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
                       // Just an alert for now as requested UI change or implement later.
                       alert('새로운 프로필 추가 기능은 준비중입니다.');
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

          {activeTab === 'profile' && isEditingProfile && profile && (
            <div className="animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-3">
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-xs font-bold text-neutral-500 flex items-center gap-1 cursor-pointer hover:text-black"
                >
                  <ChevronLeft className="w-4 h-4" /> 가이드로 돌아가기
                </button>
              </div>
              <ProfileForm initialProfile={profile} onSave={handleSaveProfile} isLoading={uiLoading} />
            </div>
          )}

        </main>

        {/* Dynamic Touch Navigation bar in footer */}
        <nav className="absolute bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 flex items-center justify-around h-16 px-2 text-white z-40">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsEditingProfile(false); setActiveMealTime(null); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 transition-all h-full cursor-pointer ${
              activeTab === 'dashboard' ? 'text-[#3B82F6] font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            id="nav-tab-dashboard"
          >
            <TrendingUp className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">오늘의 식단</span>
          </button>
          <button
            onClick={() => { setActiveTab('composition'); setIsEditingProfile(false); setActiveMealTime(null); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 transition-all h-full cursor-pointer ${
              activeTab === 'composition' ? 'text-[#3B82F6] font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            id="nav-tab-composition"
          >
            <Scale className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">체성분기록</span>
          </button>
          <button
            onClick={() => { setActiveTab('routine'); setIsEditingProfile(false); setActiveMealTime(null); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 transition-all h-full cursor-pointer ${
              activeTab === 'routine' ? 'text-[#3B82F6] font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            id="nav-tab-routine"
          >
            <ListRestart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">루틴저장</span>
          </button>
          <button
            onClick={() => { setActiveTab('fasting'); setIsEditingProfile(false); setActiveMealTime(null); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 transition-all h-full cursor-pointer ${
              activeTab === 'fasting' ? 'text-[#3B82F6] font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            id="nav-tab-fasting"
          >
            <Timer className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">단식타이머</span>
          </button>
          <button
            onClick={() => { setActiveTab('profile'); }}
            className={`flex flex-col items-center justify-center flex-grow py-1 transition-all h-full cursor-pointer ${
              activeTab === 'profile' ? 'text-[#3B82F6] font-bold' : 'text-neutral-400 hover:text-white'
            }`}
            id="nav-tab-profile"
          >
            <UserIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">마이프로필</span>
          </button>
        </nav>

        {/* Edit Food Log Modal */}
        {editingFoodLog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-neutral-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{editingFoodLog.icon || '✨'}</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1E293B] dark:text-white">음식 정보 수정</h3>
                    <p className="text-[10px] text-neutral-500">{editingFoodLog.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingFoodLog(null)}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10.5px] font-black text-[#64748B] dark:text-slate-400">음식명</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900 rounded-xl px-3 text-xs font-black focus:outline-none focus:border-[#3B82F6] dark:text-white"
                  />
                </div>

                {/* Macro Adjustment Math sliders/counters */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-100 dark:border-slate-700/30 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-[#1E293B] dark:text-slate-300">섭취 중량 (g)</span>
                    <NumberAdjuster value={editGrams} onChange={(val) => {
                      const oldGrams = editingFoodLog.grams || 100;
                      const newGrams = Math.max(1, val);
                      const ratio = newGrams / oldGrams;
                      setEditGrams(newGrams);
                      setEditCalories(Math.max(0, Math.round(editingFoodLog.calories * ratio)));
                      setEditCarbs(Math.max(0, Math.round(editingFoodLog.carbs * ratio * 10) / 10));
                      setEditProtein(Math.max(0, Math.round(editingFoodLog.protein * ratio * 10) / 10));
                      setEditFat(Math.max(0, Math.round(editingFoodLog.fat * ratio * 10) / 10));
                    }} min={1} stepDecimal={0} unit="g" />
                  </div>

                  <div className="h-px bg-neutral-200/50 dark:bg-slate-800" />

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-[#1E293B] dark:text-slate-300">칼로리 (kcal)</span>
                    <NumberAdjuster value={editCalories} onChange={(val) => setEditCalories(Math.max(0, val))} min={0} stepDecimal={0} unit="kcal" />
                  </div>

                  <div className="h-px bg-neutral-200/50 dark:bg-slate-800" />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1 items-center bg-white dark:bg-slate-800/40 p-2 rounded-xl border border-neutral-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-[#3B82F6]">탄수화물(g)</span>
                      <NumberAdjuster value={editCarbs} onChange={(val) => setEditCarbs(Math.max(0, val))} min={0} stepDecimal={0} unit="g" />
                    </div>
                    <div className="flex flex-col gap-1 items-center bg-white dark:bg-slate-800/40 p-2 rounded-xl border border-neutral-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-[#10B981]">단백질(g)</span>
                      <NumberAdjuster value={editProtein} onChange={(val) => setEditProtein(Math.max(0, val))} min={0} stepDecimal={0} unit="g" />
                    </div>
                    <div className="flex flex-col gap-1 items-center bg-white dark:bg-slate-800/40 p-2 rounded-xl border border-neutral-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-[#F43F5E]">지방(g)</span>
                      <NumberAdjuster value={editFat} onChange={(val) => setEditFat(Math.max(0, val))} min={0} stepDecimal={0} unit="g" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-neutral-100 dark:border-slate-700/50 flex gap-2">
                <button
                  onClick={() => setEditingFoodLog(null)}
                  className="flex-1 h-11 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-neutral-600 dark:text-neutral-200 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEditFoodLog}
                  className="flex-1 h-11 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> 저장 완료
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
