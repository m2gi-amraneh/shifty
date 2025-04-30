import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy, // Optional for sorting by string dates (lexicographical)
  Unsubscribe,
  serverTimestamp, // Can still be used for createdAt if desired
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, of, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { AuthService, UserMetadata } from './auth.service'; // Import AuthService

// Interface for Closing Period data - Dates remain as strings
export interface ClosingPeriod {
  id?: string; // Document ID from Firestore
  startDate: string; // Keep as ISO string format or similar string representation
  endDate: string;   // Keep as ISO string format or similar string representation
  description: string;
  // You could still add a createdAt timestamp if useful
  // createdAt?: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class ClosingDaysService implements OnDestroy {
  private closingPeriodsSubject = new BehaviorSubject<ClosingPeriod[]>([]);
  private listenerUnsubscribe: Unsubscribe | null = null;
  private userMetadataSubscription: Subscription | null = null;

  // Public observable for components to subscribe to
  closingPeriods$ = this.closingPeriodsSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService // Inject AuthService
  ) {
    console.log("ClosingDaysService Initialized - Waiting for User Metadata");
    this.initializeTenantListener();
  }

  /**
   * Sets up the Firestore listener based on the current user's businessId.
   * Reacts to login/logout events from AuthService.
   */
  private initializeTenantListener(): void {
    this.userMetadataSubscription = this.authService.userMetadata$.pipe(
      tap(metadata => console.log("ClosingDaysService: User metadata changed:", metadata)),
      switchMap(metadata => {
        // --- Teardown existing listener first ---
        this.teardownListener();

        if (metadata?.businessId) {
          // --- User logged in with a valid businessId ---
          const businessId = metadata.businessId;
          const collectionPath = `business/${businessId}/closingPeriods`;
          console.log(`ClosingDaysService: Setting up listener for path: ${collectionPath}`);

          // Querying - Note: Ordering by string dates might be lexicographical, not chronological
          // Consider storing dates in 'YYYY-MM-DD' format for better string sorting if needed.
          const q = query(
            collection(this.firestore, collectionPath),
            orderBy('startDate', 'asc') // Sorts lexicographically based on string
          );

          this.listenerUnsubscribe = onSnapshot(q,
            (snapshot) => {
              // Directly map assuming dates are stored as strings
              const periods = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
              } as ClosingPeriod)); // Cast directly
              console.log(`ClosingDaysService: Received ${periods.length} closing periods for ${businessId}`);
              this.closingPeriodsSubject.next(periods);
            },
            (error) => {
              console.error(`ClosingDaysService: Error listening to closing periods for ${businessId}:`, error);
              this.closingPeriodsSubject.next([]); // Clear data on error
            }
          );
          // Return non-null observable to keep stream alive
          return of(true);
        } else {
          // --- User logged out or no businessId ---
          console.log("ClosingDaysService: User logged out or businessId missing. Listener stopped.");
          this.closingPeriodsSubject.next([]); // Clear data
          // Return observable indicating inactive state
          return of(false);
        }
      }),
    ).subscribe();
  }

  /** Unsubscribes from the active Firestore listener. */
  private teardownListener(): void {
    if (this.listenerUnsubscribe) {
      console.log("ClosingDaysService: Tearing down listener.");
      this.listenerUnsubscribe();
      this.listenerUnsubscribe = null;
    }
  }

  // --- Public CRUD Methods (Tenant-Aware, String Dates) ---

  /** Adds a new closing period for the current tenant (dates as strings). */
  async addClosingPeriod(periodData: Omit<ClosingPeriod, 'id'>): Promise<string | null> {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      console.error("addClosingPeriod: Failed - No Business ID available.");
      throw new Error("User is not associated with a business.");
    }

    const collectionPath = `business/${businessId}/closingPeriods`;
    const colRef = collection(this.firestore, collectionPath);

    // Data to save - dates are already strings per the interface
    const dataToSave = {
      ...periodData,
      // Optionally add a server timestamp for creation time if needed
      // createdAt: serverTimestamp(),
    };

    console.log(`ClosingDaysService: Adding closing period to ${collectionPath}`);
    try {
      // Add the document with string dates
      const docRef = await addDoc(colRef, dataToSave);
      console.log(`ClosingDaysService: Period added with ID: ${docRef.id}`);
      return docRef.id; // Return the new document ID
    } catch (error) {
      console.error(`ClosingDaysService: Error adding period to ${collectionPath}:`, error);
      return null; // Indicate failure
    }
  }

  /** Updates an existing closing period for the current tenant (dates as strings). */
  async updateClosingPeriod(period: ClosingPeriod): Promise<boolean> {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      console.error("updateClosingPeriod: Failed - No Business ID available.");
      throw new Error("User is not associated with a business.");
    }
    if (!period.id) {
      console.error('updateClosingPeriod: Failed - Period ID is required.');
      return false;
    }

    const docPath = `business/${businessId}/closingPeriods/${period.id}`;
    const docRef = doc(this.firestore, docPath);

    // Prepare data to update - exclude 'id', dates remain strings
    const { id, ...dataToUpdate } = period;

    console.log(`ClosingDaysService: Updating period ${period.id} at ${docPath}`);
    try {
      // Update the document with the provided data (including string dates)
      await updateDoc(docRef, dataToUpdate);
      console.log(`ClosingDaysService: Period ${period.id} updated successfully.`);
      return true;
    } catch (error) {
      console.error(`ClosingDaysService: Error updating period ${period.id} at ${docPath}:`, error);
      return false;
    }
  }

  /** Deletes a closing period for the current tenant. */
  async deleteClosingPeriod(id: string): Promise<boolean> {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      console.error("deleteClosingPeriod: Failed - No Business ID available.");
      throw new Error("User is not associated with a business.");
    }
    if (!id) {
      console.error("deleteClosingPeriod: Failed - Period ID is required.");
      return false;
    }

    const docPath = `business/${businessId}/closingPeriods/${id}`;
    const docRef = doc(this.firestore, docPath);

    console.log(`ClosingDaysService: Deleting period ${id} at ${docPath}`);
    try {
      await deleteDoc(docRef);
      console.log(`ClosingDaysService: Period ${id} deleted successfully.`);
      return true;
    } catch (error) {
      console.error(`ClosingDaysService: Error deleting period ${id} at ${docPath}:`, error);
      return false;
    }
  }

  // Optional method to get current value synchronously (already tenant-aware via subject)
  getCurrentClosingPeriods(): ClosingPeriod[] {
    return this.closingPeriodsSubject.getValue();
  }

  /** Cleans up subscriptions when the service is destroyed. */
  ngOnDestroy(): void {
    console.log("ClosingDaysService: Destroying - Tearing down listener and subscription.");
    this.teardownListener();
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
    }
  }
}