import { Component } from '@angular/core';
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
  calendarClearOutline,
  chatbubbleEllipsesOutline,
  statsChartOutline
} from 'ionicons/icons';
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
  IonCardSubtitle,

} from '@ionic/angular/standalone';

// Add the icons to use them
addIcons({
  bed,
  qrCodeOutline, statsChartOutline,
  peopleOutline,
  calendarNumberOutline,
  documentOutline,
  personAddOutline,
  logOutOutline,
  calendarClearOutline,
  chatbubbleEllipsesOutline
});

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // IonicModule, // Or list specific components
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
    IonCardSubtitle,
  ],
  template: `
    <ion-header class="ion-no-border modern-header">
      <ion-toolbar>
        <ion-title>Admin Portal</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="logout()" class="logout-button">
            <ion-icon slot="start" name="log-out-outline"></ion-icon>
            Logout
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="dashboard-grid">
      <ion-card class="dashboard-card card-primary" button routerLink="/statistics">
          <ion-icon name="stats-chart-outline" class="card-icon" color="primary"></ion-icon>
          <ion-card-header class="card-content">
            <ion-card-title> statistics</ion-card-title>
          </ion-card-header>
        </ion-card>
        <!-- Card 1: Badge Station -->
        <ion-card class="dashboard-card card-primary" button routerLink="/scan-qr">
          <ion-icon name="qr-code-outline" class="card-icon" color="primary"></ion-icon>
          <ion-card-header class="card-content">
            <ion-card-title>Badge station</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 2: Team Management -->
        <ion-card class="dashboard-card card-danger" button routerLink="/manage-employees">
          <ion-icon name="people-outline" class="card-icon" color="danger"></ion-icon>
           <ion-card-header class="card-content">
            <ion-card-title>Team</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 3: Scheduling -->
        <ion-card class="dashboard-card card-secondary" button routerLink="/planing">
          <ion-icon name="calendar-number-outline" class="card-icon" color="secondary"></ion-icon>
          <ion-card-header class="card-content">
            <ion-card-title>Scheduling</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 4: Contract -->
        <ion-card class="dashboard-card card-tertiary" button routerLink="/documents">
           <ion-icon name="document-outline" class="card-icon" color="tertiary"></ion-icon>
           <ion-card-header class="card-content">
            <ion-card-title>Contract</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 5: Work Positions -->
        <ion-card class="dashboard-card card-success" button routerLink="/manage-positions">
          <ion-icon name="person-add-outline" class="card-icon" color="success"></ion-icon>
           <ion-card-header class="card-content">
            <ion-card-title>Positions</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 6: Absence -->
        <ion-card class="dashboard-card card-warning" button routerLink="/abcance-admin">
          <ion-icon name="calendar-clear-outline" class="card-icon" color="warning"></ion-icon>
           <ion-card-header class="card-content">
            <ion-card-title>Absence</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 7: Closing Periods -->
        <ion-card class="dashboard-card card-medium" button routerLink="/closing-periods">
           <ion-icon name="bed" class="card-icon" color="medium"></ion-icon>
           <ion-card-header class="card-content">
            <ion-card-title>Closing</ion-card-title>
          </ion-card-header>
        </ion-card>

        <!-- Card 8: Chat -->
        <ion-card class="dashboard-card card-success" button routerLink="/chat-rooms">
            <!-- Added a slight variation for chat icon color if desired -->
          <ion-icon name="chatbubble-ellipses-outline" class="card-icon" style="color: var(--ion-color-success-shade);"></ion-icon>
           <ion-card-header class="card-content">
            <ion-card-title>Chat</ion-card-title>
          </ion-card-header>
        </ion-card>

      </div>
    </ion-content>
  `,

  styles: [`
    :host {
      --ion-background-color: #f8f9fa; // Lighter, modern background grey
      --card-hover-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      --card-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      --card-border-radius: 16px; // Slightly larger radius
    }

    .modern-header ion-toolbar {
      --background: var(--ion-background-color); // Match page background
      --border-width: 0; // Remove default border
       padding-top: 8px; // Add some top padding to header content
       padding-bottom: 8px;
    }

    .modern-header ion-title {
      font-weight: 600;
      font-size: 22px;
      color: #1d2129; // Darker, more readable title color
      padding-inline: 16px; // Ensure padding matches grid
    }

    .logout-button {
      --color: var(--ion-color-medium-shade); // More subtle logout color
      --ripple-color: var(--ion-color-medium-tint);
      font-weight: 500;
      font-size: 14px;
       margin-inline-end: 10px; // Ensure some space from edge
    }
     .logout-button ion-icon {
        margin-inline-end: 5px;
        font-size: 18px; // Slightly smaller icon
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr); // Keep 3 columns for mobile focus
      gap: 16px; // Slightly increased gap for breathing room
      padding: 30px 26px; // More vertical padding, standard horizontal
    }

    .dashboard-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: var(--card-border-radius);
      box-shadow: var(--card-shadow);
      background: #ffffff; // Clean white cards
      padding: 18px 10px; // Adjust padding for content balance
      margin: 10px 0; // Vertical margin for spacing
      overflow: hidden;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1); // Smoother transition
       position: relative; // Needed for potential future pseudo-elements
    }

    /* Subtle hover effect */
     .dashboard-card:hover {
        transform: translateY(-4px); // Slightly more lift
        box-shadow: var(--card-hover-shadow);
    }

    /* Active state feedback */
     .dashboard-card:active {
        transform: scale(0.96); // Keep the nice scale effect
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); // Slightly reduced shadow when pressed
    }

    .card-icon {
      font-size: 34px; // Slightly adjusted size
      margin-bottom: 12px; // Increased space below icon
      // Color is set via 'color' attribute or inline style in template
       // Consider adding a subtle background shape if desired later
    }

    .card-content {
      padding: 0;
      text-align: center;
      width: 100%;
    }

    ion-card-title {
      color: #333d4f; // Dark grey for better readability
      font-weight: 500; // Medium weight is often cleaner than bold
      font-size: 13px; // Keep font size appropriate for small cards
      line-height: 1.4;
      margin: 0;
       letter-spacing: 0.2px; // Subtle letter spacing can look modern
    }

    /* --- Optional: Add subtle background tints based on theme --- */
    /* Uncomment and adjust colors as needed */
    /*
    .dashboard-card.card-primary { background: linear-gradient(to bottom right, white, var(--ion-color-primary-tint)); }
    .dashboard-card.card-danger { background: linear-gradient(to bottom right, white, var(--ion-color-danger-tint)); }
    .dashboard-card.card-secondary { background: linear-gradient(to bottom right, white, var(--ion-color-secondary-tint)); }
    .dashboard-card.card-tertiary { background: linear-gradient(to bottom right, white, var(--ion-color-tertiary-tint)); }
    .dashboard-card.card-success { background: linear-gradient(to bottom right, white, var(--ion-color-success-tint)); }
    .dashboard-card.card-warning { background: linear-gradient(to bottom right, white, var(--ion-color-warning-tint)); }
    .dashboard-card.card-medium { background: linear-gradient(to bottom right, white, var(--ion-color-medium-tint)); }
    */


    /* --- Responsive Adjustments --- */
    @media (min-width: 600px) { // Tablet
      .dashboard-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        padding: 24px;
      }
      .dashboard-card {
          padding: 24px 12px;
      }
      .card-icon {
          font-size: 38px;
          margin-bottom: 14px;
      }
      ion-card-title {
          font-size: 14px;
      }
    }

    @media (min-width: 992px) { // Desktop
         .dashboard-grid {
             // Use auto-fit for flexibility on large screens
             grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
             gap: 24px;
             padding: 32px;
              max-width: 1200px; // Optional: Max width for very large screens
              margin-left: auto;
              margin-right: auto;
         }
         .dashboard-card {
             padding: 28px 15px;
         }
         .card-icon {
             font-size: 42px;
            margin-bottom: 16px;
         }
         ion-card-title {
             font-size: 15px;
         }
     }
  `],
})
export class AdminDashboardPage {
  constructor(private authService: AuthService, private router: Router) { }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
