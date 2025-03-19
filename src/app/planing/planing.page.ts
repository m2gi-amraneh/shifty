// planning.page.ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonBackButton,
  IonButtons,
  IonItem,
  IonLabel,
  IonChip,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
  IonFab,
  IonFabButton, IonIcon

} from '@ionic/angular/standalone';
import { register } from 'swiper/element/bundle';
import { addIcons } from 'ionicons';
import { add, addCircle, calendarOutline, trash, close } from 'ionicons/icons';

import Swiper from 'swiper';
import { PlanningService } from '../services/planning.service';
import { from, Observable, of } from 'rxjs';
import { PositionsService } from '../services/positions.service';
import { UsersService } from '../services/users.service';
import { AddShiftModalComponent } from '../modals/add-shift-modal.component';

register();
addIcons({ trash, add, close, addCircle, calendarOutline });

interface Employee {
  id: string;
  name: string;


}

interface Shift {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
  employee: Employee;
  role: string;
}

@Component({
  selector: 'app-planning',
  templateUrl: './planing.page.html',
  styleUrls: ['./planing.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent,
    IonHeader,
    IonTitle, IonIcon,
    IonToolbar,
    IonButton,
    IonBackButton,
    IonButtons,
    IonItem,
    IonLabel,
    IonChip,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItemSliding,
    IonItemOption,
    IonItemOptions,
    IonFab,
    IonFabButton, AddShiftModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PlanningPage {
  @ViewChild('swiper', { static: false }) swiperRef!: ElementRef;
  swiper!: Swiper;
  weekDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  selectedDay = this.weekDays[new Date().getDay() - 1] || 'Monday';

  employees$: Observable<Employee[]> = of([]); // Observable of employees

  shifts$!: Observable<Shift[]>;
  currentDayShifts: Shift[] = [];

  showAddShiftModal = false;
  selectedEmployee: Employee = { id: '', name: '' };
  newShift = {
    day: '',
    startTime: '',
    endTime: '',
    role: '',
  };
  roles$: Observable<any> = of([]);
  constructor(
    private planningService: PlanningService,
    private positionsService: PositionsService, // Inject PositionsService
    private usersService: UsersService // Inject UsersService
  ) { }

  ngOnInit() {
    this.loadShiftsRealtime();
    this.loadEmployees(); // Load employees
    this.loadRoles(); // Load roles
  }
  trackById(index: number, shift: Shift): string | undefined {
    return shift.id;
  }
  loadShiftsRealtime() {
    // Utiliser la nouvelle méthode temps réel
    this.shifts$ = this.planningService.getShiftsForDayRealtime(
      this.selectedDay
    );
    this.shifts$.subscribe((shifts) => {
      this.currentDayShifts = shifts;
    });
  }
  loadEmployees() {
    this.employees$ = this.usersService.getEmployees(); // Use the service
  }

  loadRoles() {
    this.roles$ = from(this.positionsService.getPositions()); // Use the service
  }

  getDayIndex(day: string): number {
    return this.weekDays.indexOf(day);
  }
  validateShift() {
    // Force change detection
    this.showAddShiftModal = false;
    setTimeout(() => {
      this.showAddShiftModal = true;
    }, 0);
  }
  onSlideChange(event: any) {
    if (this.swiper) {
      const activeIndex = this.swiper.activeIndex;
      this.selectedDay = this.weekDays[activeIndex];

      this.loadShiftsRealtime();
    }
  }

  onSegmentChange() {
    this.loadShiftsRealtime();
    const dayIndex = this.getDayIndex(this.selectedDay);
    if (this.swiper) {
      this.swiper.slideTo(dayIndex);
    }
  }



  openAddShiftModal(day: string) {
    this.newShift.day = day;
    this.showAddShiftModal = true;
  }

  closeModal() {
    this.showAddShiftModal = false;
    this.selectedEmployee = { id: '', name: '' };
    this.newShift = { day: '', startTime: '', endTime: '', role: '' };
  }
  closeAddShiftModal() {
    this.showAddShiftModal = false;
  }

  handleShiftSave(shift: any) {
    this.planningService
      .addShift(shift)
      .then(() => {
        this.closeAddShiftModal();
        this.loadShiftsRealtime();
      })
      .catch((error) => {
        console.error('Error adding shift: ', error);
      });
  }
  isShiftValid(): boolean {
    return (
      this.newShift.startTime < this.newShift.endTime &&
      this.selectedEmployee.id !== '' &&
      this.newShift.role !== ''
    );
  }

  saveShift() {
    const newShift: Shift = {
      day: this.newShift.day,
      startTime: this.formatTime(this.newShift.startTime),
      endTime: this.formatTime(this.newShift.endTime),
      employee: this.selectedEmployee,
      role: this.newShift.role,
    };

    this.planningService
      .addShift(newShift)
      .then(() => {
        this.closeModal();
        this.loadShiftsRealtime();
      })
      .catch((error) => {
        console.error('Error adding shift: ', error);
      });
  }

  removeShift(shiftId: string) {
    this.planningService
      .deleteShift(shiftId)
      .then(() => {
        this.loadShiftsRealtime();
      })
      .catch((error) => {
        console.error('Error removing shift: ', error);
      });
  }

  ngAfterViewInit() {
    if (this.swiperRef?.nativeElement) {
      this.swiper = this.swiperRef.nativeElement.swiper;
    }
    const dayIndex = this.weekDays.indexOf(this.selectedDay);
    this.swiper.slideTo(dayIndex);
  }
  getDayHeader(day: string): string {
    const today = new Date();
    const dayIndex = this.weekDays.indexOf(day);
    const currentDayIndex = today.getDay() - 1; // 0 = Monday in our array

    const diff = dayIndex - currentDayIndex;
    const date = new Date(today);
    date.setDate(today.getDate() + diff);

    return `${day}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  // Calculate shift duration
  getShiftDuration(): string {
    if (!this.newShift.startTime || !this.newShift.endTime) return '';

    const start = new Date(this.newShift.startTime);
    const end = new Date(this.newShift.endTime);

    // If end time is before start time, assume it's the next day
    let diff = end.getTime() - start.getTime();
    if (diff < 0) {
      diff += 24 * 60 * 60 * 1000; // Add 24 hours
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
  }

  // Enhanced format time method
  formatTime(timeString: string): string {
    if (!timeString) return '';

    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return timeString;
    }
  }
}
