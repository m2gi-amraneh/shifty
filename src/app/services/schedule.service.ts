import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  collectionData,
} from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Shift } from './planning.service';
import { AbsenceRequest } from './absence.service';
import { ClosingPeriod } from './closing-periods.service';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  constructor(private firestore: Firestore) {}

  getShiftsByEmployeeAndDay(
    employeeId: string,
    day: string
  ): Observable<Shift[]> {
    const shiftsRef = collection(this.firestore, 'shifts');
    const q = query(
      shiftsRef,
      where('employee.id', '==', employeeId),
      where('day', '==', day)
    );
    return collectionData(q) as Observable<Shift[]>;
  }

  getApprovedAbsencesByEmployee(
    employeeId: string
  ): Observable<AbsenceRequest[]> {
    const absencesRef = collection(this.firestore, 'absences');
    const q = query(
      absencesRef,
      where('employeeId', '==', employeeId),
      where('status', '==', 'approved')
    );
    return collectionData(q) as Observable<AbsenceRequest[]>;
  }

  getClosingPeriods(): Observable<ClosingPeriod[]> {
    const closingPeriodsRef = collection(this.firestore, 'closingPeriods');
    return collectionData(closingPeriodsRef) as Observable<ClosingPeriod[]>;
  }
}
