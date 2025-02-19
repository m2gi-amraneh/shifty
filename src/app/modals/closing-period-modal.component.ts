import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { ClosingPeriod } from '../services/closing-periods.service';

@Component({
  selector: 'app-closing-period-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ period.id ? 'Edit Closing Period' : 'Add Closing Period' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="closeModal()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-label position="stacked" color="medium">Description</ion-label>
          <ion-input
            [(ngModel)]="period.description"
            placeholder="Enter description"
            class="custom-input"
          ></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked" color="medium">Start Date</ion-label>
          <ion-datetime
            [(ngModel)]="period.startDate"
            displayFormat="MM/DD/YYYY"
            placeholder="Select start date"
            class="custom-datetime"
          ></ion-datetime>
        </ion-item>

        <ion-item>
          <ion-label position="stacked" color="medium">End Date</ion-label>
          <ion-datetime
            [(ngModel)]="period.endDate"
            displayFormat="MM/DD/YYYY"
            placeholder="Select end date"
            class="custom-datetime"
          ></ion-datetime>
        </ion-item>
      </ion-list>

      <ion-button
        expand="block"
        color="primary"
        (click)="savePeriod()"
        class="save-button"
      >
        Save
      </ion-button>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: var(--ion-color-primary);
      --color: white;
    }

    ion-title {
      font-size: 1.2rem;
      font-weight: bold;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: 16px;
    }

    ion-label[position="stacked"] {
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    ion-input.custom-input,
    ion-datetime.custom-datetime {
      background: var(--ion-color-light);
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
    }

    ion-datetime.custom-datetime {
      width: 100%;
    }

    .save-button {
      margin-top: 24px;
      --border-radius: 8px;
      font-weight: bold;
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
}
