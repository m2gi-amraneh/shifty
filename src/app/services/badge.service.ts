// badge.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  collectionData,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { orderBy, Timestamp } from 'firebase/firestore';

export interface BadgedShift {
  id?: string;
  employeeId: string;
  shiftId: string;
  badgeInTime: Date;
  badgeOutTime?: Date;
  status: 'checked-in' | 'on-break' | 'completed';
}

@Injectable({
  providedIn: 'root',
})
export class BadgeService {
  badgedShifts = [
    // Shift 1: Completed shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_001',
      badgeInTime: new Date('2024-03-01T08:55:00'),
      badgeOutTime: new Date('2024-03-01T17:10:00'),
      status: 'completed',
    },
    // Shift 2: Another completed shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_002',

      badgeInTime: new Date('2024-03-02T09:00:00'),
      badgeOutTime: new Date('2024-03-02T18:00:00'),
      status: 'completed',
    },
    // Shift 3: Shift spanning morning and afternoon
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_003',

      badgeInTime: new Date('2024-03-03T06:30:00'),
      badgeOutTime: new Date('2024-03-03T15:45:00'),
      status: 'completed',
    },
    // Shift 4: Evening shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_004',

      badgeInTime: new Date('2024-03-04T18:00:00'),
      badgeOutTime: new Date('2024-03-05T02:30:00'),
      status: 'completed',
    },
    // Shift 5: Split shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_005',

      badgeInTime: new Date('2024-03-06T10:00:00'),
      badgeOutTime: new Date('2024-03-06T14:00:00'),
      status: 'completed',
    },
    // Shift 6: Another split shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_006',

      badgeInTime: new Date('2024-03-06T17:00:00'),
      badgeOutTime: new Date('2024-03-06T21:00:00'),
      status: 'completed',
    },
    // Shift 7: Partial month shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_007',

      badgeInTime: new Date('2024-03-15T09:15:00'),
      badgeOutTime: new Date('2024-03-15T17:45:00'),
      status: 'completed',
    },
    // Shift 8: Weekend shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_008',

      badgeInTime: new Date('2024-03-16T07:00:00'),
      badgeOutTime: new Date('2024-03-16T15:30:00'),
      status: 'completed',
    },
    // Shift 9: Late night shift
    {
      employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82',
      shiftId: 'SHIFT_2024_009',

      badgeInTime: new Date('2024-03-20T22:00:00'),
      badgeOutTime: new Date('2024-03-21T06:30:00'),
      status: 'completed',
    },
  ];
  constructor(private firestore: Firestore) { }

  // Validate QR Code (mock implementation - replace with your actual validation logic)
  validateQRCode(qrCode: string): boolean {
    // Implement QR code validation logic
    // This could involve checking against a database of valid shift QR codes
    return qrCode.length > 10 && qrCode.startsWith('SHIFT_');
  }

  // Create a badged shift entry
  async createBadgedShift(
    employeeId: string,
    shiftId: string
  ): Promise<string> {
    const badgeCollection = collection(this.firestore, 'badgedShifts');

    const badgedShift: BadgedShift = {
      employeeId,
      shiftId,
      badgeInTime: new Date(),
      status: 'checked-in',
    };

    const docRef = await addDoc(badgeCollection, badgedShift);
    return docRef.id;
  }
  async addBadgedShifts() {
    const badgeCollection = collection(this.firestore, 'badgedShifts');

    for (const shift of this.badgedShifts) {
      try {
        await addDoc(badgeCollection, shift);
        console.log(`Added shift: ${shift.shiftId}`);
      } catch (error) {
        console.error(`Error adding shift ${shift.shiftId}:`, error);
      }
    }
  }
  // Get badged shifts for an employee
  getBadgedShifts(employeeId: string): Observable<BadgedShift[]> {
    const badgeCollection = collection(this.firestore, 'badgedShifts');
    const q = query(badgeCollection, where('employeeId', '==', employeeId));

    return from(
      getDocs(q).then((snapshot) =>
        snapshot.docs.map(
          (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as BadgedShift)
        )
      )
    );
  }
  getBadgedShiftsRealtime(employeeId: string): Observable<BadgedShift[]> {
    return collectionData(
      query(
        collection(this.firestore, 'badgedShifts'),
        where('employeeId', '==', employeeId),
        orderBy('badgeInTime', 'desc')
      )
    ) as Observable<BadgedShift[]>;
  }
  // Complete a badged shift (check out)
  async completeBadgedShift(badgeId: string): Promise<void> {
    const badgeDoc = doc(this.firestore, 'badgedShifts', badgeId);

    await updateDoc(badgeDoc, {
      badgeOutTime: new Date(),
      status: 'completed',
    });
  }
  async updateBadgedShift(badgeId: string, updates: Partial<BadgedShift>): Promise<void> {
    const badgeDoc = doc(this.firestore, 'badgedShifts', badgeId);
    await updateDoc(badgeDoc, updates);
  }
  async checkExistingBadgedShift(employeeId: string, shiftId: string): Promise<boolean> {
    const badgeCollection = collection(this.firestore, 'badgedShifts');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      badgeCollection,
      where('employeeId', '==', employeeId),
      where('shiftId', '==', shiftId),
      where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.some(doc => {
      const data = doc.data();
      const badgeDate = (data['badgeInTime'] as Timestamp).toDate();
      return badgeDate >= today && badgeDate < tomorrow;
    });
  }
  async getEmployeeIdFromInput(input: string): Promise<string | null> {
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where('badgeCode', '==', input));

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id; // Return the employee UID
    }

    return input; // Assume input is already an Employee ID
  }
}
