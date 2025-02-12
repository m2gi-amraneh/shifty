import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { register } from 'swiper/element/bundle';
import { Subscription, combineLatest } from 'rxjs';

import { ScheduleService } from './../services/schedule.service';
import { Shift } from '../services/planning.service';
import { ClosingPeriod } from '../services/closing-periods.service';
import { AbsenceRequest } from '../services/absence.service';
import { AuthService } from '../services/auth.service';
import {
  add,
  chevronBackCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  timeOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
addIcons({ timeOutline, chevronBackOutline, chevronForwardOutline });

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
      <!-- Week Display -->
      <div class="week-container">
        <div class="week-header">
          <ion-buttons slot="start">
            <ion-button (click)="previousWeek()">
              <ion-icon name="chevron-back-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
          <div class="week-range">
            {{ getWeekRange() }}
          </div>
          <ion-buttons slot="end">
            <ion-button (click)="nextWeek()">
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </div>

        <!-- Date Slider -->
        <div class="date-slider-container">
          <swiper-container
            [slidesPerView]="7"
            [spaceBetween]="10"
            [centeredSlides]="false"
          >
            <swiper-slide
              *ngFor="let dateItem of currentWeek"
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
      </div>

      <!-- Loading Spinner -->

      <!-- Content Sections -->
      <ng-container>
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
      .week-container {
        padding: 10px;
        background-color: #f8f9fa; /* Optional: Light background for clarity */
      }

      .week-header {
        display: flex;
        align-items: center; /* Vertically center elements */
        justify-content: space-between; /* Space buttons evenly */
        text-align: center;
        font-size: 1.2em;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .date-slider-container {
        padding: 10px 0;
      }

      swiper-slide {
        text-align: center;
        opacity: 0.6;
        transition: opacity 0.1s;
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
export class EmployeePlanningViewPage implements OnInit, OnDestroy {
  selectedDate: Date = new Date();
  currentWeek: Date[] = [];
  shifts: Shift[] = [];
  absences: AbsenceRequest[] = [];
  closingPeriods: ClosingPeriod[] = [];
  isClosingDay = false;
  isAbsent = false;
  isLoading = true;
  employeeId: string | null = null;

  private dataSub: Subscription | null = null;
  private userSub: Subscription | null = null;

  constructor(
    private planningService: ScheduleService,
    private authService: AuthService
  ) {}
  ngOnInit() {
    this.generateCurrentWeek();
    this.userSub = this.authService.getCurrentUser().subscribe((user) => {
      if (user) {
        this.employeeId = user.uid;
        this.loadData();
      } else {
        this.isLoading = false; // Stop loading if no user is found
      }
    });
  }

  generateCurrentWeek() {
    const startOfWeek = new Date(this.selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start from Sunday
    this.currentWeek = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      return date;
    });
  }

  getWeekRange(): string {
    const start = this.currentWeek[0];
    const end = this.currentWeek[6];
    return `${start.toDateString()} - ${end.toDateString()}`;
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.loadData();
  }

  previousWeek() {
    this.selectedDate.setDate(this.selectedDate.getDate() - 7);
    this.generateCurrentWeek();
    this.loadData();
  }

  nextWeek() {
    this.selectedDate.setDate(this.selectedDate.getDate() + 7);
    this.generateCurrentWeek();
    this.loadData();
  }

  loadData() {
    if (!this.employeeId) return;

    this.isLoading = true;
    const dayOfWeek = this.selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
    });

    this.dataSub = combineLatest([
      this.planningService.getShiftsByEmployeeAndDay(
        this.employeeId,
        dayOfWeek
      ),
      this.planningService.getApprovedAbsencesByEmployee(this.employeeId),
      this.planningService.getClosingPeriods(),
    ]).subscribe({
      next: ([shifts, absences, closingPeriods]) => {
        this.shifts = shifts;
        this.absences = absences;
        this.closingPeriods = closingPeriods;

        this.checkClosingDay();
        this.checkAbsence();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading = false;
      },
    });
  }

  isSelectedDate(date: Date): boolean {
    return this.selectedDate.toDateString() === date.toDateString();
  }

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

  ngOnDestroy() {
    this.dataSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }
}
