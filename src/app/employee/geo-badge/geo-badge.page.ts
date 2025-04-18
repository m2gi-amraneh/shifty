import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BadgeService, BadgedShift } from '../../services/badge.service';
import { PlanningService, Shift } from '../../services/planning.service';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { ToastController, LoadingController, AnimationController } from '@ionic/angular';
import { firstValueFrom, Subscription, combineLatest } from 'rxjs';
import { map, switchMap, filter, take } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import {
  addCircleOutline, hourglassOutline, logInOutline, pauseOutline, playOutline,
  logOutOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline, refreshOutline,
  timeOutline, informationCircleOutline, calendarOutline, airplaneOutline, warningOutline,
  settingsOutline, briefcaseOutline, fingerPrintOutline, timerOutline, peopleOutline,
  navigateOutline, alertCircleOutline, buildOutline, flashOutline, heartOutline
} from 'ionicons/icons';

// Add necessary icons
addIcons({
  logInOutline, addCircleOutline, hourglassOutline, pauseOutline, playOutline,
  logOutOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline,
  refreshOutline, timeOutline, informationCircleOutline, calendarOutline,
  airplaneOutline, warningOutline, settingsOutline, briefcaseOutline,
  fingerPrintOutline, timerOutline, peopleOutline, navigateOutline,
  alertCircleOutline, buildOutline, flashOutline, heartOutline
});

import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent,
  IonBackButton, IonButtons, IonItem, IonButton, IonRadioGroup, IonRadio, IonList,
  IonLabel, IonCardTitle, IonIcon, IonCardHeader, IonSpinner, IonChip, IonRippleEffect,
  IonAvatar, IonBadge, IonSkeletonText, IonProgressBar, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { WorkLocationService, WorkLocationSettings } from 'src/app/services/location.service';

@Component({
  selector: 'app-geo-badge',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    TitleCasePipe,
    IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent,
    IonBackButton, IonButtons, IonItem, IonButton, IonRadioGroup, IonRadio, IonList,
    IonLabel, IonCardTitle, IonIcon, IonCardHeader, IonSpinner, IonChip, IonRippleEffect,
    IonAvatar, IonBadge, IonSkeletonText, IonProgressBar, IonFab, IonFabButton
  ],
  template: `
<ion-header  class="modern-toolbar" class="ion-no-border">
  <ion-toolbar  class="modern-toolbar">
    <ion-buttons slot="start">
      <ion-back-button defaultHref="/admin-dashboard"></ion-back-button>
    </ion-buttons>
    <ion-title class="ion-text-center">
      <span class="title-text">Badge Station</span>
    </ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="verifyLocation()" [disabled]="isVerifyingLocation">
        <ion-icon slot="icon-only" name="refresh-outline" [class.spin-icon]="isVerifyingLocation"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
  <!-- Status indicator bar -->
  <div class="status-indicator">
    <ion-progress-bar *ngIf="isVerifyingLocation" type="indeterminate" color="light"></ion-progress-bar>
  </div>
</ion-header>

<ion-content>
  <div class="main-content">
    <!-- Welcome message and date -->
    <div class="welcome-section">
      <div class="welcome-avatar">
        <ion-avatar>
          <ion-icon name="finger-print-outline" class="avatar-icon"></ion-icon>
        </ion-avatar>
      </div>
      <div class="welcome-text">
        <h2>{{ getGreeting() }}</h2>
        <p>{{ getCurrentDate() }}</p>
      </div>
    </div>

    <!-- Status Cards Row -->
    <div class="status-cards">
      <!-- Location Status Card -->
      <ion-card class="status-card location-status" [ngClass]="{
        'status-verified': isLocationVerified,
        'status-error': !isLocationVerified && locationError,
        'status-pending': isVerifyingLocation
      }">
        <div class="status-icon">
          <ion-icon [name]="isLocationVerified ? 'checkmark-circle-outline' : (locationError ? 'close-circle-outline' : 'navigate-outline')"></ion-icon>
        </div>
        <div class="status-content">
          <h3>Location</h3>
          <p *ngIf="isVerifyingLocation">Verifying...</p>
          <p *ngIf="!isVerifyingLocation && isLocationVerified">Verified</p>
          <p *ngIf="!isVerifyingLocation && !isLocationVerified" class="status-message">{{ locationError || 'Not verified' }}</p>
        </div>
      </ion-card>

      <!-- Shift Status Card -->
      <ion-card class="status-card shift-status" [ngClass]="{
        'status-active': currentBadgedShift,
        'status-break': currentBadgedShift?.status === 'on-break',
        'status-inactive': !currentBadgedShift
      }">
        <div class="status-icon">
          <ion-icon [name]="currentBadgedShift ? (currentBadgedShift.status === 'on-break' ? 'pause-outline' : 'hourglass-outline') : 'timer-outline'"></ion-icon>
        </div>
        <div class="status-content">
          <h3>Shift</h3>
          <p *ngIf="!currentBadgedShift">Not active</p>
          <p *ngIf="currentBadgedShift" class="status-message">{{ currentBadgedShift.status === 'on-break' ? 'On break' : 'Active' }}</p>
        </div>
      </ion-card>

      <!-- Day Status Card -->
      <ion-card class="status-card day-status" [ngClass]="{
  'status-closed': isClosingDay,
  'status-absence': isAbsent && !isClosingDay,
  'status-active': !isClosingDay && !isAbsent && availableShifts.length > 0,
  'status-inactive': !isClosingDay && !isAbsent && availableShifts.length === 0
}">
  <div class="status-icon">
    <ion-icon [name]="isClosingDay ? 'calendar-outline' :
              (isAbsent ? 'airplane-outline' :
              (availableShifts.length > 0 ? 'briefcase-outline' : 'time-outline'))"></ion-icon>
  </div>
  <div class="status-content">
    <h3>Day</h3>
    <p *ngIf="isClosingDay">Closed</p>
    <p *ngIf="isAbsent && !isClosingDay">Leave</p>
    <p *ngIf="!isClosingDay && !isAbsent && availableShifts.length > 0">Working</p>
    <p *ngIf="!isClosingDay && !isAbsent && availableShifts.length === 0">Not Working</p>
  </div>
</ion-card>
    </div>

    <!-- Only show content below if employee ID is known -->
    <ng-container *ngIf="employeeId">

      <!-- Current Activity Card -->
      <div class="activity-section" *ngIf="currentBadgedShift">
        <ion-card class="activity-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="hourglass-outline"></ion-icon>
              Current Activity
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="activity-details">
              <div class="activity-item">
                <div class="activity-label">
                  <ion-icon name="time-outline" color="primary"></ion-icon>
                  <span>Check-in</span>
                </div>
                <div class="activity-value">{{ currentBadgedShift.badgeInTime | date: 'h:mm a' }}</div>
              </div>

              <div class="activity-item">
                <div class="activity-label">
                  <ion-icon name="information-circle-outline" color="primary"></ion-icon>
                  <span>Status</span>
                </div>
                <div class="activity-value">
                  <ion-chip [color]="currentBadgedShift.status === 'on-break' ? 'warning' : 'success'" class="status-chip">
                    <ion-icon [name]="currentBadgedShift.status === 'on-break' ? 'pause-outline' : 'flash-outline'"></ion-icon>
                    <ion-label>{{ currentBadgedShift.status | titlecase }}</ion-label>
                  </ion-chip>
                </div>
              </div>

              <div class="activity-item" *ngIf="currentBadgedShift.shiftId === 'extra'">
                <div class="activity-label">
                  <ion-icon name="add-circle-outline" color="primary"></ion-icon>
                  <span>Type</span>
                </div>
                <div class="activity-value">
                  <ion-chip color="secondary" class="status-chip">
                    <ion-icon name="build-outline"></ion-icon>
                    <ion-label>Extra Shift</ion-label>
                  </ion-chip>
                </div>
              </div>

              <div class="activity-time">
                <div class="time-elapsed">
                  <ion-icon name="timer-outline"></ion-icon>
                  <span>{{ getElapsedTime(currentBadgedShift.badgeInTime) }}</span>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Available Shifts (Show only if not closing day/absent AND (location verified OR currently checked in)) -->
      <ng-container *ngIf="!isClosingDay && !isAbsent && (isLocationVerified || currentBadgedShift)">
        <form [formGroup]="shiftSelectionForm" *ngIf="!currentBadgedShift && (availableShifts.length > 0 || showExtraOption)">
          <ion-card class="shifts-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="people-outline"></ion-icon>
                Select Shift
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-radio-group formControlName="selectedShiftId">
                <!-- Regular Shifts -->
                <ion-item *ngFor="let shift of availableShifts" class="shift-item" lines="full" detail="false">
                  <div class="shift-content">
                    <div class="shift-info">
                      <h4>{{ shift.role }}</h4>
                      <p class="shift-time">
                        <ion-icon name="time-outline"></ion-icon>
                        {{ shift.startTime }} - {{ shift.endTime }}
                      </p>
                      <p *ngIf="shift.completed" class="completed-text">
                        <ion-icon name="checkmark-circle-outline"></ion-icon>
                        Completed today
                      </p>
                    </div>
                  </div>
                  <ion-radio slot="end" [value]="shift.id" [disabled]="shift.completed"></ion-radio>
                </ion-item>

                <!-- Extra Shift Option -->
                <ion-item class="shift-item extra-shift-item">
                  <div class="shift-content">
                    <div class="shift-info">
                      <h4>Extra Shift</h4>
                      <p class="shift-time">
                        <ion-icon name="add-circle-outline"></ion-icon>
                        Unscheduled work
                      </p>
                      <p *ngIf="extraShiftCompletedToday" class="completed-text">
                        <ion-icon name="checkmark-circle-outline"></ion-icon>
                        Completed today
                      </p>
                    </div>
                  </div>
                  <ion-radio slot="end" value="extra" [disabled]="extraShiftCompletedToday"></ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-card-content>
          </ion-card>
        </form>
      </ng-container>

      <!-- Status Messages for Closed/Absent -->
      <ion-card *ngIf="isClosingDay" class="message-card closed-card">
        <ion-card-content>
          <div class="message-content">
            <ion-icon name="calendar-outline"></ion-icon>
            <div class="message-text">
              <h3>Company Closed</h3>
              <p>Badge actions unavailable today</p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card *ngIf="isAbsent && !isClosingDay" class="message-card absence-card">
        <ion-card-content>
          <div class="message-content">
            <ion-icon name="airplane-outline"></ion-icon>
            <div class="message-text">
              <h3>On Leave</h3>
              <p>Badge actions unavailable during leave</p>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Action Buttons -->
      <div class="action-section" *ngIf="!isClosingDay && !isAbsent && (isLocationVerified || currentBadgedShift)">
        <ion-button
          class="badge-button"
          [ngClass]="{'check-in': !currentBadgedShift, 'check-out': currentBadgedShift}"
          expand="block"
          (click)="handleBadging()"
          [disabled]="!canBadge() || isProcessing">
          <div class="button-content">
            <ion-spinner *ngIf="isProcessing"></ion-spinner>
            <ion-icon *ngIf="!isProcessing" [name]="!currentBadgedShift ? 'log-in-outline' : 'log-out-outline'"></ion-icon>
            <span>{{ getBadgeActionText() }}</span>
          </div>
        </ion-button>

        <ion-button
          *ngIf="canTakeBreak()"
          class="break-button"
          [ngClass]="{'start-break': currentBadgedShift?.status !== 'on-break', 'end-break': currentBadgedShift?.status === 'on-break'}"
          expand="block"
          (click)="handleBreak()">
          <div class="button-content">
            <ion-icon [name]="currentBadgedShift?.status === 'on-break' ? 'play-outline' : 'pause-outline'"></ion-icon>
            <span>{{ currentBadgedShift?.status === 'on-break' ? 'End Break' : 'Start Break' }}</span>
          </div>
        </ion-button>
      </div>

    </ng-container>

    <!-- Show login prompt if no employeeId -->
    <ion-card *ngIf="!employeeId" class="login-card">
      <ion-card-content>
        <div class="login-content">
          <ion-icon name="log-in-outline"></ion-icon>
          <h3>Authentication Required</h3>
          <p>Please log in to use the Badge Station</p>
          <ion-button expand="block" routerLink="/login">Go to Login</ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Floating Action Button for Location Refresh -->
    <ion-fab *ngIf="employeeId && !isVerifyingLocation" vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button (click)="verifyLocation()" color="light" size="small">
        <ion-icon name="navigate-outline"></ion-icon>
      </ion-fab-button>
    </ion-fab>

  </div>
</ion-content>
  `,
  styles: [`
:host {
  --primary-gradient: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
  --success-gradient: linear-gradient(135deg, var(--ion-color-success) 0%, var(--ion-color-success-shade) 100%);
  --warning-gradient: linear-gradient(135deg, var(--ion-color-warning) 0%, var(--ion-color-warning-shade) 100%);
  --danger-gradient: linear-gradient(135deg, var(--ion-color-danger) 0%, var(--ion-color-danger-shade) 100%);
  --card-border-radius: 16px;
  --card-box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  --icon-size-small: 18px;
  --icon-size-medium: 24px;
  --icon-size-large: 32px;
}

/* Header Styles */
.modern-toolbar {
  --background:  #81D4FA;
  height: 70px;
  display: flex;
  align-items: center;
}

.title-text {
  font-weight: 700;
  letter-spacing: 0.5px;
  font-size: 20px;
}

.status-indicator {
  height: 3px;
  background: transparent;
}

/* Content Styles */
ion-content {
  --background: #81D4FA;
}

.main-content {
  max-width: 650px;
  margin: 0 auto;
  padding: 20px 16px;
}

/* Welcome Section */
.welcome-section {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 8px;
}

.welcome-avatar {
  margin-right: 16px;
}

.welcome-avatar ion-avatar {
  width: 60px;
  height: 60px;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 32px;
  color: white;
}

.welcome-text h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ion-color-dark);
}

.welcome-text p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--ion-color-dark);
}

/* Status Cards */
.status-cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.status-card {
  margin: 0;
  padding: 16px;
  border-radius: var(--card-border-radius);
  box-shadow: var(--card-box-shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
}

.status-icon {
  margin-bottom: 12px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon ion-icon {
  font-size: var(--icon-size-medium);
  color: var(--ion-color-medium);
}

.status-content h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.status-content p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.status-message {
  font-weight: 500;
}

/* Status Card States */
.status-verified .status-icon {
  background: rgba(var(--ion-color-success-rgb), 0.15);
}

.status-verified .status-icon ion-icon {
  color: var(--ion-color-success);
}

.status-error .status-icon {
  background: rgba(var(--ion-color-danger-rgb), 0.15);
}

.status-error .status-icon ion-icon {
  color: var(--ion-color-danger);
}

.status-pending .status-icon {
  background: rgba(var(--ion-color-primary-rgb), 0.15);
}

.status-pending .status-icon ion-icon {
  color: var(--ion-color-primary);
}

.status-active .status-icon {
  background: rgba(var(--ion-color-success-rgb), 0.15);
}

.status-active .status-icon ion-icon {
  color: var(--ion-color-success);
}

.status-break .status-icon {
  background: rgba(var(--ion-color-warning-rgb), 0.15);
}

.status-break .status-icon ion-icon {
  color: var(--ion-color-warning);
}
.status-inactive .status-icon {
  background: rgba(var(--ion-color-medium-rgb), 0.15);
}

.status-inactive .status-icon ion-icon {
  color: var(--ion-color-medium);
}
.status-closed .status-icon {
  background: rgba(var(--ion-color-danger-rgb), 0.15);
}

.status-closed .status-icon ion-icon {
  color: var(--ion-color-danger);
}

.status-absence .status-icon {
  background: rgba(var(--ion-color-warning-rgb), 0.15);
}

.status-absence .status-icon ion-icon {
  color: var(--ion-color-warning);
}

/* Activity Card */
.activity-card {
  margin: 0 0 24px;
  border-radius: var(--card-border-radius);
  box-shadow: var(--card-box-shadow);
  overflow: hidden;
}

.activity-card ion-card-header {
  padding: 16px;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.7);
}

.activity-card ion-card-title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.activity-card ion-card-title ion-icon {
  margin-right: 8px;
  font-size: var(--icon-size-medium);
  color: var(--ion-color-primary);
}

.activity-details {
  padding: 0;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.7);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-label {
  display: flex;
  align-items: center;
}

.activity-label ion-icon {
  margin-right: 8px;
  font-size: var(--icon-size-small);
}

.activity-label span {
  font-size: 14px;
  color: var(--ion-color-medium);
  font-weight: 500;
}

.activity-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.activity-time {
  padding: 12px 0 0;
  display: flex;
  justify-content: center;
}

.time-elapsed {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 100px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  color: var(--ion-color-primary);
  font-weight: 600;
}

.time-elapsed ion-icon {
  margin-right: 8px;
  font-size: var(--icon-size-small);
}

.status-chip {
  height: 28px;
  font-size: 12px;
  border-radius: 100px;
  font-weight: 600;
}

/* Shifts Card */
.shifts-card {
  margin: 0 0 24px;
  border-radius: var(--card-border-radius);
  box-shadow: var(--card-box-shadow);
}

.shifts-card ion-card-header {
  padding: 16px;
  border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.7);
}

.shifts-card ion-card-title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.shifts-card ion-card-title ion-icon {
  margin-right: 8px;
  font-size: var(--icon-size-medium);
  color: var(--ion-color-primary);
}

.shift-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 0;
  --background: transparent;
}

.shift-content {
  flex: 1;
  padding: 12px 0;
}

.shift-info h4 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.shift-time {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0 0 4px;
}

.shift-time ion-icon {
  margin-right: 6px;
  font-size: var(--icon-size-small);
}

.completed-text {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--ion-color-success);
  margin: 4px 0 0;
}

.completed-text ion-icon {
  margin-right: 6px;
  font-size: var(--icon-size-small);
}

.extra-shift-item {
  border-top: 1px dashed rgba(var(--ion-color-medium-rgb), 0.3);
  margin-top: 8px;
  padding-top: 8px;
}

/* Message Cards */
.message-card {
  margin: 0 0 24px;
  border-radius: var(--card-border-radius);
  box-shadow: var(--card-box-shadow);
}

.message-content {
  display: flex;
  align-items: center;
  padding: 8px;
}

.message-content ion-icon {
  font-size: var(--icon-size-large);
  margin-right: 16px;
}

.message-text h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.message-text p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--ion-color-medium);
}

.closed-card {
  border-left: 4px solid var(--ion-color-danger);
}

.closed-card ion-icon {
  color: var(--ion-color-danger);
}

.absence-card {
  border-left: 4px solid var(--ion-color-warning);
}

.absence-card ion-icon {
  color: var(--ion-color-warning);
}

/* Action Buttons */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.badge-button, .break-button {
  margin: 0;
  height: 56px;
  --border-radius: 28px;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.5px;
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-content ion-icon {
  margin-right: 8px;
  font-size: var(--icon-size-medium);
}

.check-in {
  --background: var(--success-gradient);
}

.check-out {
  --background: var(--danger-gradient);
}

.start-break {
  --background: var(--warning-gradient);
}

.end-break {
  --background: #f8b133;
}

/* Login Card */
.login-card {
  margin: 0;
  border-radius: var(--card-border-radius);
  box-shadow: var(--card-box-shadow);
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  text-align: center;
}

.login-content ion-icon {
  font-size: 48px;
  color: var(--ion-color-primary);
  margin-bottom: 16px;
}

.login-content h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}

.login-content p {
  margin: 0 0 24px;
  font-size: 16px;
  color: var(--ion-color-medium);
}

.login-content ion-button {
  --border-radius: 28px;
  height: 56px;
  font-weight: 600;
  font-size: 16px;
}

/* Spin animation for refresh icon

    /* --- Utility --- */
    /* Spin animation for refresh icon */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin-icon {
      animation: spin 1.5s linear infinite;
    }

    .transparent-list {
       background: transparent;
       --ion-item-background: transparent;
    }`]
})
export class GeoBadgePage implements OnInit, OnDestroy {
  getElapsedTime(arg0: Date) {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - new Date(arg0).getTime()) / 1000); // in seconds
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  getCurrentDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  getGreeting() {
    return 'Hello, Pret a Travailler !'; // Placeholder for greeting logic
  }
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
  // In your GeoBadgePage class
  isSelectedShiftCompleted(): boolean {
    if (this.currentBadgedShift) return false; // Not applicable if already checked in

    const selectedId = this.shiftSelectionForm.get('selectedShiftId')?.value;
    if (!selectedId) return false;

    if (selectedId === 'extra') {
      return this.extraShiftCompletedToday === true;
    } else {
      const selectedShift = this.availableShifts.find(s => s.id === selectedId);
      return selectedShift?.completed === true;
    }
  }
}
