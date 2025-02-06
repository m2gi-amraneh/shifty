import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

interface Shift {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
  employee: {
    id: string;
    name: string;
  };
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlanningService {
  private firestore: Firestore = inject(Firestore); // Inject Firestore service
  private readonly collectionName = 'shifts';

  // Get all shifts
  getShifts(): Observable<Shift[]> {
    const shiftsCollection = collection(this.firestore, this.collectionName);
    return from(getDocs(shiftsCollection)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data() as Shift;
          const id = doc.id;
          return { id, ...data };
        })
      )
    );
  }

  // Get shifts for a specific day
  getShiftsForDay(day: string): Observable<Shift[]> {
    const shiftsCollection = collection(this.firestore, this.collectionName);
    const q = query(shiftsCollection, where('day', '==', day));

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data() as Shift;
          const id = doc.id;
          return { id, ...data };
        })
      )
    );
  }

  // Add a new shift
  addShift(shift: Shift): Promise<any> {
    const shiftsCollection = collection(this.firestore, this.collectionName);
    return addDoc(shiftsCollection, shift);
  }

  // Update a shift
  updateShift(shiftId: string, shift: Partial<Shift>): Promise<void> {
    const shiftDoc = doc(this.firestore, `${this.collectionName}/${shiftId}`);
    return updateDoc(shiftDoc, shift);
  }

  // Delete a shift
  deleteShift(shiftId: string): Promise<void> {
    const shiftDoc = doc(this.firestore, `${this.collectionName}/${shiftId}`);
    return deleteDoc(shiftDoc);
  }
}
