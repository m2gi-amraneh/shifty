import { Component, OnInit } from '@angular/core';
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
} from 'ionicons/icons';
import { AbsenceRequest, AbsenceService } from '../services/absence.service';

@Component({
  selector: 'app-absence-management',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar class="header-toolbar">
        <ion-title>Absence Management</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleFilterMenu()">
            <ion-icon name="filter-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-segment [(ngModel)]="selectedStatus" (ionChange)="filterRequests()">
        <ion-segment-button value="pending">
          <ion-label>Pending</ion-label>
          <ion-icon name="time-outline"></ion-icon>
        </ion-segment-button>
        <ion-segment-button value="approved">
          <ion-label>Approved</ion-label>
          <ion-icon name="checkmark-circle-outline"></ion-icon>
        </ion-segment-button>
        <ion-segment-button value="rejected">
          <ion-label>Rejected</ion-label>
          <ion-icon name="close-circle-outline"></ion-icon>
        </ion-segment-button>
      </ion-segment>

      <div class="requests-container">
        <ion-card *ngFor="let request of filteredRequests" class="request-card">
          <ion-card-header>
            <ion-card-subtitle>{{
              request.type | titlecase
            }}</ion-card-subtitle>
            <ion-card-title>{{ request.employeeName }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <ion-grid>
              <ion-row>
                <ion-col size="6">
                  <p><strong>Start Date:</strong></p>
                  <p>{{ request.startDate | date }}</p>
                </ion-col>
                <ion-col size="6">
                  <p><strong>End Date:</strong></p>
                  <p>{{ request.endDate | date }}</p>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col size="12">
                  <p><strong>Reason:</strong></p>
                  <p>{{ request.reason }}</p>
                </ion-col>
              </ion-row>

              <ion-row *ngIf="request.status === 'pending'">
                <ion-col size="12">
                  <ion-item>
                    <ion-label position="floating">Admin Comment</ion-label>
                    <ion-textarea
                      [(ngModel)]="request.adminComment"
                    ></ion-textarea>
                  </ion-item>
                </ion-col>
              </ion-row>

              <ion-row
                *ngIf="request.status === 'pending'"
                class="action-buttons"
              >
                <ion-col>
                  <ion-button
                    expand="block"
                    color="success"
                    (click)="updateStatus(request, 'approved')"
                  >
                    <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                    Approve
                  </ion-button>
                </ion-col>
                <ion-col>
                  <ion-button
                    expand="block"
                    color="danger"
                    (click)="updateStatus(request, 'rejected')"
                  >
                    <ion-icon name="close-outline" slot="start"></ion-icon>
                    Reject
                  </ion-button>
                </ion-col>
              </ion-row>

              <ion-row *ngIf="request.status !== 'pending'" class="status-info">
                <ion-col size="12">
                  <div [class]="'status-badge ' + request.status">
                    {{ request.status | uppercase }}
                  </div>
                  <p *ngIf="request.adminComment" class="admin-comment">
                    <strong>Admin Comment:</strong> {{ request.adminComment }}
                  </p>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .header-toolbar {
        --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        --color: white;
      }

      ion-segment {
        margin-bottom: 1rem;
        --background: var(--ion-color-light);
      }

      .requests-container {
        display: grid;
        gap: 1rem;
        padding: 1rem;
      }

      .request-card {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .status-badge {
        display: inline-block;
        padding: 0.5rem 1rem;
        border-radius: 50px;
        font-weight: bold;
        text-align: center;
        margin-top: 1rem;
      }

      .status-badge.approved {
        background-color: var(--ion-color-success);
        color: white;
      }

      .status-badge.rejected {
        background-color: var(--ion-color-danger);
        color: white;
      }

      .status-badge.pending {
        background-color: var(--ion-color-warning);
        color: white;
      }

      .action-buttons {
        margin-top: 1rem;
      }

      .admin-comment {
        margin-top: 1rem;
        padding: 0.5rem;
        background-color: var(--ion-color-light);
        border-radius: 8px;
      }
    `,
  ],
})
export class AbcanceAdminPage implements OnInit {
  selectedStatus: 'pending' | 'approved' | 'rejected' = 'pending';
  filteredRequests: AbsenceRequest[] = [];

  constructor(private absenceService: AbsenceService) {
    addIcons({
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
  }

  filterRequests() {
    if (this.selectedStatus === 'pending') {
      this.absenceService.getPendingRequests().subscribe((requests) => {
        this.filteredRequests = requests;
      });
    } else {
      this.absenceService
        .getFilteredRequests(this.selectedStatus)
        .subscribe((requests) => {
          this.filteredRequests = requests;
        });
    }
  }

  async updateStatus(
    request: AbsenceRequest,
    newStatus: 'approved' | 'rejected'
  ) {
    if (request.id) {
      try {
        await this.absenceService.updateRequestStatus(
          request.id,
          newStatus,
          request.adminComment || ''
        );
        this.filterRequests();
      } catch (error) {
        console.error('Error updating request status:', error);
      }
    }
  }

  toggleFilterMenu() {
    // Implement additional filtering if needed
  }
}
