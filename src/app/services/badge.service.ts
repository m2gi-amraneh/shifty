import { Injectable, OnDestroy } from '@angular/core';
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
  Timestamp, // Keep Timestamp for data handling
  orderBy,
  limit, // Added for checkExistingBadgedShift
} from '@angular/fire/firestore';
import { Observable, from, map, of, Subscription, switchMap, catchError, take } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from './auth.service'; // Import AuthService

// Keep existing interface
export interface BadgedShift {
  id?: string;
  employeeId: string; // Global User UID
  shiftId: string;    // ID of the shift being badged (might also need tenant context if IDs aren't global)
  badgeInTime: Date; // Allow both for flexibility, convert on read/write
  badgeOutTime?: Date;
  status: 'checked-in' | 'on-break' | 'completed';
}

@Injectable({
  providedIn: 'root',
})
export class BadgeService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Inject AuthService

  private userMetadataSubscription: Subscription | null = null;

  // --- Mock data and seeding method (Keep for testing, adapt if needed) ---
  // This mock data won't be automatically used by the tenant-aware methods.
  badgedShifts_MOCK_DATA = [ // Renamed to avoid confusion
    // ... your mock data objects ...
    { employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82', shiftId: 'SHIFT_2024_001', badgeInTime: new Date('2024-03-01T08:55:00'), badgeOutTime: new Date('2024-03-01T17:10:00'), status: 'completed' },
    { employeeId: 'VCbSYUdJtKWeWkE9NfVrPdNGdL82', shiftId: 'SHIFT_2024_002', badgeInTime: new Date('2024-03-02T09:00:00'), badgeOutTime: new Date('2024-03-02T18:00:00'), status: 'completed' },
    // ... rest of your mock data ...
  ];

  constructor() {
    console.log("BadgeService Initialized (Multi-Tenant Adapted)");
    // Subscribe to auth state primarily for cleanup or if needed for non-reactive methods
    this.userMetadataSubscription = this.authService.userMetadata$.subscribe();
  }

  /** Utility to get the current business ID or throw an error */
  private getCurrentBusinessIdOrFail(): string {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("BadgeService Error: Operation failed. User is not associated with a business.");
    }
    return businessId;
  }

  /** Utility to get the tenant-specific path */
  private getBadgedShiftsCollectionPath(): string | null {
    const businessId = this.authService.getCurrentBusinessId();
    return businessId ? `business/${businessId}/badgedShifts` : null;
  }

  /** Converts Firestore Timestamps to JS Dates in a BadgedShift object */
  private mapTimestampToDate(shift: any): BadgedShift {
    // Helper to safely convert potential Timestamps
    const toDate = (ts: any): Date | undefined => {
      if (!ts) return undefined;
      return ts instanceof Timestamp ? ts.toDate() : (ts instanceof Date ? ts : undefined); // Handle existing Dates or convert Timestamps
    };
    return {
      ...shift,
      badgeInTime: toDate(shift.badgeInTime) || new Date(), // Provide a default or handle error if badgeInTime is missing/invalid
      badgeOutTime: toDate(shift.badgeOutTime),
    } as BadgedShift;
  }


  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * Validates QR Code. (Logic might need tenant context depending on implementation).
   * This version assumes validation doesn't require DB lookup *here*.
   */
  validateQRCode(qrCode: string): boolean {
    // If validation needs to check against shifts within the *current business*,
    // this method would need to become async and query the tenant's shifts collection.
    console.warn("validateQRCode: Using mock validation. Adapt if tenant-specific validation needed.");
    return typeof qrCode === 'string' && qrCode.length > 10 && qrCode.startsWith('SHIFT_');
  }

  /**
   * ADAPTED: Creates a badged shift entry in the current business's subcollection.
   * Throws error if not logged into a business or if add fails.
   */
  async createBadgedShift(
    employeeId: string,
    shiftId: string // Assuming shiftId is relevant within the business context
  ): Promise<string> {
    const collectionPath = this.getBadgedShiftsCollectionPath();
    if (!collectionPath) {
      throw new Error("Cannot create badged shift: User not associated with a business.");
    }
    if (!employeeId || !shiftId) {
      throw new Error("Cannot create badged shift: Employee ID and Shift ID are required.");
    }
    const badgeCollection = collection(this.firestore, collectionPath);

    // Prepare data - ensure badgeInTime is a Timestamp for Firestore
    const badgedShiftData: Omit<BadgedShift, 'id' | 'badgeOutTime'> = {
      employeeId,
      shiftId,
      badgeInTime: new Date(), // Use Timestamp
      status: 'checked-in',
    };

    console.log(`createBadgedShift: Adding to ${collectionPath}`);
    try {
      const docRef = await addDoc(badgeCollection, badgedShiftData);
      console.log(`createBadgedShift: Success. New ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`createBadgedShift: Error adding to ${collectionPath}:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Adds mock/seed data to a SPECIFIC business's subcollection.
   * Requires explicit businessId. USE WITH CAUTION.
   */
  async addBadgedShifts(businessId: string) {
    if (!businessId) {
      console.error("addBadgedShifts: Cannot add shifts without a target businessId.");
      return;
    }
    const collectionPath = `business/${businessId}/badgedShifts`;
    console.warn(`addBadgedShifts: Adding MOCK data to ${collectionPath}`);
    const badgeCollection = collection(this.firestore, collectionPath);

    for (const shift of this.badgedShifts_MOCK_DATA) { // Use the mock data array
      try {
        // Convert JS Dates in mock data to Timestamps before adding
        const dataToAdd = {
          ...shift,
          badgeInTime: Timestamp.fromDate(shift.badgeInTime),
          badgeOutTime: shift.badgeOutTime ? Timestamp.fromDate(shift.badgeOutTime) : null // Handle optional field
        };
        await addDoc(badgeCollection, dataToAdd);
        console.log(`Added mock shift: ${shift.shiftId} to business ${businessId}`);
      } catch (error) {
        console.error(`Error adding mock shift ${shift.shiftId} to business ${businessId}:`, error);
      }
    }
  }

  /**
   * ADAPTED: Gets badged shifts for an employee (one-time fetch) WITHIN the current business.
   * Returns empty array if no business context.
   */
  getBadgedShifts(employeeId: string): Observable<BadgedShift[]> {
    if (!employeeId) return of([]);

    return this.authService.userMetadata$.pipe(
      take(1), // Get the current metadata once for this one-time fetch
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getBadgedShifts(${employeeId}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/badgedShifts`;
        console.log(`getBadgedShifts: Querying ${collectionPath} for employee ${employeeId}`);
        const q = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId),
          orderBy('badgeInTime', 'desc') // Example order
        );

        // Use from(getDocs) for one-time fetch
        return from(getDocs(q)).pipe(
          map((snapshot) =>
            snapshot.docs.map(
              (doc) => this.mapTimestampToDate({ id: doc.id, ...doc.data() }) // Use helper
            )
          ),
          catchError(error => {
            console.error(`getBadgedShifts: Error fetching from ${collectionPath}:`, error);
            return of([]); // Return empty array on error
          })
        );
      }),
      catchError(error => {
        console.error("getBadgedShifts: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Gets badged shifts for an employee in real-time WITHIN the current business.
   * Returns an empty observable if no business context.
   */
  getBadgedShiftsRealtime(employeeId: string): Observable<BadgedShift[]> {
    if (!employeeId) return of([]);

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getBadgedShiftsRealtime(${employeeId}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/badgedShifts`;
        console.log(`getBadgedShiftsRealtime: Listening to ${collectionPath} for employee ${employeeId}`);
        const q = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId),
          orderBy('badgeInTime', 'desc')
        );

        // Use collectionData for real-time updates
        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(shifts => shifts.map(shift => this.mapTimestampToDate(shift))), // Use helper
          catchError(error => {
            console.error(`getBadgedShiftsRealtime: Error listening to ${collectionPath}:`, error);
            return of([]); // Return empty array on error
          })
        );
      }),
      catchError(error => {
        console.error("getBadgedShiftsRealtime: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Gets badged shifts between dates for an employee WITHIN the current business.
   * Returns an empty observable if no business context.
   */
  getBadgedShiftsBetweenDates(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<BadgedShift[]> {
    if (!employeeId || !startDate || !endDate) return of([]);

    return this.authService.userMetadata$.pipe(
      take(1), // Get metadata once for this one-time fetch
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getBadgedShiftsBetweenDates(${employeeId}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/badgedShifts`;
        console.log(`getBadgedShiftsBetweenDates: Querying ${collectionPath} for employee ${employeeId}`);

        // Convert dates to Timestamps for reliable querying
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        const q = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId),
          where('badgeInTime', '>=', startTimestamp),
          where('badgeInTime', '<=', endTimestamp),
          orderBy('badgeInTime', 'asc')
        );

        // Use from(getDocs) for one-time fetch
        return from(getDocs(q)).pipe(
          map((snapshot) =>
            snapshot.docs.map(doc => this.mapTimestampToDate({ id: doc.id, ...doc.data() })) // Use helper
          ),
          catchError(error => {
            console.error(`getBadgedShiftsBetweenDates: Error fetching from ${collectionPath}:`, error);
            return of([]); // Return empty array on error
          })
        );
      }),
      catchError(error => {
        console.error("getBadgedShiftsBetweenDates: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Completes a badged shift (checks out) WITHIN the current business.
   * Throws error if not logged into a business or if update fails.
   */
  async completeBadgedShift(badgeId: string): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    if (!businessId) {
      throw new Error("Cannot complete shift: User not associated with a business.");
    }
    if (!badgeId) {
      throw new Error("Cannot complete shift: Badge ID is required.");
    }

    const docPath = `business/${businessId}/badgedShifts/${badgeId}`;
    const badgeDocRef = doc(this.firestore, docPath);

    console.log(`completeBadgedShift: Updating ${badgeId} in business ${businessId}`);
    try {
      await updateDoc(badgeDocRef, {
        badgeOutTime: Timestamp.now(), // Use server timestamp for accuracy
        status: 'completed',
      });
      console.log(`completeBadgedShift: Success.`);
    } catch (error) {
      console.error(`completeBadgedShift: Error:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Updates arbitrary fields of a badged shift WITHIN the current business.
   * Throws error if not logged into a business or if update fails.
   */
  async updateBadgedShift(badgeId: string, updates: Partial<BadgedShift>): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    if (!businessId) {
      throw new Error("Cannot update shift: User not associated with a business.");
    }
    if (!badgeId) {
      throw new Error("Cannot update shift: Badge ID is required.");
    }

    const docPath = `business/${businessId}/badgedShifts/${badgeId}`;
    const badgeDocRef = doc(this.firestore, docPath);

    // Ensure ID is not in the update payload, convert dates if necessary
    const { id, badgeInTime, badgeOutTime, ...otherUpdates } = updates;
    const dataToUpdate: any = { ...otherUpdates };
    if (badgeInTime) dataToUpdate.badgeInTime = Timestamp.fromDate(new Date(badgeInTime));
    if (badgeOutTime) dataToUpdate.badgeOutTime = Timestamp.fromDate(new Date(badgeOutTime));


    console.log(`updateBadgedShift: Updating ${badgeId} in business ${businessId}`);
    try {
      await updateDoc(badgeDocRef, dataToUpdate);
      console.log(`updateBadgedShift: Success.`);
    } catch (error) {
      console.error(`updateBadgedShift: Error:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Checks if a specific shift has already been badged IN today by an employee
   * WITHIN the current business. Looks for 'checked-in' OR 'completed' status on the same day.
   * Returns boolean. Throws error if not logged in.
   */
  async checkExistingBadgedShift(employeeId: string, shiftId: string): Promise<boolean> {
    const businessId = this.getCurrentBusinessIdOrFail();
    if (!businessId) {
      // Depending on desired behavior, either throw or return false/true
      // Returning false might imply "not badged" because we can't check.
      console.warn("checkExistingBadgedShift: Cannot check, user not associated with a business.");
      return false;
      // throw new Error("Cannot check shift: User not associated with a business.");
    }
    if (!employeeId || !shiftId) {
      console.warn("checkExistingBadgedShift: Employee ID and Shift ID are required.");
      return false; // Cannot check without required info
    }

    const collectionPath = `business/${businessId}/badgedShifts`;
    const badgeCollection = collection(this.firestore, collectionPath);

    // Define today's date range using Timestamps for reliable Firestore querying
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(endOfDay);


    // Query for shifts for this employee/shiftId badged in today
    // Check for *any* status ('checked-in', 'completed', etc.) on this day.
    const q = query(
      badgeCollection,
      where('employeeId', '==', employeeId),
      where('shiftId', '==', shiftId), // Assuming shiftId helps identify the intended work period
      where('badgeInTime', '>=', startTimestamp),
      where('badgeInTime', '<=', endTimestamp),
      limit(1) // We only need to know if at least one exists
    );

    console.log(`checkExistingBadgedShift: Querying ${collectionPath} for employee ${employeeId}, shift ${shiftId} today.`);
    try {
      const snapshot = await getDocs(q);
      const exists = !snapshot.empty;
      console.log(`checkExistingBadgedShift: Existing shift found today: ${exists}`);
      return exists;
    } catch (error) {
      console.error(`checkExistingBadgedShift: Error querying:`, error);
      return false; // Assume not badged if error occurs? Or re-throw.
    }
  }

  /**
   * Gets Employee ID (UID) from badge code by querying the global /users collection.
   * (No multi-tenant changes needed IF badge codes are globally unique AND stored in /users)
   * If badge codes are per-business, this needs adaptation similar to UsersService.
   */
  async getEmployeeIdFromInput(input: string): Promise<string | null> {
    if (!input) return null;

    // Assuming badgeCode is stored in the global /users collection
    // If it's in /businesses/{bid}/employees, this needs the tenant context
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where('badgeCode', '==', input), limit(1));
    console.log(`getEmployeeIdFromInput: Querying global /users for badgeCode ${input}`);

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userId = querySnapshot.docs[0].id; // The document ID is the UID
        console.log(`getEmployeeIdFromInput: Found user ID: ${userId}`);
        return userId;
      } else {
        console.log(`getEmployeeIdFromInput: No user found globally with badgeCode ${input}. Assuming input might be UID.`);
        // Before returning the input directly, maybe validate if it looks like a UID?
        // This depends on your UID format and requirements.
        return input; // Assume input might be the employee ID (UID) itself
      }
    } catch (error) {
      console.error(`getEmployeeIdFromInput: Error querying global /users:`, error);
      return null; // Return null on error
    }
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    // Unsubscribe from the auth service subscription
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("BadgeService: Unsubscribed from AuthService.");
    }
  }
}
