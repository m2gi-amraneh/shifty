import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { Shift } from './planning.service';
import { AbsenceRequest } from './absence.service';
import { ClosingPeriod } from './closing-periods.service';
@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  constructor(private firestore: Firestore) {}

  async getShiftsByEmployeeAndDay(
    employeeId: string,
    day: string
  ): Promise<Shift[]> {
    const shiftsRef = collection(this.firestore, 'shifts');
    const q = query(
      shiftsRef,
      where('employee.id', '==', employeeId),
      where('day', '==', day)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Shift);
  }

  async getApprovedAbsencesByEmployee(
    employeeId: string
  ): Promise<AbsenceRequest[]> {
    const absencesRef = collection(this.firestore, 'absences');
    const q = query(
      absencesRef,
      where('employeeId', '==', employeeId),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as AbsenceRequest);
  }

  async getClosingPeriods(): Promise<ClosingPeriod[]> {
    const closingPeriodsRef = collection(this.firestore, 'closingPeriods');
    const querySnapshot = await getDocs(closingPeriodsRef);
    return querySnapshot.docs.map((doc) => doc.data() as ClosingPeriod);
  }
}
