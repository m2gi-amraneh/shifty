import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ClosingPeriod } from '../services/closing-periods.service';
import {
  IonHeader,
  IonToolbar,
  IonButtons,

  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonDatetime
  , IonInput

} from '@ionic/angular/standalone';
@Component({
  selector: 'app-closing-period-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader,
    IonToolbar,
    IonButtons,

    IonTitle,
    IonButton,
    IonIcon,
    IonContent, IonInput,

    IonDatetime
    ,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="gradient-toolbar">
        <ion-title>{{ period.id ? 'Edit Closing Period' : 'Add Closing Period' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="closeModal()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-container">
        <div class="section-title">
          <ion-icon name="information-circle-outline"></ion-icon>
          <h2>Period Details</h2>
        </div>

        <div class="form-field">
          <label>Description</label>
          <ion-input
            [(ngModel)]="period.description"
            placeholder="Holiday name or reason for closure"
            class="custom-input"
          ></ion-input>
        </div>

        <div class="date-container">
          <div class="form-field">
            <label>Start Date</label>
            <ion-datetime
              [(ngModel)]="period.startDate"
              displayFormat="MMM DD, YYYY"
              placeholder="Select start date"
              class="custom-datetime"
            ></ion-datetime>
          </div>

          <div class="form-field">
            <label>End Date</label>
            <ion-datetime
              [(ngModel)]="period.endDate"
              displayFormat="MMM DD, YYYY"
              placeholder="Select end date"
              class="custom-datetime"
            ></ion-datetime>
          </div>
        </div>

        <div class="period-summary" *ngIf="period.startDate && period.endDate">
          <div class="summary-icon">
            <ion-icon name="calendar-outline"></ion-icon>
          </div>
          <div class="summary-content">
            <h3>Period Summary</h3>
            <p>
              <span class="duration">{{ calculateDays() }} days</span> of closure
              <span *ngIf="isCurrentOrFuture()" class="badge">{{ isCurrentPeriod() ? 'ACTIVE' : 'UPCOMING' }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <ion-button fill="outline" (click)="closeModal()" class="cancel-button">
          Cancel
        </ion-button>
        <ion-button
          (click)="savePeriod()"
          class="save-button"
          [disabled]="!isFormValid()">
          Save Period
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --primary-gradient: linear-gradient(135deg, #f1c01c 0%, #da7356 100%);
      --primary-color: #f1c01c;
      --primary-dark: #da7356;
      --text-color: #333333;
      --light-text: #777777;
      --input-bg: #f5f5f5;
      --border-radius: 12px;
    }

    /* Header */
    .gradient-toolbar {
      --background: var(--primary-gradient);
      --color: white;
    }

    ion-title {
      font-weight: 600;
      font-size: 18px;
    }

    /* Form container */
    .form-container {
      padding: 20px 0;
    }

    .section-title {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-title ion-icon {
      font-size: 24px;
      color: var(--primary-dark);
      margin-right: 10px;
    }

    .section-title h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color);
      margin: 0;
    }

    /* Form fields */
    .form-field {
      margin-bottom: 20px;
      width: 100%;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--light-text);
      margin-bottom: 8px;
    }

    .custom-input {
      --background: var(--input-bg);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 14px;
      --padding-bottom: 14px;
      --border-radius: 10px;
      --color: var(--text-color);
      --placeholder-color: #aaaaaa;
      margin-top: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .custom-datetime {
      --background: var(--input-bg);
      border-radius: 10px;
      padding: 12px 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      width: 100%;
    }

    /* Date container */
    .date-container {
      display: flex;
      gap: 16px;
    }

    /* Period summary */
    .period-summary {
      background: rgba(241, 192, 28, 0.1);
      border-radius: var(--border-radius);
      padding: 16px;
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }

    .summary-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(241, 192, 28, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
    }

    .summary-icon ion-icon {
      font-size: 20px;
      color: var(--primary-dark);
    }

    .summary-content h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      margin: 0 0 4px;
    }

    .summary-content p {
      margin: 0;
      color: var(--light-text);
      font-size: 14px;
    }

    .duration {
      font-weight: 600;
      color: var(--primary-dark);
    }

    .badge {
      display: inline-block;
      background: var(--primary-dark);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 100px;
      margin-left: 8px;
    }

    /* Action buttons */
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    .cancel-button {
      flex: 1;
      --color: var(--light-text);
      --border-color: #dddddd;
      --border-width: 1px;
      --border-radius: 10px;
      --background: transparent;
      font-weight: 500;
    }

    .save-button {
      flex: 2;
      --background: var(--primary-gradient);
      --border-radius: 10px;
      --box-shadow: 0 4px 12px rgba(241, 192, 28, 0.3);
      font-weight: 500;
    }

    /* Disabled state */
    ion-button[disabled] {
      opacity: 0.6;
    }

    @media (max-width: 768px) {
      .date-container {
        flex-direction: column;
        gap: 8px;
      }
    }
  `],
})
export class ClosingPeriodModalComponent {
  @Input() period: ClosingPeriod = { startDate: '', endDate: '', description: '' };

  constructor(private modalController: ModalController) { }

  closeModal() {
    this.modalController.dismiss(null, 'cancel');
  }

  savePeriod() {
    this.modalController.dismiss(this.period, 'save');
  }

  calculateDays(): number {
    if (!this.period.startDate || !this.period.endDate) return 0;

    const start = new Date(this.period.startDate);
    const end = new Date(this.period.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include the end day
  }

  isCurrentPeriod(): boolean {
    if (!this.period.startDate || !this.period.endDate) return false;

    const today = new Date();
    const start = new Date(this.period.startDate);
    const end = new Date(this.period.endDate);

    return today >= start && today <= end;
  }

  isCurrentOrFuture(): boolean {
    if (!this.period.endDate) return false;

    const today = new Date();
    const end = new Date(this.period.endDate);

    return end >= today;
  }

  isFormValid(): boolean {
    return !!(
      this.period.description &&
      this.period.startDate &&
      this.period.endDate &&
      new Date(this.period.startDate) <= new Date(this.period.endDate)
    );
  }
}
