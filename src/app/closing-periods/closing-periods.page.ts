import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, AlertController, AnimationController } from '@ionic/angular';
import {
  ClosingDaysService,
  ClosingPeriod,
} from '../services/closing-periods.service';
import { ClosingPeriodModalComponent } from '../modals/closing-period-modal.component';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { add, addOutline, calendarOutline, createOutline, informationCircleOutline, timeOutline, trashOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';
addIcons({
  calendarOutline,
  addOutline,
  createOutline,
  trashOutline,
  timeOutline, add, informationCircleOutline
});

@Component({
  selector: 'app-closing-days',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonFab,
    IonFabButton],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="gradient-toolbar">
      <ion-buttons slot="start">
          <ion-back-button color="light" defaultHref="/admin-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Closing Days</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openModal()" class="add-button">
            <ion-icon name="add-outline"></ion-icon>
            <span class="ion-hide-sm-down">Add Period</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header-background">
        <div class="header-content">
          <h1>Manage Closing Days</h1>
          <p>Schedule your business holidays and closures</p>
        </div>
      </div>

      <div class="content-container">
        <ng-container *ngIf="closingPeriods.length > 0; else emptyState">
          <ion-list lines="none" class="period-list">
            <ion-item *ngFor="let period of closingPeriods; let i = index" class="period-item" [style.animation-delay]="i * 0.05 + 's'">
              <div class="period-card">
                <div class="period-header">
                  <div class="period-icon">
                    <ion-icon name="calendar-outline"></ion-icon>
                  </div>
                  <div class="period-title">
                    <h2>{{ period.description }}</h2>
                    <div class="date-badge">
                      <ion-icon name="time-outline"></ion-icon>
                      <span>{{ period.startDate | date:'MMM d' }} - {{ period.endDate | date:'MMM d, yyyy' }}</span>
                    </div>
                  </div>
                </div>

                <div class="period-duration">
                  <div class="duration-indicator">
                    <span class="days-count">{{ calculateDays(period.startDate, period.endDate) }}</span>
                    <span class="days-label">days</span>
                  </div>
                </div>

                <div class="period-actions">
                  <ion-button fill="clear" (click)="openModal(period)" class="edit-button">
                    <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                  </ion-button>
                  <ion-button fill="clear" (click)="deletePeriod(period.id)" class="delete-button">
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            </ion-item>
          </ion-list>
        </ng-container>

        <ng-template #emptyState>
          <div class="empty-state">
            <div class="empty-illustration">
              <ion-icon name="calendar-outline"></ion-icon>
            </div>
            <h2>No closing periods</h2>
            <p>Add your first business closing period</p>
            <ion-button (click)="openModal()" class="add-empty-button">
              <ion-icon name="add-outline" slot="start"></ion-icon>
              Add Closing Period
            </ion-button>
          </div>
        </ng-template>
      </div>

      <!-- FAB button for mobile -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="fab-mobile">
        <ion-fab-button (click)="openModal()" class="gradient-fab">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    :host {
      --primary-gradient: linear-gradient(135deg, #f1c01c 0%, #da7356 100%);
      --primary-color: #f1c01c;
      --primary-dark: #da7356;
      --text-color: #333333;
      --light-text: #777777;
      --card-bg: #ffffff;
      --danger-color: #ff4961;
      --border-radius: 12px;
    }

    /* Header styling */
    .gradient-toolbar {
      --background: transparent;
      --border-width: 0;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10;
    }

    ion-title {
      font-weight: 600;
      color: white;
    }

    .add-button {
      --color: white;
      font-weight: 500;
    }

    .header-background {
      background: var(--primary-gradient);
      height: 180px;
      border-bottom-left-radius: 30px;
      border-bottom-right-radius: 30px;
      position: relative;
      box-shadow: 0 4px 20px rgba(218, 115, 86, 0.3);
      padding: 20px;
      margin-bottom: 20px;
    }

    .header-content {
      position: absolute;
      bottom: 25px;
      left: 20px;
      color: white;
    }

    .header-content h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .header-content p {
      margin: 5px 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    /* Content container */
    .content-container {
      padding: 0 16px;
      margin-top: -30px;
    }

    /* Period list */
    .period-list {
      background: transparent;
      padding: 0;
    }

    .period-item {
      --background: transparent;
      --padding-start: 0;
      --padding-end: 0;
      --inner-padding-end: 0;
      margin-bottom: 16px;
      animation: fadeIn 0.5s ease forwards;
      opacity: 0;
    }

    .period-card {
      background: var(--card-bg);
      border-radius: var(--border-radius);
      width: 100%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .period-card:active {
      transform: scale(0.98);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .period-header {
      display: flex;
      align-items: center;
      flex: 1;
    }

    .period-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(241, 192, 28, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
    }

    .period-icon ion-icon {
      font-size: 24px;
      color: var(--primary-color);
    }

    .period-title h2 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      margin: 0 0 4px;
    }

    .date-badge {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: var(--light-text);
    }

    .date-badge ion-icon {
      font-size: 14px;
      margin-right: 4px;
    }

    .period-duration {
      display: flex;
      align-items: center;
      margin: 0 16px;
    }

    .duration-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(241, 192, 28, 0.1);
      padding: 8px 12px;
      border-radius: 8px;
    }

    .days-count {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-dark);
    }

    .days-label {
      font-size: 12px;
      color: var(--light-text);
    }

    .period-actions {
      display: flex;
    }

    .edit-button {
      --color: var(--primary-dark);
      margin-right: 4px;
    }

    .delete-button {
      --color: var(--danger-color);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      animation: fadeIn 0.5s ease;
    }

    .empty-illustration {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(241, 192, 28, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .empty-illustration ion-icon {
      font-size: 40px;
      color: var(--primary-color);
    }

    .empty-state h2 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-color);
      margin: 0 0 8px;
    }

    .empty-state p {
      font-size: 14px;
      color: var(--light-text);
      margin: 0 0 24px;
    }

    .add-empty-button {
      --background: var(--primary-gradient);
      --box-shadow: 0 4px 12px rgba(241, 192, 28, 0.3);
      --border-radius: 10px;
      font-weight: 500;
    }

    /* FAB button for mobile */
    .fab-mobile {
      display: none;
    }

    .gradient-fab {
      --background: var(--primary-gradient);
      --box-shadow: 0 4px 16px rgba(241, 192, 28, 0.4);
    }

    @media (max-width: 768px) {
      .fab-mobile {
        display: block;
      }

      .add-button span {
        display: none;
      }
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ClosingDaysComponent implements OnInit, OnDestroy {
  closingPeriods: ClosingPeriod[] = [];
  private closingPeriodsSubscription: Subscription | undefined;

  constructor(
    private closingDaysService: ClosingDaysService,
    private modalController: ModalController,
    private alertController: AlertController,
    private animationCtrl: AnimationController
  ) { }

  ngOnInit() {
    this.closingPeriodsSubscription = this.closingDaysService.closingPeriods$.subscribe(
      (periods) => {
        this.closingPeriods = periods;
      }
    );
  }

  ngOnDestroy() {
    if (this.closingPeriodsSubscription) {
      this.closingPeriodsSubscription.unsubscribe();
    }
  }

  calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include the end day
  }

  async openModal(period?: ClosingPeriod) {
    const modal = await this.modalController.create({
      component: ClosingPeriodModalComponent,
      componentProps: {
        period: period ? { ...period } : { startDate: '', endDate: '', description: '' },
      },
      cssClass: 'closing-period-modal',

    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'save') {
      if (data.id) {
        await this.closingDaysService.updateClosingPeriod(data);
      } else {
        await this.closingDaysService.addClosingPeriod(data);
      }
    }
  }

  async deletePeriod(id?: string) {
    if (id) {
      const alert = await this.alertController.create({
        header: 'Confirm Delete',
        message: 'Are you sure you want to delete this closing period?',
        cssClass: 'custom-alert',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'cancel-button'
          },
          {
            text: 'Delete',
            role: 'confirm',
            cssClass: 'delete-button',
            handler: async () => {
              await this.closingDaysService.deleteClosingPeriod(id);
            },
          },
        ],
      });
      await alert.present();
    }
  }

  // Custom animations
  enterAnimation() {
    return (baseEl: HTMLElement) => {
      return this.animationCtrl.create()
        .addElement(baseEl.querySelector('.closing-period-modal')!)
        .duration(300)
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateY(40px)', 'translateY(0)');
    };
  }

  leaveAnimation() {
    return (baseEl: HTMLElement) => {
      return this.animationCtrl.create()
        .addElement(baseEl.querySelector('.closing-period-modal')!)
        .duration(200)
        .fromTo('opacity', '1', '0')
        .fromTo('transform', 'translateY(0)', 'translateY(40px)');
    };
  }
}
