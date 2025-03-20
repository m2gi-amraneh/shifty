import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  personCircleOutline,
  calendarOutline,
  idCardOutline,
  trashOutline,
  addOutline,
  createOutline,
  peopleOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { Employee, UsersService } from '../services/users.service';
import { EditEmployeeModalComponent } from '../modals/edit-employee-modal.component';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
  IonContent, IonButton, IonIcon, IonCard,
  IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonSearchbar, ModalController
} from '@ionic/angular/standalone';
@Component({
  selector: 'app-manage-employees',
  templateUrl: './manage-employees.page.html',
  styleUrls: ['./manage-employees.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
    IonContent, IonButton, IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonSearchbar,
    IonCardContent, EditEmployeeModalComponent
  ],
})
export class ManageEmployeesPage implements OnInit, OnDestroy {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  private employeesSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private usersService: UsersService,
    private modalController: ModalController
  ) {
    addIcons({
      searchOutline,
      personCircleOutline,
      calendarOutline,
      idCardOutline,
      trashOutline,
      addOutline,
      createOutline, peopleOutline
    });

  }

  ngOnInit() {
    this.employeesSubscription = this.usersService.getEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.filteredEmployees = [...employees];
      },
      error: (error) => {
        console.error('Error fetching employees', error);
      },
    });
  }

  ngOnDestroy() {
    if (this.employeesSubscription) {
      this.employeesSubscription.unsubscribe();
    }
  }
  // Add this method to your component class
  trackById(index: number, employee: Employee): string | undefined {
    return employee.id;
  }
  filterEmployees(event: CustomEvent) {
    const searchTerm = event.detail.value.toLowerCase();
    this.filteredEmployees = this.employees.filter((employee) =>
      employee.name.toLowerCase().includes(searchTerm)
    );
  }

  async editEmployee(employee: Employee) {
    const modal = await this.modalController.create({
      component: EditEmployeeModalComponent,
      componentProps: {
        employee: { ...employee }
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.usersService.updateEmployee(result.data).then(() => {
          const index = this.employees.findIndex(e => e.id === result.data.id);
          if (index !== -1) {
            this.employees[index] = result.data;
            this.filteredEmployees = [...this.employees];
          }
        });
      }
    });

    await modal.present();
  }

  deleteEmployee(employee: Employee) {
    if (employee.id) {
      this.usersService.deleteEmployee(employee.id).then(() => {
        this.employees = this.employees.filter(e => e.id !== employee.id);
        this.filteredEmployees = [...this.employees];
      });
    }
  }

  addEmployee() {
    this.router.navigate(['/add-employee']);
  }

  viewPlanning(employee: Employee) {
    if (employee.id) {
      this.router.navigate(['/employee-planing-view', employee.id]);
    }
  }

  viewBadging(employee: Employee) {
    if (employee.id) {
      this.router.navigate(['/badged-shifts', employee.id]);
    }
  }
}
