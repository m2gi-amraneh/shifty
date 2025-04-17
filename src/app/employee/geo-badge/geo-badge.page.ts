import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common'; // Added TitleCasePipe
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BadgeService, BadgedShift } from '../../services/badge.service';
import { PlanningService, Shift } from '../../services/planning.service';
import { ScheduleService } from '../../services/schedule.service';

import { AuthService } from '../../services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { firstValueFrom, Subscription, combineLatest } from 'rxjs';
import { map, switchMap, filter, take } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import {
  addCircleOutline, hourglassOutline, logInOutline, pauseOutline, playOutline,
  logOutOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline, refreshOutline,
  timeOutline, informationCircleOutline, calendarOutline, airplaneOutline, warningOutline,
  settingsOutline, briefcaseOutline // Added missing icons
} from 'ionicons/icons';

// Add necessary icons
addIcons({
  logInOutline, addCircleOutline, hourglassOutline, pauseOutline, playOutline,
  logOutOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline,
  refreshOutline, timeOutline, informationCircleOutline, calendarOutline,
  airplaneOutline, warningOutline, settingsOutline, briefcaseOutline // Added missing icons
});

import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent,
  IonBackButton, IonButtons, IonItem, IonButton, IonRadioGroup, IonRadio, IonList,
  IonLabel, IonCardTitle, IonIcon, IonCardHeader, IonSpinner, IonChip // Added IonChip
} from '@ionic/angular/standalone';
import { WorkLocationService, WorkLocationSettings } from 'src/app/services/location.service';

@Component({
  selector: 'app-geo-badge',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe, // Make sure DatePipe is imported
    TitleCasePipe, // Make sure TitleCasePipe is imported
    IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent,
    IonBackButton, IonButtons, IonItem, IonButton, IonRadioGroup, IonRadio, IonList,
    IonLabel, IonCardTitle, IonIcon, IonCardHeader, IonSpinner, IonChip // Added IonChip
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin-dashboard"></ion-back-button> <!-- Adjust defaultHref -->
        </ion-buttons>
        <ion-title class="ion-text-center">Geo-Badge Station</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="container">

        <!-- Location Status Card -->
        <ion-card class="status-card location-card"
          [class.verified]="isLocationVerified"
          [class.error]="!isLocationVerified && !!locationError"
          [class.verifying]="isVerifyingLocation">
          <ion-card-header>
            <ion-icon
              [name]="isLocationVerified ? 'checkmark-circle-outline' : (isVerifyingLocation ? 'refresh-outline' : (locationError ? 'close-circle-outline' : 'location-outline'))"
              [color]="isLocationVerified ? 'success' : (isVerifyingLocation ? 'medium' : (locationError ? 'danger' : 'medium'))"
              [class.spin-icon]="isVerifyingLocation"
              slot="start"
              class="status-icon"></ion-icon>
            <ion-card-title>Location Status</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div *ngIf="isVerifyingLocation">
              <ion-spinner name="dots" color="primary"></ion-spinner> Verifying location...
            </div>
            <div *ngIf="!isVerifyingLocation">
              <p *ngIf="isLocationVerified" class="ion-text-success">
                <ion-icon name="location-outline" slot="start"></ion-icon>
                You are within the allowed work area.
              </p>
              <p *ngIf="!isLocationVerified && locationError" class="ion-text-danger">
                 <ion-icon name="warning-outline" slot="start"></ion-icon>
                 {{ locationError }}
              </p>
              <p *ngIf="!getCurrentSettings() && !locationError">
                <ion-icon name="settings-outline" slot="start"></ion-icon>
                Work location settings not yet loaded or configured.
              </p>
              <ion-button
                fill="outline"
                size="small"
                (click)="verifyLocation()"
                [disabled]="isVerifyingLocation || !getCurrentSettings()">
                <ion-icon name="refresh-outline" slot="start"></ion-icon>
                {{ isLocationVerified ? 'Re-verify' : 'Verify Location' }}
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Only show content below if employee ID is known -->
         <ng-container *ngIf="employeeId">

            <!-- Closing Day Message -->
            <ion-card *ngIf="isClosingDay" class="status-card closed-card">
              <ion-card-header>
                <ion-icon name="calendar-outline" class="status-icon"></ion-icon>
                <ion-card-title>Company Closed</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Badge actions unavailable - company is closed today.
              </ion-card-content>
            </ion-card>

            <!-- Absence Message -->
            <ion-card *ngIf="isAbsent && !isClosingDay" class="status-card absence-card">
              <ion-card-header>
                <ion-icon name="airplane-outline" class="status-icon"></ion-icon>
                <ion-card-title>On Leave</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Badge actions unavailable - you are on approved leave.
              </ion-card-content>
            </ion-card>

            <!-- Available Shifts (Show only if not closing day/absent AND (location verified OR currently checked in)) -->
            <ng-container *ngIf="!isClosingDay && !isAbsent && (isLocationVerified || currentBadgedShift)">
               <form [formGroup]="shiftSelectionForm">
                  <ion-card class="shift-card" *ngIf="availableShifts.length > 0 || showExtraOption">
                     <ion-card-header>
                      <ion-card-title>Select Shift</ion-card-title>
                     </ion-card-header>
                     <ion-card-content>
                      <ion-radio-group formControlName="selectedShiftId" [disabled]="!!currentBadgedShift"> <!-- Disable selection if already checked in -->
                        <!-- Regular Shifts -->
                        <ion-item *ngFor="let shift of availableShifts" class="shift-item" lines="full">
                          <ion-label>
                            <h2>{{ shift.role }}</h2>
                            <p>
                              <ion-icon name="time-outline"></ion-icon>
                              {{ shift.startTime }} - {{ shift.endTime }}
                            </p>
                            <p *ngIf="shift.completed" class="completed-text">
                              <ion-icon name="checkmark-circle-outline"></ion-icon>
                              Already completed today
                            </p>
                          </ion-label>
                          <ion-radio slot="end" [value]="shift.id" [disabled]="shift.completed || !!currentBadgedShift"></ion-radio>
                        </ion-item>

                        <!-- Extra Shift Option -->
                         <ion-item class="shift-item extra-shift-item" lines="none">
                          <ion-label>
                            <h2>Extra Shift</h2>
                            <p>
                              <ion-icon name="add-circle-outline"></ion-icon>
                              Unscheduled working time
                            </p>
                             <!-- Check if extra already done - Requires checkExistingBadgedShift to return Observable or Promise -->
                             <p *ngIf="extraShiftCompletedToday !== null && extraShiftCompletedToday" class="completed-text">
                               <ion-icon name="checkmark-circle-outline"></ion-icon>
                               Extra shift completed today
                             </p>
                          </ion-label>
                           <ion-radio slot="end" value="extra" [disabled]="extraShiftCompletedToday || !!currentBadgedShift"></ion-radio>
                        </ion-item>

                      </ion-radio-group>
                     </ion-card-content>
                  </ion-card>
               </form>

               <!-- Action Buttons (Show only if location verified OR currently checked in) -->
               <div class="action-buttons">
                <ion-button
                  expand="block"
                  class="badge-button"
                  (click)="handleBadging()"
                  [disabled]="!canBadge() || isProcessing">
                  <ion-spinner *ngIf="isProcessing" slot="start"></ion-spinner>
                  <ion-icon *ngIf="!isProcessing" [name]="!currentBadgedShift ? 'log-in-outline' : 'log-out-outline'" slot="start"></ion-icon>
                  {{ getBadgeActionText() }}
                </ion-button>

                <ion-button
                  expand="block"
                  class="break-button"
                  *ngIf="canTakeBreak()"
                  (click)="handleBreak()">
                    <ion-icon [name]="currentBadgedShift?.status === 'on-break' ? 'play-outline' : 'pause-outline'" slot="start"></ion-icon>
                    {{ currentBadgedShift?.status === 'on-break' ? 'End Break' : 'Start Break' }}
                </ion-button>
               </div>
            </ng-container>

            <!-- Current Shift Status -->
            <ion-card *ngIf="currentBadgedShift" class="status-card active-shift-card">
              <ion-card-header>
                <ion-icon name="hourglass-outline" class="status-icon"></ion-icon>
                <ion-card-title>Current Activity</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none" class="transparent-list">
                  <ion-item class="transparent-item">
                    <ion-icon name="time-outline" slot="start" color="success"></ion-icon>
                    <ion-label>
                      <h3>Check-in Time</h3>
                      <p>{{ currentBadgedShift.badgeInTime | date: 'MMM d, y, h:mm a' }}</p>
                    </ion-label>
                  </ion-item>
                  <ion-item class="transparent-item">
                    <ion-icon name="information-circle-outline" slot="start" color="primary"></ion-icon>
                    <ion-label>
                      <h3>Status</h3>
                       <ion-chip [color]="currentBadgedShift.status === 'on-break' ? 'warning' : 'success'" outline="false"> <!-- Changed outline -->
                         <ion-label>{{ currentBadgedShift.status | titlecase }}</ion-label>
                        </ion-chip>
                    </ion-label>
                  </ion-item>
                  <ion-item *ngIf="currentBadgedShift.shiftId === 'extra'" class="transparent-item">
                    <ion-icon name="add-circle-outline" slot="start" color="secondary"></ion-icon>
                    <ion-label>
                      <h3>Shift Type</h3>
                       <ion-chip color="secondary" outline="false"> <!-- Changed outline -->
                          <ion-label>Extra Shift</ion-label>
                        </ion-chip>
                    </ion-label>
                  </ion-item>
                   <!-- Removed getShiftDetails as it requires extra setup -->
                </ion-list>
              </ion-card-content>
            </ion-card>

         </ng-container> <!-- End employeeId check -->

         <!-- Show login prompt if no employeeId -->
         <ion-card *ngIf="!employeeId" class="status-card warning-card">
            <ion-card-header>
              <ion-icon name="log-in-outline" slot="start"></ion-icon>
              <ion-card-title>Authentication Required</ion-card-title>
            </ion-card-header>
            <ion-card-content>
                Please log in to use the Geo-Badge feature.
                 <!-- Add a login button if applicable -->
                 <!-- <ion-button expand="block" routerLink="/login">Go to Login</ion-button> -->
            </ion-card-content>
         </ion-card>

      </div>
    </ion-content>
  `,
  styles: [`
    /* Gradient background - Optional */
    ion-content {
      /* --background: linear-gradient(135deg, #6e7bca 0%, #4d80a3 100%); */
      --background: #f4f5f8; /* Simple light background */
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 16px 0;
    }

    .status-card {
      margin-bottom: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-left: 5px solid var(--ion-color-medium); /* Default border */
      --background: #ffffff; /* Default card background */

      ion-card-header {
          display: flex;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--ion-color-light-shade);
          margin-bottom: 8px;
      }

      ion-card-title {
          font-size: 1.1em;
          font-weight: 600;
          margin-left: 8px;
          color: var(--ion-color-dark-shade);
      }

      .status-icon {
          font-size: 28px;
      }

      ion-list {
        background: transparent;
        padding-top: 0;
        padding-bottom: 0;
      }
      ion-list.transparent-list {
        background: transparent;
        --ion-item-background: transparent;
      }
      ion-item.transparent-item {
          --background: transparent;
          --padding-start: 4px; /* Adjust padding */
          --inner-padding-end: 0;
          --min-height: 45px;
          ion-label h3 {
              font-weight: 500;
              font-size: 0.9em;
              color: var(--ion-color-medium-shade);
              margin-bottom: 2px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
          }
          ion-label p, ion-chip ion-label {
               font-size: 1em;
               color: var(--ion-color-dark-tint);
               font-weight: 500;
          }
          ion-icon {
            margin-right: 12px;
            font-size: 20px; /* Slightly smaller icon in list */
            margin-top: auto; /* Align icon vertically */
            margin-bottom: auto;
          }
      }
       ion-chip {
         height: 30px;
         font-size: 0.9em;
         margin-left: 0; /* Align chip left */
         --padding-start: 12px;
         --padding-end: 12px;
       }
    }

    .location-card {
       border-color: var(--ion-color-medium);
       &.verified {
          border-color: var(--ion-color-success);
       }
       &.error {
          border-color: var(--ion-color-danger);
       }
       &.verifying {
          border-color: var(--ion-color-primary);
       }
       ion-card-content {
           padding-top: 10px;
       }
       ion-button {
          margin-top: 10px;
       }
    }

    .closed-card {
      border-color: var(--ion-color-danger-shade);
      background-color: #fff0f0;
      color: #b71c1c;
    }

    .absence-card {
      border-color: var(--ion-color-warning-shade);
      background-color: #fff9e6;
      color: #f57f17;
    }

    .active-shift-card {
      border-color: var(--ion-color-success-shade);
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .warning-card {
       border-color: var(--ion-color-warning);
       background-color: #fffbeb;
       color: #b26f00;
    }

    .shift-card {
      margin-bottom: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-left: 5px solid var(--ion-color-primary);
       --background: #ffffff;

       ion-card-header {
          border-bottom: none;
          padding-bottom: 0;
       }

       ion-item.shift-item {
        --inner-padding-end: 8px;
        --min-height: 65px;
        --background: transparent; /* Ensure item background is transparent */

        ion-label h2 {
            font-weight: 600;
            font-size: 1em;
            margin-bottom: 4px;
             color: var(--ion-color-dark);
        }
        ion-label p {
            font-size: 0.9em;
            color: var(--ion-color-medium-shade);
            display: flex;
            align-items: center;
            gap: 5px;
        }
         ion-label p ion-icon {
            font-size: 16px; /* Smaller icon in text */
         }

         &.extra-shift-item {
          border-top: 1px dashed var(--ion-color-medium-tint);
          margin-top: 8px;
          padding-top: 8px;
         }

         ion-radio {
             margin-left: 10px;
         }
      }

       .completed-text {
          color: var(--ion-color-success-shade);
          font-weight: 500;
          font-size: 0.85em !important;
       }
       .completed-text ion-icon {
          color: var(--ion-color-success);
       }
    }


    .action-buttons {
      margin-top: 25px;
      display: flex;
      flex-direction: column;
      gap: 15px;

      ion-button {
          height: 50px;
          font-weight: 600;
          --border-radius: 25px;
          text-transform: uppercase;
          font-size: 1em;
          --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }

      .badge-button {
          --background: var(--ion-color-primary);
          --background-activated: var(--ion-color-primary-shade);
          --color: var(--ion-color-primary-contrast);

           &[disabled] {
              --background: var(--ion-color-medium-tint);
              --color: var(--ion-color-dark-tint);
              --box-shadow: none;
           }
      }

      .break-button {
          --background: var(--ion-color-warning);
          --background-activated: var(--ion-color-warning-shade);
          --color: #fff; /* Ensure contrast */
          --box-shadow: 0 4px 10px rgba(255, 152, 0, 0.15);

            &[disabled] {
              --background: var(--ion-color-medium-tint);
              --color: var(--ion-color-dark-tint);
              --box-shadow: none;
           }
      }
    }

    /* Spin animation for refresh icon */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin-icon {
      animation: spin 1.5s linear infinite;
    }

    ion-radio[disabled] {
       opacity: 0.5;
    }
  `]
})
export class GeoBadgePage implements OnInit, OnDestroy {
  shiftSelectionForm: FormGroup;
  currentBadgedShift: BadgedShift | null = null;
  isProcessing = false;
  isClosingDay = false;
  isAbsent = false;
  employeeId: string | null = null;
  availableShifts: (Shift & { completed?: boolean })[] = [];
  showExtraOption = true;
  extraShiftCompletedToday: boolean | null = null; // State for extra shift completion

  // Geolocation specific state
  isVerifyingLocation = false;
  isLocationVerified = false;
  locationError: string | null = null;

  private dataSub: Subscription | null = null;
  private authSub: Subscription | null = null;
  private currentShiftSub: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private badgeService: BadgeService,
    private planningService: PlanningService,
    private scheduleService: ScheduleService,
    private toastController: ToastController,
    private loadingCtrl: LoadingController,
    private workLocationService: WorkLocationService, // Use the combined service
    private authService: AuthService
  ) {
    this.shiftSelectionForm = this.fb.group({
      selectedShiftId: ['extra', [Validators.required]] // Default to 'extra'
    });
  }

  ngOnInit() {
    this.authSub = this.authService.getCurrentUser()!.pipe(
      take(1)
    ).subscribe(user => {
      if (user) {
        this.employeeId = user.uid;
        this.initializeUserData();
        this.verifyLocation(); // Attempt verification on load
      } else {
        this.showToast('User not logged in. Please log in to use geo-badging.', 'warning');
        this.employeeId = null;
      }
    });
  }

  initializeUserData() {
    if (!this.employeeId) return;
    this.checkAvailability();
    this.loadAvailableShifts(this.employeeId);
    this.checkCurrentShift(this.employeeId);
    this.checkExtraShiftStatus(this.employeeId); // Check extra shift status
  }

  async checkExtraShiftStatus(employeeId: string) {
    try {
      this.extraShiftCompletedToday = await this.badgeService.checkExistingBadgedShift(employeeId, 'extra');
    } catch (error) {
      console.error("Error checking extra shift status:", error);
      this.extraShiftCompletedToday = null; // Set to null on error
    }
  }

  async verifyLocation() {
    if (this.isVerifyingLocation) return;

    const currentSettings = this.workLocationService.getCurrentWorkLocationSettings();
    if (!currentSettings) {
      this.locationError = 'Work location settings missing or loading.';
      this.isLocationVerified = false;
      console.warn('Cannot verify location: Work location settings not yet available.');
      // Optionally try to fetch settings if needed, but service should load on init
      // this.workLocationService.getWorkLocationSettings().pipe(take(1)).subscribe();
      return;
    }

    this.isVerifyingLocation = true;
    this.isLocationVerified = false;
    this.locationError = null;
    const loader = await this.loadingCtrl.create({ message: 'Verifying location...' });
    await loader.present();

    try {
      this.isLocationVerified = await this.workLocationService.isUserWithinWorkArea();
      if (this.isLocationVerified) {
        this.showToast('Location verified successfully!', 'success');
        this.locationError = null;
      } else {
        const radiusMeters = (currentSettings.radiusKm * 1000).toFixed(0);
        this.locationError = `You are outside the allowed work area (${radiusMeters}m radius).`;
        this.showToast(this.locationError, 'danger');
      }
    } catch (error: any) {
      this.locationError = `Could not verify location: ${error.message || 'Unknown error'}`;
      this.showToast(this.locationError, 'danger');
      this.isLocationVerified = false;
      console.error("Location verification error:", error);
    } finally {
      this.isVerifyingLocation = false;
      await loader.dismiss();
    }
  }

  private checkAvailability() {
    if (!this.employeeId) return;
    this.dataSub?.unsubscribe(); // Ensure previous subscription is cleaned up
    this.dataSub = combineLatest([
      this.scheduleService.getClosingPeriods(),
      this.scheduleService.getApprovedAbsencesByEmployee(this.employeeId)
    ]).subscribe(([closingPeriods, absences]) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      this.isClosingDay = closingPeriods.some(period =>
        this.isDateWithinInterval(today, this.normalizeDate(period.startDate), this.normalizeDate(period.endDate))
      );

      this.isAbsent = absences.some(absence =>
        this.isDateWithinInterval(today, this.normalizeDate(absence.startDate), this.normalizeDate(absence.endDate))
      );

      if (this.isClosingDay || this.isAbsent) {
        this.shiftSelectionForm.reset({ selectedShiftId: 'extra' });
        this.availableShifts = [];
        // Potentially disable location verification if closed/absent?
      }
    });
  }

  private normalizeDate(dateInput: string | Date | Timestamp): Date {
    let date: Date;
    if (dateInput instanceof Timestamp) {
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = dateInput; // Assume it's already a Date
    }
    if (isNaN(date.getTime())) { // Handle invalid date strings
      console.error("Invalid date input:", dateInput);
      return new Date(NaN); // Return an invalid date object
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private isDateWithinInterval(date: Date, start: Date, end: Date): boolean {
    if (isNaN(date.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);
    return date >= start && date <= endOfDay;
  }

  async loadAvailableShifts(employeeId: string) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    try {
      const shifts = await firstValueFrom(
        this.planningService.getShiftsForEmployeeRealtime(employeeId)
          .pipe(
            map(shifts => shifts.filter(shift => shift.day === today)),
            take(1)
          )
      );

      const shiftsWithStatus = await Promise.all(
        shifts.map(async shift => ({
          ...shift,
          completed: shift.id ? await this.badgeService.checkExistingBadgedShift(employeeId, shift.id) : false
        }))
      );

      this.availableShifts = shiftsWithStatus;

      // Default selection logic
      const firstUncompleted = this.availableShifts.find(s => !s.completed);
      if (firstUncompleted?.id) {
        this.shiftSelectionForm.get('selectedShiftId')?.setValue(firstUncompleted.id);
      } else if (this.extraShiftCompletedToday === false) { // Default to extra only if not completed
        this.shiftSelectionForm.get('selectedShiftId')?.setValue('extra');
      } else if (this.availableShifts.length === 0 && this.extraShiftCompletedToday === true) {
        // If no shifts AND extra is done or unknown, keep 'extra' selected but actions will be disabled
        this.shiftSelectionForm.get('selectedShiftId')?.setValue('extra');
      } else if (this.availableShifts.length > 0 && this.availableShifts.every(s => s.completed) && this.extraShiftCompletedToday === true) {
        // If all shifts done AND extra is done/unknown, keep 'extra' selected
        this.shiftSelectionForm.get('selectedShiftId')?.setValue('extra');
      }

    } catch (error) {
      console.error("Error loading available shifts:", error);
      this.showToast('Could not load available shifts.', 'danger');
      this.availableShifts = [];
    }
  }

  private checkCurrentShift(employeeId: string) {
    this.currentShiftSub?.unsubscribe(); // Clean up previous subscription
    this.currentShiftSub = this.badgeService.getBadgedShiftsRealtime(employeeId)
      .pipe(
        map(shifts => shifts.find(shift =>
          ['checked-in', 'on-break'].includes(shift.status)
        )),
        map(shift => {
          if (shift?.badgeInTime && shift.badgeInTime instanceof Timestamp) {
            return { ...shift, badgeInTime: shift.badgeInTime.toDate() };
          }
          // Handle case where badgeInTime might be a Date object already (e.g., from mock data)
          // or already converted by Firestore SDK options
          return shift;
        })
      )
      .subscribe(shift => {
        const changed = JSON.stringify(this.currentBadgedShift) !== JSON.stringify(shift);
        this.currentBadgedShift = shift || null;
        // If status changed (e.g., checked out), refresh available shifts and extra shift status
        if (changed && !this.currentBadgedShift && this.employeeId) {
          this.loadAvailableShifts(this.employeeId);
          this.checkExtraShiftStatus(this.employeeId);
        }
        // If checked in, disable shift selection form
        if (this.currentBadgedShift) {
          this.shiftSelectionForm.disable();
        } else {
          this.shiftSelectionForm.enable();
        }
      });
  }


  canBadge(): boolean {
    const settingsLoaded = !!this.getCurrentSettings();
    const validSelection = !!this.shiftSelectionForm.get('selectedShiftId')?.value;

    // Prevent check-in if the selected shift (regular or extra) is already completed
    const selectedId = this.shiftSelectionForm.get('selectedShiftId')?.value;
    let shiftAlreadyCompleted = false;
    if (!this.currentBadgedShift) { // Only check completion status if checking IN
      if (selectedId === 'extra') {
        shiftAlreadyCompleted = this.extraShiftCompletedToday === true;
      } else {
        const selectedShift = this.availableShifts.find(s => s.id === selectedId);
        shiftAlreadyCompleted = selectedShift?.completed === true;
      }
    }

    return !!this.employeeId &&
      !this.isProcessing &&
      settingsLoaded &&
      this.isLocationVerified &&
      !this.isClosingDay &&
      !this.isAbsent &&
      validSelection &&
      !shiftAlreadyCompleted; // Cannot badge if selected shift is done
  }

  canTakeBreak(): boolean {
    const settingsLoaded = !!this.getCurrentSettings();
    return !!this.currentBadgedShift &&
      (this.currentBadgedShift.status === 'checked-in' || this.currentBadgedShift.status === 'on-break') &&
      settingsLoaded &&
      this.isLocationVerified;
  }

  getBadgeActionText(): string {
    return !this.currentBadgedShift ? 'Check In' : 'Check Out';
  }

  async handleBadging() {
    // Perform checks again just before processing
    if (!this.canBadge()) {
      // Provide specific feedback based on why it failed
      if (!this.isLocationVerified) this.showToast('Location not verified or outside work area.', 'warning');
      else if (this.isClosingDay) this.showToast('Cannot badge: Company is closed today.', 'warning');
      else if (this.isAbsent) this.showToast('Cannot badge: You are marked as absent/on leave.', 'warning');
      else if (!this.shiftSelectionForm.valid) this.showToast('Please select a shift.', 'warning');
      else if (!this.getCurrentSettings()) this.showToast('Work location settings not loaded.', 'warning');
      else {
        const selectedId = this.shiftSelectionForm.get('selectedShiftId')?.value;
        let shiftCompleted = false;
        if (selectedId === 'extra') shiftCompleted = this.extraShiftCompletedToday ?? false;
        else shiftCompleted = this.availableShifts.find(s => s.id === selectedId)?.completed ?? false;

        if (shiftCompleted) this.showToast('Selected shift has already been completed today.', 'warning');
        else this.showToast('Cannot perform badge action now.', 'warning');
      }
      return;
    }

    this.isProcessing = true;
    const employeeId = this.employeeId!;
    const selectedShiftId = this.shiftSelectionForm.get('selectedShiftId')?.value;
    let loader: HTMLIonLoadingElement | null = null;

    try {
      loader = await this.loadingCtrl.create({ message: this.currentBadgedShift ? 'Checking out...' : 'Checking in...' });
      await loader.present();

      if (!this.currentBadgedShift) { // Check IN
        // Double check completion status server-side (BadgeService handles this implicitly now if designed well, but explicit check here is safer UI)
        const shiftCompleted = await this.badgeService.checkExistingBadgedShift(employeeId, selectedShiftId);
        if (shiftCompleted) {
          throw new Error('This shift has already been completed today.');
        }

        await this.badgeService.createBadgedShift(employeeId, selectedShiftId);
        this.showToast('Successfully checked in', 'success');
        // Update local state for extra shift if checked in as extra
        if (selectedShiftId === 'extra') this.extraShiftCompletedToday = false; // Mark as "in progress", not completed yet

      } else { // Check OUT
        if (!this.currentBadgedShift?.id) {
          console.error("Attempted to check out but current shift ID is missing.", this.currentBadgedShift);
          this.showToast('Error: Cannot check out, shift ID is missing.', 'danger');
          this.isProcessing = false; // Reset processing state
          if (loader) await loader.dismiss(); // Dismiss loader
          return; // Stop execution
        }
        await this.badgeService.completeBadgedShift(this.currentBadgedShift.id!);
        this.showToast('Successfully checked out', 'success');
        // Trigger refresh of completed status after checkout
        if (this.currentBadgedShift.shiftId === 'extra') {
          this.extraShiftCompletedToday = true; // Mark extra as completed now
        } else {
          const checkedOutShift = this.availableShifts.find(s => s.id === this.currentBadgedShift?.shiftId);
          if (checkedOutShift) checkedOutShift.completed = true; // Update local state
        }
        // Realtime listener in checkCurrentShift will update currentBadgedShift to null
        // and trigger reloads via its logic
      }
    } catch (error: any) {
      console.error('Badging error:', error);
      this.showToast(`Error: ${error.message || 'Could not process badging request.'}`, 'danger');
      // Refresh state in case of error during check-in/out
      if (this.employeeId) {
        this.loadAvailableShifts(this.employeeId);
        this.checkExtraShiftStatus(this.employeeId);
      }
    } finally {
      this.isProcessing = false;
      if (loader) await loader.dismiss();
      // Re-enable form only if not checked-in after operation
      if (!this.currentBadgedShift) {
        this.shiftSelectionForm.enable();
      }
    }
  }

  async handleBreak() {
    if (!this.canTakeBreak()) {
      if (!this.isLocationVerified) this.showToast('Location not verified. Cannot manage break.', 'warning');
      else this.showToast('Cannot manage break at this time.', 'warning');
      return;
    }
    if (!this.currentBadgedShift?.id) return;

    const newStatus = this.currentBadgedShift.status === 'on-break' ? 'checked-in' : 'on-break';
    const actionText = newStatus === 'on-break' ? 'Starting' : 'Ending';
    const loader = await this.loadingCtrl.create({ message: `${actionText} break...` });
    await loader.present();

    try {
      await this.badgeService.updateBadgedShift(this.currentBadgedShift.id, { status: newStatus });
      this.showToast(`Break ${actionText.toLowerCase()} successfully`, 'success');
      // Realtime listener will update the view
    } catch (error) {
      console.error("Break error:", error);
      this.showToast('Error processing break request', 'danger');
    } finally {
      await loader.dismiss();
    }
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }

  // Helper to get current settings for template checks
  getCurrentSettings(): WorkLocationSettings | null {
    return this.workLocationService.getCurrentWorkLocationSettings();
  }

  ngOnDestroy() {
    this.dataSub?.unsubscribe();
    this.authSub?.unsubscribe();
    this.currentShiftSub?.unsubscribe();
  }
}
