import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';
import { EmployeeGuard } from './guards/employee.guard';

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
    canActivate: [AuthGuard, AdminGuard], // Apply guards
  },
  {
    path: 'employee-dashboard',
    loadComponent: () =>
      import('./employe-dashboard/employe-dashboard.page').then(
        (m) => m.EmployeDashboardPage
      ),
    canActivate: [AuthGuard, EmployeeGuard], // Apply guards
  },
  // ... other routes with guards
  {
    path: 'scan-qr',
    loadComponent: () =>
      import('./scan-qr/scan-qr.page').then((m) => m.EmployeeBadgePage),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'manage-employees',
    loadComponent: () =>
      import('./manage-employees/manage-employees.page').then(
        (m) => m.ManageEmployeesPage
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'planing',
    loadComponent: () =>
      import('./planing/planing.page').then((m) => m.PlanningPage),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'manage-positions',
    loadComponent: () =>
      import('./manage-positions/manage-positions.page').then(
        (m) => m.ManagePositionsPage
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'abcance-admin',
    loadComponent: () =>
      import('./abcance-admin/abcance-admin.page').then(
        (m) => m.AbsenceManagementPage
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'absence-employee',
    loadComponent: () =>
      import('./absence-employee/absence-employee.page').then(
        (m) => m.AbsenceEmployeePage
      ),
    canActivate: [AuthGuard, EmployeeGuard],
  },
  {
    path: 'closing-periods',
    loadComponent: () =>
      import('./closing-periods/closing-periods.page').then(
        (m) => m.ClosingDaysComponent
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'employee-planing-view/:employeeId',
    loadComponent: () =>
      import('./employee-planing-view/employee-planing-view.page').then(
        (m) => m.EmployeePlanningViewPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'employee-planing-view',
    loadComponent: () =>
      import('./employee-planing-view/employee-planing-view.page').then(
        (m) => m.EmployeePlanningViewPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'qr-scan',
    loadComponent: () =>
      import('./qr-scan/qr-scan.page').then((m) => m.QrScanPage),
    canActivate: [AuthGuard, EmployeeGuard],
  },
  {
    path: 'badged-shifts/:employeeId',
    loadComponent: () =>
      import('./badged-shifts/badged-shifts.page').then(
        (m) => m.BadgedShiftsPage
      ),
    canActivate: [AuthGuard],
  }, {
    path: 'badged-shifts',
    loadComponent: () =>
      import('./badged-shifts/badged-shifts.page').then(
        (m) => m.BadgedShiftsPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'shift-report',
    loadComponent: () =>
      import('./shift-report/shift-report.page').then((m) => m.ShiftReportPage),
    canActivate: [AuthGuard, EmployeeGuard],
  },
  {
    path: 'documents',
    loadComponent: () => import('./documents/documents.page').then(m => m.AdminContractsPage)
  }, {
    path: 'my-contract',
    loadComponent: () => import('./contract-employee/contract-employee.component').then(m => m.UserContractPage)
  }

];
