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
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent, IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,

} from '@ionic/angular/standalone'
@Component({
  selector: 'app-shift-report',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel, IonCard,
    IonCardContent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header>
      <ion-toolbar class="header-toolbar">
      <ion-buttons slot="start">
          <ion-back-button defaultHref="/employee-dashboard"></ion-back-button>
        </ion-buttons>
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

        <!-- Generate Report Button -->
        <ion-button
          expand="block"
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
    /* Base styles */
.custom-content {
  --background: #f5faff;
}

.header-toolbar {
  --background: linear-gradient(135deg, #3cd1db 0%, #66a6ff 100%);
  --color: white;
}

/* Segment styling */
.custom-segment {
  margin: 16px 0;
  --background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(102, 166, 255, 0.1);

  ion-segment-button {
    --color: #66a6ff;
    --color-checked: white;
    --background-checked: linear-gradient(135deg, #3cd1db 0%, #66a6ff 100%);
    --indicator-color: transparent;
    font-weight: 500;
    border-radius: 8px;
    margin: 3px;
    transition: all 0.3s ease;
  }
}

/* Date navigation */
.date-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
  padding: 10px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(102, 166, 255, 0.1);
}

.nav-button {
  --color: #66a6ff;
  --background-hover: rgba(102, 166, 255, 0.1);
  --border-radius: 50%;
  width: 40px;
  height: 40px;
}

.date-display {
  text-align: center;
  flex: 1;
}

.date-range {
  font-size: 1.1em;
  font-weight: 600;
  color: #3b4863;
  letter-spacing: 0.5px;
}

/* Summary card */
.summary-card {
  margin: 16px 0;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(102, 166, 255, 0.15);
  background: white;
  overflow: hidden;
}

.summary-header {
  background: linear-gradient(135deg, rgba(60, 209, 219, 0.1) 0%, rgba(102, 166, 255, 0.1) 100%);
  padding: 16px;
  border-bottom: 1px solid rgba(102, 166, 255, 0.1);

  h2 {
    margin: 0;
    font-size: 1.2em;
    color: #66a6ff;
    font-weight: 600;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
}

.icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(60, 209, 219, 0.15) 0%, rgba(102, 166, 255, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  ion-icon {
    font-size: 24px;
    color: #66a6ff;
  }
}

.text-container {
  display: flex;
  flex-direction: column;
}

.summary-item .label {
  font-size: 0.9em;
  color: #8c9bb5;
  margin-bottom: 4px;
}

.summary-item .value {
  font-size: 1.5em;
  font-weight: 700;
  color: #66a6ff;
}

/* Shift grouping */
.shift-group {
  margin-bottom: 24px;
}

.date-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 16px 0 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(102, 166, 255, 0.1);
  font-weight: 600;
  color: #3b4863;

  ion-icon {
    margin-right: 8px;
    color: #66a6ff;
  }
}

.day-total-badge {
  margin-left: auto;
  --background: linear-gradient(135deg, #3cd1db 0%, #66a6ff 100%);
  --color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
}

/* Shift card */
.shift-card {
  margin: 10px 0;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(102, 166, 255, 0.1);
  background: white;
  overflow: hidden;
  border-left: 3px solid #66a6ff;
}

.shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.shift-id {
  font-weight: 600;
  margin: 0;
  color: #3b4863;
  font-size: 1em;
}

.hours-badge {
  --background: linear-gradient(135deg, #3cd1db 0%, #66a6ff 100%);
  --color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.time-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.badge-time {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  flex: 1;
  border-radius: 8px;

  &.in {
    background-color: rgba(60, 209, 219, 0.08);
    ion-icon {
      color: #3cd1db;
    }
  }

  &.out {
    background-color: rgba(102, 166, 255, 0.08);
    ion-icon {
      color: #66a6ff;
    }
  }

  ion-icon {
    font-size: 20px;
  }
}

.time-details {
  display: flex;
  flex-direction: column;
}

.time-label {
  font-size: 0.8em;
  color: #8c9bb5;
}

.time-value {
  font-weight: 600;
  color: #3b4863;
}

.time-divider {
  display: flex;
  align-items: center;
  width: 40px;

  .divider-line {
    height: 1px;
    background-color: #e0e6f2;
    flex: 1;
  }

  ion-icon {
    font-size: 14px;
    color: #8c9bb5;
    margin: 0 4px;
  }
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c9bb5;

  ion-icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: #cfd8e6;
  }

  h3 {
    margin: 0 0 8px;
    font-weight: 600;
    color: #3b4863;
  }

  p {
    margin: 0;
    font-size: 0.9em;
  }
}

/* Generate button */
.generate-button {
  margin-top: 24px;
  margin-bottom: 24px;
  --background: linear-gradient(135deg, #3cd1db 0%, #66a6ff 100%);
  --border-radius: 12px;
  font-weight: 500;
  height: 48px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(102, 166, 255, 0.3);

  &:hover {
    --background: linear-gradient(135deg, #4fd7e0 0%, #7ab3ff 100%);
  }
}

/* Animation */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* For smaller screens adjustments */
@media (max-width: 480px) {
  .time-container {
    flex-direction: column;
    gap: 8px;
  }

  .time-divider {
    width: 100%;
    margin: 4px 0;
  }

  .summary-grid {
    gap: 10px;
  }
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
