import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { register } from 'swiper/element/bundle';
import { Observable, Subscription, combineLatest, switchMap } from 'rxjs';

import { ScheduleService } from './../services/schedule.service';
import { Shift } from '../services/planning.service';
import { ClosingPeriod } from '../services/closing-periods.service';
import { AbsenceRequest } from '../services/absence.service';
import { AuthService } from '../services/auth.service';
import {
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  calendarOutline,
  briefcaseOutline,
  closeCircleOutline,
  airplaneOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { ActivatedRoute } from '@angular/router';

// Register icons
addIcons({
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  calendarOutline,
  briefcaseOutline,
  closeCircleOutline,
  airplaneOutline
});

// Register Swiper custom elements
register();

@Component({
  selector: 'app-employee-planning',
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="transparent-toolbar">
        <ion-title>My Schedule</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="planning-gradient">
      <!-- Week Navigation -->
      <div class="week-container">
        <div class="week-header">
          <ion-button fill="clear" (click)="previousWeek()" class="nav-button">
            <ion-icon name="chevron-back-outline" slot="icon-only"></ion-icon>
          </ion-button>

          <div class="week-range">
            <ion-icon name="calendar-outline" class="calendar-icon"></ion-icon>
            {{ getWeekRange() }}
          </div>

          <ion-button fill="clear" (click)="nextWeek()" class="nav-button">
            <ion-icon name="chevron-forward-outline" slot="icon-only"></ion-icon>
          </ion-button>
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
              <div class="date-slide" [class.selected]="isSelectedDate(dateItem)">
                <div class="day">{{ dateItem | date : 'EEE' }}</div>
                <div class="date">{{ dateItem | date : 'd' }}</div>

                <!-- Status indicators -->
                <div class="status-indicators">
                  <div class="indicator closed" *ngIf="isClosingDayForDate(dateItem)"></div>
                  <div class="indicator absent" *ngIf="isAbsentForDate(dateItem) && !isClosingDayForDate(dateItem)"></div>
                  <div class="indicator shift" *ngIf="hasShiftsForDate(dateItem) && !isClosingDayForDate(dateItem) && !isAbsentForDate(dateItem)"></div>
                </div>
              </div>
            </swiper-slide>
          </swiper-container>
        </div>
      </div>

      <!-- Loading Spinner -->
      <div class="centered-spinner" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <!-- Content Sections -->
      <div class="schedule-content" *ngIf="!isLoading">
        <!-- Date Display -->
        <div class="selected-date">
          {{ selectedDate | date : 'EEEE, MMMM d, y' }}
        </div>

        <!-- Closing Day -->
        <ion-card class="status-card closed-card" *ngIf="isClosingDay">
          <ion-card-content>
            <div class="status-icon">
              <ion-icon name="close-circle-outline"></ion-icon>
            </div>
            <div class="status-details">
              <h2>Company Closed</h2>
              <p>The company is not operating on this day.</p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Absence -->
        <ion-card class="status-card absence-card" *ngIf="isAbsent && !isClosingDay">
          <ion-card-content>
            <div class="status-icon">
              <ion-icon name="airplane-outline"></ion-icon>
            </div>
            <div class="status-details">
              <h2>Scheduled Absence</h2>
              <p>You have an approved leave on this day.</p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Shifts -->
        <ng-container *ngIf="!isClosingDay && !isAbsent">
          <div class="shifts-container" *ngIf="shifts.length > 0; else noShifts">
            <h2 class="section-title">
              <ion-icon name="briefcase-outline"></ion-icon>
              Your Shifts
            </h2>

            <ion-card *ngFor="let shift of shifts" class="shift-card">
              <ion-card-content>
                <div class="shift-time">
                  <ion-icon name="time-outline"></ion-icon>
                  <span>{{ shift.startTime }} - {{ shift.endTime }}</span>
                </div>
                <div class="shift-role">
                  {{ shift.role }}
                </div>
              </ion-card-content>
            </ion-card>
          </div>

          <ng-template #noShifts>
            <ion-card class="status-card no-shifts-card">
              <ion-card-content>
                <div class="status-icon">
                  <ion-icon name="calendar-outline"></ion-icon>
                </div>
                <div class="status-details">
                  <h2>Day Off</h2>
                  <p>No shifts scheduled for this day.</p>
                </div>
              </ion-card-content>
            </ion-card>
          </ng-template>
        </ng-container>
      </div>
    </ion-content>
  `,
  styles: [`
    /* Main Gradient Background */
    .planning-gradient {
      --background: linear-gradient(135deg, #5386d8 0%, #5eb7e0 100%);
    }

    .transparent-toolbar {
      --background: linear-gradient(135deg, #5386d8 0%, #5eb7e0 100%);

    }

    ion-title {
      font-size: 1.2rem;
      font-weight: 600;
    }

    /* Week Navigation */
    .week-container {
      padding: 16px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      margin-bottom: 20px;
    }

    .week-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
    }

    .nav-button {
      --color: white;
      --background: rgba(255, 255, 255, 0.2);
      --border-radius: 50%;
      width: 36px;
      height: 36px;
      margin: 0;
    }

    .week-range {
      display: flex;
      align-items: center;
      color: white;
      font-size: 1rem;
      font-weight: 500;
    }

    .calendar-icon {
      margin-right: 8px;
      font-size: 1.1rem;
    }

    /* Date Slider */
    .date-slider-container {
      margin-top: 10px;
    }

    .date-slide {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 8px;
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 0.15);
      transition: all 0.3s ease;
      position: relative;
    }

    .date-slide.selected {
      background-color: rgba(255, 255, 255, 0.3);
      transform: translateY(-3px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .date-slide .day {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 4px;
    }

    .date-slide .date {
      font-size: 1.2rem;
      font-weight: bold;
      color: white;
      margin-bottom: 6px;
    }

    /* Status indicators */
    .status-indicators {
      display: flex;
      gap: 3px;
    }

    .indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .indicator.closed {
      background-color: #ff4961;
    }

    .indicator.absent {
      background-color: #ffce00;
    }

    .indicator.shift {
      background-color: #2fdf75;
    }

    swiper-slide {
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    swiper-slide.active {
      opacity: 1;
    }

    /* Schedule Content */
    .schedule-content {
      padding: 0 16px 24px;
    }

    .selected-date {
      color: white;
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 20px;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    /* Cards */
    .status-card {
      margin: 0 0 16px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .closed-card {
      --background: rgba(255, 255, 255, 0.9);
      border-left: 5px solid #ff4961;
    }

    .absence-card {
      --background: rgba(255, 255, 255, 0.9);
      border-left: 5px solid #ffce00;
    }

    .no-shifts-card {
      --background: rgba(255, 255, 255, 0.9);
      border-left: 5px solid #92949c;
    }

    ion-card-content {
      display: flex;
      padding: 16px;
    }

    .status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin-right: 16px;
      color: #5386d8;
    }

    .status-details h2 {
      margin: 0 0 5px;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f1f1f;
    }

    .status-details p {
      margin: 0;
      color: #666;
    }

    /* Shifts Section */
    .section-title {
      display: flex;
      align-items: center;
      color: white;
      font-size: 1.1rem;
      margin: 24px 0 16px;
    }

    .section-title ion-icon {
      margin-right: 8px;
    }

    .shifts-container {
      margin-top: 16px;
    }

    .shift-card {
      margin-bottom: 12px;
      border-radius: 12px;
      --background: rgba(255, 255, 255, 0.9);
      border-left: 5px solid #2fdf75;
    }

    .shift-time {
      display: flex;
      align-items: center;
      color: #5386d8;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .shift-time ion-icon {
      margin-right: 8px;
    }

    .shift-role {
      color: #444;
      font-size: 0.95rem;
    }

    /* Loading Spinner */
    .centered-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    ion-spinner {
      --color: white;
      transform: scale(1.5);
    }
  `],
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
  shiftsMap: Map<string, Shift[]> = new Map();

  private dataSub: Subscription | null = null;
  private userSub: Subscription | null = null;
  private routeSub: Subscription | null = null;

  constructor(
    private planningService: ScheduleService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.generateCurrentWeek();
    this.routeSub = this.route.paramMap.pipe(
      switchMap((params) => {
        const routeId = params.get('employeeId');
        if (routeId) {
          this.employeeId = routeId;
          return new Observable((observer) => observer.next(routeId));
        } else {
          return this.authService.getCurrentUser().pipe(
            switchMap((user) => {
              this.employeeId = user?.uid || null;
              return new Observable((observer) => observer.next(user?.uid));
            })
          );
        }
      })
    ).subscribe(() => this.loadWeekData());
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
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.checkClosingDay();
    this.checkAbsence();
    this.loadDateShifts();
  }

  previousWeek() {
    this.selectedDate.setDate(this.selectedDate.getDate() - 7);
    this.generateCurrentWeek();
    this.loadWeekData();
  }

  nextWeek() {
    this.selectedDate.setDate(this.selectedDate.getDate() + 7);
    this.generateCurrentWeek();
    this.loadWeekData();
  }

  loadWeekData() {
    if (!this.employeeId) return;

    this.isLoading = true;
    this.shiftsMap.clear();

    this.dataSub = combineLatest([
      this.planningService.getApprovedAbsencesByEmployee(this.employeeId),
      this.planningService.getClosingPeriods()
    ]).subscribe({
      next: ([absences, closingPeriods]) => {
        this.absences = absences;
        this.closingPeriods = closingPeriods;

        // Load shifts for all days in the week
        this.currentWeek.forEach(date => {
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
          this.planningService.getShiftsByEmployeeAndDay(
            this.employeeId!,
            dayOfWeek
          ).subscribe(shifts => {
            this.shiftsMap.set(date.toDateString(), shifts);

            // If this is the selected date, update the shifts
            if (this.isSelectedDate(date)) {
              this.loadDateShifts();
            }

            this.isLoading = false;
          });
        });

        this.checkClosingDay();
        this.checkAbsence();
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading = false;
      },
    });
  }

  loadDateShifts() {
    const dateString = this.selectedDate.toDateString();
    this.shifts = this.shiftsMap.get(dateString) || [];
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

  isClosingDayForDate(date: Date): boolean {
    return this.closingPeriods.some((period) =>
      this.isDateWithinInterval(
        date,
        new Date(period.startDate),
        new Date(period.endDate)
      )
    );
  }

  isAbsentForDate(date: Date): boolean {
    return this.absences.some((absence) =>
      this.isDateWithinInterval(
        date,
        new Date(absence.startDate),
        new Date(absence.endDate)
      )
    );
  }

  hasShiftsForDate(date: Date): boolean {
    const shifts = this.shiftsMap.get(date.toDateString());
    return shifts !== undefined && shifts.length > 0;
  }

  ngOnDestroy() {
    this.dataSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }
}
