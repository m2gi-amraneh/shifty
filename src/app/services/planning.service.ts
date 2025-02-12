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
  onSnapshot,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { getMessaging, getToken } from 'firebase/messaging';

export interface Shift {
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
  private firestore: Firestore = inject(Firestore);
  private readonly collectionName = 'shifts';
  messaging = getMessaging();

  // BehaviorSubject pour stocker les shifts du jour actuel
  private currentDayShiftsSubject = new BehaviorSubject<Shift[]>([]);
  currentDayShifts$ = this.currentDayShiftsSubject.asObservable();

  // Méthode pour obtenir les shifts en temps réel pour un jour spécifique
  getShiftsForDayRealtime(day: string): Observable<Shift[]> {
    return new Observable<Shift[]>((observer) => {
      const shiftsCollection = collection(this.firestore, this.collectionName);
      const q = query(shiftsCollection, where('day', '==', day));

      // Utiliser onSnapshot pour les mises à jour en temps réel
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const shifts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Shift),
          }));
          this.currentDayShiftsSubject.next(shifts);
          observer.next(shifts);
        },
        (error) => {
          observer.error(error);
        }
      );

      // Retourner la fonction de nettoyage
      return () => unsubscribe();
    });
  }

  // Obtenir les shifts pour un employé spécifique en temps réel
  getShiftsForEmployeeRealtime(employeeId: string): Observable<Shift[]> {
    return new Observable<Shift[]>((observer) => {
      const shiftsCollection = collection(this.firestore, this.collectionName);
      const q = query(shiftsCollection, where('employee.id', '==', employeeId));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const shifts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Shift),
          }));
          observer.next(shifts);
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => unsubscribe();
    });
  }

  // Les autres méthodes restent inchangées
  addShift(shift: Shift): Promise<any> {
    const shiftsCollection = collection(this.firestore, this.collectionName);
    //this.sendNotification(shift.employee.id, 'You have been added to the schedule!');

    return addDoc(shiftsCollection, shift);

  }

  updateShift(shiftId: string, shift: Partial<Shift>): Promise<void> {
    const shiftDoc = doc(this.firestore, `${this.collectionName}/${shiftId}`);
    return updateDoc(shiftDoc, shift);
  }

  deleteShift(shiftId: string): Promise<void> {
    const shiftDoc = doc(this.firestore, `${this.collectionName}/${shiftId}`);
    return deleteDoc(shiftDoc);
  }

  async sendNotification(userId: string, message: string) {
    const token = await this.getUserToken(userId);
    if (!token) return;

    const payload = {
      notification: {
        title: 'Schedule Update',
        body: message,
      },
      token: token,
    };

    fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=YOUR_SERVER_KEY`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async getUserToken(userId: string): Promise<string | null> {
    // Fetch token from Firestore where user tokens are stored
    return 'USER_FCM_TOKEN'; // Replace with Firestore query to fetch user token
  }
}
