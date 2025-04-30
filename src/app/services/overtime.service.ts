// overtime-calculation.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of, forkJoin, from } from 'rxjs';
import { map, switchMap, catchError, first, tap } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore'; // Import if using Timestamps in interfaces/logic

// --- Import Services and Interfaces (Adjust paths as needed) ---
import { AuthService } from './auth.service';
import { Employee, UsersService } from './users.service';
import { ShiftReportService } from './shift-report.service';
import { Contract, ContractService } from './contract.service';


// Interface for the calculated statistics result for one employee
export interface OvertimeStats {
  // Existing properties
  employeeId: string;
  employeeName: string;
  period: { start: Date; end: Date };
  contractedHours: number;
  workedHours: number;
  overtimeHours: number;
  contractDetails?: Contract | null;

  // New properties
  dailyBreakdown?: {
    [day: string]: { // 'Monday', 'Tuesday', etc.
      date: string;
      scheduled: number; // Hours scheduled
      worked: number;   // Hours actually worked
      overtime: number; // Difference (if positive)
    }[]
  };
}

@Injectable({
  providedIn: 'root'
})
export class OvertimeCalculationService {

  // Inject tenant-aware services
  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private contractService = inject(ContractService);
  private shiftReportService = inject(ShiftReportService);

  constructor() {
    console.log("OvertimeCalculationService Initialized");
  }

  /**
   * Calculates overtime statistics for one or all employees within a date range for the
   * current business.
   * @param startDate The start date of the period.
   * @param endDate The end date of the period (inclusive).
   * @param employeeId The specific employee ID, or 'all' to calculate for everyone.
   * @returns Observable emitting an array of OvertimeStats.
   */
  getOvertimeStats(startDate: Date, endDate: Date, employeeId: string = 'all'): Observable<OvertimeStats[]> {
    // Use switchMap on user metadata to ensure we have business context
    return this.authService.userMetadata$.pipe(
      first(), // Get the current user context once for this calculation run
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.error("OvertimeCalculationService: No business context available.");
          // Return an observable emitting an empty array if no business context
          return of([]);
        }
        const businessId = metadata.businessId;
        console.log(`Calculating overtime for Business ${businessId} from ${startDate.toISOString()} to ${endDate.toISOString()} for employee: ${employeeId}`);

        // Ensure end date includes the whole day
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);

        // 1. Get the list of employees to process (already scoped by UsersService)
        const employees$: Observable<Employee[]> = (employeeId === 'all' || !employeeId) // Treat null/empty string as 'all'
          ? this.usersService.getEmployees().pipe(first()) // Assuming getEmployees gets all for the business, take first list
          : from(this.usersService.getuserbyid(employeeId)).pipe(map(emp => emp ? [emp] : []), first()); // Get single employee if ID provided

        // 2. Process each employee
        return employees$.pipe(
          switchMap(employees => {
            if (!employees || employees.length === 0) {
              console.log("No employees found to calculate stats for.");
              return of([]); // No employees to process
            }
            console.log(`Processing ${employees.length} employees...`);

            // Create an array of observables, one for each employee's calculation
            const employeeStatObservables$: Observable<OvertimeStats | null>[] = employees.map(employee =>
              this.calculateStatsForEmployee(employee, startDate, adjustedEndDate)
            );

            // Combine results from all employee calculations
            return forkJoin(employeeStatObservables$).pipe(
              map(results => results.filter((stat): stat is OvertimeStats => stat !== null)) // Filter out null results (e.g., errors or no contract)
            );
          }),
          catchError(error => {
            console.error("Error fetching or processing employees:", error);
            return of([]); // Return empty array on error during employee fetch/processing
          })
        );
      }),
      catchError(error => {
        console.error("Error getting user metadata for overtime calculation:", error);
        return of([]); // Return empty array if auth fails
      })
    ); // End of userMetadata$ pipe
  }

  /**
   * Calculates stats for a single employee by combining their contract and worked shifts.
   * @param employee The employee object (must include id and name).
   * @param startDate Start date of the period.
   * @param endDate End date of the period (inclusive, time set to end of day).
   * @returns Observable emitting the OvertimeStats for the employee, or null on error/no contract.
   */
  private calculateStatsForEmployee(employee: Employee, startDate: Date, endDate: Date): Observable<OvertimeStats | null> {
    if (!employee?.id || !employee.name) {
      console.warn("calculateStatsForEmployee: Invalid employee data provided.", employee);
      return of(null);
    }
    console.log(`Calculating stats for employee: ${employee.name} (${employee.id})`);

    // Combine fetching the active contract and shift reports for this employee
    return combineLatest([
      // Fetch ACTIVE contract for the employee (tenant-aware). Taking first result.
      // Assumption: The contract active *at the end* of the period determines contracted hours.
      // More complex logic needed if contracts change mid-period and affect weekly hours.
      this.contractService.getActiveContractByEmployeeId(employee.id).pipe(first()),

      // Fetch badged shifts within the range for the employee (tenant-aware). Taking first result.
      this.shiftReportService.getShiftsByDateRange(employee.id, startDate, endDate).pipe(first())
    ]).pipe(
      map(([activeContract, shiftReports]) => {

        // Calculate total worked hours from shift reports
        const workedHours = shiftReports.reduce((sum, report) => sum + (report.totalHours ?? 0), 0);
        console.log(` -> Worked Hours: ${workedHours.toFixed(2)} from ${shiftReports.length} shift reports.`);

        let contractedHoursForPeriod = 0;
        const weeklyContractHours = activeContract?.contractHours ?? 0; // Weekly hours from contract

        if (activeContract && weeklyContractHours > 0) {
          // Calculate expected hours - using daily method (weekdays) for better accuracy
          // Assumes contract hours are based on a standard work week (e.g., 5 days)
          const dailyAverageContractHours = weeklyContractHours / 5;
          contractedHoursForPeriod = this.calculateExpectedHoursDaily(dailyAverageContractHours, startDate, endDate);
          console.log(` -> Contract Hours/Week: ${weeklyContractHours}, Calculated Expected: ${contractedHoursForPeriod.toFixed(2)}`);
        } else {
          console.warn(` -> No active contract or zero contract hours found for ${employee.name} (${employee.id}) for period.`);
          // If no contract, contractedHoursForPeriod remains 0, all worked hours might be overtime?
          // Or maybe overtime should be 0? Setting contractedHours to 0 here.
          contractedHoursForPeriod = 0;
        }

        // Calculate overtime (cannot be negative)
        const overtimeHours = Math.max(0, workedHours - contractedHoursForPeriod);
        console.log(` -> Calculated Overtime: ${overtimeHours.toFixed(2)}`);

        // Construct the result object
        return {
          employeeId: employee.id,
          employeeName: employee.name,
          period: { start: startDate, end: endDate }, // Store original range start/end
          contractedHours: +contractedHoursForPeriod.toFixed(2), // Ensure number, round
          workedHours: +workedHours.toFixed(2),
          overtimeHours: +overtimeHours.toFixed(2),
          contractDetails: activeContract // Include contract for reference in the UI if needed
        };
      }),
      catchError(error => {
        // Log error for this specific employee but don't break the forkJoin
        console.error(`Error calculating stats for employee ${employee.id} (${employee.name}):`, error);
        return of(null); // Return null for this employee on error
      })
    );
  }


  /**
   * Calculates expected contracted hours based on a daily average (contract hours / 5),
   * counting only weekdays (Mon-Fri) within the given date range.
   *
   * @param dailyAverageContractHours Average hours per weekday.
   * @param startDate Start date of the period.
   * @param endDate End date of the period (inclusive).
   * @returns Total expected contracted hours for the weekdays in the period.
   */
  private calculateExpectedHoursDaily(dailyAverageContractHours: number, startDate: Date, endDate: Date): number {
    if (dailyAverageContractHours <= 0 || !startDate || !endDate || startDate > endDate) {
      return 0;
    }

    let weekdayCount = 0;
    // Clone dates to avoid modifying originals
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Loop through each day in the range
    while (currentDate <= finalDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // If it's a weekday (Mon-Fri)
        weekdayCount++;
      }
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return weekdayCount * dailyAverageContractHours;
  }

  // --- Optional: Alternative Weekly Calculation (Less Accurate) ---
  /**
   * Calculates expected hours based on weekly contract hours.
   * Simplification: Prorates based on number of days in the period relative to 7.
   * Less accurate than counting weekdays.
   *
   * @param weeklyContractHours Total hours per week as per contract.
   * @param startDate Start date of the period.
   * @param endDate End date of the period (inclusive).
   * @returns Estimated total expected contracted hours for the period.
   */
  private calculateExpectedHoursWeekly(weeklyContractHours: number, startDate: Date, endDate: Date): number {
    if (weeklyContractHours <= 0 || !startDate || !endDate || startDate > endDate) {
      return 0;
    }
    // Calculate the difference in time (milliseconds)
    const diffTime = endDate.getTime() - startDate.getTime();
    // Calculate the difference in days (+1 to include both start and end date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Calculate the expected hours: (Weekly Hours / 7 days) * Number of days in period
    return (weeklyContractHours / 7) * diffDays;
  }

} // End OvertimeCalculationService Class
