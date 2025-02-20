import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { ClosingPeriod } from '../services/closing-periods.service';
import { Employee } from '../services/users.service';

@Component({
  selector: 'app-closing-period-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
  <ion-header>
  <ion-toolbar>
    <ion-title>Edit Employee</ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="cancel()">Cancel</ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<ion-content>
  <ion-list>
    <ion-item>
      <ion-label position="stacked">Name</ion-label>
      <ion-input [(ngModel)]="employee.name"></ion-input>
    </ion-item>
    <ion-item>
      <ion-label position="stacked">Role</ion-label>
      <ion-input [(ngModel)]="employee.role"></ion-input>
    </ion-item>
    <ion-item>
      <ion-label position="stacked">Contract Hours</ion-label>
      <ion-input type="number" [(ngModel)]="employee.contractHours"></ion-input>
    </ion-item>
  </ion-list>
</ion-content>

<ion-footer>
  <ion-toolbar>
    <ion-button expand="full" (click)="save()">Save</ion-button>
  </ion-toolbar>
</ion-footer>
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
export class EditEmployeeModalComponent {
  @Input() employee   !: Employee

  constructor(private modalController: ModalController) { }

  save() {
    this.modalController.dismiss(this.employee);
  }

  cancel() {
    this.modalController.dismiss();
  }
}
