import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp, // Keep Timestamp import for reading data
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import jsPDF from 'jspdf';
import { inject } from '@angular/core';
import { AuthService } from './auth.service'; // Import AuthService

// Keep your existing ShiftReport interface
export interface ShiftReport {
  shiftId: string;
  employeeId: string; // Assuming this still refers to the global User UID
  badgeInTime: Date;
  badgeOutTime?: Date;
  totalHours: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftReportService {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Inject AuthService

  constructor() {
    console.log("ShiftReportService Initialized (Multi-Tenant Adapted)");
  }

  /** Utility to get the current business ID or return null */
  private getCurrentBusinessId(): string | null {
    return this.authService.getCurrentBusinessId();
  }

  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * ADAPTED: Gets shift report entries for a specific employee and date range
   * WITHIN the current business.
   * Returns an empty observable if the user is not associated with a business.
   */
  getShiftsByDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ShiftReport[]> {
    if (!employeeId || !startDate || !endDate) return of([]); // Validate inputs

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.warn(`getShiftsByDateRange(${employeeId}): No businessId, returning empty.`);
          return of([]); // No business context
        }
        const businessId = metadata.businessId;
        const collectionPath = `business/${businessId}/badgedShifts`;
        console.log(`getShiftsByDateRange: Querying ${collectionPath} for employee ${employeeId}`);

        // Ensure dates are converted to Timestamps for Firestore comparison if needed
        // Firestore >= queries work okay with JS Dates, but Timestamp is safer.
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        const shiftsQuery = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId), // Query by employee's global UID
          where('badgeInTime', '>=', startTimestamp), // Use Timestamp for query
          where('badgeInTime', '<=', endTimestamp),   // Use Timestamp for query
          orderBy('badgeInTime', 'asc') // Ensure correct order
        );

        // Use from(getDocs(...)) for a one-time fetch
        return from(getDocs(shiftsQuery)).pipe(
          map((snapshot) => {
            console.log(`getShiftsByDateRange: Found ${snapshot.docs.length} shifts for ${employeeId} in ${businessId}`);
            return snapshot.docs.map((doc) => {
              const data = doc.data();
              // Safely convert Timestamps back to JS Dates
              const badgeInTime = data['badgeInTime'] instanceof Timestamp
                ? data['badgeInTime'].toDate()
                : new Date(); // Fallback or error handling needed?
              const badgeOutTime = data['badgeOutTime'] instanceof Timestamp
                ? data['badgeOutTime'].toDate()
                : undefined;

              return {
                shiftId: doc.id,
                employeeId: data['employeeId'],
                badgeInTime,
                badgeOutTime,
                totalHours: this.calculateShiftHours(badgeInTime, badgeOutTime),
              } as ShiftReport; // Assert type
            });
          }),
          catchError(error => {
            console.error(`getShiftsByDateRange: Error fetching shifts from ${collectionPath}:`, error);
            return of([]); // Return empty array on error
          })
        );
      }),
      catchError(error => {
        console.error("getShiftsByDateRange: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /** Calculates hours between two dates. (No changes needed) */
  private calculateShiftHours(checkIn: Date, checkOut?: Date): number {
    if (!checkOut || !checkIn) return 0; // Added check for checkIn
    // Add validation to ensure checkOut is after checkIn?
    if (checkOut.getTime() < checkIn.getTime()) {
      console.warn("calculateShiftHours: checkOut time is before checkIn time.");
      return 0;
    }
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return diffMs / (1000 * 60 * 60); // hours
  }

  /**
   * Generates a PDF report. (No changes needed in logic, as it consumes data)
   * Assumes the 'shifts' array passed in was already fetched for the correct tenant.
   */

}