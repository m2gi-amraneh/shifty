import { Employee } from '../../services/users.service';
import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { BadgedShift, BadgeService } from '../../services/badge.service';
import { AuthService } from '../../services/auth.service';
import { Observable, Subscription, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  logOutOutline,
  calendarOutline,
  timerOutline,
  arrowDownOutline
} from 'ionicons/icons';
import { ActivatedRoute } from '@angular/router';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonIcon,
  IonBadge
} from '@ionic/angular/standalone';
addIcons({
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  logOutOutline,
  calendarOutline,
  timerOutline,
  arrowDownOutline
});

interface ShiftGroup {
  weekStart: Date;
  weekEnd: Date;
  shifts: BadgedShift[];
}

@Component({
  selector: 'app-badged-shifts',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonIcon,
    IonBadge,
    FormsModule,
    ScrollingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="schedule-gradient">
      <ion-buttons *ngIf="isadmin" slot="start">
          <ion-back-button defaultHref="/manage-employees"></ion-back-button>
        </ion-buttons>
        <ion-buttons *ngIf="!isadmin"slot="start">
          <ion-back-button defaultHref="/employee-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title class="ion-text-center text-black">My Shifts</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="main-content">
      <div class="segment-wrapper">
        <ion-segment [(ngModel)]="selectedView" mode="ios" class="custom-segment" (ionChange)="handleViewChange()">
          <ion-segment-button value="active">
            <ion-label>Active</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>History</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ng-container *ngIf="badgedShifts$ | async as shifts">
        <ng-container *ngIf="shifts.length > 0; else noShifts">

          <!-- Active Shifts View -->
          <ng-container *ngIf="selectedView === 'active'">
            <ion-list lines="none" class="shift-list">
              <ion-item *ngFor="let shift of filteredShifts" class="shift-card animate__animated animate__fadeIn">
                <div class="shift-container">
                  <div class="shift-status-indicator" [class.active]="shift.status === 'checked-in'">
                    <ion-icon
                      [name]="shift.status === 'completed' ? 'checkmark-circle-outline' : 'timer-outline'"
                      [color]="shift.status === 'completed' ? 'success' : 'light'"
                    ></ion-icon>
                  </div>
                  <div class="shift-details">
                    <h2 class="shift-title" *ngIf="shift.shiftId!=='extra'">Shift</h2>
                    <h2 class="shift-title" *ngIf="shift.shiftId==='extra'">Extra</h2>
                    <div class="time-info">
                      <ion-icon name="calendar-outline" color="medium"></ion-icon>
                      <span>{{ formatTimestamp(shift.badgeInTime) }}</span>
                    </div>
                    <div class="status-container">
                      <ion-badge [class]="'status-badge ' + shift.status">
                        {{ shift.status === 'checked-in' ? 'In Progress' : 'Completed' }}
                      </ion-badge>
                      <span class="time-duration" *ngIf="shift.badgeOutTime">
                        {{ calculateDuration(shift.badgeInTime, shift.badgeOutTime) }}
                      </span>
                    </div>
                  </div>
                </div>
              </ion-item>
            </ion-list>
          </ng-container>

          <!-- Completed Shifts View with CDK Virtual Scroll -->
          <ng-container *ngIf="selectedView === 'completed'">
            <cdk-virtual-scroll-viewport #cdkVirtualScrollViewport [itemSize]="160" class="virtual-scroll-viewport">
              <ng-container *ngFor="let group of shiftGroups; trackBy: trackByWeekStart">
                <div class="week-header">
                  <div class="week-label">
                    {{ formatWeekRange(group.weekStart, group.weekEnd) }}
                  </div>
                </div>

                <ion-item *ngFor="let shift of group.shifts; trackBy: trackByShiftId" class="shift-card history-card animate__animated animate__fadeIn">
                  <div class="shift-container">
                    <div class="shift-status-indicator completed">
                      <ion-icon name="checkmark-circle-outline" color="light"></ion-icon>
                    </div>
                    <div class="shift-details">
                    <h2 class="shift-title" *ngIf="shift.shiftId!=='extra'">Shift</h2>
                    <h2 class="shift-title" *ngIf="shift.shiftId==='extra'">Extra</h2>
                      <div class="time-info">
                        <div class="time-badge">
                          <ion-icon name="time-outline" color="medium"></ion-icon>
                          <span>Check In: {{ formatTime(shift.badgeInTime) }}</span>
                        </div>
                        <div class="time-badge" *ngIf="shift.badgeOutTime">
                          <ion-icon name="time-outline" color="medium"></ion-icon>
                          <span>Check Out: {{ formatTime(shift.badgeOutTime) }}

                          </span>
                        </div>
                      </div>
                      <div class="status-container">
                        <ion-badge class="status-badge completed">Completed</ion-badge>
                        <span class="time-duration" *ngIf="shift.badgeOutTime">
                          {{ calculateDuration(shift.badgeInTime, shift.badgeOutTime) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </ion-item>
              </ng-container>
            </cdk-virtual-scroll-viewport>
          </ng-container>

        </ng-container>
      </ng-container>

      <ng-template #noShifts>
        <div class="empty-state animate__animated animate__fadeIn">
          <div class="empty-icon-container">
            <ion-icon name="calendar-outline"></ion-icon>
          </div>
          <h3>No {{ selectedView === 'active' ? 'Active' : 'Completed' }} Shifts</h3>
          <p>Check back later for updates</p>
        </div>
      </ng-template>
    </ion-content>
  `,
  styles: [`
    :host {
      --theme-gradient: linear-gradient(135deg, #f1c01c 0%, #da7356 100%);
      --theme-color-light: #f1c01c;
      --theme-color-dark: #da7356;
      --theme-color-medium: rgba(218, 115, 86, 0.7);
      --card-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      --card-radius: 16px;
      --animation-duration: 0.3s;
    }

    .schedule-gradient {

      --background: linear-gradient(135deg, #f1c01c 0%, #da7356 100%);
}


    .text-white {
      color: white !important;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .main-content {
      --background: #f8f9fa;
      --padding-top: 12px;
    }

    .segment-wrapper {
      padding: 0 16px 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      background: #f8f9fa;
    }

    .custom-segment {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 16px;
      padding: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    ion-segment-button {
      --background-checked: var(--theme-gradient);
      --color-checked: white;
      --indicator-color: transparent;
      --color: var(--ion-color-medium);
      --border-radius: 12px;
      text-transform: none;
      font-weight: 600;
      min-height: 40px;
      transition: all 0.3s ease;
    }

    .shift-list {
      background: transparent;
      padding: 0 16px;
    }

    .shift-card {
      --background: white;
      --padding-start: 0;
      --padding-end: 0;
      --inner-padding-end: 0;
      --inner-padding-start: 0;
      border-radius: var(--card-radius);
      margin-bottom: 16px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      transition: transform var(--animation-duration) ease, box-shadow var(--animation-duration) ease;

      &:active {
        transform: scale(0.98);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
      }
    }

    .history-card {
      margin: 0 16px 16px;
    }

    .shift-container {
      display: flex;
      width: 100%;
      padding: 16px;
    }

    .shift-status-indicator {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      margin-right: 16px;
      transition: all 0.3s ease;

      &.active {
        background: var(--theme-gradient);
      }

      &.completed {
        background: var(--ion-color-success);
      }

      ion-icon {
        font-size: 24px;
      }
    }

    .shift-details {
      flex: 1;
    }

    .shift-title {
      font-weight: 700;
      font-size: 18px;
      margin: 0 0 8px 0;
      color: var(--ion-color-dark);
    }

    .time-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .time-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--ion-color-medium);
      font-size: 14px;

      ion-icon {
        font-size: 16px;
      }
    }

    .status-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.3px;

      &.checked-in {
        background: var(--theme-gradient);
        color: white;
      }

      &.completed {
        background: var(--ion-color-success);
        color: white;
      }
    }

    .time-duration {
      font-size: 13px;
      color: var(--ion-color-medium);
      font-weight: 500;
    }

    .week-header {
      padding: 0 16px;
      margin: 24px 0 16px;
    }

    .week-label {
      background: rgba(241, 192, 28, 0.15);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 13px;
      color: var(--theme-color-dark);
      display: inline-block;
      border-left: 3px solid var(--theme-color-light);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
    }

    .empty-icon-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(241, 192, 28, 0.2) 0%, rgba(218, 115, 86, 0.2) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;

      ion-icon {
        font-size: 40px;
        color: var(--theme-color-dark);
      }
    }

    .empty-state h3 {
      margin: 0 0 8px;
      color: var(--ion-color-dark);
      font-weight: 700;
      font-size: 20px;
    }

    .empty-state p {
      margin: 0;
      color: var(--ion-color-medium);
      font-size: 16px;
    }

    .virtual-scroll-viewport {
      height: calc(100vh - 180px);
      width: 100%;
    }

    // Animation classes
    .animate__animated {
      animation-duration: 0.5s;
    }

    .animate__fadeIn {
      animation-name: fadeIn;
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
  `]
})
export class BadgedShiftsPage implements OnInit, OnDestroy {
  @ViewChild('cdkVirtualScrollViewport') virtualScroll: CdkVirtualScrollViewport | undefined;

  badgedShifts$: Observable<BadgedShift[]>;
  selectedView: 'active' | 'completed' = 'active';
  isProcessing = false;
  filteredShifts: BadgedShift[] = [];
  shiftGroups: ShiftGroup[] = [];

  private authSub: Subscription | null = null;
  private routeSub: Subscription | null = null;
  private dataSub: Subscription | null = null;
  EmployeeId: string | null = null;
  isadmin: boolean = false;
  constructor(
    private badgeService: BadgeService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.badgedShifts$ = new Observable();
  }

  ngOnInit() {
    this.routeSub = this.route.paramMap.pipe(
      switchMap((params) => {
        const routeId = params.get('employeeId');
        if (routeId) {
          this.isadmin = true;
          this.EmployeeId = routeId;
          return this.badgeService.getBadgedShiftsRealtime(routeId);
        } else {
          return this.authService.getCurrentUser().pipe(
            switchMap((user) => {
              this.EmployeeId = user?.uid || null;
              return this.badgeService.getBadgedShiftsRealtime(user?.uid);
            })
          );
        }
      })
    ).subscribe((shifts) => {
      this.processShifts(shifts);
    });
  }

  processShifts(shifts: BadgedShift[]) {
    if (!shifts) return;

    this.badgedShifts$ = new Observable((observer) => observer.next(shifts));
    this.filteredShifts = this.filterShifts(shifts);

    if (this.selectedView === 'completed') {
      this.shiftGroups = this.getShiftGroups(this.filteredShifts);
    }
  }

  handleViewChange() {
    // Force refresh of filtered data when view changes
    this.badgedShifts$.subscribe(shifts => {
      this.filteredShifts = this.filterShifts(shifts);
      if (this.selectedView === 'completed') {
        this.shiftGroups = this.getShiftGroups(this.filteredShifts);
      }
    });
  }

  private isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  private safelyCreateDate(date: any): Date {
    if (this.isValidDate(date)) {
      return date;
    }
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      if (this.isValidDate(parsedDate)) {
        return parsedDate;
      }
    }
    if (date && typeof date === 'object' && 'seconds' in date) {
      const milliseconds = date.seconds * 1000;
      const parsedDate = new Date(milliseconds);
      if (this.isValidDate(parsedDate)) {
        return parsedDate;
      }
    }
    // Return current date as fallback
    console.warn('Invalid date encountered, using current date as fallback', date);
    return new Date();
  }

  getShiftGroups(shifts: BadgedShift[]): ShiftGroup[] {
    const groups: { [key: string]: ShiftGroup } = {};

    // Sort shifts by date in descending order (newest first)
    const sortedShifts = [...shifts].sort((a, b) => {
      const dateA = this.safelyCreateDate(a.badgeInTime).getTime();
      const dateB = this.safelyCreateDate(b.badgeInTime).getTime();
      return dateB - dateA;
    });

    sortedShifts.forEach(shift => {
      try {
        const shiftDate = this.safelyCreateDate(shift.badgeInTime);
        const weekStart = this.getWeekStart(shiftDate);
        const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;

        if (!groups[weekKey]) {
          groups[weekKey] = {
            weekStart,
            weekEnd: new Date(weekStart),
            shifts: []
          };
          groups[weekKey].weekEnd.setDate(weekStart.getDate() + 6);
        }

        groups[weekKey].shifts.push(shift);
      } catch (error) {
        console.error('Error processing shift:', shift, error);
      }
    });

    return Object.values(groups);
  }

  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - result.getDay());
    return result;
  }

  formatTime(date: Date | undefined | null): string {
    try {
      if (!date) return '';
      const safeDate = this.safelyCreateDate(date);
      return safeDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  }

  formatTimestamp(date: Date | null): string {
    try {
      if (!date) return '';
      const safeDate = this.safelyCreateDate(date);
      return safeDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  }

  formatWeekRange(start: Date, end: Date): string {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  calculateDuration(startTime: Date | null, endTime: Date | null): string {
    if (!startTime || !endTime) return '';

    try {
      const start = this.safelyCreateDate(startTime);
      const end = this.safelyCreateDate(endTime);

      const durationMs = end.getTime() - start.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error);
      return '';
    }
  }

  filterShifts(shifts: BadgedShift[]): BadgedShift[] {
    if (!shifts) return [];
    return shifts.filter(shift =>
      this.selectedView === 'active'
        ? shift.status === 'checked-in'
        : shift.status === 'completed'
    );
  }

  // Track by functions for better performance
  trackByWeekStart(index: number, group: ShiftGroup): string {
    return `${group.weekStart.getTime()}`;
  }

  trackByShiftId(index: number, shift: BadgedShift): string {
    return shift.shiftId || index.toString();
  }

  handleRefresh(event: any) {
    // Re-fetch data from service
    if (this.EmployeeId) {
      this.badgeService.getBadgedShiftsRealtime(this.EmployeeId).subscribe(shifts => {
        this.processShifts(shifts);
        event.target.complete();
      });
    } else {
      event.target.complete();
    }
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.dataSub?.unsubscribe();
  }
}
