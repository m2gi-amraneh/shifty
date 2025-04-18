import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftReport } from '../../services/shift-report.service'; // Adjust path as needed

interface DayShiftSummary {
  date: Date;
  shifts: ShiftReport[];
  totalHours: number;
  hasShift: boolean;
}

interface WeekSummary {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: DayShiftSummary[];
  totalHours: number;
}

@Component({
  selector: 'app-shift-report-template',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- This is the structure that will be converted to PDF -->
    <div class="pdf-container" id="pdf-content-wrapper">
      <header>
        <div class="logo-area">
          <!-- Optional: Add company logo image here -->
          <h1>Shift Hours Report</h1>
        </div>
        <div class="report-info">
          <p><strong>Employee ID:</strong> {{ employeeId }}</p>
          <p><strong>Period:</strong> {{ formatDateRange() }}</p>
          <p><strong>Report Type:</strong> {{ isMonthly ? 'Monthly' : 'Weekly' }}</p>
        </div>
      </header>

      <div class="summary-section">
        <div class="summary-box">
          <span class="summary-label">Total Days Worked</span>
          <span class="summary-value">{{ getTotalDaysWorked() }}</span>
        </div>
        <div class="summary-box">
          <span class="summary-label">Total Shifts</span>
          <span class="summary-value">{{ shifts.length }}</span>
        </div>
        <div class="summary-box">
          <span class="summary-label">Total Hours</span>
          <span class="summary-value">{{ calculateTotalHours(shifts) | number:'1.1-2' }}</span>
        </div>
      </div>

      <!-- WEEKLY REPORT VIEW -->
      <ng-container *ngIf="!isMonthly">
        <h2 class="section-title">Weekly Schedule</h2>
        <table class="shift-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th>Shifts</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let day of dailyData">
              <tr [class.no-shift]="!day.hasShift">
                <td>{{ day.date | date:'EEE' }}</td>
                <td>{{ day.date | date:'MMM d' }}</td>
                <td>{{ day.shifts.length || 0 }}</td>
                <td>
                  <ng-container *ngIf="day.hasShift; else noShift">
                    {{ day.shifts[0].badgeInTime | date:'shortTime' }}
                  </ng-container>
                  <ng-template #noShift>-</ng-template>
                </td>
                <td>
                  <ng-container *ngIf="day.hasShift && day.shifts[0].badgeOutTime; else notCheckedOut">
                    {{ day.shifts[0].badgeOutTime | date:'shortTime' }}
                  </ng-container>
                  <ng-template #notCheckedOut>-</ng-template>
                </td>
                <td>{{ day.totalHours | number:'1.1-2' }}</td>
              </tr>
              <!-- If multiple shifts in a day, show additional rows -->
              <ng-container *ngIf="day.shifts.length > 1">
                <tr *ngFor="let shift of day.shifts.slice(1)" class="additional-shift">
                  <td colspan="2" class="centered-text">Additional Shift</td>
                  <td>-</td>
                  <td>{{ shift.badgeInTime | date:'shortTime' }}</td>
                  <td>{{ shift.badgeOutTime ? (shift.badgeOutTime | date:'shortTime') : '-' }}</td>
                  <td>{{ shift.totalHours | number:'1.1-2' }}</td>
                </tr>
              </ng-container>
            </ng-container>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="total-label"><strong>Total Hours</strong></td>
              <td class="total-value"><strong>{{ calculateTotalHours(shifts) | number:'1.1-2' }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </ng-container>

      <!-- MONTHLY REPORT VIEW - ORGANIZED BY WEEKS -->
      <ng-container *ngIf="isMonthly">
        <h2 class="section-title">Monthly Schedule - {{ startDate | date:'MMMM yyyy' }}</h2>

        <!-- Loop through each week in the month -->
        <div *ngFor="let week of weeklyData; let isLast = last" [class.page-break]="!isLast">
          <h3 class="week-header">Week {{ week.weekNumber }}: {{ week.startDate | date:'MMM d' }} - {{ week.endDate | date:'MMM d' }}</h3>

          <table class="shift-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Shifts</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let day of week.days">
                <tr [class.no-shift]="!day.hasShift">
                  <td>{{ day.date | date:'EEE' }}</td>
                  <td>{{ day.date | date:'MMM d' }}</td>
                  <td>{{ day.shifts.length || 0 }}</td>
                  <td>
                    <ng-container *ngIf="day.hasShift; else noShift">
                      {{ day.shifts[0].badgeInTime | date:'shortTime' }}
                    </ng-container>
                    <ng-template #noShift>-</ng-template>
                  </td>
                  <td>
                    <ng-container *ngIf="day.hasShift && day.shifts[0].badgeOutTime; else notCheckedOut">
                      {{ day.shifts[0].badgeOutTime | date:'shortTime' }}
                    </ng-container>
                    <ng-template #notCheckedOut>-</ng-template>
                  </td>
                  <td>{{ day.totalHours | number:'1.1-2' }}</td>
                </tr>
                <!-- If multiple shifts in a day, show additional rows -->
                <ng-container *ngIf="day.shifts.length > 1">
                  <tr *ngFor="let shift of day.shifts.slice(1)" class="additional-shift">
                    <td colspan="2" class="centered-text">Additional Shift</td>
                    <td>-</td>
                    <td>{{ shift.badgeInTime | date:'shortTime' }}</td>
                    <td>{{ shift.badgeOutTime ? (shift.badgeOutTime | date:'shortTime') : '-' }}</td>
                    <td>{{ shift.totalHours | number:'1.1-2' }}</td>
                  </tr>
                </ng-container>
              </ng-container>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="total-label"><strong>Week {{ week.weekNumber }} Total</strong></td>
                <td class="total-value"><strong>{{ week.totalHours | number:'1.1-2' }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Monthly Summary Table -->
        <div class="monthly-summary">
          <h3 class="section-title">Monthly Summary</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Dates</th>
                <th>Shifts</th>
                <th>Days Worked</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let week of weeklyData">
                <td>Week {{ week.weekNumber }}</td>
                <td>{{ week.startDate | date:'MMM d' }} - {{ week.endDate | date:'MMM d' }}</td>
                <td>{{ getShiftCountForWeek(week) }}</td>
                <td>{{ getDaysWorkedForWeek(week) }}</td>
                <td>{{ week.totalHours | number:'1.1-2' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="total-label"><strong>Total Monthly Hours</strong></td>
                <td class="total-value"><strong>{{ calculateTotalHours(shifts) | number:'1.1-2' }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ng-container>

      <footer>
        <p>Generated on: {{ generationDate | date:'medium' }}</p>
        <p class="page-number">Page 1 of {{ isMonthly ? (weeklyData.length + 1) : 1 }}</p>
      </footer>
    </div>
  `,
  styles: [`
    /* PDF Template Styles - Optimized for jsPDF HTML rendering */
    .pdf-container {
      font-family: 'Helvetica', 'Arial', sans-serif;
      padding: 30px;
      width: 700px;
      color: #333;
      line-height: 1.4;
    }

    /* Header Styles */
    header {
      display: block;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #1e88e5;
    }

    .logo-area {
      margin-bottom: 10px;
    }

    h1 {
      font-size: 24px;
      color: #1e88e5;
      margin: 0 0 10px 0;
    }

    .report-info p {
      margin: 4px 0;
      font-size: 12px;
    }

    /* Summary Section */
    .summary-section {
      margin: 20px 0;
      display: block;
      border: 1px solid #ddd;
      padding: 10px;
      background-color: #f7f9fc;
    }

    .summary-box {
      display: inline-block;
      width: 30%;
      text-align: center;
      padding: 10px 0;
    }

    .summary-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }

    .summary-value {
      display: block;
      font-size: 20px;
      font-weight: bold;
      color: #1e88e5;
    }

    /* Section Headers */
    .section-title {
      font-size: 18px;
      color: #333;
      margin: 20px 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
    }

    .week-header {
      font-size: 16px;
      color: #555;
      margin: 15px 0 10px 0;
      background-color: #f2f7ff;
      padding: 5px 10px;
      border-left: 4px solid #1e88e5;
    }

    /* Tables */
    .shift-table, .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 20px 0;
      font-size: 11px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #e9f2fe;
      font-weight: bold;
      color: #333;
    }

    tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    tfoot td {
      background-color: #e9f2fe;
      border-top: 2px solid #1e88e5;
    }

    .total-label {
      text-align: right;
    }

    .total-value {
      font-weight: bold;
      color: #1e88e5;
    }

    .no-shift {
      color: #999;
      background-color: #f9f9f9;
    }

    .additional-shift {
      background-color: #f0f7ff;
      font-style: italic;
    }

    .centered-text {
      text-align: center;
      font-size: 10px;
      color: #666;
    }

    /* Monthly Summary Section */
    .monthly-summary {
      margin-top: 30px;
    }

    /* Footer */
    footer {
      margin-top: 30px;
      border-top: 1px solid #eee;
      padding-top: 10px;
      font-size: 10px;
      color: #777;
      position: relative;
    }

    .page-number {
      position: absolute;
      right: 0;
      bottom: 0;
    }

    /* Page Breaks */
    .page-break {
      page-break-after: always;
      margin-bottom: 40px;
    }
  `]
})
export class ShiftReportTemplateComponent implements OnChanges {
  @Input() shifts: ShiftReport[] = [];
  @Input() employeeId: string | null = null;
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;

  generationDate = new Date(); // Capture generation time

  // Data structures for the template
  dailyData: DayShiftSummary[] = [];
  weeklyData: WeekSummary[] = [];
  isMonthly: boolean = false;

  ngOnChanges() {
    // Process the shifts data when inputs change
    this.isMonthly = this.determineReportType();

    if (this.startDate && this.endDate) {
      if (this.isMonthly) {
        this.processMonthlyData();
      } else {
        this.processWeeklyData();
      }
    }
  }

  determineReportType(): boolean {
    // If no dates are provided, default to weekly
    if (!this.startDate || !this.endDate) return false;

    // Calculate difference in days
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If more than 10 days, assume it's a monthly report
    return diffDays > 10;
  }

  processWeeklyData() {
    if (!this.startDate || !this.endDate) return;

    this.dailyData = [];

    // Create array for each day in the range
    let currentDate = new Date(this.startDate);

    while (currentDate <= this.endDate) {
      const dayShifts = this.getShiftsForDate(currentDate);

      this.dailyData.push({
        date: new Date(currentDate),
        shifts: dayShifts,
        totalHours: this.calculateTotalHoursForShifts(dayShifts),
        hasShift: dayShifts.length > 0
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  processMonthlyData() {
    if (!this.startDate || !this.endDate) return;

    this.weeklyData = [];

    // First, determine all the weeks in the month
    let currentDate = new Date(this.startDate);
    let weekNumber = 1;

    while (currentDate <= this.endDate) {
      // Find start of week (Monday)
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek == currentDate
        ? startOfWeek.getDay() === 0 ? 7 : startOfWeek.getDay() // Keep the original day of month for the first week
        : startOfWeek.getDay() || 7; // Convert Sunday (0) to 7
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1); // Move to Monday

      // Find end of week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      // Ensure end date doesn't exceed report end date
      if (endOfWeek > this.endDate) {
        endOfWeek.setTime(this.endDate.getTime());
      }

      // Create daily data for this week
      const daysInWeek: DayShiftSummary[] = [];
      let weekCurrentDate = new Date(startOfWeek);

      while (weekCurrentDate <= endOfWeek) {
        const dayShifts = this.getShiftsForDate(weekCurrentDate);

        daysInWeek.push({
          date: new Date(weekCurrentDate),
          shifts: dayShifts,
          totalHours: this.calculateTotalHoursForShifts(dayShifts),
          hasShift: dayShifts.length > 0
        });

        // Move to next day
        weekCurrentDate.setDate(weekCurrentDate.getDate() + 1);
      }

      // Add week data
      this.weeklyData.push({
        weekNumber: weekNumber,
        startDate: new Date(startOfWeek),
        endDate: new Date(endOfWeek),
        days: daysInWeek,
        totalHours: this.calculateTotalHoursForDays(daysInWeek)
      });

      // Move to start of next week and increment week number
      currentDate = new Date(endOfWeek);
      currentDate.setDate(currentDate.getDate() + 1);
      weekNumber++;
    }
  }

  getShiftsForDate(date: Date): ShiftReport[] {
    if (!this.shifts) return [];

    return this.shifts.filter(shift => {
      const shiftDate = new Date(shift.badgeInTime);
      return shiftDate.getFullYear() === date.getFullYear() &&
        shiftDate.getMonth() === date.getMonth() &&
        shiftDate.getDate() === date.getDate();
    });
  }

  calculateTotalHours(shifts: ShiftReport[]): number {
    if (!shifts) return 0;
    return shifts.reduce((total, shift) => total + (shift.totalHours || 0), 0);
  }

  calculateTotalHoursForShifts(shifts: ShiftReport[]): number {
    return this.calculateTotalHours(shifts);
  }

  calculateTotalHoursForDays(days: DayShiftSummary[]): number {
    if (!days) return 0;
    return days.reduce((total, day) => total + day.totalHours, 0);
  }

  getTotalDaysWorked(): number {
    if (this.isMonthly) {
      return this.weeklyData.reduce((total, week) => {
        return total + week.days.filter(day => day.hasShift).length;
      }, 0);
    } else {
      return this.dailyData.filter(day => day.hasShift).length;
    }
  }

  getShiftCountForWeek(week: WeekSummary): number {
    return week.days.reduce((total, day) => total + day.shifts.length, 0);
  }

  getDaysWorkedForWeek(week: WeekSummary): number {
    return week.days.filter(day => day.hasShift).length;
  }

  formatDateRange(): string {
    if (!this.startDate || !this.endDate) return 'Invalid Date Range';

    if (this.isMonthly) {
      // For monthly reports, just show the month and year
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
      }).format(this.startDate);
    } else {
      // For weekly reports, show start and end dates
      return `${this.formatDate(this.startDate)} - ${this.formatDate(this.endDate)}`;
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
}
