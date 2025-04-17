import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
// ... other imports
import { firstValueFrom } from 'rxjs'; // For cleaner async/await with Observables
import jsPDF from 'jspdf';
import { CommonModule } from '@angular/common';

// No need for IonicModule if using standalone components everywhere
import { FormsModule } from '@angular/forms';
import { ShiftReportService, ShiftReport } from '../../services/shift-report.service';
import { Observable, Subscription, BehaviorSubject, of } from 'rxjs'; // Added 'of'
import { filter, switchMap } from 'rxjs/operators'; // Added switchMap operator
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router'; // <-- Import ActivatedRoute
import { addIcons } from 'ionicons';

import html2canvas from 'html2canvas';
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
  IonLabel, ToastController,
  // Standalone components don't need IonicModule import here
} from '@ionic/angular/standalone';
import { ShiftReportTemplateComponent } from 'src/app/pdf-templates/shift-report-template/shift-report-template.component';

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
    IonHeader, ShiftReportTemplateComponent,
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
      <ion-back-button
         [defaultHref]="isAdminView ? '/manage-employees' : '/employee-dashboard'"
      ></ion-back-button>
    </ion-buttons>
    <ion-title>
        {{ isAdminView ? 'Employee Shift Report' : 'My Shift Hours Report' }}
    </ion-title>
  </ion-toolbar>
</ion-header>

<!-- Hidden container for the PDF template.
     It needs to be in the DOM for jsPDF to access it,
     but positioned off-screen. -->
<div style="position: absolute; left: -9999px; top: 0px; z-index: -100;" #pdfTemplateContainer>
   <app-shift-report-template
     [shifts]="(shifts$ | async) || []"
     [employeeId]="employeeId"
     [startDate]="currentStartDate"
     [endDate]="currentEndDate">
   </app-shift-report-template>
</div>


<ion-content class="custom-content">
  <div class="ion-padding">
    <!-- Report Type Selection -->
    <ion-segment [(ngModel)]="reportType" (ionChange)="onReportTypeChange()" class="custom-segment" mode="md">
      <ion-segment-button value="weekly">
        <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
        <ion-label>Weekly</ion-label>
      </ion-segment-button>
      <ion-segment-button value="monthly">
        <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
        <ion-label>Monthly</ion-label>
      </ion-segment-button>
    </ion-segment>

    <!-- Date Navigation -->
    <div class="date-navigation">
      <ion-button fill="clear" (click)="navigateDate('back')" class="nav-button" aria-label="Previous Period">
        <ion-icon name="chevron-back-outline" slot="icon-only"></ion-icon>
      </ion-button>
      <div class="date-display">
        <span class="date-range">{{ getDisplayDateRange() }}</span>
      </div>
      <ion-button fill="clear" (click)="navigateDate('forward')" class="nav-button" aria-label="Next Period">
        <ion-icon name="chevron-forward-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </div>

    <!-- Summary Card -->
     <ng-container *ngIf="shifts$ | async as shifts; else loadingOrError">
         <ion-card *ngIf="shifts !== null" class="summary-card fade-in">
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

          <div *ngIf="shifts?.length === 0" class="empty-state fade-in">
              <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
              <h3>No Shifts Found</h3>
              <p>There are no recorded shifts for this period.</p>
          </div>
     </ng-container>

    <!-- Loading/Error Template -->
    <ng-template #loadingOrError>
         <!-- Can add a loading spinner or skeleton text -->
         <div class="ion-text-center ion-padding-top">
            <!-- <ion-spinner name="crescent"></ion-spinner> <p>Loading shifts...</p> -->
            <!-- Or keep it blank until data loads -->
         </div>
    </ng-template>


    <!-- Generate Report Button -->
    <ion-button
      expand="block"
      class="generate-button"
      (click)="generatePdfFromTemplate()"
      [disabled]="!(shifts$ | async)?.length"
    >
      <ion-icon name="document-text-outline" slot="start" aria-hidden="true"></ion-icon>
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
  shifts$: Observable<ShiftReport[]> = of([]);
  employeeId: string | null = null;
  isAdminView: boolean = false;
  private dataSub: Subscription | null = null;

  // Properties to store the calculated date range for the template/PDF
  currentStartDate: Date | null = null;
  currentEndDate: Date | null = null;

  // Reference to the hidden template component's container element
  @ViewChild('pdfTemplateContainer') pdfTemplateRef!: ElementRef<HTMLDivElement>;

  constructor(
    private shiftReportService: ShiftReportService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private toastController: ToastController // <-- Inject ToastController
  ) { }

  ngOnInit() {
    this.dataSub = this.route.paramMap.pipe(
      switchMap(params => {
        const routeEmployeeId = params.get('employeeId');
        if (routeEmployeeId) {
          this.isAdminView = true;
          this.employeeId = routeEmployeeId;
          console.log(`Admin view: Reporting for employee ${this.employeeId}`);
          return of(this.employeeId);
        } else {
          this.isAdminView = false;
          return this.authService.getCurrentUser().pipe(
            switchMap(user => {
              if (user) {
                this.employeeId = user.uid;
                console.log(`Personal view: Reporting for employee ${this.employeeId}`);
                return of(this.employeeId);
              } else {
                console.error('No user logged in and no employeeId in route.');
                this.employeeId = null;
                return of(null);
              }
            })
          );
        }
      })
    ).subscribe(id => {
      if (id) {
        this.fetchShifts(); // Initial fetch
      } else {
        this.shifts$ = of([]);
        this.showToast('Could not determine user for report.', 'warning');
        console.warn('Could not determine employee ID for report.');
      }
    });
  }

  ngOnDestroy() {
    this.dataSub?.unsubscribe();
  }

  onReportTypeChange() {
    this.selectedDate = new Date(); // Reset date
    if (this.employeeId) {
      this.fetchShifts();
    }
  }

  navigateDate(direction: 'back' | 'forward') {
    const currentDate = new Date(this.selectedDate);
    if (this.reportType === 'weekly') {
      currentDate.setDate(currentDate.getDate() + (direction === 'back' ? -7 : 7));
    } else {
      currentDate.setMonth(currentDate.getMonth() + (direction === 'back' ? -1 : 1));
    }
    this.selectedDate = currentDate;
    if (this.employeeId) {
      this.fetchShifts();
    }
  }

  fetchShifts() {
    if (!this.employeeId) {
      console.warn("Attempted to fetch shifts without an employeeId.");
      this.shifts$ = of([]);
      this.currentStartDate = null; // Clear dates
      this.currentEndDate = null;
      return;
    }

    // Ensure selectedDate is valid
    if (!(this.selectedDate instanceof Date) || isNaN(this.selectedDate.getTime())) {
      console.error("Invalid selectedDate:", this.selectedDate);
      this.selectedDate = new Date();
      this.showToast('Invalid date selected, reset to current.', 'warning');
    }

    // Calculate and STORE the current date range
    if (this.reportType === 'weekly') {
      this.currentStartDate = this.getStartOfWeek(this.selectedDate);
      this.currentEndDate = this.getEndOfWeek(this.selectedDate);
    } else { // monthly
      this.currentStartDate = this.getStartOfMonth(this.selectedDate);
      this.currentEndDate = this.getEndOfMonth(this.selectedDate);
    }

    // Double check calculated dates are valid
    if (!this.currentStartDate || !this.currentEndDate || isNaN(this.currentStartDate.getTime()) || isNaN(this.currentEndDate.getTime())) {
      console.error("Failed to calculate a valid date range.");
      this.shifts$ = of([]);
      this.showToast('Error calculating report dates.', 'danger');
      return;
    }

    console.log(`Fetching shifts for ${this.employeeId} from ${this.currentStartDate.toISOString()} to ${this.currentEndDate.toISOString()}`);
    this.shifts$ = this.shiftReportService.getShiftsByDateRange(
      this.employeeId!,
      this.currentStartDate, // Use stored dates
      this.currentEndDate   // Use stored dates
    );

    // Handle potential errors from the service call
    this.shifts$.subscribe({
      error: (err) => {
        console.error("Error fetching shifts:", err);
        this.shifts$ = of([]); // Show empty on error
        this.showToast('Error fetching shift data.', 'danger');
      }
      // No need for next handler here as we use async pipe in template
    });
  }

  // --- NEW PDF Generation Method using HTML Template ---
  async generatePdfFromTemplate() {
    console.log('Attempting PDF generation from template...');

    // 1. Guard Clauses for necessary data and elements
    if (!this.pdfTemplateRef?.nativeElement) {
      console.error('PDF template container reference is not available.');
      this.showToast('Error preparing report template.', 'danger');
      return;
    }
    if (!this.employeeId || !this.currentStartDate || !this.currentEndDate) {
      console.error('Missing necessary data for PDF generation (employeeId or dates).');
      this.showToast('Report data is incomplete.', 'warning');
      return;
    }

    let shifts: ShiftReport[];
    try {
      // 2. Get the current shifts data (wait for observable to emit)
      // Use filter(s => s !== null) to ensure we don't proceed if observable hasn't emitted yet or emitted null
      const shiftsResult = await firstValueFrom(this.shifts$.pipe(filter(s => s !== null)));
      if (!shiftsResult) { // Should be caught by filter, but extra safety
        console.log("Shifts data is null.");
        this.showToast('Shift data not loaded yet.', 'warning');
        return;
      }
      shifts = shiftsResult as ShiftReport[];

      // 3. Check if there are any shifts to report
      if (shifts.length === 0) {
        console.log("No shifts data available to generate report.");
        this.showToast('No shifts found for this period to generate report.', 'medium');
        return;
      }

    } catch (error) {
      console.error("Error retrieving shifts data for PDF:", error);
      this.showToast('Failed to get shift data for report.', 'danger');
      return;
    }

    // 4. Initialize jsPDF
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true,
    }) as jsPDF & { html: (element: HTMLElement, options?: any) => Promise<any> };
    // 5. Get the HTML element to convert
    // We target the specific wrapper inside the template component for cleaner conversion
    const sourceElement = this.pdfTemplateRef.nativeElement.querySelector('#pdf-content-wrapper');
    if (!sourceElement) {
      console.error("Could not find #pdf-content-wrapper element within the template.");
      this.showToast('Report template structure error.', 'danger');
      return;
    }

    // 6. Use pdf.html() to convert the element
    try {
      console.log('Calling pdf.html()...');
      await pdf.html(sourceElement as HTMLElement, {
        callback: (doc: { save: (arg0: string) => void; }) => {
          // 7. Save the PDF inside the callback
          const startDateStr = this.currentStartDate!.toISOString().split('T')[0];
          const endDateStr = this.currentEndDate!.toISOString().split('T')[0];
          const fileName = `shift_report_${this.employeeId}_${startDateStr}_to_${endDateStr}.pdf`;

          console.log(`Saving PDF as: ${fileName}`);
          doc.save(fileName);
          this.showToast('PDF Report Generated Successfully!', 'success');
        },
        // Adjust margins and width as needed. These are in the unit defined above ('pt')
        margin: [40, 30, 40, 30], // top, left, bottom, left margins in points
        // width: 595 - 30 - 30, // A4 width (595pt) minus left/right margins (optional, jsPDF tries to figure it out)
        windowWidth: sourceElement.clientWidth || 700, // Help jsPDF with element width calculation (use actual width if possible)
        html2canvas: {
          scale: 0.7, // Adjust scale down if content overflows width (lower = smaller content)
          useCORS: true, // Important if you have external images/styles (usually not needed here)
          logging: false, // Reduce console noise
        },
        // autoPaging: 'text' // Experiment with autoPaging if needed, can be tricky
      });
      console.log('pdf.html() process completed.');
    } catch (error) {
      console.error("Error occurred during pdf.html() conversion:", error);
      this.showToast('Failed to convert report to PDF.', 'danger');
    }
  }

  // --- Helper functions ---
  getDisplayDateRange(): string {
    // Ensure dates are valid before formatting
    if (!this.currentStartDate || !this.currentEndDate || isNaN(this.currentStartDate.getTime()) || isNaN(this.currentEndDate.getTime())) {
      // Try to calculate them if not available yet (e.g., initial load before fetch completes)
      if (this.reportType === 'weekly') {
        const start = this.getStartOfWeek(this.selectedDate);
        const end = this.getEndOfWeek(this.selectedDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Calculating...";
        return `${this.formatSimpleDate(start)} - ${this.formatSimpleDate(end)}`;
      } else {
        if (isNaN(this.selectedDate.getTime())) return "Calculating...";
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.selectedDate);
      }
    }

    if (this.reportType === 'weekly') {
      return `${this.formatSimpleDate(this.currentStartDate)} - ${this.formatSimpleDate(this.currentEndDate)}`;
    } else { // monthly
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.currentStartDate); // Use start date for month name
    }
  }

  // Helper for consistent date formatting
  private formatSimpleDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }


  calculateTotalHours(shifts: ShiftReport[] | null): number {
    if (!shifts) return 0;
    return shifts.reduce((total, shift) => total + (shift.totalHours || 0), 0);
  }

  // --- Date calculation helpers (ensure they handle potential invalid input) ---
  private getStartOfWeek(date: Date): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date(); // Use valid date or fallback
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    // Adjust to get Monday (if Sunday (0), go back 6 days, else go back day-1 days)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private getEndOfWeek(date: Date): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    const startOfWeek = this.getStartOfWeek(d); // Use the reliable start date
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Add 6 days to get Sunday
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  }

  private getStartOfMonth(date: Date): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth;
  }

  private getEndOfMonth(date: Date): Date {
    const d = date instanceof Date && !isNaN(date.getTime()) ? new Date(date) : new Date();
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0); // Day 0 of next month is last day of current
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  }

  // --- Helper to show toast messages ---
  async showToast(message: string, color: 'success' | 'warning' | 'danger' | 'medium' = 'medium', duration: number = 3000) {
    const toast = await this.toastController.create({
      message: message,
      duration: duration,
      color: color,
      position: 'bottom' // Or 'top', 'middle'
    });
    await toast.present();
  }

  // Removed the old generateReport method as it's replaced by generatePdfFromTemplate
}
