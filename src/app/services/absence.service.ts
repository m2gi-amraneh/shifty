import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
} from '@angular/fire/firestore';
import { collectionData } from 'rxfire/firestore';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';

export interface AbsenceRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submissionDate: string;
  adminComment?: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
}

@Injectable({
  providedIn: 'root',
})
export class AbsenceService {
  private firestore: Firestore = inject(Firestore);
  private absenceCollection = collection(this.firestore, 'absences');

  constructor() {}

  getAllAbsenceRequests(): Observable<AbsenceRequest[]> {
    return collectionData(this.absenceCollection, {
      idField: 'id',
    }) as Observable<AbsenceRequest[]>;
  }

  getPendingRequests(): Observable<AbsenceRequest[]> {
    const pendingQuery = query(
      this.absenceCollection,
      where('status', '==', 'pending')
    );
    return collectionData(pendingQuery, { idField: 'id' }) as Observable<
      AbsenceRequest[]
    >;
  }

  getFilteredRequests(
    status: 'approved' | 'rejected'
  ): Observable<AbsenceRequest[]> {
    const statusQuery = query(
      this.absenceCollection,
      where('status', '==', status)
    );
    return collectionData(statusQuery, { idField: 'id' }) as Observable<
      AbsenceRequest[]
    >;
  }

  async updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    adminComment: string
  ) {
    const requestRef = doc(this.firestore, `absences/${requestId}`);
    const updateData = {
      status,
      adminComment,
      processedDate: new Date().toISOString(),
    };

    try {
      await updateDoc(requestRef, updateData);
      return true;
    } catch (error) {
      console.error('Error updating absence request:', error);
      return false;
    }
  }

  // Add this new method for creating requests
  async createRequest(requestData: Partial<AbsenceRequest>): Promise<boolean> {
    try {
      await addDoc(this.absenceCollection, requestData);
      return true;
    } catch (error) {
      console.error('Error creating absence request:', error);
      return false;
    }
  }

  // Add this new method for getting employee-specific requests
  getRequestsByEmployee(employeeId: string): Observable<AbsenceRequest[]> {
    const employeeQuery = query(
      this.absenceCollection,
      where('employeeId', '==', employeeId)
    );
    return collectionData(employeeQuery, { idField: 'id' }) as Observable<
      AbsenceRequest[]
    >;
  }
}
