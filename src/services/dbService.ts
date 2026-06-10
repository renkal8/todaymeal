import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, HealthRecord, FoodLog, FastingLog, RecentFood } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // --- USER PROFILE OPERATIONS ---
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async saveUserProfile(userId: string, profile: Omit<UserProfile, 'userId'>): Promise<void> {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const fullProfile: UserProfile = {
        ...profile,
        userId,
      };
      await setDoc(docRef, fullProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getSubProfiles(userId: string): Promise<UserProfile[]> {
    const path = `users/${userId}/subprofiles`;
    try {
      const colRef = collection(db, 'users', userId, 'subprofiles');
      const querySnapshot = await getDocs(colRef);
      const list: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ ...doc.data() as UserProfile, subProfileId: doc.id });
      });
      return list;
    } catch (error) {
          console.warn('getSubProfiles failed, returning empty:', error); // ✅ throw 대신 warn
    return []; // ✅ 빈 배열 반환으로 앱 안 터짐
    }
  },

  async saveSubProfile(userId: string, subProfileId: string, profile: Omit<UserProfile, 'userId'>): Promise<void> {
    const path = `users/${userId}/subprofiles/${subProfileId}`;
    try {
      const docRef = doc(db, 'users', userId, 'subprofiles', subProfileId);
      const fullProfile: UserProfile = {
        ...profile,
        userId,
        subProfileId,
      };
      await setDoc(docRef, fullProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteSubProfile(userId: string, subProfileId: string): Promise<void> {
    const path = `users/${userId}/subprofiles/${subProfileId}`;
    try {
      const docRef = doc(db, 'users', userId, 'subprofiles', subProfileId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- HEALTH RECORDS OPERATIONS (WEIGHTS & BODY COMP) ---
  async addHealthRecord(userId: string, record: Omit<HealthRecord, 'userId'>): Promise<void> {
    const path = `users/${userId}/records`;
    try {
      const colRef = collection(db, 'users', userId, 'records');
      const docRef = doc(colRef); // Generate client-side UUID for custom rules
      const fullRecord: HealthRecord = {
        ...record,
        id: docRef.id,
        userId,
      };
      await setDoc(docRef, fullRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getHealthRecords(userId: string): Promise<HealthRecord[]> {
    const path = `users/${userId}/records`;
    try {
      const colRef = collection(db, 'users', userId, 'records');
      // Sub-collection query sorting by loggedAt descending
      const q = query(colRef, orderBy('loggedAt', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const records: HealthRecord[] = [];
      querySnapshot.forEach((doc) => {
        records.push({ ...doc.data() as HealthRecord, id: doc.id });
      });
      return records;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async deleteHealthRecord(userId: string, recordId: string): Promise<void> {
    const path = `users/${userId}/records/${recordId}`;
    try {
      const docRef = doc(db, 'users', userId, 'records', recordId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateHealthRecord(userId: string, recordId: string, data: Partial<HealthRecord>): Promise<void> {
    const path = `users/${userId}/records/${recordId}`;
    try {
      const docRef = doc(db, 'users', userId, 'records', recordId);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // --- DIET FOOD LOGS OPERATIONS ---
  async addFoodLog(userId: string, log: Omit<FoodLog, 'userId'>): Promise<void> {
    const path = `users/${userId}/meals`;
    try {
      const colRef = collection(db, 'users', userId, 'meals');
      const docRef = doc(colRef);
      const fullLog: FoodLog = {
        ...log,
        id: docRef.id,
        userId,
      };
      await setDoc(docRef, fullLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getMonthFoodSummary(userId: string, yearMonth: string): Promise<Record<string, number>> {
    const colRef = collection(db, 'users', userId, 'meals');
    // yearMonth is like '2023-10'
    const startDate = `${yearMonth}-01`;
    
    // Dynamically calculate the first day of next month for robust query limits
    const [year, month] = yearMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStr = String(nextMonth).padStart(2, '0');
    const nextMonthFirstDate = `${nextYear}-${nextMonthStr}-01`;
    
    try {
      const q = query(
        colRef, 
        where('dateStr', '>=', startDate),
        where('dateStr', '<', nextMonthFirstDate)
      );
      const querySnapshot = await getDocs(q);
      
      const summary: Record<string, number> = {};
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const d = data.dateStr;
        const cals = data.calories || 0;
        if (!summary[d]) summary[d] = 0;
        summary[d] += cals;
      });
      return summary;
    } catch (err) {
      console.error(err);
      return {};
    }
  },

  async getFoodLogs(userId: string, dateStr: string): Promise<FoodLog[]> {
    const path = `users/${userId}/meals`;
    try {
      const colRef = collection(db, 'users', userId, 'meals');
      const q = query(colRef, where('dateStr', '==', dateStr));
      const querySnapshot = await getDocs(q);
      const logs: FoodLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ ...doc.data() as FoodLog, id: doc.id });
      });
      return logs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async deleteFoodLog(userId: string, mealId: string): Promise<void> {
    const path = `users/${userId}/meals/${mealId}`;
    try {
      const docRef = doc(db, 'users', userId, 'meals', mealId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateFoodLog(userId: string, mealId: string, data: Partial<FoodLog>): Promise<void> {
    const path = `users/${userId}/meals/${mealId}`;
    try {
      const docRef = doc(db, 'users', userId, 'meals', mealId);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // --- FASTING OPERATIONS ---
  async addFastingLog(userId: string, log: Omit<FastingLog, 'userId'>): Promise<void> {
    const path = `users/${userId}/fasting`;
    try {
      const colRef = collection(db, 'users', userId, 'fasting');
      const docRef = doc(colRef);
      const fullLog: FastingLog = {
        ...log,
        id: docRef.id,
        userId,
      };
      await setDoc(docRef, fullLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getActiveFastingLog(userId: string): Promise<FastingLog | null> {
    const path = `users/${userId}/fasting`;
    try {
      const colRef = collection(db, 'users', userId, 'fasting');
      const q = query(colRef, where('status', '==', 'active'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnapshot = querySnapshot.docs[0];
        return { ...docSnapshot.data() as FastingLog, id: docSnapshot.id };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async completeFastingLog(userId: string, fastingId: string, endTime: string): Promise<void> {
    const path = `users/${userId}/fasting/${fastingId}`;
    try {
      const docRef = doc(db, 'users', userId, 'fasting', fastingId);
      await updateDoc(docRef, {
        status: 'completed',
        endTime: endTime
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getFastingLogs(userId: string): Promise<FastingLog[]> {
    const path = `users/${userId}/fasting`;
    try {
      const colRef = collection(db, 'users', userId, 'fasting');
      const q = query(colRef, orderBy('startTime', 'desc'), limit(30));
      const querySnapshot = await getDocs(q);
      const logs: FastingLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ ...doc.data() as FastingLog, id: doc.id });
      });
      return logs;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // --- RECENT FOODS OPERATIONS ---
  async getRecentFoods(userId: string): Promise<RecentFood[]> {
    const path = `users/${userId}/recentFoods`;
    try {
      const colRef = collection(db, 'users', userId, 'recentFoods');
      const q = query(colRef, orderBy('updatedAt', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      const items: RecentFood[] = [];
      querySnapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RecentFood, id: docSnap.id });
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async saveRecentFood(userId: string, food: RecentFood): Promise<void> {
    const path = `users/${userId}/recentFoods/${food.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'recentFoods', food.id);
      await setDoc(docRef, {
        ...food,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteRecentFood(userId: string, foodId: string): Promise<void> {
    const path = `users/${userId}/recentFoods/${foodId}`;
    try {
      const docRef = doc(db, 'users', userId, 'recentFoods', foodId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- ROUTINES OPERATIONS ---
  async getMealRoutines(userId: string): Promise<any[]> {
    const path = `users/${userId}/settings/routines`;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'routines');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data.routines || [];
      }
      return [];
    } catch (error) {
      console.warn('Error fetching routines:', error);
      return [];
    }
  },

  async saveMealRoutines(userId: string, routines: any[]): Promise<void> {
    const path = `users/${userId}/settings/routines`;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'routines');
      // Using direct new Date() here inside service instead of modifying imports
      await setDoc(docRef, { routines, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

