import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy, // Import ChangeDetectionStrategy
  ChangeDetectorRef,       // Import ChangeDetectorRef
} from '@angular/core';
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
  IonItem,
  IonSelectOption,
  IonDatetime,
  IonLabel,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons'; // Import necessary icons

// --- Define Interfaces (adjust if needed based on your actual service definitions) ---
export interface Employee {
  id: string;
  name: string; // Or displayName
  displayName?: string; // Optional, use if available
}

export interface Position {
  id?: string; // Optional ID
  name: string;
}

export interface Shift {
  id?: string;
  day: string;
  startTime: string; // Store as "h:mm A" or "HH:mm"
  endTime: string;   // Store as "h:mm A" or "HH:mm"
  employee: {
    id: string;
    name: string;
  };
  role: string;
}
// --- End Interfaces ---

addIcons({ close }); // Add icons used in the template

@Component({
  selector: 'app-add-shift-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonDatetime,
    IonItem,
    IonSelectOption,
    IonSelect,
    IonLabel,
    IonModal,
  ],
  template: `
    <ion-modal [isOpen]="isOpen" (didDismiss)="closeModal()" class="add-shift-modal">
      <ng-template>
        <ion-header class="ion-no-border">
          <ion-toolbar class="gradient-header">
            <ion-title color="light">{{ modalTitle }}</ion-title>
            <ion-buttons slot="start">
              <ion-button (click)="closeModal()" color="light">
                <ion-icon slot="icon-only" name="close"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="modal-content-bg">
          <div class="modal-content">
            <h3 class="modal-day">{{ shiftData.day }}</h3>

            <ion-item class="custom-item">
              <ion-label position="stacked" color="primary">Employee</ion-label>
              <ion-select
                [(ngModel)]="selectedEmployee"
                [compareWith]="compareEmployees"
                interface="popover"
                placeholder="Select employee"
                class="custom-select"
                okText="Select"
                cancelText="Cancel"
              >
                <ion-select-option
                  *ngFor="let employee of employees$ | async"
                  [value]="employee"
                >
                  {{ employee.displayName || employee.name }}
                </ion-select-option>
                 <ion-select-option *ngIf="(employees$ | async)===null" disabled="true">
                    Loading...
                 </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="custom-item">
              <ion-label position="stacked" color="primary">Position</ion-label>
              <ion-select
                [(ngModel)]="shiftData.role"
                interface="popover"
                placeholder="Select position"
                class="custom-select"
                 okText="Select"
                 cancelText="Cancel"
              >
                <ion-select-option
                  *ngFor="let role of roles$ | async"
                  [value]="role.name"
                >
                  {{ role.name }}
                </ion-select-option>
                 <ion-select-option *ngIf="(roles$ | async) === null"  disabled="true">
                    Loading...
                 </ion-select-option>
              </ion-select>
            </ion-item>

            <div class="time-selection">
              <ion-item class="custom-item time-item">
                <ion-label position="stacked" color="primary">Start</ion-label>
                <ion-datetime
                  presentation="time"
                  hourCycle="h12"
                  [(ngModel)]="shiftData.startTimeISO"
                  placeholder="Start time"
                  class="custom-datetime"
                ></ion-datetime>
              </ion-item>
              <ion-item class="custom-item time-item">
                <ion-label position="stacked" color="primary">End</ion-label>
                <ion-datetime
                  presentation="time"
                  hourCycle="h12"
                  [(ngModel)]="shiftData.endTimeISO"
                  placeholder="End time"
                  class="custom-datetime"
                ></ion-datetime>
              </ion-item>
            </div>

            <div class="duration-info" *ngIf="shiftData.startTimeISO && shiftData.endTimeISO">
              Duration: {{ getShiftDuration() }}
            </div>

            <ion-button
              expand="block"
              (click)="saveOrUpdateShift()"
              [disabled]="!isShiftValid()"
              class="save-button"
            >
              {{ saveButtonText }}
            </ion-button>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      /* Add slight adjustments if needed, otherwise keep previous styles */
      .gradient-header {
        --background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
        --color: white;
      }
       ion-toolbar.gradient-header ion-title {
          text-align: center;
          padding: 0 50px; /* Ensure title doesn't overlap buttons */
       }

      .modal-content-bg {
        --background: #f8f9fa;
      }

      .modal-content {
        padding: 20px; // Increased padding
      }

      .modal-day {
        color: #0077b6;
        font-size: 1.5rem; // Larger day display
        font-weight: 600; // Slightly bolder
        margin-bottom: 24px; // More space below day
        text-align: center;
        padding: 8px;
        background-color: rgba(0, 180, 216, 0.08); // Lighter background
        border-radius: 8px;
      }

      .custom-item {
        --background: white;
        margin-bottom: 16px; // Increased spacing
        border-radius: 10px; // Slightly more rounded
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.07); // Softer shadow
        --border-width: 0; // Remove default border
        --inner-padding-start: 12px; // Consistent padding
        --inner-padding-end: 12px;
        --padding-start: 0;
        --min-height: 55px; // Ensure enough height
      }

       .custom-item ion-label[position="stacked"] {
          color: #0077b6; // Make label primary color
          font-weight: 500;
          margin-left: 4px; // Align with input text
          margin-bottom: 6px;
          font-size: 0.85rem;
       }

      .custom-select ion-select-option {
          color: #005f8f; // Slightly darker option text
      }

      .custom-select,
      .custom-datetime {
        --placeholder-color: #8a9aa8; // Grey placeholder
        width: 100%;
        font-size: 1rem; // Standard font size
        padding-left: 4px;
        padding-right: 4px;
      }

      .time-selection {
        display: grid; // Use grid for better alignment
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }

      .time-item {
         // Reset margin if needed from grid gap
         margin-bottom: 0;
      }


      .duration-info {
        background: rgba(0, 180, 216, 0.1);
        padding: 12px; // More padding
        border-radius: 8px; // Match item radius
        margin-bottom: 24px; // More space below duration
        color: #0077b6;
        font-weight: 500;
        text-align: center;
        font-size: 0.9rem;
      }

      .save-button {
        --background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
        margin-top: 16px;
        --border-radius: 25px; // Pill shape
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 119, 182, 0.25); // Enhanced shadow
        height: 48px; // Standard button height
        letter-spacing: 0.5px;
      }

      /* Target placeholder specifically if needed */
      ion-datetime::part(placeholder) {
         color: #8a9aa8;
         font-style: italic;
      }
    `,
  ],
  // Use OnPush for potentially better performance if inputs don't change constantly
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddShiftModalComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() day: string = '';
  @Input() employees$!: Observable<Employee[]>; // Expect Observable<Employee[]>
  @Input() roles$!: Observable<Position[]>; // Expect Observable<Position[]>
  @Input() shiftToEdit: Shift | null = null; // Input for editing

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Omit<Shift, 'id'>>(); // For new shifts
  @Output() update = new EventEmitter<Shift>(); // For updated shifts

  // Internal state for the form
  selectedEmployee: Employee | null = null; // Store the selected Employee object
  shiftData = {
    day: '',
    startTimeISO: '', // Bound to ion-datetime (expects ISO 8601)
    endTimeISO: '', // Bound to ion-datetime (expects ISO 8601)
    role: '',
  };

  isEditMode = false;
  modalTitle = 'Add New Shift';
  saveButtonText = 'Schedule Shift';

  constructor(private cdr: ChangeDetectorRef) { } // Inject ChangeDetectorRef

  // React to input changes
  ngOnChanges(changes: SimpleChanges) {
    // When the modal is opened OR shiftToEdit data changes while open
    if (changes['isOpen']?.currentValue === true || (this.isOpen && changes['shiftToEdit'])) {
      this.isEditMode = !!this.shiftToEdit; // Check if shiftToEdit has data
      this.modalTitle = this.isEditMode ? 'Edit Shift' : 'Add New Shift';
      this.saveButtonText = this.isEditMode ? 'Update Shift' : 'Schedule Shift';

      if (this.isEditMode && this.shiftToEdit) {
        // --- Populate form for editing ---
        this.shiftData = {
          day: this.shiftToEdit.day,
          // Convert display/stored time ("h:mm A" or "HH:mm") to ISO string for ion-datetime
          startTimeISO: this.timeToISOString(this.shiftToEdit.startTime) || '',
          endTimeISO: this.timeToISOString(this.shiftToEdit.endTime) || '',
          role: this.shiftToEdit.role,
        };
        // Set the selectedEmployee object directly if shiftToEdit includes it correctly
        // Ensure the object reference matches one from the employees$ stream for ion-select binding
        this.selectedEmployee = this.shiftToEdit.employee as Employee; // Assuming structure matches

      } else {
        // --- Reset form for adding ---
        this.resetForm(); // Clear previous data
        this.shiftData.day = this.day; // Set the current day context
      }
      this.cdr.markForCheck(); // Trigger change detection because OnPush strategy is used
    }

    // Optionally update the day if it changes while modal is open in add mode
    if (!this.isEditMode && this.isOpen && changes['day']) {
      this.shiftData.day = this.day;
      this.cdr.markForCheck();
    }
  }

  closeModal() {
    this.close.emit();
    // Form state will be reset/updated by ngOnChanges when isOpen becomes true again
  }

  saveOrUpdateShift() {
    if (this.isShiftValid()) {
      if (!this.selectedEmployee) {
        console.error("Employee not selected");
        // TODO: Show toast or validation message
        return;
      }

      // Prepare payload with formatted times (e.g., "h:mm A")
      const shiftPayloadBase = {
        day: this.shiftData.day,
        startTime: this.formatTimeFromISO(this.shiftData.startTimeISO),
        endTime: this.formatTimeFromISO(this.shiftData.endTimeISO),
        employee: {
          id: this.selectedEmployee.id,
          name: this.selectedEmployee.displayName || this.selectedEmployee.name || 'N/A' // Use display name if available
        },
        role: this.shiftData.role,
      };

      if (this.isEditMode && this.shiftToEdit?.id) {
        // Update mode: emit full shift object including the ID
        const updatedShift: Shift = { ...shiftPayloadBase, id: this.shiftToEdit.id };
        this.update.emit(updatedShift);
      } else {
        // Add mode: emit object without ID
        this.save.emit(shiftPayloadBase);
      }
    } else {
      console.warn("Shift form invalid:", this.shiftData, this.selectedEmployee);
      // Optionally show validation feedback to the user
    }
  }

  isShiftValid(): boolean {
    const isValid =
      !!this.selectedEmployee?.id && // Check if an employee object with an ID is selected
      !!this.shiftData.role &&       // Check if role is selected
      !!this.shiftData.startTimeISO && // Check if start time is set
      !!this.shiftData.endTimeISO &&   // Check if end time is set
      // Ensure start time is strictly before end time by comparing ISO strings
      this.shiftData.startTimeISO < this.shiftData.endTimeISO;

    return isValid;
  }

  getShiftDuration(): string {
    if (!this.shiftData.startTimeISO || !this.shiftData.endTimeISO) return 'N/A';

    try {
      const start = new Date(this.shiftData.startTimeISO);
      const end = new Date(this.shiftData.endTimeISO);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date'; // Check if dates are valid

      let diff = end.getTime() - start.getTime(); // Difference in milliseconds

      if (diff < 0) {
        // Indicate invalid time range if end is before start on the same "day" context of the picker
        return 'Invalid Range';
        // Or handle overnight shifts if your logic supports it:
        // diff += 24 * 60 * 60 * 1000;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours === 0 && minutes === 0) return 'Zero Duration'; // Indicate zero duration

      return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`.trim();
    } catch (e) {
      console.error("Error calculating duration:", e);
      return 'Error';
    }
  }

  // --- Time Conversion Helpers ---

  /**
   * Converts a time string (like "9:00 AM" or "14:30") into an ISO 8601 string
   * using today's date as a base, suitable for ion-datetime binding.
   * Returns null if parsing fails.
   */
  private timeToISOString(timeStr: string | undefined | null): string | null {
    if (!timeStr) return null;
    try {
      const baseDate = new Date(); // Use today as base
      baseDate.setSeconds(0, 0);

      // Try parsing HH:mm (24-hour)
      let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
          baseDate.setHours(hours, minutes);
          return baseDate.toISOString();
        }
      }

      // Try parsing h:mm A or hh:mm A (12-hour)
      match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes < 60) {
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0; // Handle midnight
          baseDate.setHours(hours, minutes);
          return baseDate.toISOString();
        }
      }
      // If it's already an ISO string (or something Date() can parse)
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }

      console.warn(`Could not parse time string "${timeStr}" to create ISO string.`);
      return null;
    } catch (e) {
      console.error(`Error in timeToISOString for "${timeStr}":`, e);
      return null;
    }
  }

  /**
   * Formats an ISO 8601 string (from ion-datetime) into "h:mm A" format.
   * Returns 'Invalid Time' on error.
   */
  private formatTimeFromISO(isoString: string | undefined | null): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Invalid Time';
      // Format to h:mm A (e.g., "9:00 AM", "11:30 PM")
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      console.error(`Error formatting time from ISO "${isoString}":`, e);
      return 'Invalid Time';
    }
  }

  // Resets the form fields for adding a new shift
  private resetForm() {
    this.selectedEmployee = null;
    this.shiftData = {
      day: this.day, // Pre-fill day if provided
      startTimeISO: '',
      endTimeISO: '',
      role: '',
    };
    // No need to set edit mode flags here, ngOnChanges handles it
  }

  // compareWith function for ion-select when using objects
  compareEmployees = (o1: Employee | null, o2: Employee | null): boolean => {
    // Handle null values and compare by a unique identifier (id)
    return o1 !== null && o2 !== null ? o1.id === o2.id : o1 === o2;
  }
}
