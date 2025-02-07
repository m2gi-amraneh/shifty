// shift-report.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import {
  ShiftReportService,
  ShiftReport,
} from '../services/shift-report.service';
import { Observable } from 'rxjs';
import { BadgeService } from '../services/badge.service';

@Component({
  selector: 'app-shift-report',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Shift Hours Report</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Report Type Selection -->
      <ion-segment [(ngModel)]="reportType" (ionChange)="onReportTypeChange()">
        <ion-segment-button value="weekly">
          <ion-label>Weekly</ion-label>
        </ion-segment-button>
        <ion-segment-button value="monthly">
          <ion-label>Monthly</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- Date Selection -->
      <div class="ion-padding">
        <!-- Weekly Selection -->
        <ng-container *ngIf="reportType === 'weekly'">
          <ion-label>Select Week</ion-label>
          <ion-datetime
            presentation="week-year"
            [(ngModel)]="selectedWeek"
            (ionChange)="fetchShifts()"
          ></ion-datetime>
        </ng-container>

        <!-- Monthly Selection -->
        <ng-container *ngIf="reportType === 'monthly'">
          <ion-label>Select Month</ion-label>
          <ion-datetime
            presentation="month-year"
            [(ngModel)]="selectedMonth"
            (ionChange)="fetchShifts()"
          ></ion-datetime>
        </ng-container>
      </div>

      <!-- Shifts List -->
      <ion-list *ngIf="shifts$ | async as shifts">
        <ion-list-header>
          <ion-label>Shifts</ion-label>
        </ion-list-header>
        <ion-item *ngFor="let shift of shifts">
          <ion-label>
            <h2>{{ shift.checkInTime | date : 'mediumDate' }}</h2>
            <p>
              Check In: {{ shift.checkInTime | date : 'shortTime' }} | Check
              Out: {{ shift.checkOutTime | date : 'shortTime' }}
            </p>
            <p>Total Hours: {{ shift.totalHours | number : '1.2-2' }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Generate Report Button -->
      <div class="ion-padding">
        <ion-button
          expand="block"
          color="primary"
          (click)="generateReport()"
          [disabled]="!(shifts$ | async)?.length"
        >
          Generate PDF Report
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      ion-segment {
        margin: 10px 0;
      }
      .report-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 10px 0;
      }
    `,
  ],
})
export class ShiftReportPage {
  reportType: 'weekly' | 'monthly' = 'weekly';
  selectedWeek: string = '';
  selectedMonth: string = '';
  shifts$!: Observable<ShiftReport[]>;

  // Replace with actual employee ID from authentication
  employeeId = 'VCbSYUdJtKWeWkE9NfVrPdNGdL82'; // Replace with dynamic ID

  constructor(
    private shiftReportService: ShiftReportService,
    private shi: BadgeService
  ) {
    //  this.shi.addBadgedShifts();
  }

  onReportTypeChange() {
    // Reset selections when changing report type
    this.selectedWeek = '';
    this.selectedMonth = '';
    this.shifts$ = new Observable<ShiftReport[]>((observer) =>
      observer.next([])
    );
  }

  fetchShifts() {
    let startDate: Date;
    let endDate: Date;

    if (this.reportType === 'weekly') {
      // Parse week selection
      const weekStart = new Date(this.selectedWeek);
      startDate = this.getStartOfWeek(weekStart);
      endDate = this.getEndOfWeek(weekStart);
    } else {
      // Parse month selection
      const monthDate = new Date(this.selectedMonth);
      startDate = this.getStartOfMonth(monthDate);
      endDate = this.getEndOfMonth(monthDate);
    }

    // Fetch shifts for the selected period
    this.shifts$ = this.shiftReportService.getShiftsByDateRange(
      this.employeeId,
      startDate,
      endDate
    );
    this.shifts$.subscribe((data) => {
      console.log(data);
    });
  }

  async generateReport() {
    const shifts = (await this.shifts$.toPromise()) || [];

    let startDate: Date;
    let endDate: Date;

    if (this.reportType === 'weekly') {
      const weekStart = new Date(this.selectedWeek);
      startDate = this.getStartOfWeek(weekStart);
      endDate = this.getEndOfWeek(weekStart);
    } else {
      const monthDate = new Date(this.selectedMonth);
      startDate = this.getStartOfMonth(monthDate);
      endDate = this.getEndOfMonth(monthDate);
    }

    await this.shiftReportService.generatePdfReport(
      this.employeeId,
      startDate,
      endDate,
      shifts
    );
  }

  // Utility methods for date calculations
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
