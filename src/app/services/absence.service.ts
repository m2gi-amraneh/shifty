import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
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

  // BehaviorSubjects pour stocker l'état des différentes listes d'absences
  private allRequestsSubject = new BehaviorSubject<AbsenceRequest[]>([]);
  private pendingRequestsSubject = new BehaviorSubject<AbsenceRequest[]>([]);
  private employeeRequestsSubject = new BehaviorSubject<AbsenceRequest[]>([]);

  // Observables publics
  allRequests$ = this.allRequestsSubject.asObservable();
  pendingRequests$ = this.pendingRequestsSubject.asObservable();
  employeeRequests$ = this.employeeRequestsSubject.asObservable();

  constructor() {
    // Initialiser les écouteurs en temps réel
    this.initializeRealtimeListeners();
  }

  private initializeRealtimeListeners() {
    // Écouter toutes les demandes
    onSnapshot(
      this.absenceCollection,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AbsenceRequest[];
        this.allRequestsSubject.next(requests);
      },
      (error) => {
        console.error('Error listening to all requests:', error);
      }
    );

    // Écouter les demandes en attente
    const pendingQuery = query(
      this.absenceCollection,
      where('status', '==', 'pending')
    );
    onSnapshot(
      pendingQuery,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AbsenceRequest[];
        this.pendingRequestsSubject.next(requests);
      },
      (error) => {
        console.error('Error listening to pending requests:', error);
      }
    );
  }

  getAllAbsenceRequests(): Observable<AbsenceRequest[]> {
    return this.allRequests$;
  }

  getPendingRequests(): Observable<AbsenceRequest[]> {
    return this.pendingRequests$;
  }

  getFilteredRequests(
    status: 'approved' | 'rejected'
  ): Observable<AbsenceRequest[]> {
    return new Observable<AbsenceRequest[]>((observer) => {
      const statusQuery = query(
        this.absenceCollection,
        where('status', '==', status)
      );

      const unsubscribe = onSnapshot(
        statusQuery,
        (snapshot) => {
          const requests = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as AbsenceRequest[];
          observer.next(requests);
        },
        (error) => {
          observer.error(error);
        }
      );

      // Cleanup function
      return () => unsubscribe();
    });
  }

  getRequestsByEmployee(employeeId: string): Observable<AbsenceRequest[]> {
    return new Observable<AbsenceRequest[]>((observer) => {
      const employeeQuery = query(
        this.absenceCollection,
        where('employeeId', '==', employeeId)
      );

      const unsubscribe = onSnapshot(
        employeeQuery,
        (snapshot) => {
          const requests = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as AbsenceRequest[];
          this.employeeRequestsSubject.next(requests);
          observer.next(requests);
        },
        (error) => {
          observer.error(error);
        }
      );

      // Cleanup function
      return () => unsubscribe();
    });
  }

  async updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    adminComment: string
  ): Promise<boolean> {
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

  async createRequest(requestData: Partial<AbsenceRequest>): Promise<boolean> {
    try {
      await addDoc(this.absenceCollection, {
        ...requestData,
        submissionDate: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error creating absence request:', error);
      return false;
    }
  }
}
