import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  collectionData,
  docData
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PositionsService {
  private firestore: Firestore = inject(Firestore);

  // Get all positions as an Observable for realtime updates
  getPositions(): Observable<any[]> {
    const positionsRef = collection(this.firestore, 'positions');
    const q = query(positionsRef);
    return collectionData(q, { idField: 'id' });
  }

  // Get a single position as an Observable
  getPosition(id: string): Observable<any> {
    const positionRef = doc(this.firestore, 'positions', id);
    return docData(positionRef, { idField: 'id' });
  }

  // Add a new position
  async addPosition(position: { name: string }): Promise<string> {
    const positionsRef = collection(this.firestore, 'positions');
    const docRef = await addDoc(positionsRef, position);
    return docRef.id;
  }

  // Edit an existing position
  async updatePosition(id: string, position: { name: string }): Promise<void> {
    const positionRef = doc(this.firestore, 'positions', id);
    await updateDoc(positionRef, position);
  }

  // Delete a position
  async deletePosition(id: string): Promise<void> {
    const positionRef = doc(this.firestore, 'positions', id);
    await deleteDoc(positionRef);
  }
}
