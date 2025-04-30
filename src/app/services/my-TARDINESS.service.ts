import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of, forkJoin, from } from 'rxjs';
import { map, switchMap, catchError, first, tap } from 'rxjs/operators';

// Import services and interfaces
import { AuthService } from './auth.service';
import { ShiftReportService, ShiftReport } from './shift-report.service'; // Need ShiftReport interface
import { ScheduleService, } from './schedule.service'; // Need Shift interface
import { Employee, UsersService } from './users.service'; // Need Employee interface

// Interface for tardiness statistics (kept as is)
export interface TardinessStats {
  employeeId: string;
  employeeName: string;
  period: { start: Date; end: Date };
  // Late arrivals statistics
  lateArrivals: {
    count: number;
    totalMinutesLate: number;
    details: {
      date: string;
      scheduledStart: string; // e.g., "08:00"
      actualStart: string;   // e.g., "08:10"
      minutesLate: number;
    }[];
  };
  // Unauthorized absences
  unauthorizedAbsences: {
    count: number;
    details: {
      date: string;
      scheduledShift: string; // e.g., "08:00 - 16:00"
      status: 'absent' | 'noRecord'; // Keeping 'noRecord' though logic only flags 'absent' currently
    }[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class TardinessService {
  // Inject required services
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private shiftReportService = inject(ShiftReportService); // Assumed multi-tenant adapted
  private scheduleService = inject(ScheduleService);       // Assumed multi-tenant adapted

  // Threshold for tardiness in minutes
  private readonly LATE_THRESHOLD_MINUTES = 5;

  constructor() {
    console.log("TardinessService Initialized");
  }

  /**
   * Get tardiness statistics for employees within a date range for the current business.
   * Relies on UsersService, ShiftReportService, and ScheduleService being multi-tenant adapted.
   * @param startDate The start date of the period
   * @param endDate The end date of the period
   * @param employeeId Optional specific employee ID, or 'all' (defaults to 'all' if null or undefined)
   * @returns Observable of tardiness statistics array. Returns empty array if no business context or employees found.
   */
  getTardinessStats(startDate: Date, endDate: Date, employeeId?: string | 'all'): Observable<TardinessStats[]> {
    // Default employeeId to 'all' if not provided or null/undefined
    const targetEmployeeId = employeeId === undefined || employeeId === null ? 'all' : employeeId;

    // First get user metadata to ensure we have business context
    return this.authService.userMetadata$.pipe(
      first(), // Get the current metadata value and complete
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.error("TardinessService: No business context available. Cannot fetch tardiness stats.");
          return of([]); // Return empty array if no business context
        }

        const businessId = metadata.businessId;
        console.log(`Calculating tardiness for Business ${businessId} from ${startDate.toISOString()} to ${endDate.toISOString()} for employee: ${targetEmployeeId}`);

        // Adjust end date to include the entire day for queries
        // Note: schedule service handles date range filtering, shift report service
        // should handle time range filtering based on badgeInTime.
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);

        // Get the list of employees to process
        const employees$: Observable<Employee[]> = (targetEmployeeId === 'all')
          ? this.usersService.getEmployees().pipe(first()) // Assumed multi-tenant and returns employees for the current business
          : from(this.usersService.getuserbyid(targetEmployeeId)).pipe( // Assumed multi-tenant and checks if user is in current business
            map(emp => emp ? [emp] : []), // Wrap single employee in array
            first(), // Get the result and complete
            catchError(err => {
              console.error(`TardinessService: Error fetching employee with ID ${targetEmployeeId}:`, err);
              return of([]); // Return empty array if fetching a single employee fails
            })
          );

        // Process each employee
        return employees$.pipe(
          switchMap(employees => {
            if (!employees || employees.length === 0) {
              console.log("TardinessService: No employees found in the current business to calculate tardiness for or employee ID not found.");
              return of([]); // Return empty array if no employees are returned
            }
            console.log(`TardinessService: Processing tardiness for ${employees.length} employees...`);

            // Create observables for each employee's tardiness calculation
            const employeeStatObservables$: Observable<TardinessStats | null>[] = employees.map(employee =>
              this.calculateTardinessForEmployee(employee, startDate, adjustedEndDate)
              // calculateTardinessForEmployee already includes robust error handling per employee
            );

            // Combine results using forkJoin to wait for all employee calculations
            return forkJoin(employeeStatObservables$).pipe(
              map(results => results.filter((stat): stat is TardinessStats => stat !== null)), // Filter out any null results from individual employee errors
              catchError(error => {
                // This catchError would only trigger if forkJoin itself fails after some observables completed, less likely but good practice
                console.error("TardinessService: Error combining employee tardiness statistics:", error);
                return of([]);
              })
            );
          }),
          catchError(error => {
            // Catch errors from the employees$ stream (e.g., if getEmployees fails)
            console.error("TardinessService: Error fetching employee list:", error);
            return of([]);
          })
        );
      }),
      catchError(error => {
        // Catch errors from the initial authService.userMetadata$ stream
        console.error("TardinessService: Error getting user metadata for tardiness calculation:", error);
        return of([]); // Return empty array on any error in the initial stream
      })
    );
  }

  /**
   * Calculate tardiness statistics for a single employee within a date range.
   * Handles fetching scheduled shifts and shift reports for the employee.
   * @param employee The employee object
   * @param startDate Start date of the period
   * @param endDate End date of the period (adjusted to include the whole day)
   * @returns Observable with tardiness statistics or null on error for this specific employee calculation.
   */
  private calculateTardinessForEmployee(employee: Employee, startDate: Date, endDate: Date): Observable<TardinessStats | null> {
    if (!employee?.id || !employee.name) {
      console.warn("TardinessService: Invalid employee data provided for tardiness calculation.", employee);
      return of(null); // Return null for this employee if data is invalid
    }

    console.log(`TardinessService: Calculating tardiness for: ${employee.name} (${employee.id})`);

    // Get scheduled shifts and actual shift reports for comparison
    // Assumed these services return data only for the current business
    return combineLatest([
      // Get scheduled shifts from schedule service for the employee and date range
      this.scheduleService.getShiftsByEmployeeInRange(employee.id, startDate, endDate).pipe(
        catchError(err => {
          console.error(`TardinessService: Error getting scheduled shifts for ${employee.id}:`, err);
          return of([]); // Return empty array if scheduled shifts fetch fails for this employee
        })
      ),

      // Get shift reports from shift report service for the employee and date range
      this.shiftReportService.getShiftsByDateRange(employee.id, startDate, endDate).pipe(
        catchError(err => {
          console.error(`TardinessService: Error getting shift reports for ${employee.id}:`, err);
          return of([]); // Return empty array if shift reports fetch fails for this employee
        })
      )
    ]).pipe(
      map(([scheduledShifts, shiftReports]) => {
        console.log(`TardinessService: Found ${scheduledShifts.length} scheduled shifts and ${shiftReports.length} shift reports for ${employee.name}`);

        // Initialize containers for late arrivals and absences
        const lateArrivals = {
          count: 0,
          totalMinutesLate: 0,
          details: [] as TardinessStats['lateArrivals']['details'] // Use type from interface
        };

        const unauthorizedAbsences = {
          count: 0,
          details: [] as TardinessStats['unauthorizedAbsences']['details'] // Use type from interface
        };

        // Process each scheduled shift to check for tardiness or absence
        scheduledShifts.forEach(scheduledShift => {
          // Ensure the shift has a day and start time string
          if (!scheduledShift.day || !scheduledShift.startTime) {
            console.warn(`TardinessService: Skipping scheduled shift with missing day or startTime data:`, scheduledShift);
            return; // Skip this scheduled shift
          }

          // Create a Date object for the *scheduled* start time by combining day and time
          // Assumes shift.day is 'YYYY-MM-DD' and shift.startTime is 'HH:MM'
          const scheduledStartTime = this.parseShiftDateTime(scheduledShift.day, scheduledShift.startTime);

          // If parsing fails (e.g., invalid date/time strings), skip this shift
          if (isNaN(scheduledStartTime.getTime())) {
            console.warn(`TardinessService: Could not parse scheduled start time for shift:`, scheduledShift);
            return;
          }

          const dateStr = scheduledShift.day; // Use the day string directly for date comparison

          // Find corresponding shift report for the *same day*
          const matchingReport = shiftReports.find(report => {
            // Ensure report badgeInTime is a valid Date
            const reportDate = report.badgeInTime instanceof Date && !isNaN(report.badgeInTime.getTime()) ?
              report.badgeInTime :
              null; // Invalid date

            if (!reportDate) {
              console.warn(`TardinessService: Skipping shift report with invalid badgeInTime:`, report);
              return false; // Skip this report
            }

            // Compare dates by formatting to YYYY-MM-DD
            return this.formatDateString(reportDate) === dateStr;
          });

          if (matchingReport) {
            // Employee showed up - check if they were late

            // Ensure actual start time from report is a valid Date
            const actualStartTime = matchingReport.badgeInTime instanceof Date && !isNaN(matchingReport.badgeInTime.getTime()) ?
              matchingReport.badgeInTime :
              null;

            if (!actualStartTime) {
              console.warn(`TardinessService: Skipping late arrival check due to invalid actual start time in report:`, matchingReport);
              return; // Skip late check for this scheduled shift
            }

            // Calculate minutes late: difference between actual start and scheduled start
            // Convert both to milliseconds since epoch and find the difference
            const minutesLate = Math.max(
              0, // Ensure we don't have negative minutes (early arrival is 0 late)
              Math.round((actualStartTime.getTime() - scheduledStartTime.getTime()) / (1000 * 60))
            );

            // Check if employee was late beyond threshold
            if (minutesLate > this.LATE_THRESHOLD_MINUTES) {
              lateArrivals.count++;
              lateArrivals.totalMinutesLate += minutesLate;
              lateArrivals.details.push({
                date: dateStr,
                scheduledStart: scheduledShift.startTime, // Use the original HH:MM string
                actualStart: this.formatTimeString(actualStartTime), // Format the actual Date object time
                minutesLate
              });
            }
          } else {
            // No matching report found for this scheduled shift day - employee was absent
            // Check if the scheduled shift day is within the specified range, just in case
            // getShiftsByEmployeeInRange returned shifts slightly outside the strict range.
            const scheduledDateOnly = new Date(scheduledShift.day); // Date object for the day
            if (scheduledDateOnly >= startDate && scheduledDateOnly <= endDate) {
              unauthorizedAbsences.count++;
              unauthorizedAbsences.details.push({
                date: dateStr,
                scheduledShift: `${scheduledShift.startTime} - ${scheduledShift.endTime}`, // Use original time strings
                status: 'absent'
              });
            } else {
              // Should not happen if getShiftsByEmployeeInRange is correct, but good safety check
              console.warn(`TardinessService: Found scheduled shift outside date range?`, scheduledShift);
            }
          }
        });

        // Return the complete tardiness statistics for this employee
        return {
          employeeId: employee.id,
          employeeName: employee.name,
          period: { start: startDate, end: endDate },
          lateArrivals,
          unauthorizedAbsences
        };
      }),
      catchError(error => {
        // Catch errors from the combineLatest or the map operation for this employee
        console.error(`TardinessService: Error calculating tardiness for ${employee.name} (${employee.id}):`, error);
        return of(null); // Return null if calculation fails for this specific employee
      })
    );
  }

  /**
   * Parses 'YYYY-MM-DD' date string and 'HH:MM' time string into a Date object.
   * Creates the Date object in the local time zone.
   */
  private parseShiftDateTime(dateStr: string, timeStr: string): Date {
    // Assuming dateStr is "YYYY-MM-DD" and timeStr is "HH:MM"
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Month is 0-indexed in Date constructor, so subtract 1 from the month part.
    // Creates Date object in the local time zone.
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return date;
  }


  /**
   * Format a Date object as YYYY-MM-DD string (local time zone).
   */
  private formatDateString(date: Date): string {
    // Use padStart for month and day to ensure YYYY-MM-DD format
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format time from a Date object as HH:MM string (local time zone).
   */
  private formatTimeString(date: Date): string {
    // Using toLocaleTimeString with options is generally good for standard formatting
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); // Use 24-hour format
  }

  // formatTimeValue helper is no longer strictly needed as we use original strings or formatTimeString
  // private formatTimeValue(value: number): string {
  //   return value.toString().padStart(2, '0');
  // }
}

// --- Keep the interface definitions included in your prompt ---

/*
// Interface for employees (assuming this comes from UsersService)
export interface Employee {
  id: string; // Firebase Auth UID
  name: string;
  // ... other employee properties
}

// Interface for scheduled shifts (assuming this comes from ScheduleService)
export interface Shift {
  id?: string;
  day: string; // Assuming 'YYYY-MM-DD'
  startTime: string; // Assuming 'HH:MM'
  endTime: string;   // Assuming 'HH:MM'
  employee: {
    id: string; // User UID
    name: string;
  };
  role: string; // Position/Role for the shift
}

// Interface for shift reports (assuming this comes from ShiftReportService)
export interface ShiftReport {
  shiftId: string; // This might link back to a scheduled shift, but logic compares by date
  employeeId: string; // Assuming this still refers to the global User UID
  badgeInTime: Date; // Assuming this is a JS Date object, converted from Timestamp
  badgeOutTime?: Date; // Assuming this is a JS Date object, converted from Timestamp
  totalHours: number; // Calculated property
}
*/
