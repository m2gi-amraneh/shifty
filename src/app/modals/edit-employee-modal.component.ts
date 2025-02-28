import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Employee } from '../services/users.service';

@Component({
  selector: 'app-edit-employee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Edit Employee</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding modal-content">
      <div class="profile-header">
        <ion-icon name="person-circle-outline" class="profile-avatar"></ion-icon>
        <h2 class="employee-title">{{ employee.name }}</h2>
      </div>

      <div class="form-container">
        <ion-list lines="none">
          <ion-item>
            <ion-label position="stacked">Full Name</ion-label>
            <ion-input
              [(ngModel)]="employee.name"
              placeholder="Enter employee name"
              class="custom-input">
            </ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Role</ion-label>
            <ion-input
              [(ngModel)]="employee.role"
              placeholder="Enter employee role"
              class="custom-input">
            </ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Contract Hours</ion-label>
            <ion-input
              type="number"
              [(ngModel)]="employee.contractHours"
              placeholder="Enter weekly hours"
              class="custom-input">
            </ion-input>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <div class="footer-buttons">
          <ion-button fill="outline" class="cancel-button" (click)="cancel()">
            Cancel
          </ion-button>
          <ion-button class="save-button" (click)="save()">
            <ion-icon name="checkmark-outline" slot="start"></ion-icon>
            Save Changes
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host {
      --input-background: rgba(240, 240, 240, 0.5);
      --input-border-radius: 12px;
      --primary-gradient: linear-gradient(135deg, #e94560 0%, #c53678 100%);
    }

    ion-header ion-toolbar {
      --background: var(--primary-gradient);
      --color: white;
      padding-top: 12px;
      padding-bottom: 12px;
    }

    ion-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .modal-content {
      --background: #f8f8f8;
    }

    .profile-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0 32px;
    }

    .profile-avatar {
      color: #c53678;
      font-size: 80px;
      margin-bottom: 16px;
      background: rgba(233, 69, 96, 0.1);
      border-radius: 50%;
      padding: 8px;
    }

    .employee-title {
      margin: 0;
      color: #333;
      font-size: 22px;
      font-weight: 600;
    }

    .form-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      padding: 8px;
      margin-bottom: 20px;
    }

    ion-list {
      padding: 0;
    }

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 16px;
      margin-bottom: 16px;
      --background: transparent;
    }

    ion-label[position="stacked"] {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .custom-input {
      --background: var(--input-background);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 14px;
      --padding-bottom: 14px;
      --border-radius: var(--input-border-radius);
      --placeholder-color: #999;
      --placeholder-opacity: 0.6;
      margin-top: 8px;
      font-size: 16px;
    }

    ion-footer {
      --background: white;
    }

    ion-footer ion-toolbar {
      --background: white;
      --min-height: 80px;
    }

    .footer-buttons {
      display: flex;
      padding: 0 16px 16px;
      gap: 16px;
    }

    .cancel-button {
      flex: 1;
      --border-color: rgba(197, 54, 120, 0.3);
      --color: #c53678;
      --border-radius: 10px;
      --border-width: 1px;
    }

    .save-button {
      flex: 2;
      --background: var(--primary-gradient);
      --border-radius: 10px;
      --box-shadow: 0 4px 10px rgba(197, 54, 120, 0.3);
    }
  `],
})
export class EditEmployeeModalComponent {
  @Input() employee!: Employee;

  constructor(private modalController: ModalController) { }

  save() {
    this.modalController.dismiss(this.employee);
  }

  cancel() {
    this.modalController.dismiss();
  }
}
