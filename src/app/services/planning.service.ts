import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc, // Import getDoc
  getDocs, // Import getDocs
  onSnapshot,
  Timestamp, // Import Timestamp if needed later
  Unsubscribe,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable, BehaviorSubject, of, Subscription, from } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
// Messaging imports remain the same
import { getMessaging, getToken } from 'firebase/messaging';
// Import AuthService
import { AuthService } from './auth.service';

// Keep your existing Shift interface
export interface Shift {
  id?: string;
  day: string; // Assuming 'YYYY-MM-DD' or similar sortable format
  startTime: string;
  endTime: string;
  employee: {
    id: string; // User UID
    name: string;
  };
  role: string; // Position/Role for the shift
}

@Injectable({
  providedIn: 'root',
})
export class PlanningService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Inject AuthService
  messaging = getMessaging(); // Keep messaging if used

  // --- Commented out BehaviorSubject - methods now return targeted Observables ---
  // If you absolutely need this subject for some specific UI pattern,
  // you'll need to add initializeTenantListener and ngOnDestroy similar to other services
  // to listen to the *current day's* shifts for the tenant in real-time.
  // private currentDayShiftsSubject = new BehaviorSubject<Shift[]>([]);
  // currentDayShifts$ = this.currentDayShiftsSubject.asObservable();
  // ---

  private userMetadataSubscription: Subscription | null = null; // For cleaning up auth subscription

  constructor() {
    console.log("PlanningService Initialized (Multi-Tenant Adapted)");
    // Minimal setup here, observables react to auth state
    this.userMetadataSubscription = this.authService.userMetadata$.subscribe(meta => {
      // We don't necessarily need to *do* anything here,
      // but subscribing ensures the auth state is monitored.
      // Methods using switchMap will react automatically.
      if (!meta) {
        // Optionally clear any local non-observable state if user logs out
        // e.g., this.currentDayShiftsSubject.next([]); (if subject is kept)
      }
    });
  }


  /** Utility to get the current business ID or return null */
  private getCurrentBusinessId(): string | null {
    return this.authService.getCurrentBusinessId();
  }

  /** Utility to get the tenant-specific path */
  private getShiftsCollectionPath(): string | null {
    const businessId = this.getCurrentBusinessId();
    return businessId ? `business/${businessId}/shifts` : null;
  }

  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * ADAPTED: Gets shifts in real-time for a specific day WITHIN the current business.
   * Returns an empty observable if the user is not associated with a business.
   */
  getShiftsForDayRealtime(day: string): Observable<Shift[]> {
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getShiftsForDayRealtime(${day}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/shifts`;
        console.log(`getShiftsForDayRealtime(${day}): Listening to ${collectionPath}`);
        const shiftsQuery = query(
          collection(this.firestore, collectionPath),
          where('day', '==', day)
          // Add orderBy if needed (e.g., orderBy('startTime'))
        );

        // Return a new observable for this specific query
        return new Observable<Shift[]>((observer) => {
          const unsubscribe = onSnapshot(shiftsQuery,
            (snapshot) => {
              const shifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
              console.log(`getShiftsForDayRealtime(${day}): Received ${shifts.length} shifts.`);
              observer.next(shifts);
              // DO NOT update the shared subject here: this.currentDayShiftsSubject.next(shifts);
            },
            (error) => {
              console.error(`getShiftsForDayRealtime(${day}): Error listening:`, error);
              observer.error(error); // Propagate error
            }
          );
          // Return cleanup function
          return () => {
            console.log(`getShiftsForDayRealtime(${day}): Unsubscribing listener.`);
            unsubscribe();
          };
        });
      }),
      catchError(error => {
        console.error(`getShiftsForDayRealtime(${day}): Error in outer stream:`, error);
        return of([]); // Return empty array on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Gets shifts for a specific employee in real-time WITHIN the current business.
   * Returns an empty observable if the user is not associated with a business.
   */
  getShiftsForEmployeeRealtime(employeeId: string): Observable<Shift[]> {
    if (!employeeId) return of([]); // Need an employee ID

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getShiftsForEmployeeRealtime(${employeeId}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/shifts`;
        console.log(`getShiftsForEmployeeRealtime(${employeeId}): Listening to ${collectionPath}`);
        const shiftsQuery = query(
          collection(this.firestore, collectionPath),
          where('employee.id', '==', employeeId)
          // Add orderBy if needed (e.g., orderBy('day'), orderBy('startTime'))
        );

        // Return a new observable for this specific query
        return new Observable<Shift[]>((observer) => {
          const unsubscribe = onSnapshot(shiftsQuery,
            (snapshot) => {
              const shifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shift));
              console.log(`getShiftsForEmployeeRealtime(${employeeId}): Received ${shifts.length} shifts.`);
              observer.next(shifts);
            },
            (error) => {
              console.error(`getShiftsForEmployeeRealtime(${employeeId}): Error listening:`, error);
              observer.error(error);
            }
          );
          // Return cleanup function
          return () => {
            console.log(`getShiftsForEmployeeRealtime(${employeeId}): Unsubscribing listener.`);
            unsubscribe();
          };
        });
      }),
      catchError(error => {
        console.error(`getShiftsForEmployeeRealtime(${employeeId}): Error in outer stream:`, error);
        return of([]); // Return empty array on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Adds a shift to the current business's subcollection.
   * Throws error if not logged into a business or if add fails.
   */
  async addShift(shift: Shift): Promise<any> { // Original return type was Promise<any>
    const collectionPath = this.getShiftsCollectionPath();
    if (!collectionPath) {
      throw new Error("Cannot add shift: User not associated with a business.");
    }
    const shiftsCollection = collection(this.firestore, collectionPath);

    // Exclude 'id' if it exists in the input shift object
    const { id, ...shiftData } = shift;

    console.log(`addShift: Adding shift to ${collectionPath}`);
    try {
      const docRef = await addDoc(shiftsCollection, shiftData);
      console.log(`addShift: Success. New ID: ${docRef.id}`);
      // Optionally trigger notification (ensure sendNotification is adapted if needed)
      // if (shift.employee?.id) {
      //    this.sendNotification(shift.employee.id, `You have a new shift on ${shift.day}.`);
      // }
      return docRef; // Return the DocumentReference as before
    } catch (error) {
      console.error(`addShift: Error adding to ${collectionPath}:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Updates a shift within the current business's subcollection.
   * Throws error if not logged into a business or if update fails.
   */
  async updateShift(shiftId: string, shiftUpdate: Partial<Shift>): Promise<void> {
    const businessId = this.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("Cannot update shift: User not associated with a business.");
    }
    if (!shiftId) {
      throw new Error("Cannot update shift: Shift ID is required.");
    }

    const docPath = `business/${businessId}/shifts/${shiftId}`;
    const shiftDocRef = doc(this.firestore, docPath);

    // Ensure 'id' is not part of the update payload
    const { id, ...dataToUpdate } = shiftUpdate;

    console.log(`updateShift: Updating shift ${shiftId} in business ${businessId}`);
    try {
      await updateDoc(shiftDocRef, dataToUpdate);
      console.log(`updateShift: Success.`);
    } catch (error) {
      console.error(`updateShift: Error:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Deletes a shift from the current business's subcollection.
   * Throws error if not logged into a business or if delete fails.
   */
  async deleteShift(shiftId: string): Promise<void> {
    const businessId = this.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("Cannot delete shift: User not associated with a business.");
    }
    if (!shiftId) {
      throw new Error("Cannot delete shift: Shift ID is required.");
    }

    const docPath = `business/${businessId}/shifts/${shiftId}`;
    const shiftDocRef = doc(this.firestore, docPath);

    console.log(`deleteShift: Deleting shift ${shiftId} in business ${businessId}`);
    try {
      await deleteDoc(shiftDocRef);
      console.log(`deleteShift: Success.`);
    } catch (error) {
      console.error(`deleteShift: Error:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  // --- Notification Methods (Assuming global /users storage for tokens) ---

  /** Sends notification using FCM. Requires server key setup. */
  async sendNotification(userId: string, message: string): Promise<void> {
    if (!userId || !message) return;

    try {
      const token = await this.getUserToken(userId); // Fetch token using adapted method
      if (!token) {
        console.warn(`sendNotification: No FCM token found for user ${userId}. Cannot send notification.`);
        return;
      }

      // ** SECURITY WARNING: Storing your server key in client-side code is insecure! **
      // ** This should ideally be handled by a Cloud Function triggered by Firestore writes. **
      const YOUR_SERVER_KEY = "YOUR_FCM_SERVER_KEY_HERE"; // <-- Replace or move to backend
      if (YOUR_SERVER_KEY === "YOUR_FCM_SERVER_KEY_HERE") {
        console.error("sendNotification: FCM Server Key is not configured!");
        return;
      }

      const payload = {
        notification: {
          title: 'Schedule Update',
          body: message,
          // Add other options like icon, click_action if needed
        },
        token: token,
      };

      console.log(`sendNotification: Sending notification to user ${userId}`);
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${YOUR_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`sendNotification: FCM request failed with status ${response.status}:`, errorData);
      } else {
        console.log(`sendNotification: Notification sent successfully to user ${userId}.`);
      }

    } catch (error) {
      console.error(`sendNotification: Error sending notification to user ${userId}:`, error);
    }
  }

  /**
   * ADAPTED: Fetches the FCM token for a specific user from the global /users collection.
   * Assumes token is stored in a field named 'fcmToken'.
   */
  async getUserToken(userId: string): Promise<string | null> {
    if (!userId) return null;
    // Path to the global user document
    const userDocRef = doc(this.firestore, `users/${userId}`);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        // ** Adjust 'fcmToken' if your field name is different **
        const token = userDocSnap.data()?.['fcmToken'] as string | undefined;
        return token || null;
      } else {
        console.warn(`getUserToken: User document not found for ID: ${userId}`);
        return null;
      }
    } catch (error) {
      console.error(`getUserToken: Error fetching token for user ${userId}:`, error);
      return null;
    }
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    // Unsubscribe from the auth service subscription
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("PlanningService: Unsubscribed from AuthService.");
    }
    // No persistent Firestore listeners were kept in this adapted version's core logic
    // (observables returned by functions manage their own lifecycle via subscriber)
  }
}