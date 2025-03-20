import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline,
  documentOutline,
  calendarNumberOutline,
  peopleOutline,
  personAddOutline,
  logOutOutline,
  bed,
  calendarClearOutline
} from 'ionicons/icons';

// Add the icons to use them
addIcons({
  bed,
  qrCodeOutline,
  peopleOutline,
  calendarNumberOutline,
  documentOutline,
  personAddOutline,
  logOutOutline,
  calendarClearOutline
});
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle
} from '@ionic/angular/standalone';
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,],
  template: `
    <ion-content [fullscreen]="true">
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title size="large">Admin Portal</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="logout()" class="logout-button">
              <ion-icon slot="start" name="log-out-outline"></ion-icon>
              Logout
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <div class="dashboard-grid">
        <ion-card class="dashboard-card" button routerLink="/scan-qr">
          <div class="card-gradient qr-gradient"></div>
          <ion-icon name="qr-code-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Badge station</ion-card-title>
            <ion-card-subtitle>Device Verification</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/manage-employees">
          <div class="card-gradient team-gradient"></div>
          <ion-icon name="people-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Team Management</ion-card-title>
            <ion-card-subtitle>Employee Database</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/planing">
          <div class="card-gradient schedule-gradient"></div>
          <ion-icon name="calendar-number-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Scheduling</ion-card-title>
            <ion-card-subtitle>Workflow Planning</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/documents">
          <div class="card-gradient docs-gradient"></div>
          <ion-icon name="document-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Contract</ion-card-title>
            <ion-card-subtitle>Manage Employee Contracts</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/manage-positions">
          <div class="card-gradient position-gradient"></div>
          <ion-icon name="person-add-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Work Positions</ion-card-title>
            <ion-card-subtitle>Manage Employee Roles</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/abcance-admin">
          <div class="card-gradient absence-gradient"></div>
          <ion-icon name="calendar-clear-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Absence</ion-card-title>
            <ion-card-subtitle>Manage Time Off</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/closing-periods">
          <div class="card-gradient closing-gradient"></div>
          <ion-icon name="bed" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Closing Periods</ion-card-title>
            <ion-card-subtitle>Manage Closed Days</ion-card-subtitle>
          </ion-card-header>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --ion-background-color: #f7f8fc;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      padding: 24px;
      margin-top: 10px;
    }

    .dashboard-card {
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      height: 180px;
      --background: white;
    }

    .dashboard-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
    }

    .card-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.9;
    }

    .qr-gradient {
      background: linear-gradient(135deg, #4361eb 0%, #764ba2 100%);
    }

    .team-gradient {
      background: linear-gradient(135deg, #e94560 0%, #c53678 100%);
    }

    .schedule-gradient {
      background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
    }

    .docs-gradient {
      background: linear-gradient(135deg, #7b2cbf 0%, #5a189a 100%);
    }

    .position-gradient {
      background: linear-gradient(135deg, #4caf50 0%, #087f23 100%);
    }

    .absence-gradient {
      background: linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%);
    }

    .closing-gradient {
      background: linear-gradient(135deg, #f1c01c 0%, #da7356 100%);
    }

    .card-icon {
      font-size: 42px;
      color: rgba(255, 255, 255, 0.9);
      position: absolute;
      top: 20px;
      right: 20px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    ion-card-header {
      padding-top: 80px;
      position: relative;
      z-index: 2;
    }

    ion-card-title {
      color: white;
      font-weight: 600;
      font-size: 20px;
      margin-bottom: 4px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    ion-card-subtitle {
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    ion-header ion-toolbar {
      --background: transparent;
      padding: 10px 16px;
    }

    ion-title {
      font-weight: 700;
      font-size: 24px;
    }

    .logout-button {
      --background: #f4f5f8;
      --color: #545ca7;
      --border-radius: 8px;
      --padding-start: 12px;
      --padding-end: 12px;
      font-weight: 500;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      height: 40px;
      margin-right: 8px;
      transition: background-color 0.2s;
    }

    .logout-button:hover {
      --background: #e8eaef;
    }

    @media (max-width: 576px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
        padding: 16px;
      }

      .dashboard-card {
        height: 150px;
      }

      ion-card-header {
        padding-top: 60px;
      }
    }
  `],
})
export class AdminDashboardpage {
  constructor(private authService: AuthService, private router: Router) { }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
