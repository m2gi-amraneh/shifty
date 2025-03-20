import { Component, OnInit, OnDestroy } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  closeOutline,
  filterOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  calendarOutline,
  documentTextOutline,
  business,
  businessOutline,
  hourglassOutline,
  chevronDownOutline,
  ellipsisVerticalOutline,
  refreshOutline
} from 'ionicons/icons';
import { AbsenceRequest, AbsenceService } from '../../services/absence.service';
import { map, Observable, Subscription } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonAvatar,
  IonCardContent,
  IonItem,
  IonTextarea,
  ToastController,
  AnimationController
} from '@ionic/angular/standalone';
@Component({
  selector: 'app-absence-management',
  standalone: true,
  imports: [IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonAvatar,
    IonCardContent,
    IonItem,
    IonTextarea, CommonModule, FormsModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin-dashboard" color="light"></ion-back-button>
        </ion-buttons>
        <ion-title color="light">Absence Management</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refreshData()" color="light">
            <ion-icon name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>


      <!-- Stats Cards -->
      <div class="content-container">
        <ion-segment [(ngModel)]="selectedStatus" (ionChange)="filterRequests()" mode="ios" class="custom-segment">
          <ion-segment-button value="pending" class="segment-button">
            <ion-icon name="hourglass-outline"></ion-icon>
            <ion-label>
              <span class="status-count">{{ (absenceService.pendingRequests$ | async)?.length || 0 }}</span>
              <span class="status-label">Pending</span>
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="approved" class="segment-button">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            <ion-label>
              <span class="status-count">{{ (getApprovedCount$ | async) || 0 }}</span>
              <span class="status-label">Approved</span>
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="rejected" class="segment-button">
            <ion-icon name="close-circle-outline"></ion-icon>
            <ion-label>
              <span class="status-count">{{ (getRejectedCount$ | async) || 0 }}</span>
              <span class="status-label">Rejected</span>
            </ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Request Cards -->
        <div class="requests-container">
          <ng-container *ngIf="filteredRequests$ | async as requests">
            <div *ngIf="requests.length === 0" class="empty-state">
              <div class="empty-illustration">
                <ion-icon name="calendar-outline"></ion-icon>
              </div>
              <h2>No {{ selectedStatus }} requests</h2>
              <p>
                There are currently no {{ selectedStatus }} absence requests to
                display.
              </p>
            </div>

            <ion-card
              *ngFor="let request of requests; let i = index"
              class="request-card animate-card"
              [class]="request.status"
              [style.animation-delay]="i * 0.1 + 's'"
            >
              <div class="status-indicator" [class]="request.status"></div>
              <div class="request-header">
                <div class="employee-info">
                  <ion-avatar>
                    <img
                      [src]="
                        'https://ui-avatars.com/api/?name=' + request.employeeName + '&background=FF758C&color=fff'
                      "
                      alt="employee avatar"
                    />
                  </ion-avatar>
                  <div class="text-info">
                    <h2>{{ request.employeeName }}</h2>
                    <p class="type">
                      <ion-icon name="business-outline"></ion-icon>
                      {{ request.type | titlecase }}
                    </p>
                  </div>
                </div>
                <div class="date-badge">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <span>{{ request.startDate | date : 'MMM d' }} - {{ request.endDate | date : 'MMM d, yyyy' }}</span>
                </div>
              </div>

              <ion-card-content>
                <div class="reason-section">
                  <h3>
                    <ion-icon name="document-text-outline"></ion-icon> Reason
                  </h3>
                  <p>{{ request.reason }}</p>
                </div>

                <div *ngIf="request.status === 'pending'" class="action-section">
                  <ion-item lines="none" class="comment-input">
                    <ion-label position="stacked">Admin Comment</ion-label>
                    <ion-textarea
                      [(ngModel)]="request.adminComment"
                      placeholder="Add your comment here..."
                      class="custom-textarea"
                      rows="3"
                    ></ion-textarea>
                  </ion-item>

                  <div class="action-buttons">
                    <ion-button
                      fill="solid"
                      class="approve-button"
                      (click)="updateStatus(request, 'approved')"
                    >
                      <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                      Approve
                    </ion-button>
                    <ion-button
                      fill="solid"
                      class="reject-button"
                      (click)="updateStatus(request, 'rejected')"
                    >
                      <ion-icon name="close-outline" slot="start"></ion-icon>
                      Reject
                    </ion-button>
                  </div>
                </div>

                <div *ngIf="request.status !== 'pending'" class="status-section">
                  <div [class]="'status-chip ' + request.status">
                    <ion-icon
                      [name]="
                        request.status === 'approved'
                          ? 'checkmark-circle-outline'
                          : 'close-circle-outline'
                      "
                    ></ion-icon>
                    {{ request.status | uppercase }}
                  </div>
                  <div *ngIf="request.adminComment" class="admin-comment">
                    <h3>Admin Comment</h3>
                    <p>{{ request.adminComment }}</p>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </ng-container>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* Main theme colors */
      :host {
        --primary-gradient: linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%);
        --primary-color: #ff758c;
        --primary-light: rgba(255, 117, 140, 0.15);
        --secondary-color: #ff7eb3;
        --text-light: #ffffff;
        --text-dark: #333333;
        --pending-color: #ffb74d;
        --pending-bg: rgba(255, 183, 77, 0.15);
        --approved-color: #66bb6a;
        --approved-bg: rgba(102, 187, 106, 0.15);
        --rejected-color: #ef5350;
        --rejected-bg: rgba(239, 83, 80, 0.15);
        --card-bg: #ffffff;
        --card-shadow: 0 8px 20px rgba(255, 117, 140, 0.1);
        --border-radius: 16px;
      }

      /* Header styling */
      .header-toolbar {
        --background: linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%);
        --border-width: 0;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
      }

      .header-background {
        background: var(--primary-gradient);

        box-shadow: 0 4px 20px rgba(255, 117, 140, 0.3);

      }

      .header-content {
        bottom: 25px;
        left: 20px;
        color: var(--text-light);
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
        margin-top: 60px;
      }

      /* Custom Segment */
      .custom-segment {
        background: var(--card-bg);
        border-radius: var(--border-radius);
        box-shadow: var(--card-shadow);
        margin-bottom: 24px;
        padding: 5px;
        --background: white;
      }

      .segment-button {
        border-radius: 12px !important;
        padding: 8px 0;
        min-height: 70px;
        display: flex;
        flex-direction: column;
      }

      .status-count {
        display: block;
        font-size: 20px;
        font-weight: 700;
        margin-top: 5px;
      }

      .status-label {
        display: block;
        font-size: 12px;
        opacity: 0.8;
      }

      ion-segment-button.segment-button-checked {
        --indicator-color: transparent;
        background: var(--primary-light);
        color: var(--primary-color) !important;
      }

      ion-segment-button.segment-button-checked ion-icon {
        color: var(--primary-color);
      }

      /* Empty state styling */
      .empty-state {
        text-align: center;
        padding: 30px 16px;
        color: var(--text-dark);
        opacity: 0.7;
        background: var(--card-bg);
        border-radius: var(--border-radius);
        box-shadow: var(--card-shadow);
        animation: fadeIn 0.5s ease;
      }

      .empty-illustration {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: var(--primary-light);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      }

      .empty-illustration ion-icon {
        font-size: 36px;
        color: var(--primary-color);
      }

      .empty-state h2 {
        font-size: 18px;
        margin-bottom: 8px;
      }

      .empty-state p {
        font-size: 14px;
        max-width: 260px;
        margin: 0 auto;
        line-height: 1.4;
      }

      /* Request Card Styling */
      .request-card {
        margin: 0 0 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--card-shadow);
        overflow: hidden;
        border: none;
        position: relative;
        transition: all 0.3s ease;
      }

      .request-card:active {
        transform: scale(0.98);
      }

      .animate-card {
        animation: slideInUp 0.5s ease forwards;
        opacity: 0;
        transform: translateY(20px);
      }

      .status-indicator {
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
      }

      .status-indicator.pending {
        background-color: var(--pending-color);
      }

      .status-indicator.approved {
        background-color: var(--approved-color);
      }

      .status-indicator.rejected {
        background-color: var(--rejected-color);
      }

      .request-header {
        padding: 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }

      .employee-info {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .employee-info ion-avatar {
        width: 48px;
        height: 48px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      .employee-info .text-info h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-dark);
      }

      .text-info .type {
        margin: 4px 0 0;
        color: #777;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .date-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background-color: var(--primary-light);
        color: var(--primary-color);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
      }

      .reason-section {
        margin-bottom: 16px;
      }

      .reason-section h3 {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        color: var(--text-dark);
        margin: 0 0 8px;
        font-weight: 600;
      }

      .reason-section p {
        margin: 0;
        color: #666;
        line-height: 1.5;
        font-size: 14px;
      }

      /* Action buttons */
      .action-section .comment-input {
        --background: rgba(0, 0, 0, 0.03);
        border-radius: 12px;
        margin-bottom: 16px;
      }

      .action-section ion-label {
        color: var(--text-dark);
        font-weight: 500;
        font-size: 14px;
        margin-bottom: 6px;
      }

      .custom-textarea {
        --padding-start: 12px;
        --padding-end: 12px;
        --background: rgba(0, 0, 0, 0.03);
        border-radius: 8px;
        font-size: 14px;
      }

      .action-buttons {
        display: flex;
        gap: 12px;
      }

      .approve-button {
        flex: 1;
        --background: var(--approved-color);
        --background-hover: var(--approved-color);
        --background-activated: var(--approved-color);
        --border-radius: 12px;
        min-height: 44px;
        margin: 0;
      }

      .reject-button {
        flex: 1;
        --background: var(--rejected-color);
        --background-hover: var(--rejected-color);
        --background-activated: var(--rejected-color);
        --border-radius: 12px;
        min-height: 44px;
        margin: 0;
      }

      /* Status section */
      .status-section {
        display: flex;
        flex-direction: column;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 16px;
        align-self: flex-start;
      }

      .status-chip.approved {
        background-color: var(--approved-bg);
        color: var(--approved-color);
      }

      .status-chip.rejected {
        background-color: var(--rejected-bg);
        color: var(--rejected-color);
      }

      .status-chip ion-icon {
        font-size: 16px;
      }

      .admin-comment {
        background-color: rgba(0, 0, 0, 0.03);
        padding: 12px 16px;
        border-radius: 12px;
      }

      .admin-comment h3 {
        font-size: 14px;
        color: var(--text-dark);
        margin: 0 0 8px;
        font-weight: 600;
      }

      .admin-comment p {
        margin: 0;
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }

      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideInUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class AbsenceManagementPage implements OnInit, OnDestroy {
  selectedStatus: 'pending' | 'approved' | 'rejected' = 'pending';
  filteredRequests$!: Observable<AbsenceRequest[]>;
  private statusSubscription?: Subscription;
  getApprovedCount$!: Observable<number>;
  getRejectedCount$!: Observable<number>;

  constructor(
    public absenceService: AbsenceService,
    private toastController: ToastController,
    private animationCtrl: AnimationController
  ) {
    addIcons({
      hourglassOutline,
      businessOutline,
      documentTextOutline,
      calendarOutline,
      checkmarkOutline,
      closeOutline,
      filterOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      chevronDownOutline,
      ellipsisVerticalOutline,
      refreshOutline
    });
  }

  ngOnInit() {
    this.filterRequests();
    this.getApprovedCount$ = this.absenceService.allRequests$.pipe(
      map(
        (requests) => requests.filter((req) => req.status === 'approved').length
      )
    );

    this.getRejectedCount$ = this.absenceService.allRequests$.pipe(
      map(
        (requests) => requests.filter((req) => req.status === 'rejected').length
      )
    );
  }

  ngOnDestroy() {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  filterRequests() {
    if (this.selectedStatus === 'pending') {
      this.filteredRequests$ = this.absenceService.pendingRequests$;
    } else {
      this.filteredRequests$ = this.absenceService.getFilteredRequests(
        this.selectedStatus
      );
    }
  }

  refreshData() {
    // Simulate refresh with a toast notification
    this.presentToast('Data refreshed successfully', 'success');
    // Here you'd typically call a method to refresh data from your service
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

  async updateStatus(
    request: AbsenceRequest,
    newStatus: 'approved' | 'rejected'
  ) {
    if (request.id) {
      try {
        const success = await this.absenceService.updateRequestStatus(
          request.id,
          newStatus,
          request.adminComment || ''
        );

        if (success) {
          // Display success message with appropriate messaging
          const actionText = newStatus === 'approved' ? 'approved' : 'rejected';
          this.presentToast(`Request ${actionText} successfully`, newStatus === 'approved' ? 'success' : 'danger');
        }
      } catch (error) {
        console.error('Error updating request status:', error);
        // Display error message
        this.presentToast('Error updating request status', 'danger');
      }
    }
  }
}
