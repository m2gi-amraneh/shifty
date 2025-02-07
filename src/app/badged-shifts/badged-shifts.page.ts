// badged-shifts.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BadgeService, BadgedShift } from '../services/badge.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-badged-shifts',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>My Badged Shifts</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ng-container *ngIf="badgedShifts$ | async as shifts">
          <ng-container *ngIf="shifts.length > 0; else noShifts">
            <ion-item *ngFor="let shift of shifts">
              <ion-icon name="time-outline" slot="start"></ion-icon>
              <ion-label>
                <h2>Shift ID: {{ shift.shiftId }}</h2>
                <p>
                  Checked In: {{ shift.badgeInTime }}
                  <span *ngIf="shift.badgeOutTime">
                    | Checked Out: {{ shift.badgeOutTime }}
                  </span>
                </p>
                <ion-badge [color]="getStatusColor(shift.status)">
                  {{ shift.status }}
                </ion-badge>
              </ion-label>
              <ion-button
                *ngIf="shift.status === 'checked-in'"
                fill="clear"
                color="primary"
                (click)="completeShift(shift)"
              >
                Check Out
              </ion-button>
            </ion-item>
          </ng-container>
        </ng-container>

        <ng-template #noShifts>
          <ion-item>
            <ion-label class="ion-text-center">
              No badged shifts found
            </ion-label>
          </ion-item>
        </ng-template>
      </ion-list>
    </ion-content>
  `,
})
export class BadgedShiftsPage implements OnInit {
  badgedShifts$: Observable<BadgedShift[]>;

  constructor(private badgeService: BadgeService) {
    // Get current employee ID (replace with actual authentication)
    const employeeId = 'VCbSYUdJtKWeWkE9NfVrPdNGdL82';
    this.badgedShifts$ = this.badgeService.getBadgedShifts(employeeId);
  }

  ngOnInit() {}

  getStatusColor(status: string): string {
    switch (status) {
      case 'checked-in':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'medium';
    }
  }

  async completeShift(shift: BadgedShift) {
    if (shift.id) {
      await this.badgeService.completeBadgedShift(shift.id);
    }
  }
}
