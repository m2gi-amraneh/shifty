import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs, // Keep if needed for one-time fetches elsewhere, but not used here
  collectionData,
  orderBy, // Optional for sorting
} from '@angular/fire/firestore';
// Removed Timestamp import as it's not directly used here, but present in interfaces
// import { Timestamp } from 'firebase/firestore';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap, catchError, map, tap } from 'rxjs/operators';
import { inject } from '@angular/core';

// Import Interfaces and AuthService
import { Shift } from './planning.service';
import { AbsenceRequest } from './absence.service';
import { ClosingPeriod } from './closing-periods.service';
import { AuthService } from './auth.service'; // Import AuthService

@Injectable({
  providedIn: 'root',
})
export class ScheduleService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Inject AuthService

  private userMetadataSubscription: Subscription | null = null;

  constructor() {
    console.log("ScheduleService Initialized (Multi-Tenant Adapted)");
    // Subscribe to metadata changes primarily for cleanup purposes,
    // as the reactive methods handle fetching based on the current state.
    this.userMetadataSubscription = this.authService.userMetadata$.subscribe();
  }

  /** Utility to get the tenant-specific path */
  private getTenantCollectionPath(subCollectionName: 'shifts' | 'absences' | 'closingPeriods'): string | null {
    const businessId = this.authService.getCurrentBusinessId();
    return businessId ? `business/${businessId}/${subCollectionName}` : null;
  }


  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * ADAPTED: Gets shifts for a specific employee and day WITHIN the current business.
   * Returns an empty observable if the user is not associated with a business.
   */
  getShiftsByEmployeeAndDay(
    employeeId: string,
    day: string
  ): Observable<Shift[]> {
    if (!employeeId || !day) return of([]); // Need parameters

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getShiftsByEmployeeAndDay(${employeeId}, ${day}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/shifts`;
        console.log(`getShiftsByEmployeeAndDay: Querying ${collectionPath}`);
        const shiftsQuery = query(
          collection(this.firestore, collectionPath),
          where('employee.id', '==', employeeId),
          where('day', '==', day)
          // Optional: orderBy('startTime')
        );
        // Use collectionData for real-time updates
        return (collectionData(shiftsQuery, { idField: 'id' }) as Observable<Shift[]>).pipe(
          catchError(error => {
            console.error(`getShiftsByEmployeeAndDay: Error fetching shifts from ${collectionPath}:`, error);
            return of([]); // Return empty on error
          })
        );
      }),
      catchError(error => {
        console.error("getShiftsByEmployeeAndDay: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Gets APPROVED absence requests for a specific employee WITHIN the current business.
   * Returns an empty observable if the user is not associated with a business.
   */
  getApprovedAbsencesByEmployee(
    employeeId: string
  ): Observable<AbsenceRequest[]> {
    if (!employeeId) return of([]);

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getApprovedAbsencesByEmployee(${employeeId}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/absences`;
        console.log(`getApprovedAbsencesByEmployee: Querying ${collectionPath}`);
        const absencesQuery = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId),
          where('status', '==', 'approved')
          // Optional: orderBy('startDate')
        );
        // Use collectionData for real-time updates
        return (collectionData(absencesQuery, { idField: 'id' }) as Observable<AbsenceRequest[]>).pipe(
          catchError(error => {
            console.error(`getApprovedAbsencesByEmployee: Error fetching absences from ${collectionPath}:`, error);
            return of([]); // Return empty on error
          })
        );
      }),
      catchError(error => {
        console.error("getApprovedAbsencesByEmployee: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Gets all closing periods WITHIN the current business.
   * Returns an empty observable if the user is not associated with a business.
   */
  getClosingPeriods(): Observable<ClosingPeriod[]> {
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getClosingPeriods: No businessId, returning empty.`);
          return of([]); // No business context
        }
        const collectionPath = `business/${metadata.businessId}/closingPeriods`;
        console.log(`getClosingPeriods: Querying ${collectionPath}`);
        const closingPeriodsQuery = query(
          collection(this.firestore, collectionPath)
          // Optional: orderBy('startDate')
        );
        // Use collectionData for real-time updates
        return (collectionData(closingPeriodsQuery, { idField: 'id' }) as Observable<ClosingPeriod[]>).pipe(
          catchError(error => {
            console.error(`getClosingPeriods: Error fetching closing periods from ${collectionPath}:`, error);
            return of([]); // Return empty on error
          })
        );
      }),
      catchError(error => {
        console.error("getClosingPeriods: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    // Unsubscribe from the auth service subscription
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("ScheduleService: Unsubscribed from AuthService.");
    }
    // No specific Firestore listeners to tear down here as collectionData handles it.
  }
  getShiftsByEmployeeInRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<Shift[]> {
    if (!employeeId || !startDate || !endDate) return of([]);

    // Format dates to match 'day' format in shifts (assuming YYYY-MM-DD format)
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getShiftsByEmployeeInRange: No businessId, returning empty.`);
          return of([]);
        }

        const collectionPath = `business/${metadata.businessId}/shifts`;
        console.log(`getShiftsByEmployeeInRange: Querying ${collectionPath} from ${startStr} to ${endStr}`);

        // Note: Firestore doesn't directly support range queries on text fields
        // We would ideally need a numeric field for proper range queries

        // As a workaround, we'll get all shifts for this employee and filter client-side
        const shiftsQuery = query(
          collection(this.firestore, collectionPath),
          where('employee.id', '==', employeeId)
          // We can't do range filtering on day field directly in Firestore query
        );

        return (collectionData(shiftsQuery, { idField: 'id' }) as Observable<Shift[]>).pipe(
          map(shifts => {
            // Filter shifts that fall within our date range client-side
            return shifts.filter(shift => {
              return shift.day >= startStr && shift.day <= endStr;
            });
          }),
          catchError(error => {
            console.error(`getShiftsByEmployeeInRange: Error fetching shifts:`, error);
            return of([]);
          })
        );
      }),
      catchError(error => {
        console.error("getShiftsByEmployeeInRange: Error in outer auth stream:", error);
        return of([]);
      })
    );
  }
}
