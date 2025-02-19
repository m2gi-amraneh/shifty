import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import {
  ClosingDaysService,
  ClosingPeriod,
} from '../services/closing-periods.service';
import { ClosingPeriodModalComponent } from '../modals/closing-period-modal.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-closing-days',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Manage Closing Days</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openModal()">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col size="12" size-md="6" size-lg="4" *ngFor="let period of closingPeriods">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ period.description }}</ion-card-title>
                <ion-card-subtitle>
                  {{ period.startDate | date }} - {{ period.endDate | date }}
                </ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-button expand="full" (click)="openModal(period)">Edit</ion-button>
                <ion-button expand="full" color="danger" (click)="deletePeriod(period.id)">Delete</ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `,
  styles: [`
    ion-card {
      margin: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    ion-card-header {
      background: var(--ion-color-primary);
      color: white;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }

    ion-card-title {
      font-size: 1.2rem;
      font-weight: bold;
    }

    ion-card-subtitle {
      color: rgba(255, 255, 255, 0.8);
    }

    ion-button {
      margin-top: 8px;
    }

    ion-fab-button {
      --background: var(--ion-color-primary);
      --background-activated: var(--ion-color-primary-shade);
    }
  `],
})
export class ClosingDaysComponent implements OnInit, OnDestroy {
  closingPeriods: ClosingPeriod[] = [];
  private closingPeriodsSubscription: Subscription | undefined;

  constructor(
    private closingDaysService: ClosingDaysService,
    private modalController: ModalController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.closingPeriodsSubscription = this.closingDaysService.closingPeriods$.subscribe(
      (periods) => {
        this.closingPeriods = periods;
      }
    );
  }

  ngOnDestroy() {
    if (this.closingPeriodsSubscription) {
      this.closingPeriodsSubscription.unsubscribe();
    }
  }

  async openModal(period?: ClosingPeriod) {
    const modal = await this.modalController.create({
      component: ClosingPeriodModalComponent,
      componentProps: {
        period: period ? { ...period } : { startDate: '', endDate: '', description: '' },
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'save') {
      if (data.id) {
        await this.closingDaysService.updateClosingPeriod(data);
      } else {
        await this.closingDaysService.addClosingPeriod(data);
      }
    }
  }

  async deletePeriod(id?: string) {
    if (id) {
      const alert = await this.alertController.create({
        header: 'Confirm Delete',
        message: 'Are you sure you want to delete this closing period?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete',
            handler: async () => {
              await this.closingDaysService.deleteClosingPeriod(id);
            },
          },
        ],
      });
      await alert.present();
    }
  }
}
