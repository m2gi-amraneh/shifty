import {
  OnInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy // Import OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonBackButton,
  IonButtons, IonItem, IonLabel, IonChip, IonSegment, IonSegmentButton,
  IonList, IonItemSliding, IonItemOption, IonItemOptions, IonFab, // Keep ItemSliding imports if used elsewhere, but not needed here
  IonFabButton, IonIcon, IonSpinner, ActionSheetController // Added ActionSheetController
} from '@ionic/angular/standalone';
import { register } from 'swiper/element/bundle';
import { addIcons } from 'ionicons';
import {
  add, addCircle, calendarOutline, trash, close, pencilOutline, timeOutline, briefcaseOutline,
  hourglassOutline, helpCircleOutline // Added hourglass, help-circle
} from 'ionicons/icons';

import Swiper from 'swiper';
import { PlanningService, Shift } from '../../services/planning.service';
import { from, Observable, of, Subscription } from 'rxjs';
import { PositionsService } from '../../services/positions.service';
import { UsersService } from '../../services/users.service';
import { AddShiftModalComponent } from '../../modals/add-shift-modal.component';

register();
// Added new icons
addIcons({
  trash, add, close, addCircle, calendarOutline, pencilOutline, timeOutline, briefcaseOutline,
  hourglassOutline, helpCircleOutline
});

// Use Employee interface from UsersService if available, otherwise define locally
interface Employee {
  id: string;
  name: string;
}

@Component({
  selector: 'app-planning',
  templateUrl: './planing.page.html',
  styleUrls: ['./planing.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonIcon,
    IonToolbar, IonButton, IonBackButton, IonButtons, IonItem, IonLabel,
    IonChip, IonSegment, IonSegmentButton, IonList, /* IonItemSliding, IonItemOption, IonItemOptions, */ // Removed Sliding imports as they are not used directly in the template now
    IonFab, IonFabButton, IonSpinner,
    AddShiftModalComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanningPage implements OnInit, AfterViewInit, OnDestroy { // Implement OnDestroy
  @ViewChild('swiper', { static: false }) swiperRef!: ElementRef;
  swiper!: Swiper;
  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDay: string;

  employees$: Observable<Employee[]> = of([]);
  roles$: Observable<any> = of([]);

  shifts$!: Observable<Shift[]>;
  currentDayShifts: Shift[] = [];
  isLoadingShifts = false;
  private shiftsSubscription: Subscription | null = null;

  showShiftModal = false;
  shiftToEdit: Shift | null = null;

  constructor(
    private planningService: PlanningService,
    private positionsService: PositionsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private actionSheetCtrl: ActionSheetController // Inject ActionSheetController
  ) {
    const todayIndex = new Date().getDay();
    this.selectedDay = this.weekDays[todayIndex === 0 ? 6 : todayIndex - 1] || 'Monday';
  }

  ngOnInit() {
    this.loadEmployees();
    this.loadRoles();
    this.loadShiftsForSelectedDay();
  }

  ngAfterViewInit() {
    this.initializeSwiper();
  }

  ngOnDestroy() {
    this.shiftsSubscription?.unsubscribe(); // Clean up subscription
  }

  initializeSwiper() {
    setTimeout(() => {
      if (this.swiperRef?.nativeElement) {
        this.swiper = this.swiperRef.nativeElement.swiper;
        const initialDayIndex = this.weekDays.indexOf(this.selectedDay);
        if (this.swiper && initialDayIndex !== -1) {
          this.swiper.slideTo(initialDayIndex, 0);
        }
      } else {
        console.warn("Swiper ref not available yet in ngAfterViewInit");
      }
    }, 0);
  }

  loadEmployees() {
    this.employees$ = this.usersService.getEmployees();
    this.cdr.markForCheck();
  }

  loadRoles() {
    this.roles$ = from(this.positionsService.getPositions());
    this.cdr.markForCheck();
  }

  loadShiftsForSelectedDay() {
    if (!this.selectedDay) return; // Prevent loading if day is somehow undefined

    this.isLoadingShifts = true;
    this.currentDayShifts = []; // Clear previous day's shifts immediately
    this.cdr.markForCheck();
    this.shiftsSubscription?.unsubscribe();

    this.shifts$ = this.planningService.getShiftsForDayRealtime(this.selectedDay);
    this.shiftsSubscription = this.shifts$.subscribe({
      next: (shifts) => {
        // Sort and enrich shifts (if needed, e.g., pre-calculate duration or employee name if not populated)
        this.currentDayShifts = shifts
          .map(shift => ({
            ...shift,
            // Ensure employee data is present if possible (might be needed if getShiftsForDayRealtime doesn't populate)
            // employee: shift.employee || { id: shift.employeeId, name: 'Loading...' }
          }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        this.isLoadingShifts = false;
        this.cdr.markForCheck(); // Trigger change detection
      },
      error: (err) => {
        console.error(`Error loading shifts for ${this.selectedDay}:`, err);
        this.isLoadingShifts = false;
        this.currentDayShifts = [];
        this.cdr.markForCheck();
        // TODO: Show user-friendly error message (e.g., ToastController)
      }
    });
  }

  trackById(index: number, shift: Shift): string {
    return shift.id!;
  }

  getDayIndex(day: string): number {
    return this.weekDays.indexOf(day);
  }

  // --- Swiper and Segment Handlers ---

  onSlideChange(event: any) {
    if (this.swiper && typeof this.swiper.activeIndex === 'number') {
      const activeIndex = this.swiper.activeIndex;
      if (activeIndex >= 0 && activeIndex < this.weekDays.length) {
        const newSelectedDay = this.weekDays[activeIndex];
        if (newSelectedDay !== this.selectedDay) {
          this.selectedDay = newSelectedDay;
          this.loadShiftsForSelectedDay();
          this.cdr.markForCheck(); // Update segment binding
        }
      }
    } else if (event?.detail?.[0]?.activeIndex !== undefined) {
      const activeIndex = event.detail[0].activeIndex;
      if (activeIndex >= 0 && activeIndex < this.weekDays.length) {
        const newSelectedDay = this.weekDays[activeIndex];
        if (newSelectedDay !== this.selectedDay) {
          this.selectedDay = newSelectedDay;
          this.loadShiftsForSelectedDay();
          this.cdr.markForCheck();
        }
      }
    }
  }

  onSegmentChange() {
    this.loadShiftsForSelectedDay();
    const dayIndex = this.getDayIndex(this.selectedDay);
    if (this.swiper && dayIndex !== -1 && this.swiper.activeIndex !== dayIndex) {
      this.swiper.slideTo(dayIndex);
    }
  }

  // --- Modal Handling ---

  openAddShiftModal(day: string) {
    this.shiftToEdit = null;
    this.selectedDay = day;
    this.showShiftModal = true;
    this.cdr.markForCheck();
  }

  // Updated: No longer needs slidingItem
  openEditShiftModal(shift: Shift) {
    this.shiftToEdit = { ...shift };
    this.selectedDay = shift.day; // Ensure context is correct
    this.showShiftModal = true;
    this.cdr.markForCheck();
  }

  closeShiftModal() {
    this.showShiftModal = false;
    this.shiftToEdit = null;
    this.cdr.markForCheck();
  }

  // --- CRUD Operations ---

  async handleShiftSave(shiftData: Omit<Shift, 'id'>) {
    try {
      await this.planningService.addShift(shiftData as Shift);
      console.log('Shift added successfully');
      this.closeShiftModal();
      // Realtime listener updates the view
    } catch (error) {
      console.error('Error adding shift: ', error);
      // TODO: Show user-friendly error message
    }
  }

  async handleShiftUpdate(updatedShiftData: Shift) { // Event type might be just Shift now
    if (!updatedShiftData.id) {
      console.error('Cannot update shift without an ID');
      return;
    }
    try {
      const { id, ...dataToUpdate } = updatedShiftData;
      await this.planningService.updateShift(id, dataToUpdate);
      console.log('Shift updated successfully');
      this.closeShiftModal();
      // Realtime listener updates the view
    } catch (error) {
      console.error('Error updating shift: ', error);
      // TODO: Show user-friendly error message
    }
  }

  // Updated: Remove shift requires confirmation now
  async presentDeleteConfirm(shiftId: string | undefined) {
    if (!shiftId) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Delete Shift',
      subHeader: 'Are you sure you want to delete this shift?',
      buttons: [
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash', // Optional icon
          handler: () => {
            this.deleteShift(shiftId);
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close', // Optional icon
          handler: () => {
            console.log('Delete canceled');
          },
        },
      ],
    });
    await actionSheet.present();
  }

  private async deleteShift(shiftId: string) {
    try {
      await this.planningService.deleteShift(shiftId);
      console.log('Shift removed successfully');
      // Realtime listener should update the view, force check detection just in case
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error removing shift: ', error);
      // TODO: Show user-friendly error message
    }
  }


  // --- Utility ---

  getDayHeader(day: string): string {
    const today = new Date();
    const currentDayIndex = today.getDay();
    const targetDayIndex = this.weekDays.indexOf(day);
    const adjustedCurrentDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
    const diff = targetDayIndex - adjustedCurrentDayIndex;
    const date = new Date(today);
    date.setDate(today.getDate() + diff);
    return `${day}, ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  private convertTo24Hour(timeString: string): string | null {
    if (!timeString) return null;

    const time = timeString.trim().toUpperCase();
    // Regex to capture hours (1-12), minutes (00-59), and AM/PM
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

    if (!match) {
      // If it doesn't match AM/PM format, assume it might already be HH:mm
      // Basic check for HH:mm format
      if (/^(\d{1,2}):(\d{2})$/.test(timeString.trim())) {
        // You might want more robust validation here if needed
        // For now, just pad if necessary
        const [h, m] = timeString.trim().split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
      }
      console.warn(`Invalid time format for conversion: ${timeString}`);
      return null; // Indicate invalid format
    }

    let [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10); // Minutes are straightforward

    if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.warn(`Invalid time values in: ${timeString}`);
      return null; // Invalid hour/minute numbers
    }

    // --- Convert to 24-hour ---
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      // Midnight case: 12:xx AM becomes 00:xx
      hours = 0;
    }
    // If period is AM and hours is 1-11, it's already correct for 24h.
    // If period is PM and hours is 12, it's already correct for 24h.

    // Format to "HH:mm"
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
  }
  // NEW: Calculate Duration Function
  calculateDuration(startTime: string, endTime: string): string {
    // Use the helper to convert both times to HH:mm format first
    const start24 = this.convertTo24Hour(startTime);
    const end24 = this.convertTo24Hour(endTime);

    // Check if conversion was successful
    if (!start24 || !end24) {
      return 'Invalid Time'; // Return specific error if format is wrong
    }

    try {
      // Create dummy dates using the standardized 24-hour format
      const start = new Date(`1970-01-01T${start24}:00`);
      const end = new Date(`1970-01-01T${end24}:00`);

      // Check if Date objects are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid Date';
      }

      // Handle shifts crossing midnight
      if (end < start) {
        end.setDate(end.getDate() + 1); // Add 24 hours
      }

      const diffMillis = end.getTime() - start.getTime();
      // Ensure difference is not negative (shouldn't happen with midnight check, but good practice)
      if (diffMillis < 0) {
        return 'Error';
      }

      const diffHours = Math.floor(diffMillis / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMillis % (1000 * 60 * 60)) / (1000 * 60));

      let durationString = '';
      if (diffHours > 0) {
        durationString += `${diffHours}h`;
      }
      if (diffMinutes > 0) {
        durationString += `${durationString ? ' ' : ''}${diffMinutes}m`;
      }

      // Return '0m' if both hours and minutes are 0, otherwise the calculated string
      return durationString || '0m';

    } catch (e) {
      console.error("Error calculating duration:", e, { startTime, endTime, start24, end24 });
      return 'Error'; // Generic error for unexpected issues
    }
  }
}
