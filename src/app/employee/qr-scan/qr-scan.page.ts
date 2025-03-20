import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { addIcons } from 'ionicons';
import {
  fingerPrintOutline,
  shieldCheckmarkOutline,
  timeOutline,
  logOutOutline,
  settingsOutline,
  helpCircleOutline,
  ellipse
} from 'ionicons/icons';

addIcons({
  fingerPrintOutline,
  timeOutline,
  shieldCheckmarkOutline,
  logOutOutline,
  settingsOutline,
  helpCircleOutline, ellipse
});
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonAvatar,
  IonCard,
  IonCardContent,
  IonBackButton,
  IonButtons, IonImg,
  IonItem,
  IonLabel,
  IonChip, IonCardSubtitle,
  IonIcon, IonCardHeader

} from '@ionic/angular/standalone';
@Component({
  selector: 'app-employee-id',
  standalone: true,
  imports: [CommonModule, IonContent,
    IonHeader,
    IonTitle,
    IonToolbar, IonCardHeader,
    IonAvatar,
    IonCard, IonCardSubtitle,
    IonCardContent, IonImg,
    IonBackButton,
    IonButtons,
    IonItem,
    IonLabel,
    IonChip,
    IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="none" class="transparent-toolbar">
      <ion-buttons slot="start">
          <ion-back-button defaultHref="/employee-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title class="ion-text-center">Employee Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="gradient-background">
      <div class="profile-container" *ngIf="currentUser | async as user">
        <!-- Profile Header -->
        <div class="profile-header" [@fadeIn]>
          <div class="avatar-container">
            <ion-avatar class="large-avatar">
              <ion-img alt="Silhouette of a person's head" src="https://ionicframework.com/docs/img/demos/avatar.svg" ></ion-img>
            </ion-avatar>
            <div class="status-badge" [class.online]="true"></div>
          </div>

          <h1 class="employee-name">{{ user.displayName || 'Employee' }}</h1>
          <p class="employee-role">{{ userRole || 'Loading...' }}</p>

          <ion-chip class="status-chip">
            <ion-icon name="ellipse" color="success"></ion-icon>
            <ion-label>Active</ion-label>
          </ion-chip>
        </div>

        <!-- Info Cards -->
        <div class="card-container" [@staggeredFadeIn]>
          <!-- Employee Info Card -->
          <ion-card class="employee-card">
            <ion-card-header>
              <ion-card-subtitle>Employee Information</ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <div class="info-grid">
                <ion-item lines="none" class="info-item">
                  <ion-icon name="finger-print-outline" slot="start" class="card-icon"></ion-icon>
                  <ion-label>
                    <div class="card-label">Badge Code</div>
                    <div class="card-value">{{ user.badgeCode || 'N/A' }}</div>
                  </ion-label>
                </ion-item>

                <ion-item lines="none" class="info-item">
                  <ion-icon name="time-outline" slot="start" class="card-icon"></ion-icon>
                  <ion-label>
                    <div class="card-label">Join Date</div>
                    <div class="card-value">{{ user.metadata?.creationTime | date:'mediumDate' }}</div>
                  </ion-label>
                </ion-item>

                <ion-item lines="none" class="info-item">
                  <ion-icon name="shield-checkmark-outline" slot="start" class="card-icon"></ion-icon>
                  <ion-label>
                    <div class="card-label">Status</div>
                    <div class="card-value">Active</div>
                  </ion-label>
                </ion-item>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Quick Actions -->

        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    /* Main gradient background */
    .gradient-background {
      --background: linear-gradient(135deg, #4361eb 0%, #764ba2 100%);
    }

    .transparent-toolbar {
      --background: transparent;
      --border-width: 0;
      --color: white;
    }

    ion-title {
      font-weight: 600;
      letter-spacing: 0.5px;
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
      margin-bottom: 24px;
      padding: 24px 20px;
      color: white;
    }

    .avatar-container {
      position: relative;
      margin-bottom: 10px;
    }

    .large-avatar {
      width: 100px;
      height: 100px;
      margin-bottom: 16px;
      border: 4px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .status-badge {
      position: absolute;
      bottom: 15px;
      right: 15px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #ccc;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .status-badge.online {
      background-color: #2dd36f;
    }

    .status-chip {
      margin-top: 8px;
      --background: rgba(255, 255, 255, 0.2);
      --color: white;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .employee-name {
      font-size: 26px;
      font-weight: 700;
      margin: 12px 0 4px;
      color: white;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .employee-role {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.9);
      margin: 0 0 8px;
    }

    .card-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    ion-card {
      margin: 0;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    ion-card-header {
      padding-bottom: 0;
    }

    ion-card-subtitle {
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #4361eb;
      font-size: 13px;
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item {
      --background: transparent;
      --padding-start: 0;
      --inner-padding-end: 0;
    }

    .card-icon {
      font-size: 22px;
      color: #4361eb;
      margin-right: 16px;
    }

    .card-label {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin-bottom: 2px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .action-button {
      height: 80px;
      margin: 0;
      --border-radius: 12px;
      --color: var(--ion-color-dark);
    }

    .action-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .action-content ion-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    .action-content span {
      font-size: 13px;
      font-weight: 500;
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggeredFadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('800ms 300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
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
