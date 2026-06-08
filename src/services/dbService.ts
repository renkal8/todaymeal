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
import { UserProfile, HealthRecord, FoodLog, FastingLog } from '../types';

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
    const endDate = `${yearMonth}-31`;
    
    try {
      const q = query(
        colRef, 
        where('dateStr', '>=', startDate),
        where('dateStr', '<=', endDate)
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
  }
};
