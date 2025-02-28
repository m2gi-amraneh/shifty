import { UsersService } from './../services/users.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BadgeService, BadgedShift } from '../services/badge.service';
import { PlanningService, Shift } from '../services/planning.service';
import { ScheduleService } from '../services/schedule.service';
import { ToastController } from '@ionic/angular';
import { firstValueFrom, Subscription, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-employee-badge',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, DatePipe],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
      <ion-buttons slot="start">
          <ion-back-button color="black" defaultHref="/admin-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title class="ion-text-center">Badge Station</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="gradient-background">
      <div class="container">
        <form [formGroup]="badgeForm">
          <ion-card class="badge-card">
            <ion-card-content>
              <ion-item lines="none" class="transparent-item">
                <ion-label position="floating">Employee ID</ion-label>
                <ion-input
                  type="text"
                  formControlName="badgeCode"
                  placeholder="Scan or enter your badge code"
                  class="badge-input">
                </ion-input>
              </ion-item>
            </ion-card-content>
          </ion-card>

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

            <!-- Available Shifts -->
            <ng-container *ngIf="!isClosingDay && !isAbsent">
              <ion-card class="shift-card" *ngIf="availableShifts.length > 0">
                <ion-card-header>
                  <ion-card-title>Available Shifts</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-radio-group formControlName="selectedShiftId">
                    <ion-item *ngFor="let shift of availableShifts" class="shift-item" lines="full">
                      <ion-label>
                        <h2>{{ shift.role }}</h2>
                        <p>
                          <ion-icon name="time-outline"></ion-icon>
                          {{ shift.startTime }} - {{ shift.endTime }}
                        </p>
                        <p *ngIf="shift.completed" class="completed-text">
                          <ion-icon name="checkmark-circle-outline"></ion-icon>
                          Already completed
                        </p>
                      </ion-label>
                      <ion-radio slot="end" [value]="shift.id" [disabled]="shift.completed"></ion-radio>
                    </ion-item>
                  </ion-radio-group>
                </ion-card-content>
              </ion-card>

              <div class="action-buttons">
                <ion-button
                  expand="block"
                  class="badge-button"
                  (click)="handleBadging()"
                  [disabled]="!canBadge() || isProcessing">
                  <ion-icon [name]="!currentBadgedShift ? 'log-in-outline' : 'log-out-outline'" slot="start"></ion-icon>
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
          </ng-container>

          <!-- Current Shift Status -->
          <ion-card *ngIf="currentBadgedShift" class="status-card active-shift-card">
            <ion-card-header>
              <ion-icon name="hourglass-outline" class="status-icon"></ion-icon>
              <ion-card-title>Current Shift</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item class="transparent-item">
                  <ion-icon name="time-outline" slot="start"></ion-icon>
                  <ion-label>
                    <h3>Check-in Time</h3>
                    <p>{{ currentBadgedShift.badgeInTime | date: 'short' }}</p>
                  </ion-label>
                </ion-item>
                <ion-item class="transparent-item">
                  <ion-icon name="information-circle-outline" slot="start"></ion-icon>
                  <ion-label>
                    <h3>Status</h3>
                    <div class="status-badge" [ngClass]="{
                      'checked-in': currentBadgedShift.status === 'checked-in',
                      'on-break': currentBadgedShift.status === 'on-break'
                    }">
                      {{ currentBadgedShift.status }}
                    </div>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </form>
      </div>
    </ion-content>
  `,
  styles: [`
    .gradient-background {
      --background: linear-gradient(135deg, #4361eb 0%, #764ba2 100%);
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
    }

    .badge-card {
      margin-top: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .transparent-item {
      --background: transparent;
    }

    .badge-input {
      font-size: 18px;
      --padding-start: 12px;
    }

    .status-card {
      margin-top: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .closed-card {
      --background: #ffcdd2;
      color: #b71c1c;
    }

    .absence-card {
      --background: #fff9c4;
      color: #f57f17;
    }

    .active-shift-card {
      --background: #e8f5e9;
      color: #2e7d32;
    }

    .shift-card {
      margin-top: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .shift-item {
      --inner-padding-end: 8px;
      margin-bottom: 8px;
    }

    .completed-text {
      color: #ff9800;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-icon {
      font-size: 24px;
      margin-right: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: capitalize;
      font-weight: 500;
    }

    .checked-in {
      background-color: #c8e6c9;
      color: #2e7d32;
    }

    .on-break {
      background-color: #ffecb3;
      color: #ff8f00;
    }

    .action-buttons {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .badge-button {
      --background: #3d5afe;
      --box-shadow: 0 4px 12px rgba(61, 90, 254, 0.3);
      height: 48px;
      font-weight: 500;
    }

    .break-button {
      --background: #ff9800;
      --box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
      height: 48px;
      font-weight: 500;
    }

    ion-card-header {
      display: flex;
      align-items: center;
    }

    ion-card-title {
      font-size: 18px;
      font-weight: 600;
    }

    ion-list {
      background: transparent;
    }
  `]
})
export class EmployeeBadgePage implements OnInit, OnDestroy {
  badgeForm: FormGroup;
  currentBadgedShift: BadgedShift | null = null;
  isProcessing = false;
  isClosingDay = false;
  isAbsent = false;
  employeeId: string | null = null;
  availableShifts: (Shift & { completed?: boolean })[] = [];
  private dataSub: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private badgeService: BadgeService,
    private planningService: PlanningService,
    private scheduleService: ScheduleService,
    private toastController: ToastController,
    private UsersService: UsersService
  ) {
    this.badgeForm = this.fb.group({
      badgeCode: ['', [Validators.required]],
      selectedShiftId: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.badgeForm.get('badgeCode')?.valueChanges.pipe(
      switchMap(badgeCode => this.UsersService.getUserByBadgeCode(badgeCode))
    ).subscribe(user => {
      if (user) {
        // User found, proceed with badging logic
        this.employeeId = user.id;
        this.checkAvailability();
        this.loadAvailableShifts(this.employeeId);
        this.checkCurrentShift(this.employeeId);
      } else {
        // User not found, handle error
        this.employeeId = null;
        this.availableShifts = [];
        this.currentBadgedShift = null;
        this.showToast('Invalid Badge Code');
      }
    });
  }

  private checkAvailability() {
    if (!this.employeeId) return;

    this.dataSub = combineLatest([
      this.scheduleService.getClosingPeriods(),
      this.scheduleService.getApprovedAbsencesByEmployee(this.employeeId)
    ]).subscribe(([closingPeriods, absences]) => {
      const today = new Date();

      this.isClosingDay = closingPeriods.some(period =>
        this.isDateWithinInterval(today, new Date(period.startDate), new Date(period.endDate))
      );

      this.isAbsent = absences.some(absence =>
        this.isDateWithinInterval(today, new Date(absence.startDate), new Date(absence.endDate))
      );
    });
  }

  private isDateWithinInterval(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  async loadAvailableShifts(employeeId: string) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const shifts = await firstValueFrom(
      this.planningService.getShiftsForEmployeeRealtime(employeeId)
        .pipe(map(shifts => shifts.filter(shift => shift.day === today)))
    );

    const shiftsWithStatus = await Promise.all(
      shifts.map(async shift => ({
        ...shift,
        completed: await this.badgeService.checkExistingBadgedShift(employeeId, shift.id!)
      }))
    );

    this.availableShifts = shiftsWithStatus;
  }

  private checkCurrentShift(employeeId: string) {
    this.badgeService.getBadgedShifts(employeeId)
      .pipe(
        map(shifts => shifts.find(shift =>
          ['checked-in', 'on-break'].includes(shift.status)
        ))
      )
      .subscribe(shift => {
        if (shift && shift.badgeInTime instanceof Timestamp) {
          // Ensure Firestore Timestamp is converted to Date
          shift.badgeInTime = shift.badgeInTime.toDate();
        }
        this.currentBadgedShift = shift || null;
      });
  }

  canBadge(): boolean {
    return this.badgeForm.valid &&
      this.availableShifts.length > 0 &&
      !this.isClosingDay &&
      !this.isAbsent;
  }

  canTakeBreak(): boolean {
    return this.currentBadgedShift?.status === 'checked-in' ||
      this.currentBadgedShift?.status === 'on-break';
  }

  getBadgeActionText(): string {
    if (!this.currentBadgedShift) return 'Check In';
    return 'Check Out';
  }

  async handleBadging() {
    if (!this.canBadge() || this.isProcessing) return;

    this.isProcessing = true;
    const employeeId = this.employeeId!;
    const selectedShiftId = this.badgeForm.get('selectedShiftId')?.value;

    try {
      if (!this.currentBadgedShift) {
        const shiftCompleted = await this.badgeService.checkExistingBadgedShift(
          employeeId,
          selectedShiftId
        );

        if (shiftCompleted) {
          this.showToast('You have already completed this shift today');
          return;
        }

        await this.badgeService.createBadgedShift(employeeId, selectedShiftId);
        this.showToast('Successfully checked in');
      } else {
        await this.badgeService.completeBadgedShift(this.currentBadgedShift.id!);
        this.showToast('Successfully checked out');
      }

      this.checkCurrentShift(employeeId);
      this.loadAvailableShifts(employeeId);
    } catch (error) {
      console.error('Badging error:', error);
      this.showToast('Error processing request');
    } finally {
      this.isProcessing = false;
    }
  }

  async handleBreak() {
    if (!this.currentBadgedShift?.id) return;

    const newStatus = this.currentBadgedShift.status === 'on-break' ? 'checked-in' : 'on-break';
    try {
      await this.badgeService.updateBadgedShift(this.currentBadgedShift.id, { status: newStatus });
      this.showToast(`Break ${newStatus === 'on-break' ? 'started' : 'ended'}`);
      this.checkCurrentShift(this.employeeId!);
    } catch (error) {
      this.showToast('Error processing break request');
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'custom-toast',
      buttons: [
        {
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    toast.present();
  }

  ngOnDestroy() {
    this.dataSub?.unsubscribe();
  }
}
