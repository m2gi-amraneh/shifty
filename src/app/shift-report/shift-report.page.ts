import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ShiftReportService, ShiftReport } from '../services/shift-report.service';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';

addIcons({
  calendarOutline,
  documentTextOutline,
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline
});

@Component({
  selector: 'app-shift-report',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Shift Hours Report</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ion-padding">
        <!-- Report Type Selection -->
        <ion-segment [(ngModel)]="reportType" (ionChange)="onReportTypeChange()" class="custom-segment">
          <ion-segment-button value="weekly">
            <ion-icon name="calendar-Outline"></ion-icon>
            <ion-label>Weekly</ion-label>
          </ion-segment-button>
          <ion-segment-button value="monthly">
            <ion-icon name="calendar-Outline"></ion-icon>
            <ion-label>Monthly</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Date Navigation -->
        <div class="date-navigation">
          <ion-button fill="clear" (click)="navigateDate('back')">
            <ion-icon name="chevron-back-Outline"></ion-icon>
          </ion-button>
          <div class="date-display">
            <span class="date-range">{{ getDisplayDateRange() }}</span>
          </div>
          <ion-button fill="clear" (click)="navigateDate('forward')">
            <ion-icon name="chevron-forward-Outline"></ion-icon>
          </ion-button>
        </div>

        <!-- Summary Card -->
        <ion-card *ngIf="shifts$ | async as shifts" class="summary-card">
          <ion-card-content>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="label">Total Shifts</span>
                <span class="value">{{ shifts.length }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Total Hours</span>
                <span class="value">{{ calculateTotalHours(shifts) | number:'1.1-1' }}</span>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Shifts List -->
        <ion-list *ngIf="shifts$ | async as shifts">
          <ion-list-header>
            <ion-label>Shift Details</ion-label>
          </ion-list-header>



            <ion-item *ngFor="let shift of shifts" class="shift-item">
              <ion-label>
                <h2 class="shift-id">{{ shift.shiftId }}</h2>
                <div class="time-container">
                  <div class="time-block">
                    <ion-icon name="time-outline" color="primary"></ion-icon>
                    <span>{{ formatTimestamp(shift.badgeInTime) }}</span>
                    <ion-icon name="arrow-forward-outline" color="medium"></ion-icon>
                    <span>{{ formatTimestamp(shift.badgeOutTime) }}</span>
                  </div>
                  <ion-badge color="primary" class="hours-badge">
                    {{ shift.totalHours | number:'1.1-1' }} hrs
                  </ion-badge>
                </div>
              </ion-label>
            </ion-item>
        </ion-list>

        <!-- Generate Report Button -->
        <ion-button
          expand="block"
          color="primary"
          class="generate-button"
          (click)="generateReport()"
          [disabled]="!(shifts$ | async)?.length"
        >
          <ion-icon name="document-text-outline" slot="start"></ion-icon>
          Generate PDF Report
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .custom-segment {
      margin: 16px 0;
      --background: var(--ion-color-light);
      border-radius: 8px;
    }

    .date-navigation {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 16px 0;
      padding: 0 8px;
    }

    .date-display {
      text-align: center;
      flex: 1;
    }

    .date-range {
      font-size: 1.1em;
      font-weight: 500;
      color: var(--ion-color-dark);
    }

    .summary-card {
      margin: 16px 0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: center;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-item .label {
      font-size: 0.9em;
      color: var(--ion-color-medium);
    }

    .summary-item .value {
      font-size: 1.5em;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .shift-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 12px;
    }

    .shift-id {
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--ion-color-dark);
    }

    .time-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }

    .time-block {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--ion-color-medium);
    }

    .hours-badge {
      padding: 6px 12px;
      border-radius: 12px;
    }

    .generate-button {
      margin-top: 24px;
    }

    ion-item-divider {
      --background: var(--ion-color-light);
      --padding-start: 16px;
      font-weight: 500;
    }
  `]
})
export class ShiftReportPage implements OnInit, OnDestroy {
  reportType: 'weekly' | 'monthly' = 'weekly';
  selectedDate = new Date();
  shifts$!: Observable<ShiftReport[]>;
  employeeId: string | null = null;
  private authSub: Subscription | null = null;

  constructor(
    private shiftReportService: ShiftReportService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authSub = this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.employeeId = user.uid;
        this.fetchShifts();
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  onReportTypeChange() {
    this.selectedDate = new Date();
    this.fetchShifts();
  }

  navigateDate(direction: 'back' | 'forward') {
    if (this.reportType === 'weekly') {
      this.selectedDate.setDate(
        this.selectedDate.getDate() + (direction === 'back' ? -7 : 7)
      );
    } else {
      this.selectedDate.setMonth(
        this.selectedDate.getMonth() + (direction === 'back' ? -1 : 1)
      );
    }
    this.fetchShifts();
  }

  getDisplayDateRange(): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
      day: 'numeric'
    });

    if (this.reportType === 'weekly') {
      const startDate = this.getStartOfWeek(this.selectedDate);
      const endDate = this.getEndOfWeek(this.selectedDate);
      return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
      }).format(this.selectedDate);
    }
  }

  formatDate(date: Date, style: 'full' | 'short' = 'full'): string {
    const options: Intl.DateTimeFormatOptions = style === 'full'
      ? { weekday: 'long', month: 'long', day: 'numeric' }
      : { month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  formatTime(timestamp: Date | undefined): string {
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      return 'N/A'; // Fallback for invalid dates
    }
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(timestamp));
  }
  calculateTotalHours(shifts: ShiftReport[]): number {
    return shifts.reduce((total, shift) => total + shift.totalHours, 0);
  }
  groupShiftsByDate(shifts: ShiftReport[]): { date: Date; shifts: ShiftReport[] }[] {
    const groups = shifts.reduce((acc, shift) => {
      const badgeInTime = this.formatTimestamp(shift.badgeInTime);
      console.log('Formatted badgeInTime:', badgeInTime); // Debugging log

      // If badgeInTime is 'Invalid timestamp', skip this shift
      if (badgeInTime === 'Invalid timestamp') {
        console.error('Skipping shift due to invalid badgeInTime:', shift);
        return acc; // Skip this shift if the badgeInTime is invalid
      }

      const date = new Date(badgeInTime);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString();

      if (!acc[dateString]) {
        acc[dateString] = {
          date,
          shifts: []
        };
      }
      acc[dateString].shifts.push(shift);
      return acc;
    }, {} as Record<string, { date: Date; shifts: ShiftReport[] }>);

    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  formatTimestamp(timestamp: any): string {
    try {
      if (timestamp instanceof Date) {
        // Already a Date object, return formatted string
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(timestamp);
      } else if (timestamp && timestamp.seconds) {
        // Firestore Timestamp
        const date = new Date(timestamp.seconds * 1000); // Firestore Timestamp handling
        if (isNaN(date.getTime())) {
          throw new Error('Invalid Firestore Timestamp');
        }
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(date);
      } else {
        return 'Invalid timestamp'; // If it's a bad timestamp, return a fallback string
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid timestamp'; // Fallback if anything goes wrong
    }
  }

  fetchShifts() {
    if (!this.employeeId) return;

    let startDate: Date;
    let endDate: Date;

    if (this.reportType === 'weekly') {
      startDate = this.getStartOfWeek(this.selectedDate);
      endDate = this.getEndOfWeek(this.selectedDate);
    } else {
      startDate = this.getStartOfMonth(this.selectedDate);
      endDate = this.getEndOfMonth(this.selectedDate);
    }

    this.shifts$ = this.shiftReportService.getShiftsByDateRange(
      this.employeeId,
      startDate,
      endDate
    );
  }

  async generateReport() {
    if (!this.employeeId) return;

    const shifts = await this.shifts$.toPromise();
    if (!shifts?.length) return;

    let startDate: Date;
    let endDate: Date;

    if (this.reportType === 'weekly') {
      startDate = this.getStartOfWeek(this.selectedDate);
      endDate = this.getEndOfWeek(this.selectedDate);
    } else {
      startDate = this.getStartOfMonth(this.selectedDate);
      endDate = this.getEndOfMonth(this.selectedDate);
    }

    await this.shiftReportService.generatePdfReport(
      this.employeeId,
      startDate,
      endDate,
      shifts
    );
  }

  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getEndOfWeek(date: Date): Date {
    const end = new Date(date);
    end.setDate(date.getDate() + (6 - date.getDay()));
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
  }

  private getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  }
}
