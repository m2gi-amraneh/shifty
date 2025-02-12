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
      import('./scan-qr/scan-qr.page').then((m) => m.EmployeeBadgePage),
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
  {
    path: 'abcance-admin',
    loadComponent: () =>
      import('./abcance-admin/abcance-admin.page').then(
        (m) => m.AbcanceAdminPage
      ),
  },
  {
    path: 'absence-employee',
    loadComponent: () =>
      import('./absence-employee/absence-employee.page').then(
        (m) => m.AbsenceEmployeePage
      ),
  },
  {
    path: 'closing-periods',
    loadComponent: () =>
      import('./closing-periods/closing-periods.page').then(
        (m) => m.ClosingDaysComponent
      ),
  },
  {
    path: 'employee-planing-view',
    loadComponent: () =>
      import('./employee-planing-view/employee-planing-view.page').then(
        (m) => m.EmployeePlanningViewPage
      ),
  },
  {
    path: 'qr-scan',
    loadComponent: () =>
      import('./qr-scan/qr-scan.page').then((m) => m.QrScanPage),
  },
  {
    path: 'badged-shifts',
    loadComponent: () =>
      import('./badged-shifts/badged-shifts.page').then(
        (m) => m.BadgedShiftsPage
      ),
  },
  {
    path: 'shift-report',
    loadComponent: () =>
      import('./shift-report/shift-report.page').then((m) => m.ShiftReportPage),
  },
];
