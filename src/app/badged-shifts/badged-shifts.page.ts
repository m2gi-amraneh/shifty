import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { BadgedShift, BadgeService } from '../services/badge.service';
import { AuthService } from '../services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  logOutOutline
} from 'ionicons/icons';

addIcons({
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  logOutOutline
});

@Component({
  selector: 'app-badged-shifts',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>My Shifts</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-segment [(ngModel)]="selectedView" class="ion-padding">
        <ion-segment-button value="active">
          <ion-label>Active</ion-label>
        </ion-segment-button>
        <ion-segment-button value="completed">
          <ion-label>History</ion-label>
        </ion-segment-button>
      </ion-segment>

      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ng-container *ngIf="badgedShifts$ | async as shifts">
        <ng-container *ngIf="shifts.length > 0; else noShifts">
          <ion-list>
            <ion-item-group>
              <ion-item-divider color="light">
                <ion-label>
                  {{ selectedView === 'active' ? 'Current Shifts' : 'Completed Shifts' }}
                </ion-label>
              </ion-item-divider>

              <ion-item *ngFor="let shift of filterShifts(shifts)" class="shift-item">
                <ion-grid>
                  <ion-row class="ion-align-items-center">
                    <ion-col size="2">
                      <ion-icon
                        [name]="shift.status === 'completed' ? 'checkmark-circle-outline' : 'time-outline'"
                        [color]="shift.status === 'completed' ? 'success' : 'warning'"
                        size="large"
                      ></ion-icon>
                    </ion-col>
                    <ion-col size="8">
                      <ion-label>
                        <h2 class="shift-title">{{ shift.shiftId }}</h2>
                        <p class="time-info">
                          <ion-text color="medium">
                            <strong>Check In:</strong> {{ formatTimestamp(shift.badgeInTime) }}
                          </ion-text>
                        </p>
                        <p *ngIf="shift.badgeOutTime" class="time-info">
                          <ion-text color="medium">
                            <strong>Check Out:</strong> {{ formatTimestamp(shift.badgeOutTime) }}
                          </ion-text>
                        </p>
                        <ion-badge [color]="getStatusColor(shift.status)" class="status-badge">
                          {{ shift.status === 'checked-in' ? 'In Progress' : 'Completed' }}
                        </ion-badge>
                      </ion-label>
                    </ion-col>

                  </ion-row>
                </ion-grid>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </ng-container>
      </ng-container>

      <ng-template #noShifts>
        <ion-card class="ion-margin">
          <ion-card-content class="ion-text-center">
            <ion-icon
              name="alert-circle-outline"
              color="medium"
              size="large"
              class="no-shifts-icon"
            ></ion-icon>
            <p>No {{ selectedView === 'active' ? 'active' : 'completed' }} shifts found</p>
          </ion-card-content>
        </ion-card>
      </ng-template>
    </ion-content>
  `,
  styles: [`
    .shift-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin: 8px 0;
    }

    .shift-title {
      font-weight: 600;
      font-size: 1.1em;
      margin-bottom: 4px;
    }

    .time-info {
      margin: 4px 0;
      font-size: 0.9em;
    }

    .status-badge {
      margin-top: 8px;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .no-shifts-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    ion-segment {
      background: var(--ion-color-light);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    ion-segment-button {
      --background-checked: var(--ion-color-primary);
      --color-checked: var(--ion-color-primary-contrast);
      --indicator-color: transparent;
    }
  `]
})
export class BadgedShiftsPage implements OnInit, OnDestroy {
  badgedShifts$: Observable<BadgedShift[]>;
  selectedView: 'active' | 'completed' = 'active';
  isProcessing = false;
  private authSub: Subscription | null = null;

  constructor(
    private badgeService: BadgeService,
    private authService: AuthService
  ) {
    this.badgedShifts$ = new Observable();
  }

  ngOnInit() {
    this.authSub = this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.badgedShifts$ = this.badgeService.getBadgedShiftsRealtime(user.uid);
      }
    });
  }

  // Convert Firestore Timestamp or Date directly to string
  formatTimestamp(timestamp: any): string {
    try {
      if (timestamp instanceof Date) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(timestamp);
      } else if (timestamp && timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);  // Firestore Timestamp handling
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(date);
      } else {
        return String(timestamp); // If it's a bad timestamp, return as-is
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return String(timestamp); // Fallback if anything goes wrong
    }
  }

  filterShifts(shifts: BadgedShift[]): BadgedShift[] {
    return shifts.filter(shift =>
      this.selectedView === 'active'
        ? shift.status === 'checked-in'
        : shift.status === 'completed'
    );
  }

  getStatusColor(status: string): string {
    return status === 'checked-in' ? 'warning' : 'success';
  }


  handleRefresh(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}
