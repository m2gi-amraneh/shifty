import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  getDoc,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PositionsService {
  private firestore: Firestore = inject(Firestore);

  // Get all positions
  async getPositions(): Promise<any[]> {
    const positionsRef = collection(this.firestore, 'positions');
    const q = query(positionsRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // Add a new position
  async addPosition(position: { name: string }): Promise<void> {
    const positionsRef = collection(this.firestore, 'positions');
    await addDoc(positionsRef, position);
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
