import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
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
} from 'ionicons/icons';
import { AbsenceRequest, AbsenceService } from '../services/absence.service';
import { map, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-absence-management',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar class="header-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/admin-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>My Absences</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Stats Cards -->
      <ion-grid class="stats-grid">
        <ion-row>
          <ion-col size="4">
            <ion-card
              class="stats-card pending"
              [class.active]="selectedStatus === 'pending'"
              (click)="selectedStatus = 'pending'; filterRequests()"
            >
              <ion-card-content>
                <ion-icon name="hourglass-outline"></ion-icon>
                <h2>
                  {{ (absenceService.pendingRequests$ | async)?.length || 0 }}
                </h2>
                <p>Pending</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="4">
            <ion-card
              class="stats-card approved"
              [class.active]="selectedStatus === 'approved'"
              (click)="selectedStatus = 'approved'; filterRequests()"
            >
              <ion-card-content>
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <h2>{{ (getApprovedCount$ | async) || 0 }}</h2>
                <p>Approved</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="4">
            <ion-card
              class="stats-card rejected"
              [class.active]="selectedStatus === 'rejected'"
              (click)="selectedStatus = 'rejected'; filterRequests()"
            >
              <ion-card-content>
                <ion-icon name="close-circle-outline"></ion-icon>
                <h2>{{ (getRejectedCount$ | async) || 0 }}</h2>
                <p>Rejected</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Request Cards -->
      <div class="requests-container">
        <ng-container *ngIf="filteredRequests$ | async as requests">
          <div *ngIf="requests.length === 0" class="empty-state">
            <ion-icon name="calendar-outline"></ion-icon>
            <h2>No {{ selectedStatus }} requests</h2>
            <p>
              There are currently no {{ selectedStatus }} absence requests to
              display.
            </p>
          </div>

          <ion-card
            *ngFor="let request of requests"
            class="request-card"
            [class]="request.status"
          >
            <div class="request-header">
              <div class="employee-info">
                <ion-avatar>
                  <img
                    [src]="
                      'https://ui-avatars.com/api/?name=' + request.employeeName
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
                <span
                  >{{ request.startDate | date : 'shortDate' }} -
                  {{ request.endDate | date : 'shortDate' }}</span
                >
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
                  ></ion-textarea>
                </ion-item>

                <div class="action-buttons">
                  <ion-button
                    fill="solid"
                    color="success"
                    (click)="updateStatus(request, 'approved')"
                    class="action-button"
                  >
                    <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                    Approve
                  </ion-button>
                  <ion-button
                    fill="solid"
                    color="danger"
                    (click)="updateStatus(request, 'rejected')"
                    class="action-button"
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
    </ion-content>
  `,
  styles: [
    `
      .header-toolbar {
        --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        --color: white;
      }

      .title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
        color: var(--ion-color-dark);
      }

      .stats-grid {
        margin-bottom: 1rem;
      }

      .stats-card {
        margin: 0;
        border-radius: 16px;
        transition: all 0.3s ease;
        cursor: pointer;

        &.active {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        ion-card-content {
          text-align: center;
          padding: 1rem;

          ion-icon {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }

          h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0.5rem 0;
          }

          p {
            margin: 0;
            color: var(--ion-color-medium);
            font-size: 0.9rem;
          }
        }

        &.pending ion-icon {
          color: var(--ion-color-warning);
        }

        &.approved ion-icon {
          color: var(--ion-color-success);
        }

        &.rejected ion-icon {
          color: var(--ion-color-danger);
        }
      }

      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--ion-color-medium);

        ion-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        h2 {
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }

        p {
          font-size: 0.9rem;
          max-width: 300px;
          margin: 0 auto;
        }
      }

      .request-card {
        margin: 1rem 0;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        overflow: hidden;

        .request-header {
          padding: 1rem;
          background: var(--ion-color-light);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);

          .employee-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;

            ion-avatar {
              width: 48px;
              height: 48px;
            }

            .text-info {
              h2 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
              }

              .type {
                margin: 0.25rem 0 0;
                color: var(--ion-color-medium);
                display: flex;
                align-items: center;
                gap: 0.25rem;

                ion-icon {
                  font-size: 0.9rem;
                }
              }
            }
          }

          .date-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: var(--ion-color-medium);

            ion-icon {
              font-size: 1rem;
            }
          }
        }

        .reason-section {
          margin-bottom: 1rem;

          h3 {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            color: var(--ion-color-dark);
            margin-bottom: 0.5rem;

            ion-icon {
              font-size: 1.1rem;
            }
          }

          p {
            margin: 0;
            color: var(--ion-color-medium);
            line-height: 1.4;
          }
        }

        .action-section {
          .comment-input {
            --background: var(--ion-color-light);
            border-radius: 8px;
            margin-bottom: 1rem;

            ion-label {
              color: var(--ion-color-dark);
              font-weight: 500;
            }

            .custom-textarea {
              --background: var(--ion-color-light);
              --padding-start: 0;
              --padding-end: 0;
              margin-top: 0.5rem;
            }
          }

          .action-buttons {
            display: flex;
            gap: 1rem;

            .action-button {
              flex: 1;
              margin: 0;
              --border-radius: 8px;
            }
          }
        }

        .status-section {
          .status-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem 1rem;
            border-radius: 100px;
            font-size: 0.9rem;
            font-weight: 500;
            margin-bottom: 1rem;

            &.approved {
              background: var(--ion-color-success-light);
              color: var(--ion-color-success);
            }

            &.rejected {
              background: var(--ion-color-danger-light);
              color: var(--ion-color-danger);
            }

            ion-icon {
              font-size: 1.1rem;
            }
          }

          .admin-comment {
            background: var(--ion-color-light);
            padding: 1rem;
            border-radius: 8px;

            h3 {
              font-size: 0.9rem;
              color: var(--ion-color-dark);
              margin: 0 0 0.5rem;
            }

            p {
              margin: 0;
              color: var(--ion-color-medium);
              font-size: 0.9rem;
              line-height: 1.4;
            }
          }
        }
      }
    `,
  ],
})
export class AbcanceAdminPage implements OnInit, OnDestroy {
  selectedStatus: 'pending' | 'approved' | 'rejected' = 'pending';
  filteredRequests$!: Observable<AbsenceRequest[]>;
  private statusSubscription?: Subscription;
  getApprovedCount$!: Observable<number>;
  getRejectedCount$!: Observable<number>;
  constructor(
    public absenceService: AbsenceService,
    private toastController: ToastController
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
  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
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
          // Display success message
          this.presentToast(`Request ${newStatus} successfully`, 'success');
        }
      } catch (error) {
        console.error('Error updating request status:', error);
        // Display error message
        this.presentToast('Error updating request status', 'danger');
      }
    }
  }

  toggleFilterMenu() {
    // Implémentez le filtrage supplémentaire si nécessaire
  }
}
