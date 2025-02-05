import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
import { trigger, transition, animate, style } from '@angular/animations';
interface Employee {
  id: string;
  name: string;
  grade: string;
  planningUrl: string;
  badgingUrl: string;
}

@Component({
  selector: 'app-manage-employees',
  templateUrl: './manage-employees.page.html',
  styleUrls: ['./manage-employees.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule],
})
export class ManageEmployeesPage {
  deleteEmployee(_t23: Employee) {
    throw new Error('Method not implemented.');
  }
  viewBadging(_t23: Employee) {
    throw new Error('Method not implemented.');
  }
  viewPlanning(_t23: Employee) {
    throw new Error('Method not implemented.');
  }
  employees: Employee[] = [
    {
      id: '1',
      name: 'John Doe',
      grade: 'Manager',
      planningUrl: '/employee-planning/1',
      badgingUrl: '/employee-badging/1',
    },
    {
      id: '2',
      name: 'Jane Smith',
      grade: 'Developer',
      planningUrl: '/employee-planning/2',
      badgingUrl: '/employee-badging/2',
    },
    {
      id: '3',
      name: 'Mark Johnson',
      grade: 'Designer',
      planningUrl: '/employee-planning/3',
      badgingUrl: '/employee-badging/3',
    },
  ]; // Keep your existing employee array

  filteredEmployees: Employee[] = this.employees;

  constructor(private router: Router) {
    addIcons({
      searchOutline,
      personCircleOutline,
      calendarOutline,
      idCardOutline,
      trashOutline,
      addOutline,
    });
  }

  filterEmployees(event: CustomEvent) {
    const searchTerm = event.detail.value.toLowerCase();
    this.filteredEmployees = this.employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(searchTerm) ||
        employee.grade.toLowerCase().includes(searchTerm)
    );
  }

  // Keep your existing methods and add:
  addEmployee() {
    // Add your employee creation logic
  }
}
