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
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { Employee, UsersService } from '../services/users.service';

@Component({
  selector: 'app-manage-employees',
  templateUrl: './manage-employees.page.html',
  styleUrls: ['./manage-employees.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ManageEmployeesPage implements OnInit, OnDestroy {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  private employeesSubscription: Subscription | null = null;

  constructor(private router: Router, private usersService: UsersService) {
    addIcons({
      searchOutline,
      personCircleOutline,
      calendarOutline,
      idCardOutline,
      trashOutline,
      addOutline,
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

  filterEmployees(event: CustomEvent) {
    const searchTerm = event.detail.value.toLowerCase();
    this.filteredEmployees = this.employees.filter((employee) =>
      employee.name.toLowerCase().includes(searchTerm)
    );
  }

  deleteEmployee(employee: Employee) {
    if (employee.id) {
      // this.usersService.deleteEmployee(employee.id);
    }
  }

  addEmployee() {
    // Implement navigation to add employee page or show a modal
    this.router.navigate(['/add-employee']);
  }

  viewPlanning(employee: Employee) {
    if (employee) {
      //  this.router.navigate([employee.planningUrl]);
    }
  }

  viewBadging(employee: Employee) {
    if (employee) {
      // this.router.navigate([employee.badgingUrl]);
    }
  }
}
