import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingController, ToastController } from '@ionic/angular/standalone';
import { Subscription, Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { catchError, finalize, switchMap, tap, first, filter } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);
// --- Services ---
import { AuthService } from '../../services/auth.service';
import { UsersService, Employee } from '../../services/users.service';
import { OvertimeCalculationService, OvertimeStats } from 'src/app/services/overtime.service';

// --- Icons ---
import { addIcons } from 'ionicons';
import {
  calendarOutline, personOutline, timeOutline, statsChartOutline,
  filterOutline, refreshOutline, alertCircleOutline, documentTextOutline,
  chevronDown, searchOutline, gridOutline, optionsOutline,
  downloadOutline, arrowForwardOutline, hourglassOutline
} from 'ionicons/icons';

addIcons({
  calendarOutline, personOutline, timeOutline, statsChartOutline, filterOutline,
  refreshOutline, alertCircleOutline, documentTextOutline, chevronDown, searchOutline,
  gridOutline, optionsOutline, downloadOutline, arrowForwardOutline, hourglassOutline
});

import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonAvatar, IonCard, IonCardContent,
  IonSpinner, IonBackButton, IonDatetime, IonBadge, IonButtons, IonText,
  IonItem, IonButton, IonRadioGroup, IonRadio, IonList, IonLabel, IonCardTitle,
  IonInput, IonSelectOption, IonSelect, IonCardSubtitle, IonIcon, IonCardHeader,
  IonSearchbar, IonChip, IonSegment, IonSegmentButton, IonRow, IonCol, IonGrid,
  IonSkeletonText, IonFab, IonFabButton, IonItemDivider, IonNote, IonPopover,
  IonToggle, IonAccordion, IonAccordionGroup
} from '@ionic/angular/standalone';
import { TardinessService, TardinessStats } from 'src/app/services/my-TARDINESS.service';

@Component({
  selector: 'app-admin-overtime-stats',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonText, IonBadge,
    IonAvatar, IonDatetime, IonCard, IonCardContent, IonSpinner, IonCardSubtitle,
    IonBackButton, IonButtons, IonItem, IonButton, IonRadioGroup, IonRadio,
    IonList, IonSelectOption, IonSelect, IonLabel, IonCardTitle, IonInput,
    IonIcon, IonCardHeader, IonSearchbar, IonChip, IonSegment, IonSegmentButton,
    IonRow, IonCol, IonGrid, IonSkeletonText, IonFab, IonFabButton, IonItemDivider,
    IonNote, IonPopover, IonToggle, IonAccordion, IonAccordionGroup,
  ],
  template: `
    <ion-header class="ion-no-border">
    <ion-toolbar color="light">
  <ion-segment [(ngModel)]="activeSegment" (ionChange)="onSegmentChange()" mode="ios">
    <ion-segment-button value="overtime">
      <ion-icon name="stats-chart-outline"></ion-icon>
      <ion-label>Overtime</ion-label>
    </ion-segment-button>
    <ion-segment-button value="tardiness">
      <ion-icon name="time-outline"></ion-icon>
      <ion-label>Tardiness</ion-label>
    </ion-segment-button>
  </ion-segment>
</ion-toolbar>
      <!-- Secondary toolbar for filter chips -->
      <ion-toolbar color="light" class="filters-toolbar">
        <div class="ion-padding-horizontal filter-chips-container">
          <!-- Time period chip -->
          <ion-chip
            [color]="selectedTimeframe === 'custom' ? 'tertiary' : 'primary'"
            outline="true"
            (click)="openTimeframePopover = true"
            #timeframePopoverTrigger>
            <ion-icon name="calendar-outline"></ion-icon>
            <ion-label>{{ getTimeframeLabel() }}</ion-label>
          </ion-chip>

          <!-- Employee chip -->
          <ion-chip
            [color]="selectedEmployeeId !== 'all' ? 'tertiary' : 'primary'"
            outline="true"
            (click)="openEmployeeSelect = true"
            #employeePopoverTrigger>
            <ion-icon name="person-outline"></ion-icon>
            <ion-label>{{ getEmployeeLabel() }}</ion-label>
          </ion-chip>
        </div>
      </ion-toolbar>

      <!-- Popovers -->
      <ion-popover
        [isOpen]="openTimeframePopover"
        (didDismiss)="openTimeframePopover = false"
        trigger="timeframePopoverTrigger"
        side="bottom"
        alignment="start">
        <ng-template>
          <ion-list lines="full">
            <ion-item button detail="false" (click)="selectTimeframe('week'); openTimeframePopover = false">
              <ion-icon name="calendar-outline" slot="start" color="primary"></ion-icon>
              <ion-label>Current Week</ion-label>
              <ion-icon *ngIf="selectedTimeframe === 'week'" name="checkmark" slot="end" color="success"></ion-icon>
            </ion-item>
            <ion-item button detail="false" (click)="selectTimeframe('month'); openTimeframePopover = false">
              <ion-icon name="calendar-outline" slot="start" color="primary"></ion-icon>
              <ion-label>Current Month</ion-label>
              <ion-icon *ngIf="selectedTimeframe === 'month'" name="checkmark" slot="end" color="success"></ion-icon>
            </ion-item>
            <ion-item button detail="false" (click)="selectTimeframe('lastWeek'); openTimeframePopover = false">
              <ion-icon name="time-outline" slot="start" color="primary"></ion-icon>
              <ion-label>Last Week</ion-label>
              <ion-icon *ngIf="selectedTimeframe === 'lastWeek'" name="checkmark" slot="end" color="success"></ion-icon>
            </ion-item>
            <ion-item button detail="false" (click)="selectTimeframe('lastMonth'); openTimeframePopover = false">
              <ion-icon name="time-outline" slot="start" color="primary"></ion-icon>
              <ion-label>Last Month</ion-label>
              <ion-icon *ngIf="selectedTimeframe === 'lastMonth'" name="checkmark" slot="end" color="success"></ion-icon>
            </ion-item>
            <ion-item button detail="false" (click)="selectTimeframe('custom'); openTimeframePopover = false">
              <ion-icon name="options-outline" slot="start" color="tertiary"></ion-icon>
              <ion-label>Custom Range</ion-label>
              <ion-icon *ngIf="selectedTimeframe === 'custom'" name="checkmark" slot="end" color="success"></ion-icon>
            </ion-item>
          </ion-list>
        </ng-template>
      </ion-popover>

      <ion-popover
        [isOpen]="openEmployeeSelect"
        (didDismiss)="openEmployeeSelect = false"
        trigger="employeePopoverTrigger"
        side="bottom"
        alignment="start">
        <ng-template>
          <ion-list lines="full">
            <ion-searchbar placeholder="Search employees"
              [(ngModel)]="employeeSearchTerm"
              [debounce]="300">
            </ion-searchbar>
            <div *ngIf="loadingEmployees" class="ion-text-center ion-padding">
              <ion-spinner name="dots"></ion-spinner>
              <ion-text color="medium">Loading employees...</ion-text>
            </div>
            <div class="employee-select-list">
              <ion-item button detail="false" (click)="selectEmployee('all'); openEmployeeSelect = false">
                <ion-avatar slot="start">
                  <ion-icon name="people-outline" color="primary" size="large"></ion-icon>
                </ion-avatar>
                <ion-label>All Employees</ion-label>
                <ion-icon *ngIf="selectedEmployeeId === 'all'" name="checkmark" slot="end" color="success"></ion-icon>
              </ion-item>
              <ng-container *ngFor="let emp of getFilteredEmployees()">
                <ion-item button detail="false" (click)="selectEmployee(emp.id); openEmployeeSelect = false">
                  <ion-avatar slot="start">
                    <div *ngIf="!emp.profilePicture" class="avatar-placeholder">{{ getInitials(emp.name) }}</div>
                    <img *ngIf="emp.profilePicture" [src]="emp.profilePicture" alt="{{ emp.name }}">
                  </ion-avatar>
                  <ion-label>{{ emp.name }}</ion-label>
                  <ion-note color="medium" slot="end" *ngIf="emp.role">{{ emp.role }}</ion-note>
                  <ion-icon *ngIf="selectedEmployeeId === emp.id" name="checkmark" slot="end" color="success"></ion-icon>
                </ion-item>
              </ng-container>
            </div>
          </ion-list>
        </ng-template>
      </ion-popover>
    </ion-header>

    <ion-content>
      <!-- Custom Date Range Panel (only visible when custom is selected) -->
      <ion-card *ngIf="selectedTimeframe === 'custom'" class="custom-date-card">
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6">
                <ion-item>
                  <ion-label position="stacked">Start Date</ion-label>
                  <ion-input>
                    <ion-datetime
                        presentation="date"
                        [(ngModel)]="customStartDate"
                        (ionChange)="onFilterChange()"
                        [max]="customEndDate || todayIsoString"
                        [showDefaultButtons]="true">
                    </ion-datetime>
                  </ion-input>
                </ion-item>
              </ion-col>
              <ion-col size="6">
                <ion-item>
                  <ion-label position="stacked">End Date</ion-label>
                  <ion-input>
                    <ion-datetime
                        presentation="date"
                        [(ngModel)]="customEndDate"
                        (ionChange)="onFilterChange()"
                        [min]="customStartDate"
                        [max]="todayIsoString"
                        [showDefaultButtons]="true">
                    </ion-datetime>
                  </ion-input>
                </ion-item>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Week/Month Picker (when not custom) -->
      <ion-card *ngIf="selectedTimeframe === 'week' || selectedTimeframe === 'lastWeek'" class="date-picker-card">
        <ion-card-content>
          <ion-item lines="none">
            <ion-label position="stacked">Select Week</ion-label>
            <ion-input>
              <ion-datetime
                  presentation="date"
                  [(ngModel)]="selectedDate"
                  (ionChange)="onFilterChange()"
                  [showDefaultButtons]="true"
                  [firstDayOfWeek]="1"
                  [max]="todayIsoString">
              </ion-datetime>
            </ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <ion-card *ngIf="selectedTimeframe === 'month' || selectedTimeframe === 'lastMonth'" class="date-picker-card">
        <ion-card-content>
          <ion-item lines="none">
            <ion-label position="stacked">Select Month</ion-label>
            <ion-input>
              <ion-datetime
                  presentation="month-year"
                  [(ngModel)]="selectedDate"
                  (ionChange)="onFilterChange()"
                  [max]="todayIsoString"
                  [showDefaultButtons]="true">
              </ion-datetime>
            </ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Summary Card -->
      <ion-card *ngIf="stats$ | async as stats" class="summary-card">
        <ion-card-header>
          <ion-card-subtitle>
            <ion-icon name="calendar-outline" size="small"></ion-icon>
            {{ getPeriodDisplay() }}
          </ion-card-subtitle>
          <ion-card-title>Overtime Summary</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="3" class="summary-col">
                <div class="summary-value">{{ stats.length }}</div>
                <div class="summary-label">Employees</div>
              </ion-col>
              <ion-col size="3" class="summary-col">
                <div class="summary-value">{{ getContractHours(stats) | number:'1.1-1' }}h</div>
                <div class="summary-label">Contract Hours</div>
              </ion-col>
              <ion-col size="3" class="summary-col">
                <div class="summary-value">{{ getTotalWorkedHours(stats) | number:'1.1-1' }}h</div>
                <div class="summary-label">Hours Worked</div>
              </ion-col>
              <ion-col size="3" class="summary-col">
                <div class="summary-value highlight">{{ getTotalOvertime(stats) | number:'1.1-1' }}h</div>
                <div class="summary-label">Total Overtime</div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- Loading Indicator -->
      <div *ngIf=" !(stats$ | async)" class="loading-container ion-text-center ion-padding">
        <ion-spinner name="circular" color="primary"></ion-spinner>
        <p>Calculating overtime statistics...</p>
      </div>
      <ion-card *ngIf="stats$ | async as stats" class="chart-card">
  <ion-card-header>
    <ion-card-title>
      <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
      Overtime by Day of Week
    </ion-card-title>
  </ion-card-header>
  <ion-card-content>
    <!-- Daily Overtime Summary Chart -->
    <canvas #dailyOvertimeChart></canvas>
  </ion-card-content>
</ion-card>
      <!-- Error Message -->
      <ion-card *ngIf=" errorLoading" class="error-card">
        <ion-card-content class="ion-text-center">
          <ion-icon name="alert-circle-outline" color="danger" size="large"></ion-icon>
          <p>{{ errorLoading }}</p>
          <ion-button fill="outline" size="small" (click)="triggerCalculation()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Retry
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Results Section -->
      <div *ngIf=" !errorLoading" class="results-container">
      <div *ngIf="selectedEmployeeId !== 'all' && (stats$ | async) as stats" class="single-employee-details">
  <ion-card *ngIf="stats.length === 1">
    <ion-card-header>
      <ion-card-title>
        <ion-icon name="calendar-outline" slot="start"></ion-icon>
        Daily Breakdown for {{ stats[0].employeeName }}
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <ion-list lines="full">
        <ion-item *ngFor="let day of weekDays" class="day-breakdown-item">
          <ion-label>
            <h2>{{ day }}</h2>
            <div class="day-details-grid" *ngIf="stats[0]?.dailyBreakdown?.[day]?.length">
              <div *ngFor="let detail of stats[0]?.dailyBreakdown?.[day]" class="day-detail-entry">
                <div class="date-label">{{ detail.date | date:'MMM d' }}</div>
                <div class="hours-grid">
                  <div class="hours-item">
                    <span class="label">Scheduled</span>
                    <span class="value">{{ detail.scheduled | number:'1.1-1' }}h</span>
                  </div>
                  <div class="hours-item">
                    <span class="label">Worked</span>
                    <span class="value">{{ detail.worked | number:'1.1-1' }}h</span>
                  </div>
                  <div class="hours-item">
                    <span class="label">Overtime</span>
                    <span class="value" [ngClass]="{'highlight': detail.overtime > 0}">
                      <ion-badge [color]="getOvertimeBadgeColor(detail.overtime)">
                        {{ detail.overtime | number:'1.1-1' }}h
                      </ion-badge>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p *ngIf="!stats[0]?.dailyBreakdown?.[day]?.length" class="no-data-message">
              No shifts on this day during the selected period.
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-card-content>
  </ion-card>
</div>
<div *ngIf="activeSegment === 'tardiness' && (tardinessStats$ | async) as tardiness">
  <ion-card class="tardiness-summary-card">
    <ion-card-header>
      <ion-card-subtitle>
        <ion-icon name="time-outline" size="small"></ion-icon>
        {{ getPeriodDisplay() }}
      </ion-card-subtitle>
      <ion-card-title>Tardiness Summary</ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <ion-grid>
        <ion-row>
          <ion-col size="6" class="summary-col">
            <div class="summary-value">{{ getTotalLateArrivals(tardiness) }}</div>
            <div class="summary-label">Late Arrivals</div>
          </ion-col>
          <ion-col size="6" class="summary-col">
            <div class="summary-value">{{ getTotalUnauthorizedAbsences(tardiness) }}</div>
            <div class="summary-label">Unauthorized Absences</div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-card-content>
  </ion-card>

  <!-- Tardiness Results Table -->
  <ion-card *ngIf="tardiness.length > 0" class="tardiness-results-card">
    <ion-card-header>
      <ion-card-title>
        <ion-icon name="alert-circle-outline" slot="start"></ion-icon>
        Tardiness & Absence Details
      </ion-card-title>
    </ion-card-header>

    <ion-segment [(ngModel)]="tardinessViewMode" mode="ios" class="view-mode-segment">
      <ion-segment-button value="lateArrivals">
        <ion-icon name="time-outline"></ion-icon>
        <ion-label>Late Arrivals</ion-label>
      </ion-segment-button>
      <ion-segment-button value="absences">
        <ion-icon name="close-circle-outline"></ion-icon>
        <ion-label>Absences</ion-label>
      </ion-segment-button>
    </ion-segment>

    <!-- Late Arrivals View -->
    <div *ngIf="tardinessViewMode === 'lateArrivals'">
      <ion-list lines="full">
        <ion-item lines="full" class="list-header">
          <ion-grid class="header-grid">
            <ion-row>
              <ion-col size="4">
                <ion-label>Employee</ion-label>
              </ion-col>
              <ion-col size="3">
                <ion-label>Date</ion-label>
              </ion-col>
              <ion-col size="2">
                <ion-label>Scheduled</ion-label>
              </ion-col>
              <ion-col size="3" class="ion-text-end">
                <ion-label>Minutes Late</ion-label>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-item>

        <ng-container *ngFor="let stat of tardiness">
          <ng-container *ngFor="let late of stat.lateArrivals.details">
            <ion-item class="tardiness-item">
              <ion-grid>
                <ion-row>
                  <ion-col size="4">
                    {{ stat.employeeName }}
                  </ion-col>
                  <ion-col size="3">
                    {{ late.date | date:'MMM d' }}
                  </ion-col>
                  <ion-col size="2">
                    {{ late.scheduledStart }}
                  </ion-col>
                  <ion-col size="3" class="ion-text-end">
                    <ion-badge [color]="getLateBadgeColor(late.minutesLate)">
                      {{ late.minutesLate }} min
                    </ion-badge>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-item>
          </ng-container>
        </ng-container>

        <ion-item *ngIf="!getTotalLateArrivals(tardiness)" lines="none" class="no-records-item">
          <ion-label class="ion-text-center">
            No late arrivals recorded in this period.
          </ion-label>
        </ion-item>
      </ion-list>
    </div>

    <!-- Absences View -->
    <div *ngIf="tardinessViewMode === 'absences'">
      <ion-list lines="full">
        <ion-item lines="full" class="list-header">
          <ion-grid class="header-grid">
            <ion-row>
              <ion-col size="4">
                <ion-label>Employee</ion-label>
              </ion-col>
              <ion-col size="3">
                <ion-label>Date</ion-label>
              </ion-col>
              <ion-col size="5">
                <ion-label>Missed Shift</ion-label>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-item>

        <ng-container *ngFor="let stat of tardiness">
          <ng-container *ngFor="let absence of stat.unauthorizedAbsences.details">
            <ion-item class="tardiness-item">
              <ion-grid>
                <ion-row>
                  <ion-col size="4">
                    {{ stat.employeeName }}
                  </ion-col>
                  <ion-col size="3">
                    {{ absence.date | date:'MMM d' }}
                  </ion-col>
                  <ion-col size="5">
                    {{ absence.scheduledShift }}
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-item>
          </ng-container>
        </ng-container>

        <ion-item *ngIf="!getTotalUnauthorizedAbsences(tardiness)" lines="none" class="no-records-item">
          <ion-label class="ion-text-center">
            No unauthorized absences recorded in this period.
          </ion-label>
        </ion-item>
      </ion-list>
    </div>
  </ion-card>
</div>
        <ng-container *ngIf="stats$ | async as stats; else noData">
          <ion-card *ngIf="stats.length > 0" class="results-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="stats-chart-outline" slot="start"></ion-icon>
                Overtime Results
              </ion-card-title>
            </ion-card-header>

            <!-- Segmented View Option -->
            <ion-segment [(ngModel)]="viewMode" mode="ios" class="view-mode-segment">
              <ion-segment-button value="list">
                <ion-icon name="list-outline"></ion-icon>
                <ion-label>List</ion-label>
              </ion-segment-button>
              <ion-segment-button value="cards">
                <ion-icon name="grid-outline"></ion-icon>
                <ion-label>Cards</ion-label>
              </ion-segment-button>
            </ion-segment>

            <!-- List View -->
            <ion-list *ngIf="viewMode === 'list'" lines="full">
              <!-- Table Header -->
              <ion-item lines="full" class="list-header">
                <ion-grid class="header-grid">
                  <ion-row>
                    <ion-col size="5">
                      <ion-label class="col-employee">Employee</ion-label>
                    </ion-col>
                    <ion-col size="2" class="ion-text-center">
                      <ion-label class="col-hours">Contract</ion-label>
                    </ion-col>
                    <ion-col size="2" class="ion-text-center">
                      <ion-label class="col-hours">Worked</ion-label>
                    </ion-col>
                    <ion-col size="3" class="ion-text-end">
                      <ion-label class="col-hours overtime-header">Overtime</ion-label>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-item>

              <!-- Results Rows -->
              <ion-item *ngFor="let stat of stats; trackBy: trackByEmployeeId" class="stat-item" button detail="false">
                <ion-grid class="results-grid">
                  <ion-row>
                    <ion-col size="5">
                      <div class="employee-col">
                        <ion-avatar class="list-avatar" *ngIf="getEmployeeById(stat.employeeId) as emp">
                          <div *ngIf="!emp.profilePicture" class="avatar-placeholder small">
                            {{ getInitials(stat.employeeName) }}
                          </div>
                          <img *ngIf="emp.profilePicture" [src]="emp.profilePicture" alt="{{ stat.employeeName }}">
                        </ion-avatar>
                        <div class="employee-info">
                          <strong>{{ stat.employeeName }}</strong>
                          <small class="employee-id">ID: {{ stat.employeeId }}</small>
                        </div>
                      </div>
                    </ion-col>
                    <ion-col size="2" class="ion-text-center">
                      <span class="col-hours">{{ stat.contractedHours | number:'1.1-1' }}h</span>
                    </ion-col>
                    <ion-col size="2" class="ion-text-center">
                      <span class="col-hours">{{ stat.workedHours | number:'1.1-1' }}h</span>
                    </ion-col>
                    <ion-col size="3" class="ion-text-end">
                      <ion-badge [color]="getOvertimeBadgeColor(stat.overtimeHours)" class="overtime-badge">
                        {{ stat.overtimeHours | number:'1.1-1' }}h
                      </ion-badge>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </ion-item>
            </ion-list>

            <!-- Card View -->
            <ion-grid *ngIf="viewMode === 'cards'" class="cards-grid">
              <ion-row>
                <ion-col size="12" sizeMd="6" sizeLg="4" *ngFor="let stat of stats; trackBy: trackByEmployeeId">
                  <ion-card class="employee-card">
                    <ion-card-header>
                      <div class="employee-card-header">
                        <ion-avatar class="card-avatar" *ngIf="getEmployeeById(stat.employeeId) as emp">
                          <div *ngIf="!emp.profilePicture" class="avatar-placeholder">
                            {{ getInitials(stat.employeeName) }}
                          </div>
                          <img *ngIf="emp.profilePicture" [src]="emp.profilePicture" alt="{{ stat.employeeName }}">
                        </ion-avatar>
                        <div>
                          <ion-card-title>{{ stat.employeeName }}</ion-card-title>
                          <ion-card-subtitle>ID: {{ stat.employeeId }}</ion-card-subtitle>
                        </div>
                      </div>
                    </ion-card-header>
                    <ion-card-content>
                      <div class="stats-grid">
                        <div class="stats-item">
                          <div class="stats-value">{{ stat.contractedHours | number:'1.1-1' }}h</div>
                          <div class="stats-label">Contracted</div>
                        </div>
                        <div class="stats-item">
                          <div class="stats-value">{{ stat.workedHours | number:'1.1-1' }}h</div>
                          <div class="stats-label">Worked</div>
                        </div>
                        <div class="stats-item">
                          <div class="stats-value highlight">
                            <ion-badge [color]="getOvertimeBadgeColor(stat.overtimeHours)" class="card-overtime-badge">
                              {{ stat.overtimeHours | number:'1.1-1' }}h
                            </ion-badge>
                          </div>
                          <div class="stats-label">Overtime</div>
                        </div>
                      </div>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              </ion-row>
            </ion-grid>

          </ion-card>
        </ng-container>

        <!-- No Data Template -->
        <ng-template #noData>
          <div *ngIf="!isLoading && !errorLoading" class="no-data-message ion-text-center ion-padding">
            <ion-icon name="hourglass-outline" size="large" color="medium"></ion-icon>
            <h4>No Overtime Data</h4>
            <p>No overtime data found for the selected criteria.</p>
            <ion-button fill="outline" size="small" (click)="resetFilters()">
              Reset Filters
            </ion-button>
          </div>
        </ng-template>
      </div>
    </ion-content>
  `,
  styles: [`
    /* Header styling */
    ion-header ion-toolbar:first-of-type {
      padding-top: var(--ion-safe-area-top, 0);
    }

    .filters-toolbar {
      --min-height: 56px;
    }

    .filter-chips-container {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-top: 8px;
      padding-bottom: 8px;
      scrollbar-width: none; /* Firefox */
    }

    .filter-chips-container::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }

    ion-chip {
      --background: var(--ion-color-light);
      font-weight: 500;
      cursor: pointer;
    }

    /* Card styling */
    ion-card {
      margin: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      overflow: hidden;
    }

    .custom-date-card, .date-picker-card {
      margin-bottom: 8px;
    }

    .summary-card {
      background: linear-gradient(to right, var(--ion-color-primary-tint), var(--ion-color-primary));
      color: white;
    }

    .summary-card ion-card-header {
      padding-bottom: 0;
    }

    .summary-card ion-card-title,
    .summary-card ion-card-subtitle,
    .summary-card ion-icon {
      color: white;
    }

    .summary-col {
      text-align: center;
      padding: 12px 0;
    }

    .summary-value {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .summary-label {
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .highlight {
      color: var(--ion-color-warning);
    }

    /* Employee Selection */
    .employee-select-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background-color: var(--ion-color-primary-tint);
      color: white;
      font-weight: bold;
      border-radius: 50%;
    }

    .avatar-placeholder.small {
      font-size: 0.8rem;
    }

    /* Results Styling */
    .results-container {
      padding-bottom: 20px;
    }

    .view-mode-segment {
      margin: 0 16px;
      --background: var(--ion-color-light);
    }

    .list-header {
      --background: var(--ion-color-light);
      font-weight: 600;
      font-size: 0.8rem;
      color: var(--ion-color-medium-shade);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      --min-height: 40px;
      padding-top: 4px;
      padding-bottom: 4px;
    }

    .header-grid, .results-grid {
      width: 100%;
      padding: 0;
    }

    .stat-item {
      --padding-start: 0;
      --inner-padding-end: 0;
    }

    .employee-col {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .list-avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
    }

    .employee-info {
      display: flex;
      flex-direction: column;
    }

    .employee-id {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    .overtime-badge {
      padding: 6px 10px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .overtime-header {
      font-weight: 700;
      color: var(--ion-color-warning-shade);
    }

    /* Card View */
    .cards-grid {
      padding: 8px;
    }

    .employee-card {
      margin: 8px;
      height: 100%;
    }

    .employee-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .card-avatar {
      width: 48px;
      height: 48px;
    }

    .stats-grid {
      display: flex;
      justify-content: space-between;
      text-align: center;
      margin-top: 16px;
    }

    .stats-item {
      flex: 1;
    }

    .stats-value {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .stats-label {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }

    .card-overtime-badge {
      padding: 6px 10px;
      border-radius: 16px;
      font-weight: normal;
      font-size: 1rem;
    }

    /* Loading States */
    .loading-container {
      margin: 48px 0;
      color: var(--ion-color-medium);
    }

    .loading-container ion-spinner {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    /* Error and No Data States */
    .error-card, .no-data-message {
      text-align: center;
      color: var(--ion-color-medium);
      margin: 48px 16px;
    }

    .error-card ion-icon, .no-data-message ion-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .no-data-message h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .no-data-message p {
      margin-bottom: 16px;
    }
  `]
})
export class AdminOvertimeStatsPage implements OnInit, OnDestroy {

  @ViewChild('dailyOvertimeChart') dailyOvertimeChartCanvas: ElementRef | undefined;
  activeSegment: 'overtime' | 'tardiness' = 'overtime';
  weekDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  tardinessStats$: Observable<TardinessStats[]> = of([]);
  tardinessViewMode: 'lateArrivals' | 'absences' = 'lateArrivals';
  private dailyOvertimeChart: Chart | undefined;

  // --- State ---
  employees: Employee[] = [];
  selectedEmployeeId: string = 'all'; // Default to all employees
  selectedTimeframe: 'week' | 'month' | 'lastWeek' | 'lastMonth' | 'custom' = 'week';
  selectedDate: string = new Date().toISOString(); // For week/month picker, defaults to today
  customStartDate: string = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(); // Default custom start: 1st of month
  customEndDate: string = new Date().toISOString(); // Default custom end: today
  todayIsoString = new Date().toISOString(); // For max date on pickers

  // UI state variables
  viewMode: 'list' | 'cards' = 'list';
  openTimeframePopover: boolean = false;
  openEmployeeSelect: boolean = false;
  employeeSearchTerm: string = '';

  stats$: Observable<OvertimeStats[]> = of([]); // Observable for results
  isLoading: boolean = false;
  errorLoading: string | null = null;
  loadingEmployees: boolean = false;
  errorLoadingEmployees: boolean = false;

  private subscriptions = new Subscription();
  private calculationTrigger = new BehaviorSubject<void>(undefined);
  // --- Injected Services ---
  private tardinessService = inject(TardinessService);

  private authService = inject(AuthService);
  private usersService = inject(UsersService);
  private overtimeService = inject(OvertimeCalculationService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }
  ngAfterViewInit() {
    // Initialize charts when view is ready
    this.initializeCharts();
  }
  onSegmentChange() {
    console.log(`Segment changed to: ${this.activeSegment}`);

    // Trigger calculation for the selected segment
    if (this.activeSegment === 'overtime') {
      this.triggerCalculation();
    } else {
      // Trigger tardiness calculation
      this.calculationTrigger.next();
    }

    // Update the charts after a short delay to ensure the view is ready
    setTimeout(() => {
      if (this.activeSegment === 'overtime' && this.dailyOvertimeChartCanvas) {
        this.stats$.pipe(first()).subscribe(stats => {
          this.updateDailyOvertimeChart(stats);
        });
      }
    }, 100);
  }

  setupTardinessStream() {
    this.tardinessStats$ = this.calculationTrigger.pipe(
      tap(() => {
        this.isLoading = true;
        this.errorLoading = null;
        this.cdr.detectChanges();
      }),
      switchMap(() => {
        const { start, end } = this.getSelectedDateRange();
        if (!start || !end) {
          console.warn("Invalid date range selected for tardiness.");
          this.isLoading = false;
          this.errorLoading = "Invalid date range selected.";
          this.cdr.detectChanges();
          return of([]);
        }
        return this.tardinessService.getTardinessStats(start, end, this.selectedEmployeeId);
      }),
      tap(stats => {
        console.log("Tardiness Stats Received:", stats);
      }),
      catchError(err => {
        console.error("Error in tardiness stream:", err);
        this.errorLoading = "Failed to calculate tardiness statistics.";
        this.showToast(this.errorLoading, 'danger');
        this.isLoading = false;
        this.cdr.detectChanges();
        return of([]);
      }),
      finalize(() => {
        if (this.isLoading) {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      })
    );

    const tardinessSub = this.tardinessStats$.subscribe();
    this.subscriptions.add(tardinessSub);
  }

  // Initialize charts
  initializeCharts() {
    // Wait for view to initialize and stats to be available
    const combinedSub = combineLatest([
      this.stats$,
      of(this.dailyOvertimeChartCanvas?.nativeElement) // Once the view is ready
    ]).pipe(
      filter(([stats, canvas]) => !!stats && !!canvas),
      tap(([stats, canvas]) => {
        this.updateDailyOvertimeChart(stats);
      })
    ).subscribe();

    this.subscriptions.add(combinedSub);
  }
  updateDailyOvertimeChart(stats: OvertimeStats[]) {
    if (!this.dailyOvertimeChartCanvas) return;

    // Destroy previous chart instance if it exists
    if (this.dailyOvertimeChart) {
      this.dailyOvertimeChart.destroy();
    }

    // Process data for the chart
    const dailyData = this.calculateDailyOvertimeTotals(stats);

    // Chart configuration
    const chartConfig: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.weekDays,
        datasets: [
          {
            label: 'Total Overtime Hours',
            data: this.weekDays.map(day => dailyData[day] || 0),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Overtime Hours'
            }
          }
        }
      }
    };

    // Create the chart
    this.dailyOvertimeChart = new Chart(
      this.dailyOvertimeChartCanvas.nativeElement,
      chartConfig
    );
  }
  calculateDailyOvertimeTotals(stats: OvertimeStats[]): Record<string, number> {
    // Initialize with zero values for each day
    const dailyTotals: Record<string, number> = {};
    this.weekDays.forEach(day => dailyTotals[day] = 0);

    // Aggregate overtime by day of week
    stats.forEach(stat => {
      if (stat.dailyBreakdown) {
        this.weekDays.forEach(day => {
          const dayData = (stat.dailyBreakdown ?? {})[day] || [];
          dayData.forEach(entry => {
            dailyTotals[day] += entry.overtime || 0;
          });
        });
      }
    });

    return dailyTotals;
  }

  ngOnInit() {
    console.log("AdminOvertimeStatsPage: OnInit");
    this.setDefaultDates();
    this.loadInitialData();
    this.setupCalculationStream();
    this.setupTardinessStream(); // Added this call to initialize tardiness data

    // Listen for segment changes to update the view
    this.onSegmentChange();
  }

  ngOnDestroy() {
    console.log("AdminOvertimeStatsPage: OnDestroy");
    this.subscriptions.unsubscribe();
  }

  /** Load initial data like the employee list */
  async loadInitialData() {
    const userSub = this.authService.userMetadata$.subscribe(user => {
      if (user?.businessId) {
        this.loadEmployees();
      } else {
        this.employees = [];
        this.stats$ = of([]);
        this.errorLoadingEmployees = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.add(userSub);
  }

  /** Fetch employees for the current business */
  /** Fetch employees for the current business */
  async loadEmployees() {
    this.loadingEmployees = true;
    this.errorLoadingEmployees = false;
    this.cdr.detectChanges();

    try {
      // The issue is here - you're using await with subscribe which isn't correct
      // Change from:
      // await this.usersService.getAllUsers().subscribe(...)
      // To:
      this.usersService.getAllUsers().subscribe(
        (employees: Employee[]) => {
          this.employees = employees;
          this.errorLoadingEmployees = false;
          this.loadingEmployees = false;
          this.cdr.detectChanges();
        },
        (error) => {
          console.error("Error loading employees for filter:", error);
          this.errorLoadingEmployees = true;
          this.showToast("Could not load employee list.", "danger");
          this.loadingEmployees = false;
          this.cdr.detectChanges();
        }
      );
    } catch (error) {
      console.error("Error loading employees for filter:", error);
      this.errorLoadingEmployees = true;
      this.showToast("Could not load employee list.", "danger");
      this.loadingEmployees = false;
      this.cdr.detectChanges();
    }
  }
  /** Set up the observable stream for stats calculation */
  setupCalculationStream() {
    this.stats$ = this.calculationTrigger.pipe(
      tap(() => {
        this.isLoading = true;
        this.errorLoading = null;
        this.cdr.detectChanges();
      }),
      switchMap(() => {
        const { start, end } = this.getSelectedDateRange();
        if (!start || !end) {
          console.warn("Invalid date range selected.");
          this.isLoading = false;
          this.errorLoading = "Invalid date range selected.";
          this.cdr.detectChanges();
          return of([]);
        }
        return this.overtimeService.getOvertimeStats(start, end, this.selectedEmployeeId);
      }),
      tap(stats => {
        console.log("Overtime Stats Received:", stats);
      }),
      catchError(err => {
        console.error("Error in calculation stream:", err);
        this.errorLoading = "Failed to calculate overtime statistics.";
        this.showToast(this.errorLoading, 'danger');
        this.isLoading = false;
        this.cdr.detectChanges();
        return of([]);
      }),
      finalize(() => {
        if (this.isLoading) {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      })
    );

    const calculationSub = this.stats$.subscribe();
    this.subscriptions.add(calculationSub);
    this.triggerCalculation();
  }

  /** Trigger a recalculation when filters change */
  onFilterChange() {
    console.log("Filters changed, triggering recalculation...");
    if (this.selectedTimeframe !== 'custom') {
      this.setDefaultDates();
    }

    if (this.selectedTimeframe === 'custom') {
      if (!this.customStartDate || !this.customEndDate ||
        new Date(this.customStartDate) > new Date(this.customEndDate)) {
        this.showToast("Please select a valid custom date range.", "warning");
        return;
      }
    }
    this.triggerCalculation();
  }

  /** Emit a new value to trigger the calculation stream */
  triggerCalculation() {
    this.calculationTrigger.next();
  }

  /** Calculate the start and end dates based on selected timeframe */
  getSelectedDateRange(): { start: Date | null, end: Date | null } {
    let start: Date | null = null;
    let end: Date | null = null;

    try {
      const selectedDateObj = new Date(this.selectedDate);
      if (isNaN(selectedDateObj.getTime())) throw new Error("Invalid selectedDate");

      switch (this.selectedTimeframe) {
        case 'week':
        case 'lastWeek':
          const targetDateForWeek = new Date(this.selectedDate);
          if (this.selectedTimeframe === 'lastWeek') {
            targetDateForWeek.setDate(targetDateForWeek.getDate() - 7);
          }
          start = this.getStartOfWeek(targetDateForWeek);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        case 'month':
        case 'lastMonth':
          const targetDateForMonth = new Date(this.selectedDate);
          let year = targetDateForMonth.getFullYear();
          let month = targetDateForMonth.getMonth();
          if (this.selectedTimeframe === 'lastMonth') {
            month -= 1;
            if (month < 0) {
              month = 11;
              year -= 1;
            }
          }
          start = new Date(year, month, 1);
          end = new Date(year, month + 1, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'custom':
          if (this.customStartDate && this.customEndDate) {
            start = new Date(this.customStartDate);
            end = new Date(this.customEndDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
              console.error("Invalid custom date range values.");
              return { start: null, end: null };
            }
          }
          break;
        default:
          console.error("Invalid timeframe selected:", this.selectedTimeframe);
          return { start: null, end: null };
      }
      console.log(`Selected Range: ${start?.toISOString()} to ${end?.toISOString()}`);
      return { start, end };
    } catch (e) {
      console.error("Error calculating date range:", e);
      return { start: null, end: null };
    }
  }

  /** Set default start/end dates based on selected period for custom range display */
  setDefaultDates() {
    const { start, end } = this.getSelectedDateRange();
    if (start && end && this.selectedTimeframe !== 'custom') {
      this.customStartDate = this.formatDateForInput(start);
      this.customEndDate = this.formatDateForInput(end);
    } else if (this.selectedTimeframe === 'custom' && (!this.customStartDate || !this.customEndDate)) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      this.customStartDate = this.formatDateForInput(startOfMonth);
      this.customEndDate = this.formatDateForInput(now);
    }
  }

  /** Gets the start of the week (Monday) for a given date */
  private getStartOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay() || 7;
    if (day !== 1) {
      date.setDate(date.getDate() - day + 1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /** Formats a Date object to YYYY-MM-DD for input binding */
  private formatDateForInput(date: Date | null | undefined): string {
    if (!date || isNaN(date.getTime())) return '';
    return date.toISOString();
  }

  /** Helper to display period nicely */
  getPeriodDisplay(): string {
    const { start, end } = this.getSelectedDateRange();
    if (start && end) {
      const datePipe = new DatePipe('en-US');
      return `${datePipe.transform(start, 'MMM d')} - ${datePipe.transform(end, 'MMM d, y')}`;
    }
    return 'Invalid Period';
  }

  /** Calculates total overtime for the displayed results */
  getTotalOvertime(stats: OvertimeStats[] | null): number {
    if (!stats) return 0;
    return stats.reduce((sum, stat) => sum + stat.overtimeHours, 0);
  }

  /** Calculate total worked hours */
  getTotalWorkedHours(stats: OvertimeStats[] | null): number {
    if (!stats) return 0;
    return stats.reduce((sum, stat) => sum + stat.workedHours, 0);
  }

  /** TrackBy function for employee stats list */
  trackByEmployeeId(index: number, stat: OvertimeStats): string {
    return stat.employeeId;
  }

  /** Show toast messages */
  async showToast(message: string, color: string = 'primary', duration: number = 3000) {
    try {
      const toast = await this.toastCtrl.create({ message, duration, color, position: 'bottom' });
      await toast.present();
    } catch (e) {
      console.error("showToast error:", e);
    }
  }

  /** Get timeframe label for display in chip */
  getTimeframeLabel(): string {
    switch (this.selectedTimeframe) {
      case 'week': return 'Current Week';
      case 'month': return 'Current Month';
      case 'lastWeek': return 'Last Week';
      case 'lastMonth': return 'Last Month';
      case 'custom': return 'Custom Range';
      default: return 'Select Period';
    }
  }

  /** Get employee label for display in chip */
  getEmployeeLabel(): string {
    if (this.selectedEmployeeId === 'all') return 'All Employees';
    const employee = this.getEmployeeById(this.selectedEmployeeId);
    return employee ? employee.name : 'Select Employee';
  }

  /** Reset filters to default */
  resetFilters() {
    this.selectedTimeframe = 'week';
    this.selectedEmployeeId = 'all';
    this.selectedDate = new Date().toISOString();
    this.setDefaultDates();
    this.triggerCalculation();
  }

  /** Get employee by ID */
  getEmployeeById(id: string): Employee | undefined {
    return this.employees.find(emp => emp.id === id);
  }

  /** Get employee initials from name */
  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /** Get filtered employees based on search term */
  getFilteredEmployees(): Employee[] {
    if (!this.employeeSearchTerm.trim()) return this.employees;

    const searchTerm = this.employeeSearchTerm.trim().toLowerCase();
    return this.employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm) ||
      (emp.role && emp.role.toLowerCase().includes(searchTerm))
    );
  }

  /** Determine overtime badge color based on hours */
  getOvertimeBadgeColor(hours: number): string {
    if (hours <= 0) return 'medium';
    if (hours < 5) return 'success';
    if (hours < 10) return 'warning';
    return 'danger';
  }
  selectEmployee(employeeId: string) {
    this.selectedEmployeeId = employeeId;
    this.employeeSearchTerm = ''; // Clear search term after selection
    this.onFilterChange();
  }

  /** Select a timeframe for filtering */
  selectTimeframe(timeframe: 'week' | 'month' | 'lastWeek' | 'lastMonth' | 'custom') {
    this.selectedTimeframe = timeframe;

    // Reset to default date selection when changing timeframes
    if (timeframe !== 'custom') {
      this.selectedDate = new Date().toISOString();
    }

    this.setDefaultDates();
    this.onFilterChange();
  }
  getContractHours(stats: OvertimeStats[] | null): number {
    if (!stats) return 0;

    // Sum up contract hours from employee data instead of the stats
    return stats.reduce((sum, stat) => {
      const employee = this.getEmployeeById(stat.employeeId);
      // Use employee contract hours if available, or fall back to stat.contractedHours
      const hours = employee?.contractHours || stat.contractedHours || 0;
      return sum + hours;
    }, 0);
  }
  getTotalLateArrivals(stats: TardinessStats[]): number {
    if (!stats || !stats.length) return 0;
    return stats.reduce((total, stat) => total + stat.lateArrivals.count, 0);
  }
  getTotalUnauthorizedAbsences(stats: TardinessStats[]): number {
    if (!stats || !stats.length) return 0;
    return stats.reduce((total, stat) => total + stat.unauthorizedAbsences.count, 0);
  }
  getLateBadgeColor(minutes: number): string {
    if (minutes <= 10) return 'warning';  // 5-10 minutes late
    if (minutes <= 30) return 'danger';   // 10-30 minutes late
    return 'dark';                        // More than 30 minutes late
  }
}
