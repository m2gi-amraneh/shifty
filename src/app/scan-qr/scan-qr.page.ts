import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BadgeService, BadgedShift } from '../services/badge.service';
import { PlanningService, Shift } from '../services/planning.service';
import { ScheduleService } from '../services/schedule.service';
import { ToastController } from '@ionic/angular';
import { firstValueFrom, Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-employee-badge',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Badge Station</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="badgeForm">
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Employee ID</ion-label>
            <ion-input type="text" formControlName="employeeId"></ion-input>
          </ion-item>
        </ion-list>

        <ng-container *ngIf="employeeId">
          <!-- Closing Day Message -->
          <ion-card *ngIf="isClosingDay" color="light">
            <ion-card-header>
              <ion-card-title>Company Closed</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Badge actions unavailable - company is closed today.
            </ion-card-content>
          </ion-card>

          <!-- Absence Message -->
          <ion-card *ngIf="isAbsent && !isClosingDay" color="warning">
            <ion-card-header>
              <ion-card-title>On Leave</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Badge actions unavailable - you are on approved leave.
            </ion-card-content>
          </ion-card>

          <!-- Available Shifts -->
          <ng-container *ngIf="!isClosingDay && !isAbsent">
            <ion-list *ngIf="availableShifts.length > 0">
              <ion-radio-group formControlName="selectedShiftId">
                <ion-list-header>
                  <ion-label>Select Shift</ion-label>
                </ion-list-header>

                <ion-item *ngFor="let shift of availableShifts">
                  <ion-label>
                    <h2>{{ shift.role }}</h2>
                    <p>{{ shift.startTime }} - {{ shift.endTime }}</p>
                    <p *ngIf="shift.completed" class="ion-text-warning">Already completed</p>
                  </ion-label>
                  <ion-radio [value]="shift.id" [disabled]="shift.completed"></ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-list>

            <div class="ion-padding">
              <ion-button expand="block"
                        (click)="handleBadging()"
                        [disabled]="!canBadge() || isProcessing">
                {{ getBadgeActionText() }}
              </ion-button>

              <ion-button expand="block"
                        color="warning"
                        *ngIf="canTakeBreak()"
                        (click)="handleBreak()">
                {{ currentBadgedShift?.status === 'on-break' ? 'End Break' : 'Start Break' }}
              </ion-button>
            </div>
          </ng-container>
        </ng-container>

        <!-- Current Shift Status -->
        <ion-card *ngIf="currentBadgedShift">
          <ion-card-header>
            <ion-card-title>Current Shift</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label>
                  <h2>Check-in Time</h2>
                  <p>{{ currentBadgedShift.badgeInTime | date:'medium' }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label>
                  <h2>Status</h2>
                  <p>{{ currentBadgedShift.status }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </form>
    </ion-content>
  `
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
    private toastController: ToastController
  ) {
    this.badgeForm = this.fb.group({
      employeeId: ['', [Validators.required]],
      selectedShiftId: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.badgeForm.get('employeeId')?.valueChanges.subscribe(employeeId => {
      if (employeeId) {
        this.employeeId = employeeId;
        this.checkAvailability();
        this.loadAvailableShifts(employeeId);
        this.checkCurrentShift(employeeId);
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
    const employeeId = this.badgeForm.get('employeeId')?.value;
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
      position: 'bottom'
    });
    toast.present();
  }

  ngOnDestroy() {
    this.dataSub?.unsubscribe();
  }
}
