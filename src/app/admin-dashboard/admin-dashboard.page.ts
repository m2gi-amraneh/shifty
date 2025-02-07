import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline,
  documentOutline,
  calendarNumberOutline,
  peopleOutline,
  bed,
} from 'ionicons/icons';

// Add the icons to use them
addIcons({
  bed,
  qrCodeOutline,
  peopleOutline,
  calendarNumberOutline,
  documentOutline,
});

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar class="header-toolbar">
        <ion-title class="header-title">Admin Portal</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" class="logout-btn" (click)="logout()">
            <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding main-content">
      <div class="dashboard-grid">
        <!-- Existing Cards -->
        <ion-card class="dashboard-card" button routerLink="/scan-qr">
          <div class="card-gradient qr-gradient"></div>
          <ion-icon name="qr-code-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>QR Scanner</ion-card-title>
            <ion-card-subtitle>Device verification</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/manage-employees">
          <div class="card-gradient team-gradient"></div>
          <ion-icon name="people-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Team Management</ion-card-title>
            <ion-card-subtitle>Employee database</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/planing">
          <div class="card-gradient schedule-gradient"></div>
          <ion-icon name="calendar-number-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Scheduling</ion-card-title>
            <ion-card-subtitle>Workflow planning</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <ion-card class="dashboard-card" button routerLink="/features">
          <div class="card-gradient docs-gradient"></div>
          <ion-icon name="document-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Documentation</ion-card-title>
            <ion-card-subtitle>System features</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <!-- New Card for Work Positions -->
        <ion-card class="dashboard-card" button routerLink="/manage-positions">
          <div class="card-gradient position-gradient"></div>
          <ion-icon name="person-add-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>Work Positions</ion-card-title>
            <ion-card-subtitle>Manage employee roles</ion-card-subtitle>
          </ion-card-header>
        </ion-card>
        <ion-card class="dashboard-card" button routerLink="/abcance-admin">
          <div class="card-gradient position-gradient"></div>
          <ion-icon name="person-add-outline" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>abcence</ion-card-title>
            <ion-card-subtitle>Manage employee abcence</ion-card-subtitle>
          </ion-card-header>
        </ion-card>
        <ion-card class="dashboard-card" button routerLink="/">
          <div class="card-gradient position-gradient"></div>
          <ion-icon name="bed" class="card-icon"></ion-icon>
          <ion-card-header>
            <ion-card-title>closing</ion-card-title>
            <ion-card-subtitle>Manage closing days</ion-card-subtitle>
          </ion-card-header>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .header-toolbar {
        --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        --color: white;
        --border-width: 0;
      }

      .header-title {
        font-family: 'Roboto', sans-serif;
        font-weight: 300;
        letter-spacing: 1.5px;
      }

      .logout-btn {
        --color: rgba(255, 255, 255, 0.9);
        --color-hover: #e94560;
      }

      .main-content {
        --background: #0f0f1f;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        padding: 1rem;
      }

      .dashboard-card {
        position: relative;
        overflow: hidden;
        border-radius: 20px;
        min-height: 250px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        transition: transform 0.3s ease, box-shadow 0.3s ease;

        &:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 180, 216, 0.2);
        }
      }

      .card-gradient {
        position: grid;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        filter: blur(60px);
        opacity: 0.4;
        transition: opacity 0.3s ease;
      }

      .qr-gradient {
        background: #00b4d8;
      }
      .team-gradient {
        background: #e94560;
      }
      .schedule-gradient {
        background: #90e0ef;
      }
      .docs-gradient {
        background: #7b2cbf;
      }
      .position-gradient {
        background: #4caf50; /* Change gradient to suit your design */
      }

      .dashboard-card:hover .card-gradient {
        opacity: 0.6;
      }

      .card-icon {
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 2.5rem;
        color: rgba(255, 255, 255, 0.9);
        z-index: 1;
      }

      ion-card-header {
        position: absolute;
        bottom: 20px;
        left: 20px;
        z-index: 2;
      }

      ion-card-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: white;
        margin-bottom: 0.5rem;
      }

      ion-card-subtitle {
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class AdminDashboardpage {
  constructor(private authService: AuthService, private router: Router) {}

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
