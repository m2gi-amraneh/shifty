import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { register } from 'swiper/element/bundle';
import Swiper from 'swiper';

import { ScheduleService } from './../services/schedule.service';
import { Shift } from '../services/planning.service';
import { ClosingPeriod } from '../services/closing-periods.service';
import { AbsenceRequest } from '../services/absence.service';

// Register Swiper custom elements
register();

@Component({
  selector: 'app-employee-planning',
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>My Schedule</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Date Slider -->
      <div class="date-slider-container">
        <swiper-container
          [slidesPerView]="5"
          [spaceBetween]="10"
          [centeredSlides]="true"
          (slidechange)="onDateSlideChange($event)"
        >
          <swiper-slide
            *ngFor="let dateItem of dateRange"
            [class.active]="isSelectedDate(dateItem)"
            (click)="selectDate(dateItem)"
          >
            <div class="date-slide">
              <div class="day">{{ dateItem | date : 'EEE' }}</div>
              <div class="date">{{ dateItem | date : 'd' }}</div>
            </div>
          </swiper-slide>
        </swiper-container>
      </div>

      <!-- Loading Spinner -->
      <ng-container *ngIf="isLoading">
        <ion-spinner class="centered-spinner"></ion-spinner>
      </ng-container>

      <!-- Content Sections -->
      <ng-container *ngIf="!isLoading">
        <!-- Closing Day -->
        <ng-container *ngIf="isClosingDay">
          <ion-card color="light">
            <ion-card-header>
              <ion-card-title color="medium">Company Closed</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              The company is closed on this day.
            </ion-card-content>
          </ion-card>
        </ng-container>

        <!-- Absence -->
        <ng-container *ngIf="isAbsent && !isClosingDay">
          <ion-card color="warning">
            <ion-card-header>
              <ion-card-title>Absence</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              You are on approved leave on this day.
            </ion-card-content>
          </ion-card>
        </ng-container>

        <!-- Shifts -->
        <ng-container *ngIf="!isClosingDay && !isAbsent">
          <ion-list *ngIf="shifts.length > 0; else noShifts">
            <ion-item-group>
              <ion-item-divider color="light">
                <ion-label>Scheduled Shifts</ion-label>
              </ion-item-divider>
              <ion-item *ngFor="let shift of shifts">
                <ion-icon name="time-outline" slot="start"></ion-icon>
                <ion-label>
                  <h2>{{ shift.role }}</h2>
                  <p>{{ shift.startTime }} - {{ shift.endTime }}</p>
                </ion-label>
              </ion-item>
            </ion-item-group>
          </ion-list>

          <ng-template #noShifts>
            <ion-card color="light">
              <ion-card-content class="ion-text-center">
                No shifts scheduled for this day.
              </ion-card-content>
            </ion-card>
          </ng-template>
        </ng-container>
      </ng-container>
    </ion-content>
  `,
  styles: [
    `
      .date-slider-container {
        padding: 10px 0;
        background-color: #f4f5f8;
      }

      swiper-slide {
        text-align: center;
        opacity: 0.6;
        transition: opacity 0.3s;
        cursor: pointer;
      }

      swiper-slide.active {
        opacity: 1;
      }

      .date-slide {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        border-radius: 8px;
        background-color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }

      .date-slide .day {
        font-size: 0.8em;
        color: #666;
      }

      .date-slide .date {
        font-size: 1.2em;
        font-weight: bold;
      }

      .centered-spinner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    `,
  ],
})
export class EmployeePlanningViewPage implements OnInit {
  selectedDate: Date = new Date();
  dateRange: Date[] = [];
  shifts: Shift[] = [];
  absences: AbsenceRequest[] = [];
  closingPeriods: ClosingPeriod[] = [];
  isClosingDay = false;
  isAbsent = false;
  isLoading = true;
  employeeId = 'VCbSYUdJtKWeWkE9NfVrPdNGdL82'; // Replace with dynamic ID

  constructor(private planningService: ScheduleService) {}

  ngOnInit() {
    this.generateDateRange();
    this.loadData();
  }

  // Generate a range of dates (e.g., 10 days around current date)
  generateDateRange() {
    this.dateRange = [];
    for (let i = -5; i <= 5; i++) {
      const date = new Date(this.selectedDate);
      date.setDate(date.getDate() + i);
      this.dateRange.push(date);
    }
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.loadData();
  }

  isSelectedDate(date: Date): boolean {
    return this.selectedDate.toDateString() === date.toDateString();
  }

  onDateSlideChange(event: any) {
    // Optional: Handle slide change if needed
    console.log('Slide changed', event);
  }

  // Rest of the methods remain the same as in the previous implementation
  async loadData() {
    try {
      this.isLoading = true;
      const dayOfWeek = this.selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
      });

      // Parallel data fetching
      const [shifts, absences, closingPeriods] = await Promise.all([
        this.planningService.getShiftsByEmployeeAndDay(
          this.employeeId,
          dayOfWeek
        ),
        this.planningService.getApprovedAbsencesByEmployee(this.employeeId),
        this.planningService.getClosingPeriods(),
      ]);

      this.shifts = shifts;
      this.absences = absences;
      this.closingPeriods = closingPeriods;

      this.checkClosingDay();
      this.checkAbsence();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Existing methods for checking closing day and absence remain the same
  private isDateWithinInterval(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  checkClosingDay() {
    this.isClosingDay = this.closingPeriods.some((period) =>
      this.isDateWithinInterval(
        this.selectedDate,
        new Date(period.startDate),
        new Date(period.endDate)
      )
    );
  }

  checkAbsence() {
    this.isAbsent = this.absences.some((absence) =>
      this.isDateWithinInterval(
        this.selectedDate,
        new Date(absence.startDate),
        new Date(absence.endDate)
      )
    );
  }
}
