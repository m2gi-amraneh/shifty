// closing-days.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  ClosingDaysService,
  ClosingPeriod,
} from '../services/closing-periods.service';

@Component({
  selector: 'app-closing-days',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Manage Closing Days</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item *ngFor="let period of closingPeriods">
          <ion-label>
            <h2>{{ period.description }}</h2>
            <p>{{ period.startDate | date }} - {{ period.endDate | date }}</p>
          </ion-label>
          <ion-button (click)="editPeriod(period)">Edit</ion-button>
          <ion-button color="danger" (click)="deletePeriod(period.id)"
            >Delete</ion-button
          >
        </ion-item>
      </ion-list>

      <ion-item>
        <ion-label position="stacked">Description</ion-label>
        <ion-input [(ngModel)]="newPeriod.description"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Start Date</ion-label>
        <ion-datetime [(ngModel)]="newPeriod.startDate"></ion-datetime>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">End Date</ion-label>
        <ion-datetime [(ngModel)]="newPeriod.endDate"></ion-datetime>
      </ion-item>
      <ion-button expand="full" (click)="savePeriod()">Save</ion-button>
    </ion-content>
  `,
})
export class ClosingDaysComponent {
  closingPeriods: ClosingPeriod[] = [];
  newPeriod: ClosingPeriod = { startDate: '', endDate: '', description: '' };
  isEditing = false;

  constructor(private closingDaysService: ClosingDaysService) {
    this.loadClosingPeriods();
  }

  async loadClosingPeriods() {
    this.closingPeriods =
      await this.closingDaysService.getCurrentClosingPeriods();
  }

  editPeriod(period: ClosingPeriod) {
    this.newPeriod = { ...period };
    this.isEditing = true;
  }

  async savePeriod() {
    if (this.isEditing) {
      await this.closingDaysService.updateClosingPeriod(this.newPeriod);
    } else {
      await this.closingDaysService.addClosingPeriod(this.newPeriod);
    }
    this.newPeriod = { startDate: '', endDate: '', description: '' };
    this.isEditing = false;
    this.loadClosingPeriods();
  }

  async deletePeriod(id?: string) {
    if (id) {
      await this.closingDaysService.deleteClosingPeriod(id);
      this.loadClosingPeriods();
    }
  }
}
