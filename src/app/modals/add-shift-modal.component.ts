import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonButtons,

  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonSelect,
  IonItem, IonSelectOption, IonDatetime
  ,
  IonLabel, IonModal

} from '@ionic/angular/standalone';
interface Employee {
  id: string;
  name: string;
}

@Component({
  selector: 'app-add-shift-modal',
  template: `
 <ion-modal [isOpen]="isOpen" (didDismiss)="closeModal()" class="add-shift-modal">
  <ng-template>
    <ion-header>
      <ion-toolbar class="gradient-header">
        <ion-buttons slot="start">
          <ion-button (click)="closeModal()" color="light">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title color="light">Add New Shift</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content-bg">
      <div class="modal-content">
        <h3 class="modal-day">{{ newShift.day }}</h3>

        <ion-item class="custom-item">
          <ion-label position="stacked" color="primary">Employee</ion-label>
          <ion-select
            [(ngModel)]="selectedEmployee"
            interface="popover"
            placeholder="Select employee"
            class="custom-select"
          >
            <ion-select-option *ngFor="let employee of employees$ | async" [value]="employee">
              {{ employee.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item class="custom-item">
          <ion-label position="stacked" color="primary">Position</ion-label>
          <ion-select
            [(ngModel)]="newShift.role"
            interface="popover"
            placeholder="Select position"
            class="custom-select"
          >
            <ion-select-option *ngFor="let role of roles$ | async" [value]="role.name">
              {{ role.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <div class="time-selection">
          <ion-item class="custom-item">
            <ion-label position="stacked" color="primary">Start</ion-label>
            <ion-datetime
              presentation="time"
              [(ngModel)]="newShift.startTime"
              placeholder="Start time"
              class="custom-datetime"
            ></ion-datetime>
          </ion-item>
          <ion-item class="custom-item">
            <ion-label position="stacked" color="primary">End</ion-label>
            <ion-datetime
              presentation="time"
              [(ngModel)]="newShift.endTime"
              placeholder="End time"
              class="custom-datetime"
            ></ion-datetime>
          </ion-item>
        </div>

        <div class="duration-info" *ngIf="newShift.startTime && newShift.endTime">
          Duration: {{ getShiftDuration() }}
        </div>

        <ion-button expand="block" (click)="saveShift()" [disabled]="!isShiftValid()" class="save-button">
          Schedule Shift
        </ion-button>
      </div>
    </ion-content>
  </ng-template>
</ion-modal>
  `,
  styles: [`
    .gradient-header {
      --background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
      --color: white;
    }

    .modal-content-bg {
      --background: #f8f9fa;
    }

    .modal-content {
      padding: 16px;
    }

    .modal-day {
      color: #0077b6;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 16px;
      text-align: center;
    }

    .custom-item {
      --background: white;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .custom-select, .custom-datetime {
      --placeholder-color: #6c757d;
    }

    .time-selection {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .time-selection ion-item {
      flex: 1;
    }

    .duration-info {
      background: rgba(0, 180, 216, 0.1);
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 20px;
      color: #0077b6;
      font-weight: 500;
      text-align: center;
    }

    .save-button {
      --background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
      margin-top: 16px;
      --border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 4px 8px rgba(0, 119, 182, 0.2);
    }

    ion-select-option {
      color: #0077b6;
    }

    ion-datetime {
      --ion-color-primary: #0077b6;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent, IonDatetime,

    IonItem, IonSelectOption, IonSelect,

    IonLabel, IonModal
  ],
})

export class AddShiftModalComponent {
  @Input() isOpen: boolean = false;
  @Input() day: string = '';
  @Input() employees$!: Observable<Employee[]>;
  @Input() roles$!: Observable<any>;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  selectedEmployee: Employee = { id: '', name: '' };
  newShift = {
    day: '',
    startTime: '',
    endTime: '',
    role: '',
  };

  ngOnChanges() {
    if (this.day) {
      this.newShift.day = this.day;
    }
  }

  closeModal() {
    this.resetForm();
    this.close.emit();
  }

  saveShift() {
    if (this.isShiftValid()) {
      const shift = {
        day: this.newShift.day,
        startTime: this.formatTime(this.newShift.startTime),
        endTime: this.formatTime(this.newShift.endTime),
        employee: this.selectedEmployee,
        role: this.newShift.role,
      };
      this.save.emit(shift);
      this.resetForm();
    }
  }

  isShiftValid(): boolean {
    return (
      this.newShift.startTime < this.newShift.endTime &&
      this.selectedEmployee.id !== '' &&
      this.newShift.role !== ''
    );
  }

  getShiftDuration(): string {
    if (!this.newShift.startTime || !this.newShift.endTime) return '';

    const start = new Date(this.newShift.startTime);
    const end = new Date(this.newShift.endTime);
    let diff = end.getTime() - start.getTime();
    if (diff < 0) {
      diff += 24 * 60 * 60 * 1000;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return timeString;
    }
  }

  private resetForm() {
    this.selectedEmployee = { id: '', name: '' };
    this.newShift = { day: this.day, startTime: '', endTime: '', role: '' };
  }
}
