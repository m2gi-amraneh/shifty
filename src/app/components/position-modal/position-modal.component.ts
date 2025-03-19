import { PositionsService } from './../../services/positions.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, addOutline, briefcaseOutline, closeOutline, createOutline, refreshOutline, trashOutline } from 'ionicons/icons';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonLabel, IonItem, IonInput, IonTextarea, IonToggle,
  IonFooter
} from '@ionic/angular/standalone';
addIcons({
  trashOutline, closeOutline, createOutline, addOutline, refreshOutline, briefcaseOutline, add
});

@Component({
  selector: 'app-position-modal',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="modal-header">
        <ion-title>{{ editing ? 'Edit Position' : 'Add New Position' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" color="light">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-container">
        <div class="position-avatar-container">
          <div class="position-avatar" *ngIf="position.name">
            <span>{{ position.name.charAt(0) }}</span>
          </div>
          <div class="position-avatar empty" *ngIf="!position.name">
            <ion-icon name="briefcase-outline"></ion-icon>
          </div>
          <h3 class="position-title">{{ editing ? 'Update Position Details' : 'Create New Position' }}</h3>
        </div>

        <div class="form-group">
          <ion-label class="form-label">Position Name <span class="required">*</span></ion-label>
          <ion-item lines="none" class="input-item">
            <ion-input
              [(ngModel)]="position.name"
              placeholder="Enter position name"
              class="custom-input"
              required
            ></ion-input>
          </ion-item>
          <div class="helper-text" *ngIf="!position.name && submitted">Position name is required</div>
        </div>


        <div class="form-group">
          <ion-label class="form-label">Description</ion-label>
          <ion-item lines="none" class="input-item">
            <ion-textarea
              [(ngModel)]="position.description"
              placeholder="Brief description of the position"
              rows="3"
              class="custom-textarea"
            ></ion-textarea>
          </ion-item>
        </div>

        <div class="form-group" *ngIf="editing">
          <ion-label class="form-label">Status</ion-label>
          <ion-item lines="none" class="toggle-item">
            <ion-toggle
              [(ngModel)]="position.active"
              [checked]="position.active !== false"
              color="success"
            >
              {{ position.active !== false ? 'Active' : 'Inactive' }}
            </ion-toggle>
          </ion-item>
        </div>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar class="footer-toolbar">
        <div class="button-container">
          <ion-button class="cancel-button" fill="outline" (click)="close()">
            Cancel
          </ion-button>
          <ion-button class="save-button" (click)="save()">
            {{ editing ? 'Update Position' : 'Add Position' }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  imports: [CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonLabel,
    IonItem,
    IonInput,
    IonTextarea,
    IonToggle,
    IonFooter],
  standalone: true,
  styles: [`
    :host {
      --primary-color: #4caf50;
      --primary-dark: #087f23;
      --primary-light: #80e27e;
      --primary-gradient: linear-gradient(135deg, #4caf50 0%, #087f23 100%);
      --card-bg: #ffffff;
      --input-bg: #f5f5f5;
      --border-radius: 12px;
    }

    /* Header */
    .modal-header {
      --background: var(--primary-gradient);
      --color: white;
      --border-color: transparent;
    }

    ion-content {
      --background: #f8f9fa;
    }

    /* Form styling */
    .form-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px 0;
    }

    .position-avatar-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .position-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 36px;
      margin-bottom: 16px;
      box-shadow: 0 6px 16px rgba(8, 127, 35, 0.2);
    }

    .position-avatar.empty {
      background: #e0e0e0;
      color: #999;
    }

    .position-avatar.empty ion-icon {
      font-size: 36px;
    }

    .position-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0;
      text-align: center;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #555;
      margin-bottom: 8px;
      padding-left: 4px;
    }

    .required {
      color: #f44336;
    }

    .input-item {
      --background: var(--input-bg);
      --border-radius: 12px;
      --padding-start: 12px;
      --highlight-color: var(--primary-color);
    }

    .custom-input,
    .custom-textarea,
    .custom-select {
      --padding-start: 4px;
      font-size: 15px;
    }

    .helper-text {
      font-size: 12px;
      color: #f44336;
      margin-top: 4px;
      padding-left: 16px;
    }

    .toggle-item {
      --background: transparent;
      --border-style: none;
    }

    /* Footer */
    .footer-toolbar {
      --background: #fff;
      --border-color: transparent;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
      padding: 10px 16px;
    }

    .button-container {
      display: flex;
      gap: 12px;
    }

    .cancel-button {
      flex: 1;
      --border-color: #d1d1d1;
      --color: #555;
      --border-radius: 12px;
      --border-width: 1px;
      margin: 0;
    }

    .save-button {
      flex: 2;
      --background: var(--primary-gradient);
      --border-radius: 12px;
      --box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      margin: 0;
    }
  `],
})
export class PositionModalComponent {
  position: any = {
    name: '',
    description: '',
    active: true
  };
  editing: boolean = false;
  submitted: boolean = false;

  constructor(
    private modalController: ModalController,
    private positionsService: PositionsService
  ) { }

  close(data: any = null) {
    this.modalController.dismiss(data);
  }

  save() {
    this.submitted = true;

    if (!this.position.name) {
      return; // Don't save if name is empty
    }

    if (this.editing) {
      this.positionsService
        .updatePosition(this.position.id, this.position)
        .then(() => {
          this.close({ saved: true });
        });
    } else {
      this.positionsService.addPosition(this.position).then(() => {
        this.close({ saved: true });
      });
    }
  }
}
