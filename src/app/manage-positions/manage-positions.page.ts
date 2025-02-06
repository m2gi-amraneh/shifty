import { Component } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular'; // Import ModalController
import { CommonModule } from '@angular/common';
import { PositionsService } from '../services/positions.service';
import { FormsModule } from '@angular/forms';
import { PositionModalComponent } from '../components/position-modal/position-modal.component';

@Component({
  selector: 'app-manage-positions',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Manage Work Positions</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list *ngIf="positions$ | async as positions; else loading">
        <ion-item *ngFor="let position of positions$ | async">
          <ion-label>{{ position.name }}</ion-label>
          <ion-button
            color="primary"
            fill="clear"
            (click)="openModal(position)"
          >
            Edit
          </ion-button>
          <ion-button
            color="danger"
            fill="clear"
            (click)="deletePosition(position.id)"
          >
            Delete
          </ion-button>
        </ion-item>
      </ion-list>

      <ng-template #loading> <ion-spinner></ion-spinner> </ng-template>

      <ion-button expand="full" (click)="openModal()"
        >Add New Position</ion-button
      >
    </ion-content>
  `,
  styles: [
    `
      ion-content {
        --background: #f4f4f4;
      }
    `,
  ],
})
export class ManagePositionsPage {
  positions$: any;
  newPosition: any = { name: '' };
  editingPosition: any = null;

  constructor(
    private positionsService: PositionsService,
    private modalController: ModalController // Inject ModalController
  ) {
    this.loadPositions();
  }

  loadPositions() {
    this.positions$ = this.positionsService.getPositions();
  }

  async openModal(position: any = null) {
    // Accept optional position
    this.editingPosition = position ? { ...position } : null; // Set for editing or null for adding
    this.newPosition = position ? { ...position } : { name: '' }; // Initialize form data

    const modal = await this.modalController.create({
      component: PositionModalComponent, // Use a separate component for the modal
      componentProps: {
        position: this.newPosition, // Pass data to the modal
        editing: !!position, // Tell the modal if it's for editing
      },
    });

    modal.onDidDismiss().then((data) => {
      if (data.data && data.data.saved) {
        // Check if saved
        this.loadPositions();
      }
      this.editingPosition = null; // Reset after modal close
    });

    return await modal.present();
  }

  deletePosition(id: string) {
    this.positionsService.deletePosition(id).then(() => {
      this.loadPositions();
    });
  }
}
