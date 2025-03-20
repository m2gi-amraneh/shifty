import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  IonicModule,

} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { AbsenceRequest, AbsenceService } from '../../services/absence.service';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  timeOutline,
  alertCircleOutline,
  paperPlaneOutline,
  addOutline,
  listOutline,
  chatboxOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItemGroup,
  IonItemDivider,
  IonChip,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonItem,
  IonDatetimeButton,
  IonModal,
  IonDatetime,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  ToastController,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-request-absence',
  standalone: true,
  imports: [IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItemGroup,
    IonItemDivider,
    IonChip,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonItem,
    IonDatetimeButton,
    IonModal,
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton, CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar class="header-toolbar">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/employee-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>My Absences</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding custom-content">
      <!-- Segment Control -->
      <ion-segment [(ngModel)]="selectedView" class="custom-segment">
        <ion-segment-button value="list">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>My Absences</ion-label>
        </ion-segment-button>
        <ion-segment-button value="new">
          <ion-icon name="add-outline"></ion-icon>
          <ion-label>New Request</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- List View -->
      <div *ngIf="selectedView === 'list'" class="fade-in">
        <ion-card class="status-summary">
          <ion-grid>
            <ion-row>
              <ion-col size="4">
                <div class="status-box pending">
                  <h3>{{ getPendingCount() }}</h3>
                  <p>Pending</p>
                </div>
              </ion-col>
              <ion-col size="4">
                <div class="status-box approved">
                  <h3>{{ getApprovedCount() }}</h3>
                  <p>Approved</p>
                </div>
              </ion-col>
              <ion-col size="4">
                <div class="status-box rejected">
                  <h3>{{ getRejectedCount() }}</h3>
                  <p>Rejected</p>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card>

        <ion-list>
          <ion-item-group>
            <ion-item-divider sticky>
              <ion-label>Current & Upcoming</ion-label>
            </ion-item-divider>

            <ion-card
              *ngFor="let request of getCurrentAndUpcomingRequests()"
              class="request-card"
            >
              <ion-card-content>
                <div class="request-header">
                  <ion-chip [class]="'status-chip ' + request.status">
                    {{ request.status | titlecase }}
                  </ion-chip>
                  <span class="request-date">
                    {{ request.submissionDate | date : 'mediumDate' }}
                  </span>
                </div>

                <h2 class="request-type">{{ request.type | titlecase }}</h2>
                <p class="date-range">
                  <ion-icon name="calendar-outline"></ion-icon>
                  {{ request.startDate | date }} - {{ request.endDate | date }}
                </p>
                <p class="request-reason">{{ request.reason }}</p>

                <div *ngIf="request.adminComment" class="admin-comment">
                  <ion-icon name="chatbox-outline"></ion-icon>
                  {{ request.adminComment }}
                </div>
              </ion-card-content>
            </ion-card>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider sticky>
              <ion-label>Past Requests</ion-label>
            </ion-item-divider>

            <ion-card
              *ngFor="let request of getPastRequests()"
              class="request-card past"
            >
              <ion-card-content>
                <div class="request-header">
                  <ion-chip [class]="'status-chip ' + request.status">
                    {{ request.status | titlecase }}
                  </ion-chip>
                  <span class="request-date">
                    {{ request.submissionDate | date : 'mediumDate' }}
                  </span>
                </div>

                <h2 class="request-type">{{ request.type | titlecase }}</h2>
                <p class="date-range">
                  <ion-icon name="calendar-outline"></ion-icon>
                  {{ request.startDate | date }} - {{ request.endDate | date }}
                </p>
                <p class="request-reason">{{ request.reason }}</p>
              </ion-card-content>
            </ion-card>
          </ion-item-group>
        </ion-list>
      </div>

      <!-- New Request Form -->
      <div *ngIf="selectedView === 'new'" class="fade-in">
        <form [formGroup]="absenceForm" (ngSubmit)="submitRequest()">
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>New Absence Request</ion-card-title>
              <ion-card-subtitle
                >Please fill in all required information</ion-card-subtitle
              >
            </ion-card-header>

            <ion-card-content>
              <div class="date-container">
                <ion-item lines="none" class="custom-item">
                  <ion-icon name="calendar-outline" slot="start"></ion-icon>
                  <ion-label position="top">Start Date</ion-label>
                  <ion-datetime-button
                    datetime="startDate"
                  ></ion-datetime-button>
                  <ion-modal [keepContentsMounted]="true">
                    <ng-template>
                      <ion-datetime
                        id="startDate"
                        formControlName="startDate"
                        [min]="minDate"
                        presentation="date"
                      >
                      </ion-datetime>
                    </ng-template>
                  </ion-modal>
                </ion-item>

                <ion-item lines="none" class="custom-item">
                  <ion-icon name="calendar-outline" slot="start"></ion-icon>
                  <ion-label position="top">End Date</ion-label>
                  <ion-datetime-button datetime="endDate"></ion-datetime-button>
                  <ion-modal [keepContentsMounted]="true">
                    <ng-template>
                      <ion-datetime
                        id="endDate"
                        formControlName="endDate"
                        [min]="minDate"
                        presentation="date"
                      >
                      </ion-datetime>
                    </ng-template>
                  </ion-modal>
                </ion-item>
              </div>

              <ion-item lines="none" class="custom-item">
                <ion-icon name="alert-circle-outline" slot="start"></ion-icon>
                <ion-label position="stacked">Absence Type</ion-label>
                <ion-select formControlName="type" placeholder="Select type">
                  <ion-select-option value="vacation"
                    >Vacation</ion-select-option
                  >
                  <ion-select-option value="sick">Sick Leave</ion-select-option>
                  <ion-select-option value="personal"
                    >Personal Leave</ion-select-option
                  >
                  <ion-select-option value="other">Other</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item lines="none" class="custom-item">
                <ion-icon name="document-text-outline" slot="start"></ion-icon>
                <ion-label position="stacked">Reason</ion-label>
                <ion-textarea
                  formControlName="reason"
                  placeholder="Please provide details about your absence request"
                  [rows]="4"
                  class="custom-textarea"
                ></ion-textarea>
              </ion-item>

              <div class="submit-button-container">
                <ion-button
                  expand="block"
                  type="submit"
                  [disabled]="!absenceForm.valid || isSubmitting"
                  class="submit-button"
                >
                  <ion-icon name="paper-plane-outline" slot="start"></ion-icon>
                  Submit Request
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </form>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .custom-content {
  --background: #f8f5f7;
}

.header-toolbar {
  --background: linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%);
  --color: white;
}

.custom-segment {
  margin: 16px 0;
  border-radius: 8px;
  --background: white;
  ion-segment-button {
    --indicator-color: #ff758c;
    --color: #ff758c;
    --color-checked: #ff758c;
  }
}

.status-summary {
  margin: 16px 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(255, 117, 140, 0.1);
}

.status-box {
  text-align: center;
  padding: 16px;
  h3 {
    margin: 0;
    font-size: 24px;
    font-weight: bold;
  }
  p {
    margin: 4px 0 0;
    color: #8c8c8c;
  }
}

.status-box.pending h3 {
  color: #ffa352;
}
.status-box.approved h3 {
  color: #4BD0A0;
}
.status-box.rejected h3 {
  color: #ff6b6b;
}

.request-card {
  margin: 16px 0;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(255, 117, 140, 0.12);
  background: white;
  border-left: 4px solid #ff758c;

  &.past {
    opacity: 0.75;
    border-left: 4px solid #e0e0e0;
  }
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-chip {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  &.pending {
    --background: #ffa352;
    --color: white;
  }
  &.approved {
    --background: #4BD0A0;
    --color: white;
  }
  &.rejected {
    --background: #ff6b6b;
    --color: white;
  }
}

.request-date {
  color: #8c8c8c;
  font-size: 14px;
}

.request-type {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0;
  color: #333;
}

.date-range {
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  ion-icon {
    color: #ff758c;
    font-size: 16px;
  }
}

.request-reason {
  margin: 12px 0;
  color: #333;
}

.admin-comment {
  margin-top: 12px;
  padding: 12px;
  background: #fff9fb;
  border-radius: 8px;
  font-style: italic;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border-left: 3px solid #ff7eb3;
  ion-icon {
    color: #ff7eb3;
  }
}

.form-card {
  margin: 16px 0;
  border-radius: 16px;
  background: white;
  box-shadow: 0 4px 16px rgba(255, 117, 140, 0.15);
  overflow: hidden;
}

ion-card-header {
  background: linear-gradient(135deg, rgba(255, 126, 179, 0.1) 0%, rgba(255, 117, 140, 0.1) 100%);
}

ion-card-title {
  color: #ff758c;
  font-weight: 600;
}

.custom-item {
  --background: transparent;
  margin-bottom: 16px;

  ion-icon {
    color: #ff758c;
  }

  ion-label {
    color: #666;
  }
}

.date-container {
  display: flex;
  flex-direction: column;
  gap: 8px;

  ion-datetime-button {
    --background: #fff9fb;
    --color: #ff758c;
  }
}

ion-datetime {
  --background: #fff;
  --color: #333;
  --ion-color-primary: #ff758c;
}

ion-select {
  --placeholder-color: #999;
  background: #fff9fb;
  border-radius: 8px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.custom-textarea {
  --background: #fff9fb;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border-radius: 8px;
  margin-top: 8px;
  border: 1px solid rgba(255, 117, 140, 0.2);
}

.submit-button-container {
  margin-top: 24px;
}

.submit-button {
  --background: linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%);
  --border-radius: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  height: 48px;

  &:hover {
    --background: linear-gradient(135deg, #ff8eba 0%, #ff8599 100%);
  }
}

ion-item-divider {
  --background: transparent;
  --color: #ff758c;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: 20px;
  font-size: 15px;
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
    `,
  ],
})
export class AbsenceEmployeePage implements OnInit, OnDestroy {
  absenceForm: FormGroup;
  isSubmitting = false;
  minDate = new Date().toISOString();
  recentRequests: AbsenceRequest[] = [];
  currentUser: any;
  selectedView: 'list' | 'new' = 'list';

  private requestsSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private absenceService: AbsenceService,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    addIcons({
      chatboxOutline,
      paperPlaneOutline,
      addOutline,
      listOutline,
      calendarOutline,
      documentTextOutline,
      timeOutline,
      alertCircleOutline,
    });

    this.absenceForm = this.formBuilder.group({
      startDate: [new Date().toJSON(), Validators.required],
      endDate: [new Date().toJSON(), Validators.required],
      type: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit() {
    this.loadUserData();
  }

  ngOnDestroy() {
    if (this.requestsSubscription) {
      this.requestsSubscription.unsubscribe();
    }
  }

  async loadUserData() {
    this.authService.getCurrentUser().subscribe((user) => {
      this.currentUser = user;
      console.log('Current user:', user);
      if (user?.uid) {
        // Subscribe to real-time updates for the employee's requests
        this.requestsSubscription = this.absenceService
          .getRequestsByEmployee(user.uid)
          .subscribe(
            (requests) => {
              this.recentRequests = requests;
            },
            (error) => {
              console.error('Error loading recent requests:', error);
              this.showToast('Error loading requests', 'danger');
            }
          );
      }
    });
  }

  async submitRequest() {
    if (this.absenceForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const requestData: Partial<AbsenceRequest> = {
        ...this.absenceForm.value,
        employeeId: this.currentUser.uid,
        employeeName: this.currentUser.displayName || 'Employee',
        status: 'pending',
        submissionDate: new Date().toISOString(),
      };

      try {
        const success = await this.absenceService.createRequest(requestData);
        if (success) {
          await this.showToast('Request submitted successfully', 'success');
          this.absenceForm.reset();
          this.selectedView = 'list'; // Switch to list view after successful submission
        } else {
          await this.showToast('Failed to submit request', 'danger');
        }
      } catch (error) {
        console.error('Error submitting request:', error);
        await this.showToast('Failed to submit request', 'danger');
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  validateDates() {
    const start = new Date(this.absenceForm.get('startDate')?.value);
    const end = new Date(this.absenceForm.get('endDate')?.value);

    if (start && end && start > end) {
      this.absenceForm.get('endDate')?.setErrors({ invalidRange: true });
    }
  }

  getCurrentAndUpcomingRequests() {
    const today = new Date();
    return this.recentRequests
      .filter((request) => new Date(request.endDate) >= today)
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  }

  getPastRequests() {
    const today = new Date();
    return this.recentRequests
      .filter((request) => new Date(request.endDate) < today)
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
  }

  getPendingCount() {
    return this.recentRequests.filter((r) => r.status === 'pending').length;
  }

  getApprovedCount() {
    return this.recentRequests.filter((r) => r.status === 'approved').length;
  }

  getRejectedCount() {
    return this.recentRequests.filter((r) => r.status === 'rejected').length;
  }
}
