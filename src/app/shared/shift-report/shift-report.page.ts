import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
// No need for IonicModule if using standalone components everywhere
import { FormsModule } from '@angular/forms';
import { ShiftReportService, ShiftReport } from '../../services/shift-report.service';
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs'; // Added 'of'
import { switchMap } from 'rxjs/operators'; // Added switchMap operator
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router'; // <-- Import ActivatedRoute
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  documentTextOutline,
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent, IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  // Standalone components don't need IonicModule import here
} from '@ionic/angular/standalone';

// addIcons call remains the same
addIcons({
  calendarOutline,
  documentTextOutline,
  timeOutline,
  chevronBackOutline,
  chevronForwardOutline
});
@Component({
  selector: 'app-shift-report',
  standalone: true,
  // imports remain the same as listed above
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardContent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-header>
      <ion-toolbar class="header-toolbar">
        <ion-buttons slot="start">
          <!-- Conditionally change back button destination -->
          <ion-back-button
             [defaultHref]="isAdminView ? '/manage-employees' : '/employee-dashboard'"
          ></ion-back-button>
        </ion-buttons>
        <ion-title>
            {{ isAdminView ? 'Employee Shift Report' : 'My Shift Hours Report' }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="custom-content"> <!-- Added custom-content class if needed by styles -->
      <div class="ion-padding">
        <!-- Report Type Selection -->
        <ion-segment [(ngModel)]="reportType" (ionChange)="onReportTypeChange()" class="custom-segment">
          <ion-segment-button value="weekly">
            <ion-icon name="calendar-outline"></ion-icon> <!-- Corrected icon name case -->
            <ion-label>Weekly</ion-label>
          </ion-segment-button>
          <ion-segment-button value="monthly">
            <ion-icon name="calendar-outline"></ion-icon> <!-- Corrected icon name case -->
            <ion-label>Monthly</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Date Navigation -->
        <div class="date-navigation">
          <ion-button fill="clear" (click)="navigateDate('back')" class="nav-button"> <!-- Added class -->
            <ion-icon name="chevron-back-outline"></ion-icon> <!-- Corrected icon name case -->
          </ion-button>
          <div class="date-display">
            <span class="date-range">{{ getDisplayDateRange() }}</span>
          </div>
          <ion-button fill="clear" (click)="navigateDate('forward')" class="nav-button"> <!-- Added class -->
            <ion-icon name="chevron-forward-outline"></ion-icon> <!-- Corrected icon name case -->
          </ion-button>
        </div>

        <!-- Summary Card -->
         <!-- Check if shifts$ exists and has emitted before showing summary -->
         <ng-container *ngIf="shifts$ | async as shifts; else loadingOrError">
             <ion-card *ngIf="shifts !== null" class="summary-card fade-in"> <!-- Ensure shifts is not null -->
                 <ion-card-content>
                     <div class="summary-grid">
                         <div class="summary-item">
                           <span class="label">Total Shifts</span>
                           <span class="value">{{ shifts.length }}</span>
                         </div>
                         <div class="summary-item">
                           <span class="label">Total Hours</span>
                           <span class="value">{{ calculateTotalHours(shifts) | number:'1.1-1' }}</span>
                         </div>
                     </div>
                 </ion-card-content>
             </ion-card>

             <!-- Optional: Display empty state within the async pipe if shifts array is empty -->
              <div *ngIf="shifts?.length === 0" class="empty-state fade-in">
                  <ion-icon name="document-text-outline"></ion-icon>
                  <h3>No Shifts Found</h3>
                  <p>There are no recorded shifts for this period.</p>
              </div>
         </ng-container>

        <!-- Loading/Error Template -->
        <ng-template #loadingOrError>
             <!-- You can add a loading spinner here if needed -->
             <!-- <ion-spinner name="crescent"></ion-spinner> -->
             <!-- Or just leave it blank until shifts$ emits -->
        </ng-template>


        <!-- Generate Report Button -->
        <ion-button
          expand="block"
          class="generate-button"
          (click)="generateReport()"
           [disabled]="!(shifts$ | async)?.length"
        >
          <ion-icon name="document-text-outline" slot="start"></ion-icon>
          Generate PDF Report
        </ion-button>
      </div>
    </ion-content>
  `, // Pass the template string here
  styles: [`
    /* Base styles */
    .custom-content {
      --background: #f5faff; /* Light blue-grey background */
    }

    .header-toolbar {
        /* Softer gradient */
       --background: linear-gradient(135deg, #64b5f6 0%, #90caf9 100%); /* Example blue gradient */
       --color: white; /* White text */
    }

    ion-title {
      font-weight: 600;
    }

    ion-back-button {
        --color: white; /* Ensure back button icon is visible */
    }

    /* Segment styling */
    .custom-segment {
      margin: 16px 0;
      --background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(100, 181, 246, 0.15); /* Adjusted shadow */

      ion-segment-button {
        --color: #64b5f6; /* Primary blue color */
        --color-checked: white; /* White text when checked */
        /* Gradient background when checked */
        --background-checked: linear-gradient(135deg, #64b5f6 0%, #90caf9 100%);
        --indicator-color: transparent; /* Hide default indicator */
        font-weight: 500;
        border-radius: 8px;
        margin: 3px; /* Small gap between buttons */
        transition: all 0.3s ease; /* Smooth transition */
        text-transform: none; /* Prevent uppercase */
      }

      ion-icon {
        margin-bottom: 2px; /* Space icon and label */
      }
    }

    /* Date navigation */
    .date-navigation {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 20px 0;
      padding: 8px 4px; /* Reduced padding */
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(100, 181, 246, 0.15);
    }

    .nav-button {
      --color: #64b5f6; /* Button icon color */
       --ripple-color: rgba(100, 181, 246, 0.1); /* Ripple effect */
      --padding-start: 8px;
      --padding-end: 8px;
    }

    .date-display {
      text-align: center;
      flex: 1; /* Take up remaining space */
      padding: 0 8px; /* Space around text */
    }

    .date-range {
      font-size: 1em; /* Slightly smaller */
      font-weight: 600;
      color: #37474f; /* Darker text color */
      letter-spacing: 0.3px;
    }

    /* Summary card */
    .summary-card {
       margin: 16px 0;
       border-radius: 12px; /* Slightly less rounded */
       box-shadow: 0 4px 12px rgba(100, 181, 246, 0.1); /* Softer shadow */
       background: white;
       overflow: hidden; /* Clip content */
    }


    .summary-grid {
       display: grid;
       grid-template-columns: 1fr 1fr; /* Two equal columns */
       gap: 16px; /* Space between items */
       padding: 16px; /* Padding inside the card */
    }

    .summary-item {
       display: flex;
       flex-direction: column; /* Stack label and value */
       align-items: center; /* Center align text */
       text-align: center;
       background-color: #f8faff; /* Very light background for item */
       padding: 12px 8px;
       border-radius: 8px;
    }


    .summary-item .label {
       font-size: 0.8em; /* Smaller label */
       color: #78909c; /* Greyish blue text */
       margin-bottom: 4px;
       text-transform: uppercase; /* Uppercase label */
       letter-spacing: 0.5px;
    }

    .summary-item .value {
       font-size: 1.6em; /* Larger value */
       font-weight: 700;
       color: #64b5f6; /* Primary blue */
       line-height: 1.2;
    }


    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      margin-top: 20px;
      color: #90a4ae; /* Lighter grey text */
      background-color: #ffffff;
      border-radius: 12px;
      border: 1px dashed #cfd8dc; /* Dashed border */

      ion-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: #b0bec5; /* Lighter icon color */
      }

      h3 {
        margin: 0 0 8px;
        font-weight: 600;
        color: #546e7a; /* Darker grey heading */
      }

      p {
        margin: 0;
        font-size: 0.9em;
      }
    }

    /* Generate button */
    .generate-button {
       margin-top: 24px;
       margin-bottom: 24px;
       --background: linear-gradient(135deg, #64b5f6 0%, #90caf9 100%);
       --border-radius: 10px;
       font-weight: 500;
       height: 48px;
       text-transform: none; /* Normal case */
       letter-spacing: 0.5px;
       box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);

       &:hover {
           /* Slightly lighter gradient on hover */
           --background: linear-gradient(135deg, #81c7ff 0%, #b3e0ff 100%);
       }

       /* Style for disabled state */
        &[disabled] {
           --background: #cfd8dc; /* Grey background when disabled */
           --box-shadow: none;
           opacity: 0.7;
        }
    }

    /* Animation */
    .fade-in {
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px); /* Slight upward movement */
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    `] // Pass the styles string here
})
export class ShiftReportPage implements OnInit, OnDestroy {
  reportType: 'weekly' | 'monthly' = 'weekly';
  selectedDate = new Date();
  shifts$: Observable<ShiftReport[] | null> = of(null); // Initialize with null
  employeeId: string | null = null;
  isAdminView: boolean = false; // Flag for UI changes
  private dataSub: Subscription | null = null; // Renamed subscription

  constructor(
    private shiftReportService: ShiftReportService,
    private authService: AuthService,
    private route: ActivatedRoute // Inject ActivatedRoute
  ) { }

  ngOnInit() {
    // Chain route param check and auth check
    this.dataSub = this.route.paramMap.pipe(
      switchMap(params => {
        const routeEmployeeId = params.get('employeeId');
        if (routeEmployeeId) {
          // Admin view: Use employeeId from route
          this.isAdminView = true;
          this.employeeId = routeEmployeeId;
          console.log(`Admin view: Reporting for employee ${this.employeeId}`);
          return of(this.employeeId); // Pass the ID down the chain
        } else {
          // Personal view: Get logged-in user's ID
          this.isAdminView = false;
          return this.authService.getCurrentUser().pipe(
            switchMap(user => {
              if (user) {
                this.employeeId = user.uid;
                console.log(`Personal view: Reporting for employee ${this.employeeId}`);
                return of(this.employeeId); // Pass the ID down
              } else {
                console.error('No user logged in and no employeeId in route.');
                this.employeeId = null;
                return of(null); // Indicate no valid ID found
              }
            })
          );
        }
      })
    ).subscribe(id => {
      if (id) {
        // An employee ID was determined (either from route or auth)
        this.fetchShifts(); // Fetch shifts now that we have the ID
      } else {
        // Handle the case where no ID could be determined
        this.shifts$ = of([]); // Show empty state or handle error
        console.warn('Could not determine employee ID for report.');
        // Potentially show an error message to the user
      }
    });
  }

  ngOnDestroy() {
    this.dataSub?.unsubscribe(); // Unsubscribe
  }

  onReportTypeChange() {
    // Reset date to current month/week when type changes for simplicity
    this.selectedDate = new Date();
    // Re-fetch shifts only if we have a valid employeeId
    if (this.employeeId) {
      this.fetchShifts();
    }
  }

  navigateDate(direction: 'back' | 'forward') {
    const currentDate = new Date(this.selectedDate); // Clone to avoid direct mutation issues if needed elsewhere

    if (this.reportType === 'weekly') {
      currentDate.setDate(currentDate.getDate() + (direction === 'back' ? -7 : 7));
    } else { // monthly
      currentDate.setMonth(currentDate.getMonth() + (direction === 'back' ? -1 : 1));
    }

    this.selectedDate = currentDate; // Update the component's selectedDate

    // Re-fetch shifts only if we have a valid employeeId
    if (this.employeeId) {
      this.fetchShifts();
    }
  }


  fetchShifts() {
    if (!this.employeeId) {
      console.warn("Attempted to fetch shifts without an employeeId.");
      this.shifts$ = of([]); // Set to empty array observable
      return; // Guard clause
    }

    let startDate: Date;
    let endDate: Date;

    // Ensure selectedDate is a valid Date object before calculations
    if (!(this.selectedDate instanceof Date) || isNaN(this.selectedDate.getTime())) {
      console.error("Invalid selectedDate:", this.selectedDate);
      this.selectedDate = new Date(); // Reset to current date as a fallback
    }


    if (this.reportType === 'weekly') {
      startDate = this.getStartOfWeek(this.selectedDate);
      endDate = this.getEndOfWeek(this.selectedDate);
    } else { // monthly
      startDate = this.getStartOfMonth(this.selectedDate);
      endDate = this.getEndOfMonth(this.selectedDate);
    }

    console.log(`Fetching shifts for ${this.employeeId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    // Assign the observable directly
    this.shifts$ = this.shiftReportService.getShiftsByDateRange(
      this.employeeId!,
      startDate,
      endDate
    );

    // Optional: Handle potential errors from the service call
    this.shifts$.subscribe({
      error: (err) => {
        console.error("Error fetching shifts:", err);
        this.shifts$ = of([]); // Show empty on error
      }
    });
  }

  async generateReport() {
    if (!this.employeeId) {
      console.error("Cannot generate report without employeeId.");
      return;
    }

    // We need the current shifts data, not just the observable
    // Use a temporary subscription or take(1) if you prefer
    const shiftsSub = this.shifts$.subscribe(async shifts => {
      if (!shifts || shifts.length === 0) {
        console.log("No shifts data available to generate report.");
        // Optionally show a toast message to the user
        return;
      }

      let startDate: Date;
      let endDate: Date;

      if (this.reportType === 'weekly') {
        startDate = this.getStartOfWeek(this.selectedDate);
        endDate = this.getEndOfWeek(this.selectedDate);
      } else { // monthly
        startDate = this.getStartOfMonth(this.selectedDate);
        endDate = this.getEndOfMonth(this.selectedDate);
      }

      try {
        console.log(`Generating PDF report for ${this.employeeId}...`);
        await this.shiftReportService.generatePdfReport(
          this.employeeId!,
          startDate,
          endDate,
          shifts // Pass the actual shifts array
        );
        console.log("PDF report generation initiated.");
      } catch (error) {
        console.error("Error generating PDF report:", error);
        // Optionally show an error message to the user
      }
    });

    // Clean up the temporary subscription after it runs once
    // Note: This might run before the async operation inside completes,
    // but it prevents memory leaks if the component is destroyed quickly.
    // Consider using `firstValueFrom` or `take(1)` for cleaner handling.
    setTimeout(() => shiftsSub.unsubscribe(), 0);

    /* Alternative using firstValueFrom (more modern RxJS):
    try {
        const shifts = await firstValueFrom(this.shifts$.pipe(filter(s => s !== null))); // Wait for non-null shifts
        if (!shifts || shifts.length === 0) {
           console.log("No shifts data available to generate report.");
           return;
        }
        // ... (calculate startDate, endDate)
        await this.shiftReportService.generatePdfReport(...);
    } catch (error) {
        console.error("Error generating PDF report:", error);
    }
    */
  }

  // --- Helper functions remain the same ---
  getDisplayDateRange(): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
      day: 'numeric'
    });

    // Ensure selectedDate is valid before formatting
    if (!(this.selectedDate instanceof Date) || isNaN(this.selectedDate.getTime())) {
      return "Invalid Date";
    }


    if (this.reportType === 'weekly') {
      const startDate = this.getStartOfWeek(this.selectedDate);
      const endDate = this.getEndOfWeek(this.selectedDate);
      // Additional check for valid start/end dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "Invalid Week";
      return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
    } else { // monthly
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
      }).format(this.selectedDate);
    }
  }

  calculateTotalHours(shifts: ShiftReport[] | null): number {
    if (!shifts) return 0; // Handle null case
    return shifts.reduce((total, shift) => total + (shift.totalHours || 0), 0); // Add null check for totalHours
  }

  // Add null/undefined check for the input date parameter in helper functions
  private getStartOfWeek(date: Date | null | undefined): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); // Assuming Monday is start of week
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfWeek(date: Date | null | undefined): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    const startOfWeek = this.getStartOfWeek(d);
    startOfWeek.setDate(startOfWeek.getDate() + 6);
    startOfWeek.setHours(23, 59, 59, 999);
    return startOfWeek;
  }

  private getStartOfMonth(date: Date | null | undefined): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  }

  private getEndOfMonth(date: Date | null | undefined): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Removed groupShiftsByDate and formatTimestamp as they weren't used in the provided template
  // Removed formatDate and formatTime as they weren't used either
}
