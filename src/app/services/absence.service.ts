import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  orderBy, // Optional: for sorting
  Unsubscribe, // Type for listener cleanup
  Timestamp, // Import Timestamp if using Date objects
  serverTimestamp, // For setting server-side timestamps
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, of, Subscription } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import { AuthService, UserMetadata } from './auth.service'; // Import AuthService and UserMetadata

// Define the interface for AbsenceRequest data
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
export class AbsenceService implements OnDestroy {
  // Subjects to hold the current state for the logged-in tenant
  private allRequestsSubject = new BehaviorSubject<AbsenceRequest[]>([]);
  private pendingRequestsSubject = new BehaviorSubject<AbsenceRequest[]>([]);
  // Removed employeeRequestsSubject for simplicity, getRequestsByEmployee returns Observable directly

  // Public observables exposing the state
  allRequests$ = this.allRequestsSubject.asObservable();
  pendingRequests$ = this.pendingRequestsSubject.asObservable();

  // Listener unsubscribe functions
  private allRequestsUnsubscribe: Unsubscribe | null = null;
  private pendingRequestsUnsubscribe: Unsubscribe | null = null;
  private userMetadataSubscription: Subscription | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService // Inject AuthService
  ) {
    console.log("AbsenceService Initialized - Waiting for User Metadata");
    this.initializeTenantListeners();
  }

  /**
   * Sets up Firestore listeners *only* when a valid user with a businessId is logged in.
   * Tears down listeners on logout or if metadata becomes invalid.
   */
  private initializeTenantListeners() {
    this.userMetadataSubscription = this.authService.userMetadata$.pipe(
      tap(metadata => console.log("AbsenceService: User metadata changed:", metadata)),
      switchMap(metadata => {
        // --- Teardown existing listeners before setting up new ones or if logged out ---
        this.teardownListeners();

        if (metadata?.businessId) {
          // --- User is logged in with a valid businessId ---
          console.log(`AbsenceService: Setting up listeners for businessId: ${metadata.businessId}`);
          const businessId = metadata.businessId;
          const basePath = `business/${businessId}/absences`;

          // Listener for ALL requests for this tenant
          const allQuery = query(
            collection(this.firestore, basePath),
            orderBy('submissionDate', 'desc') // Optional: Sort by submission date
          );
          this.allRequestsUnsubscribe = onSnapshot(allQuery,
            (snapshot) => {
              const requests = snapshot.docs.map(d => this.mapDocToRequest(d)) as AbsenceRequest[];
              console.log(`AbsenceService: Received ${requests.length} total requests for ${businessId}`);
              this.allRequestsSubject.next(requests);
            },
            (error) => {
              console.error(`AbsenceService: Error listening to all requests for ${businessId}:`, error);
              this.allRequestsSubject.next([]); // Clear on error
            }
          );

          // Listener for PENDING requests for this tenant
          const pendingQuery = query(
            collection(this.firestore, basePath),
            where('status', '==', 'pending'),
            orderBy('submissionDate', 'asc') // Optional: Sort oldest first
          );
          this.pendingRequestsUnsubscribe = onSnapshot(pendingQuery,
            (snapshot) => {
              const requests = snapshot.docs.map(d => this.mapDocToRequest(d)) as AbsenceRequest[];
              console.log(`AbsenceService: Received ${requests.length} pending requests for ${businessId}`);
              this.pendingRequestsSubject.next(requests);
            },
            (error) => {
              console.error(`AbsenceService: Error listening to pending requests for ${businessId}:`, error);
              this.pendingRequestsSubject.next([]); // Clear on error
            }
          );
          // Return a non-null observable to keep the stream alive
          return of(true);
        } else {
          // --- User is logged out or metadata is invalid ---
          console.log("AbsenceService: User logged out or businessId missing. Listeners stopped.");
          this.allRequestsSubject.next([]); // Clear subjects
          this.pendingRequestsSubject.next([]);
          // Return an observable indicating no active listeners
          return of(false);
        }
      }),
      // Catch errors in the switchMap/listener setup itself
      // catchError(err => {
      //     console.error("AbsenceService: Error in userMetadata stream:", err);
      //     this.teardownListeners();
      //     this.allRequestsSubject.next([]);
      //     this.pendingRequestsSubject.next([]);
      //     return of(false); // Indicate failure/inactive state
      // })
    ).subscribe(); // Keep the subscription active
  }

  /** Tears down active Firestore listeners. */
  private teardownListeners() {
    if (this.allRequestsUnsubscribe) {
      console.log("AbsenceService: Unsubscribing from all requests listener.");
      this.allRequestsUnsubscribe();
      this.allRequestsUnsubscribe = null;
    }
    if (this.pendingRequestsUnsubscribe) {
      console.log("AbsenceService: Unsubscribing from pending requests listener.");
      this.pendingRequestsUnsubscribe();
      this.pendingRequestsUnsubscribe = null;
    }
  }

  /** Utility to map Firestore doc snapshot to AbsenceRequest, handling Timestamps */
  private mapDocToRequest(doc: any): AbsenceRequest {
    const data = doc.data();
    // Convert Firestore Timestamps to JS Date objects or keep as Timestamps based on preference
    // Here, we'll keep them as Timestamps if they exist, otherwise use the raw data
    const mapTimestamp = (ts: any) => (ts?.toDate ? ts.toDate() : ts);

    return {
      id: doc.id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      startDate: mapTimestamp(data.startDate), // Convert or keep timestamp
      endDate: mapTimestamp(data.endDate),     // Convert or keep timestamp
      reason: data.reason,
      status: data.status,
      submissionDate: mapTimestamp(data.submissionDate), // Convert or keep timestamp
      processedDate: data.processedDate ? mapTimestamp(data.processedDate) : undefined,
      adminComment: data.adminComment,
      type: data.type,
    } as AbsenceRequest;
  }


  // --- Public Methods (Tenant-Aware) ---

  /** Gets ALL absence requests for the current tenant (uses the existing listener). */
  getAllAbsenceRequests(): Observable<AbsenceRequest[]> {
    // Simply return the observable connected to the listener
    return this.allRequests$;
  }

  /** Gets PENDING absence requests for the current tenant (uses the existing listener). */
  getPendingRequests(): Observable<AbsenceRequest[]> {
    // Simply return the observable connected to the listener
    return this.pendingRequests$;
  }

  /** Gets APPROVED or REJECTED requests for the current tenant. Creates a new listener per call. */
  getFilteredRequests(status: 'approved' | 'rejected'): Observable<AbsenceRequest[]> {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      console.error("getFilteredRequests: Cannot fetch - No Business ID available.");
      return of([]); // Return empty observable if no tenant context
    }
    const basePath = `business/${businessId}/absences`;
    const statusQuery = query(
      collection(this.firestore, basePath),
      where('status', '==', status),
      orderBy('processedDate', 'desc') // Order by processed date
    );

    // Return an Observable that sets up and tears down its own listener
    return new Observable<AbsenceRequest[]>((observer) => {
      console.log(`AbsenceService: Setting up listener for ${status} requests in ${businessId}`);
      const unsubscribe = onSnapshot(statusQuery,
        (snapshot) => {
          const requests = snapshot.docs.map(d => this.mapDocToRequest(d));
          observer.next(requests);
        },
        (error) => {
          console.error(`AbsenceService: Error listening to ${status} requests for ${businessId}:`, error);
          observer.error(error); // Propagate error
        }
      );
      // Cleanup function: Called when the observable is unsubscribed from
      return () => {
        console.log(`AbsenceService: Tearing down listener for ${status} requests in ${businessId}`);
        unsubscribe();
      };
    });
  }

  /** Gets requests specifically for a given employee ID within the current tenant. */
  getRequestsByEmployee(employeeId: string): Observable<AbsenceRequest[]> {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      console.error("getRequestsByEmployee: Cannot fetch - No Business ID available.");
      return of([]);
    }
    if (!employeeId) {
      console.error("getRequestsByEmployee: Employee ID is required.");
      return of([]);
    }

    const basePath = `business/${businessId}/absences`;
    const employeeQuery = query(
      collection(this.firestore, basePath),
      where('employeeId', '==', employeeId),
      orderBy('submissionDate', 'desc') // Order by submission date
    );

    // Return an Observable with its own listener lifecycle
    return new Observable<AbsenceRequest[]>((observer) => {
      console.log(`AbsenceService: Setting up listener for employee ${employeeId} requests in ${businessId}`);
      const unsubscribe = onSnapshot(employeeQuery,
        (snapshot) => {
          const requests = snapshot.docs.map(d => this.mapDocToRequest(d));
          observer.next(requests);
          // Note: We are NOT updating the old employeeRequestsSubject here
        },
        (error) => {
          console.error(`AbsenceService: Error listening to employee ${employeeId} requests for ${businessId}:`, error);
          observer.error(error);
        }
      );
      return () => {
        console.log(`AbsenceService: Tearing down listener for employee ${employeeId} requests in ${businessId}`);
        unsubscribe();
      };
    });
  }

  /** Updates the status and admin comment of a specific request within the current tenant. */
  async updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    adminComment: string
  ): Promise<boolean> {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      console.error("updateRequestStatus: Failed - No Business ID available.");
      // Optionally throw an error or return a specific result
      throw new Error("User is not associated with a business.");
      // return false;
    }
    if (!requestId) {
      console.error("updateRequestStatus: Failed - Request ID is required.");
      return false;
    }

    const requestRef = doc(this.firestore, `business/${businessId}/absences/${requestId}`);
    const updateData = {
      status,
      adminComment: adminComment || '', // Ensure it's not null/undefined
      processedDate: serverTimestamp(), // Use server timestamp for accuracy
    };

    console.log(`AbsenceService: Updating request ${requestId} in ${businessId} to ${status}`);
    try {
      await updateDoc(requestRef, updateData);
      console.log(`AbsenceService: Request ${requestId} updated successfully.`);
      return true;
    } catch (error) {
      console.error(`AbsenceService: Error updating request ${requestId} in ${businessId}:`, error);
      return false; // Indicate failure
    }
  }

  /** Creates a new absence request within the current tenant. */
  async createRequest(requestData: Partial<AbsenceRequest>): Promise<boolean> {
    const businessId = this.authService.getCurrentBusinessId();
    const currentUser = this.authService.getCurrentUserMetadata(); // Get current user info

    if (!businessId) {
      console.error("createRequest: Failed - No Business ID available.");
      throw new Error("User is not associated with a business.");
      // return false;
    }
    if (!currentUser) {
      console.error("createRequest: Failed - No current user available.");
      throw new Error("User data not available.");
      // return false;
    }

    const absencesCollectionRef = collection(this.firestore, `business/${businessId}/absences`);

    // Prepare the data, ensure dates are Timestamps if needed by Firestore rules/queries
    const newRequestData = {
      ...requestData,
      employeeId: currentUser.uid, // Automatically set employeeId to current user's UID
      employeeName: currentUser.displayName || currentUser.email, // Use display name or email
      status: 'pending' as const, // Initial status is always pending
      submissionDate: serverTimestamp(), // Use server timestamp
      adminComment: '', // Initialize admin comment
      // Convert JS Dates to Timestamps if necessary before saving
      // startDate: Timestamp.fromDate(new Date(requestData.startDate)),
      // endDate: Timestamp.fromDate(new Date(requestData.endDate)),
    };

    console.log(`AbsenceService: Creating new request in ${businessId} for employee ${newRequestData.employeeId}`);
    try {
      await addDoc(absencesCollectionRef, newRequestData);
      console.log(`AbsenceService: New request created successfully in ${businessId}.`);
      return true;
    } catch (error) {
      console.error(`AbsenceService: Error creating request in ${businessId}:`, error);
      return false;
    }
  }

  /** Cleans up listeners when the service is destroyed. */
  ngOnDestroy(): void {
    console.log("AbsenceService: Destroying - Tearing down listeners.");
    this.teardownListeners();
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
    }
  }
}
