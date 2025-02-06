import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  { path: 'login', component: LoginPage },
  {
    path: 'register',
    component: RegisterPage,
  },

  {
    path: 'admin-dashboard',
    loadComponent: () =>
      import('./admin-dashboard/admin-dashboard.page').then(
        (m) => m.AdminDashboardpage
      ),
  },
  {
    path: 'employee-dashboard',
    loadComponent: () =>
      import('./employe-dashboard/employe-dashboard.page').then(
        (m) => m.EmployeDashboardPage
      ),
  },
  {
    path: 'scan-qr',
    loadComponent: () =>
      import('./scan-qr/scan-qr.page').then((m) => m.QrScannerPage),
  },
  {
    path: 'manage-employees',
    loadComponent: () =>
      import('./manage-employees/manage-employees.page').then(
        (m) => m.ManageEmployeesPage
      ),
  },
  {
    path: 'planing',
    loadComponent: () =>
      import('./planing/planing.page').then((m) => m.PlanningPage),
  },
  {
    path: 'manage-positions',
    loadComponent: () =>
      import('./manage-positions/manage-positions.page').then(
        (m) => m.ManagePositionsPage
      ),
  },
];
