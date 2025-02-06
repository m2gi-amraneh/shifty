import { PositionsService } from './../../services/positions.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-position-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ editing ? 'Edit' : 'Add' }} Position</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-label>Position Name</ion-label>
        <ion-input [(ngModel)]="position.name"></ion-input>
      </ion-item>
      <ion-button expand="full" (click)="save()">
        {{ editing ? 'Save Changes' : 'Add Position' }}
      </ion-button>
    </ion-content>
  `,
  imports: [IonicModule, CommonModule, FormsModule],
  standalone: true,
  styles: [],
})
export class PositionModalComponent {
  position: any;
  editing: boolean | undefined;

  constructor(
    private modalController: ModalController,
    private positionsService: PositionsService
  ) {}

  close(data: any = null) {
    this.modalController.dismiss(data);
  }

  save() {
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
