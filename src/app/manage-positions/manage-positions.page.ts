import { Component, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { PositionsService } from '../services/positions.service';
import { FormsModule } from '@angular/forms';
import { PositionModalComponent } from '../components/position-modal/position-modal.component';
import { Observable } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonFab,
  IonFabButton,
  IonAlert,
  IonSpinner, AnimationController, ToastController
} from '@ionic/angular/standalone';
@Component({
  selector: 'app-manage-positions',
  standalone: true,
  imports: [IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonFab,
    IonFabButton,
    IonAlert,
    IonSpinner, CommonModule, FormsModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin-dashboard" color="light"></ion-back-button>
        </ion-buttons>
        <ion-title color="light">Work Positions</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="loadPositions(true)" color="light">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" #content>


      <div class="content-container">
        <!-- Stats summary -->
        <div class="stats-card" *ngIf="positions$ | async as positions">
          <div class="stat-item">
            <div class="stat-value">{{ positions.length }}</div>
            <div class="stat-label">Total Positions</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ getActivePositions(positions) }}</div>
            <div class="stat-label">Active</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-action">
            <ion-button class="add-button" (click)="openModal()">
              <ion-icon name="add-outline" slot="start"></ion-icon>
              New Position
            </ion-button>
          </div>
        </div>

        <!-- Position List -->
        <div class="list-container">
          <h2 class="section-title">
            <ion-icon name="briefcase-outline"></ion-icon>
            Position List
          </h2>

          <ng-container *ngIf="positions$ | async as positions; else loading">
            <div *ngIf="positions.length === 0" class="empty-state">
              <div class="empty-illustration">
                <ion-icon name="briefcase-outline"></ion-icon>
              </div>
              <h2>No positions found</h2>
              <p>Start by adding your first job position</p>
              <ion-button class="empty-action" (click)="openModal()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Add Position
              </ion-button>
            </div>

            <ion-list class="custom-list" *ngIf="positions.length > 0">
              <ion-item-sliding *ngFor="let position of positions; let i = index" class="custom-item" [style.animation-delay]="i * 0.05 + 's'">
                <ion-item lines="none" detail="false" class="position-item">
                  <div class="position-avatar">
                    <span>{{ position.name.charAt(0) }}</span>
                  </div>
                  <ion-label>
                    <h2>{{ position.name }}</h2>
                    <p> {{ position.description}}</p>
                  </ion-label>
                  <ion-button fill="clear" (click)="openModal(position)" class="edit-button">
                    <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                  </ion-button>
                </ion-item>

                <ion-item-options side="end">
                  <ion-item-option color="danger" (click)="confirmDelete(position)">
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
          </ng-container>

          <ng-template #loading>
            <div class="loading-container">
              <ion-spinner name="circles" color="success"></ion-spinner>
              <p>Loading positions...</p>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- FAB button for mobile -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed" class="fab-mobile">
        <ion-fab-button (click)="openModal()" color="success">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- Delete confirmation modal -->
    <ion-alert
      [isOpen]="showDeleteAlert"
      header="Confirm Deletion"
      message="Are you sure you want to delete this position? This action cannot be undone."


    ></ion-alert>
  `,
  styles: [
    `
      :host {
        --primary-color: #4caf50;
        --primary-dark: #087f23;
        --primary-light: #80e27e;
        --primary-gradient: linear-gradient(135deg, #4caf50 0%, #087f23 100%);
        --text-on-primary: #ffffff;
        --card-bg: #ffffff;
        --danger-color: #f44336;
        --border-radius: 16px;
      }

      /* Header styling */
      .header-toolbar {
        --background: linear-gradient(135deg, #4caf50 0%, #087f23 100%);

        height: 80px;
        border-bottom-left-radius: 30px;
        border-bottom-right-radius: 30px;
        position: relative;
        box-shadow: 0 4px 20px rgba(8, 127, 35, 0.3);
        padding: 20px;
        margin-bottom: 20px;

      }

      .header-background {
        background: var(--primary-gradient);
        height: 50px;
        border-bottom-left-radius: 30px;
        border-bottom-right-radius: 30px;
        position: relative;
        box-shadow: 0 4px 20px rgba(8, 127, 35, 0.3);
        padding: 20px;
        margin-bottom: 20px;
      }

      .header-content {

        color: var(--text-on-primary);
      }

      .header-content h1 {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
      }

      .header-content p {
        margin: 5px 0 0;
        opacity: 0.9;
        font-size: 14px;
      }

      /* Content container */
      .content-container {
        padding: 0 16px;

      }

      /* Stats card */
      .stats-card {
        background: var(--card-bg);
        border-radius: var(--border-radius);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        padding: 20px;
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        animation: slideInUp 0.5s ease;
      }

      .stat-item {
        flex: 1;
        text-align: center;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--primary-dark);
      }

      .stat-label {
        font-size: 14px;
        color: #666;
        margin-top: 4px;
      }

      .stat-divider {
        width: 1px;
        height: 40px;
        background-color: #e0e0e0;
        margin: 0 16px;
      }

      .stat-action {
        padding-left: 16px;
      }

      .add-button {
        --background: var(--primary-color);
        --background-activated: var(--primary-dark);
        --background-hover: var(--primary-dark);
        --box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        --border-radius: 12px;
        height: 44px;
        font-weight: 600;
      }

      /* Section title */
      .section-title {
        display: flex;
        align-items: center;
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0 0 16px;
      }

      .section-title ion-icon {
        margin-right: 8px;
        color: var(--primary-color);
        font-size: 22px;
      }

      /* List styling */
      .list-container {
        background: var(--card-bg);
        border-radius: var(--border-radius);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        padding: 20px;
        margin-bottom: 24px;
        overflow: hidden;
      }

      .custom-list {
        background: transparent;
        padding: 0;
      }

      .custom-item {
        --background: transparent;
        animation: fadeIn 0.5s ease forwards;
        opacity: 0;
      }

      .position-item {
        --background: rgba(76, 175, 80, 0.05);
        --border-radius: 12px;
        margin-bottom: 12px;
        --padding-start: 8px;
        --inner-padding-end: 8px;
        --padding-top: 8px;
        --padding-bottom: 8px;
        transition: all 0.2s ease;
      }

      .position-item:active {
        --background: rgba(76, 175, 80, 0.1);
      }

      .position-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--primary-gradient);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        color: white;
        font-weight: 600;
        font-size: 18px;
      }

      ion-label h2 {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 4px;
      }

      ion-label p {
        font-size: 13px;
        color: #666;
        margin: 0;
      }

      .edit-button {
        --color: var(--primary-color);
      }

      /* Empty state */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px 20px;
        text-align: center;
        animation: fadeIn 0.5s ease;
      }

      .empty-illustration {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(76, 175, 80, 0.1);
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
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0 0 8px;
      }

      .empty-state p {
        font-size: 14px;
        color: #666;
        margin: 0 0 20px;
      }

      .empty-action {
        --background: var(--primary-color);
        --background-activated: var(--primary-dark);
        --background-hover: var(--primary-dark);
        --border-radius: 12px;
        --box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      }

      /* Loading state */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }

      .loading-container ion-spinner {
        margin-bottom: 16px;
      }

      .loading-container p {
        color: #666;
        font-size: 14px;
        margin: 0;
      }

      /* FAB button (visible only on mobile) */
      .fab-mobile {
        display: none;
      }

      @media (max-width: 768px) {
        .stats-card .stat-action {
          display: none;
        }
        .fab-mobile {
          display: block;
        }
      }

      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ManagePositionsPage {
  @ViewChild('content') content!: IonContent;
  positions$: Observable<any[]>;
  showDeleteAlert: boolean = false;
  positionToDelete: any = null;

  constructor(
    private positionsService: PositionsService,
    private modalController: ModalController,
    private animationCtrl: AnimationController,
    private toastController: ToastController
  ) {
    this.positions$ = this.positionsService.getPositions();
  }

  getActivePositions(positions: any[]): number {
    // Assuming positions with active property, or count all as active
    return positions.filter(p => p.active !== false).length;
  }

  loadPositions(showToast: boolean = false) {
    this.positions$ = this.positionsService.getPositions();

    if (showToast) {
      this.presentToast('Positions refreshed successfully', 'success');
    }
  }

  async openModal(position: any = null) {
    const modal = await this.modalController.create({
      component: PositionModalComponent,
      componentProps: {
        position: position ? { ...position } : { name: '' },
        editing: !!position,
      },
      cssClass: 'position-modal',

      leaveAnimation: this.leaveAnimation()
    });

    modal.onDidDismiss().then((data) => {
      if (data.data && data.data.saved) {
        this.loadPositions();
        this.presentToast(
          position ? 'Position updated successfully' : 'Position added successfully',
          'success'
        );

        // Scroll to top after adding a new position
        if (!position) {
          this.content.scrollToTop(300);
        }
      }
    });

    return await modal.present();
  }

  confirmDelete(position: any) {
    this.positionToDelete = position;
    this.showDeleteAlert = true;
  }

  deletePosition(id: string) {
    this.positionsService.deletePosition(id).then(() => {
      this.loadPositions();
      this.presentToast('Position deleted successfully', 'danger');
    });
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
      cssClass: 'custom-toast',
      buttons: [
        {
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  enterAnimation() {
    return (baseEl: HTMLElement) => {
      return this.animationCtrl.create()
        .addElement(baseEl.querySelector('.position-modal')!)
        .duration(300)
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateY(50px)', 'translateY(0)');
    };
  }

  leaveAnimation() {
    return (baseEl: HTMLElement) => {
      return this.animationCtrl.create()
        .addElement(baseEl.querySelector('.position-modal')!)
        .duration(200)
        .fromTo('opacity', '1', '0')
        .fromTo('transform', 'translateY(50px)', 'translateY(0)');
    };
  }
}
