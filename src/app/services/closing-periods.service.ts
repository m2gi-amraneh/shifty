// closing-days.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from '@angular/fire/firestore';

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

  constructor(private firestore: Firestore) {}

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

  async getAllClosingPeriods(): Promise<ClosingPeriod[]> {
    const colRef = collection(this.firestore, this.collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ClosingPeriod)
    );
  }
}
