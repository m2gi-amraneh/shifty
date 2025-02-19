import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, shieldCheckmarkOutline, timeOutline } from 'ionicons/icons';
addIcons({ fingerPrintOutline, timeOutline, shieldCheckmarkOutline });

@Component({
  selector: 'app-employee-id',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="none" class="transparent-toolbar">
        <ion-title class="ion-text-center">Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" [fullscreen]="true">
      <div class="profile-container" *ngIf="currentUser | async as user">
        <!-- Profile Header -->
        <div class="profile-header" [@fadeIn]>
          <div class="avatar-container">
            <ion-avatar class="large-avatar">
            <img alt="Silhouette of a person's head" src="https://ionicframework.com/docs/img/demos/avatar.svg" />
            </ion-avatar>
            <div class="status-badge" [class.online]="true"></div>
          </div>

          <h1 class="employee-name">{{ user.displayName || 'Employee' }}</h1>
          <p class="employee-role">{{ userRole || 'Loading...' }}</p>
        </div>

        <!-- Info Cards -->
        <div class="info-grid" [@fadeIn]>
          <ion-card class="info-card">
            <ion-card-content>
              <ion-icon name="finger-print-outline" class="card-icon"></ion-icon>
              <div class="card-label">Employee ID</div>
              <div class="card-value">{{ user.badgeCode }}</div>
            </ion-card-content>
          </ion-card>


          <ion-card class="info-card">
            <ion-card-content>
              <ion-icon name="time-outline" class="card-icon"></ion-icon>
              <div class="card-label">Join Date</div>
              <div class="card-value">{{ user.metadata?.creationTime | date:'mediumDate' }}</div>
            </ion-card-content>
          </ion-card>

          <ion-card class="info-card">
            <ion-card-content>
              <ion-icon name="shield-checkmark-outline" class="card-icon"></ion-icon>
              <div class="card-label">Status</div>
              <div class="card-value">Active</div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Quick Actions -->

      </div>
    </ion-content>
  `,
  styles: [`
    .transparent-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    .profile-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .profile-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
      padding: 20px;
    }

    .avatar-container {
      position: relative;
      margin-bottom: 16px;
    }

    .large-avatar {
      width: 120px;
      height: 120px;
      margin-bottom: 16px;
      border: 4px solid var(--ion-color-primary);
    }

    .status-badge {
      position: absolute;
      bottom: 10px;
      right: 10px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: #ccc;
      border: 2px solid white;
    }

    .status-badge.online {
      background-color: #2dd36f;
    }

    .employee-name {
      font-size: 24px;
      font-weight: 700;
      margin: 8px 0;
      color: var(--ion-color-dark);
    }

    .employee-role {
      font-size: 16px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .info-card {
      margin: 0;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .card-icon {
      font-size: 24px;
      color: var(--ion-color-primary);
      margin-bottom: 8px;
    }

    .card-label {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .action-button {
      margin: 0;
      --border-radius: 12px;
      height: 48px;
    }

    ion-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 16px;
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})

export class QrScanPage implements OnInit {
  currentUser: Observable<any>;
  userRole: string | null = null;

  constructor(private authService: AuthService) {
    this.currentUser = this.authService.getCurrentUser();
  }

  async ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.userRole = await this.authService.getUserRole(userId);
    }
  }
}
