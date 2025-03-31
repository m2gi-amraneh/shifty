import { Component, Input, OnInit, OnDestroy } from '@angular/core'; // Import OnInit, OnDestroy
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, of } from 'rxjs'; // Import Observable, Subscription, of

import { Employee } from '../services/users.service';
import { PositionsService } from '../services/positions.service'; // Import PositionsService

import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonLabel,
  IonList,
  IonItem,
  IonFooter,
  IonInput,
  ModalController,
  IonSelect,        // <-- Import IonSelect
  IonSelectOption   // <-- Import IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons'; // Import addIcons
import { personCircleOutline, closeOutline, checkmarkOutline } from 'ionicons/icons'; // Import necessary icons

// Add icons used in the template
addIcons({ personCircleOutline, closeOutline, checkmarkOutline });

// Define an interface for the Position data for better type safety
interface Position {
  id: string;
  name: string;
  // Add other properties if your positions have more fields
}

@Component({
  selector: 'app-edit-employee-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonToolbar,
    IonHeader,
    IonButtons,
    IonList,
    IonItem,
    IonFooter,
    IonTitle,
    IonLabel,
    IonButton,
    IonIcon,
    IonContent,
    IonInput,
    IonSelect,         // <-- Add IonSelect
    IonSelectOption    // <-- Add IonSelectOption
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Edit Employee</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()" color="dark"> <!-- Ensure button is visible -->
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding modal-content">
      <div class="profile-header">
        <ion-icon name="person-circle-outline" class="profile-avatar"></ion-icon>
        <h2 class="employee-title">{{ employee?.name || 'Employee' }}</h2>
      </div>

      <!-- Add null check for employee -->
      <div class="form-container" *ngIf="employee">
        <ion-list lines="none">
          <ion-item>
            <ion-label position="stacked">Full Name</ion-label>
            <ion-input
              [(ngModel)]="employee.name"
              placeholder="Enter employee name"
              class="custom-input">
            </ion-input>
          </ion-item>

          <!-- Role Select Dropdown -->
          <ion-item>
            <ion-label position="stacked">Role</ion-label>
            <ion-select
              [(ngModel)]="employee.role"
              placeholder="Select Role"
              class="custom-select"
              interface="action-sheet"
            >
              <!-- Use async pipe to handle observable -->
              <ion-select-option
                *ngFor="let position of (positions$ | async)"
                [value]="position.name"
              >
                {{ position.name }}
              </ion-select-option>
               <!-- Optional: Add an option for no role -->
               <ion-select-option [value]="null">None</ion-select-option>
            </ion-select>
          </ion-item>
          <!-- End Role Select -->

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
       <!-- Optional: Show message if employee data is missing -->
        <div *ngIf="!employee" class="ion-text-center ion-padding">
            <p>Employee data not available.</p>
        </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <div class="footer-buttons">
          <ion-button fill="outline" class="cancel-button" (click)="cancel()">
            Cancel
          </ion-button>
          <ion-button class="save-button" (click)="save()" [disabled]="!employee"> <!-- Disable save if no employee data -->
            <ion-icon name="checkmark-outline" slot="start"></ion-icon>
            Save Changes
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host {
      --input-background: rgba(240, 240, 240, 0.7); // Slightly more opaque
      --input-border-radius: 10px; // Consistent radius
      --primary-gradient: linear-gradient(135deg, #e94560 0%, #c53678 100%);
      --ion-color-dark: #333; // Ensure dark color is defined if used
    }

    ion-header ion-toolbar {
      --background: transparent; // Make header transparent for content scroll effect
      --color: #333; // Dark text for light background
      padding-top: 8px;
      padding-bottom: 8px;
       border-bottom: 1px solid #eee; // Subtle separator
    }

    ion-header ion-toolbar ion-button {
        --color: #c53678; // Use theme color for close button
    }

    ion-title {
      font-size: 18px;
      font-weight: 600;
      text-align: center; // Center title
      color: #333; // Dark title text
    }

    .modal-content {
      --background: #f8f9fa; // Lighter background
    }

    .profile-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0 32px;
    }

    .profile-avatar {
      color: #c53678;
      font-size: 72px; // Slightly smaller
      margin-bottom: 12px;
      background: rgba(233, 69, 96, 0.1);
      border-radius: 50%;
      padding: 10px; // More padding
      line-height: 1; // Prevent extra space
    }

    .employee-title {
      margin: 0;
      color: #333;
      font-size: 20px; // Smaller title
      font-weight: 600;
    }

    .form-container {
      background: white;
      border-radius: 12px; // Consistent radius
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); // Softer shadow
      padding: 12px;
      margin-bottom: 20px;
    }

    ion-list {
      padding: 0;
      background: transparent; // Ensure list is transparent
    }

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 0px; // Remove inner padding end for select/input
       --inner-padding-start: 0; // Remove inner padding start
      --min-height: auto; // Adjust height automatically
      margin-bottom: 16px;
      --background: transparent;
       --border-color: transparent; // Hide default item border
       --detail-icon-opacity: 0; // Hide arrow icon if not needed
    }

    ion-label[position="stacked"] {
      font-size: 13px; // Smaller label
      color: #555; // Darker grey
      margin-bottom: 6px; // Less space below label
      font-weight: 500;
      transform: none; // Prevent label animation if not desired
       padding-left: 4px; // Align with input padding
    }

    .custom-input, .custom-select {
      --background: var(--input-background);
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px; // Adjust padding
      --padding-bottom: 12px;
      --border-radius: var(--input-border-radius);
      --placeholder-color: #888; // Darker placeholder
      --placeholder-opacity: 1;
      margin-top: 4px; // Space between label and input/select
      font-size: 15px; // Standard font size
       border: 1px solid rgba(0, 0, 0, 0.05); // Subtle border
       width: 100%; // Ensure it takes full width
    }

    /* Specific select styling if needed */
    .custom-select {
       --padding-start: 16px; // Ensure padding matches input
    }

    // Style the select text when an option is selected
    .custom-select::part(text) {
       color: #333; // Color for selected text
       font-size: 15px;
    }

    // Style the placeholder text
     .custom-select::part(placeholder) {
        color: #888;
        font-size: 15px;
     }

    ion-footer {
       background: #ffffff; // Explicit white background
       box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05); // Shadow above footer
        border-top: 1px solid #eee;
    }

    ion-footer ion-toolbar {
      --background: transparent; // Toolbar inside footer transparent
      --min-height: auto; // Auto height
       padding: 12px 0; // Padding top/bottom
    }

    .footer-buttons {
      display: flex;
      padding: 0 16px;
      gap: 12px; // Smaller gap
    }

    .cancel-button {
      flex: 1;
      --border-color: #ddd; // Lighter border
      --color: #555; // Darker grey text
      --border-radius: 10px;
      --border-width: 1px;
       --box-shadow: none; // Remove shadow
       font-weight: 500;
    }

    .save-button {
      flex: 2; // Give save more space
      --background: var(--primary-gradient);
      --border-radius: 10px;
      --box-shadow: 0 4px 12px rgba(197, 54, 120, 0.25); // Adjust shadow
       font-weight: 500;
    }
  `],
})
export class EditEmployeeModalComponent implements OnInit { // Implement OnInit
  @Input() employee!: Employee; // Use definite assignment assertion if always provided

  // Observable to hold positions
  positions$: Observable<Position[]> = of([]); // Initialize with empty observable

  constructor(
    private modalController: ModalController,
    private positionsService: PositionsService // Inject PositionsService
  ) { }

  ngOnInit() {
    // Fetch positions when the component initializes
    this.positions$ = this.positionsService.getPositions() as Observable<Position[]>;

    // Optional: Log the employee data received
    // console.log('Employee received in modal:', this.employee);
    // Optional: Log positions observable
    this.positions$.subscribe(positions => console.log('Positions loaded:', positions));
  }


  save() {
    // Add check in case employee is somehow null/undefined
    if (this.employee) {
      console.log('Saving employee:', this.employee);
      this.modalController.dismiss(this.employee, 'save'); // Pass role and data
    } else {
      console.error("Cannot save, employee data is missing.");
      this.cancel(); // Or dismiss with an error role
    }
  }

  cancel() {
    this.modalController.dismiss(null, 'cancel'); // Pass role
  }
}
