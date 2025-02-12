import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ClosingPeriod {
  id?: string;
  startDate: string; // ISO string format
  endDate: string; // ISO string format
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClosingDaysService {
  private collectionName = 'closingPeriods';
  private closingPeriodsSubject = new BehaviorSubject<ClosingPeriod[]>([]);

  // Public observable for real-time updates
  closingPeriods$ = this.closingPeriodsSubject.asObservable();

  constructor(private firestore: Firestore) {
    this.initializeRealTimeListener();
  }

  // Real-time listener for closing periods
  private initializeRealTimeListener() {
    const colRef = collection(this.firestore, this.collectionName);

    onSnapshot(
      colRef,
      (snapshot) => {
        const periods = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as ClosingPeriod)
        );
        this.closingPeriodsSubject.next(periods);
      },
      (error) => {
        console.error('Error listening to closing periods:', error);
      }
    );
  }

  async addClosingPeriod(period: ClosingPeriod): Promise<void> {
    const colRef = collection(this.firestore, this.collectionName);
    await addDoc(colRef, period);
  }

  async updateClosingPeriod(period: ClosingPeriod): Promise<void> {
    if (!period.id) throw new Error('Period ID is required');
    const docRef = doc(this.firestore, `${this.collectionName}/${period.id}`);
    await updateDoc(docRef, { ...period });
  }

  async deleteClosingPeriod(id: string): Promise<void> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(docRef);
  }

  // Optional method to get current value synchronously
  getCurrentClosingPeriods(): ClosingPeriod[] {
    return this.closingPeriodsSubject.getValue();
  }
}
