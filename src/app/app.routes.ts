import { Routes } from '@angular/router';
import { LoginPage } from './auth/login/login.page';
import { RegisterPage } from './auth/register/register.page';
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
      import('./employer/admin-dashboard/admin-dashboard.page').then(
        (m) => m.AdminDashboardPage
      ),
    canActivate: [AuthGuard, AdminGuard], // Apply guards
  },
  {
    path: 'employee-dashboard',
    loadComponent: () =>
      import('./employee/employe-dashboard/employe-dashboard.page').then(
        (m) => m.EmployeDashboardPage
      ),
    canActivate: [AuthGuard, EmployeeGuard], // Apply guards
  },
  // ... other routes with guards
  {
    path: 'scan-qr',
    loadComponent: () =>
      import('./employer/scan-qr/scan-qr.page').then((m) => m.EmployeeBadgePage),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'manage-employees',
    loadComponent: () =>
      import('./employer/manage-employees/manage-employees.page').then(
        (m) => m.ManageEmployeesPage
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'planing',
    loadComponent: () =>
      import('./employer/planing/planing.page').then((m) => m.PlanningPage),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'manage-positions',
    loadComponent: () =>
      import('./employer/manage-positions/manage-positions.page').then(
        (m) => m.ManagePositionsPage
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'abcance-admin',
    loadComponent: () =>
      import('./employer/abcance-admin/abcance-admin.page').then(
        (m) => m.AbsenceManagementPage
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'absence-employee',
    loadComponent: () =>
      import('./employee/absence-employee/absence-employee.page').then(
        (m) => m.AbsenceEmployeePage
      ),
    canActivate: [AuthGuard, EmployeeGuard],
  },
  {
    path: 'closing-periods',
    loadComponent: () =>
      import('./employer/closing-periods/closing-periods.page').then(
        (m) => m.ClosingDaysComponent
      ),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'employee-planing-view/:employeeId',
    loadComponent: () =>
      import('./employee/employee-planing-view/employee-planing-view.page').then(
        (m) => m.EmployeePlanningViewPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'employee-planing-view',
    loadComponent: () =>
      import('./employee/employee-planing-view/employee-planing-view.page').then(
        (m) => m.EmployeePlanningViewPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'qr-scan',
    loadComponent: () =>
      import('./employee/qr-scan/qr-scan.page').then((m) => m.QrScanPage),
    canActivate: [AuthGuard, EmployeeGuard],
  },
  {
    path: 'badged-shifts/:employeeId',
    loadComponent: () =>
      import('./shared/badged-shifts/badged-shifts.page').then(
        (m) => m.BadgedShiftsPage
      ),
    canActivate: [AuthGuard],
  }, {
    path: 'badged-shifts',
    loadComponent: () =>
      import('./shared/badged-shifts/badged-shifts.page').then(
        (m) => m.BadgedShiftsPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'shift-report',
    loadComponent: () =>
      import('./shared/shift-report/shift-report.page').then((m) => m.ShiftReportPage),
    canActivate: [AuthGuard, EmployeeGuard],
  },
  {
    path: 'shift-report/:employeeId',
    loadComponent: () =>
      import('./shared/shift-report/shift-report.page').then((m) => m.ShiftReportPage),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'documents',
    loadComponent: () => import('./employer/documents/documents.page').then(m => m.AdminContractsPage)
  }, {
    path: 'my-contract',
    loadComponent: () => import('./employee/contract-employee/contract-employee.component').then(m => m.UserContractPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordPage)
  }, {
    path: 'create-chat',
    loadComponent: () =>
      import('./shared/create-chat-room/create-chat-room.component').then((m) => m.CreateChatComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'chat-rooms',
    loadComponent: () =>
      import('./shared/group-chat/group-chat.component').then((m) => m.GroupChatComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'geo-badge',
    loadComponent: () => import('./employee/geo-badge/geo-badge.page').then(m => m.GeoBadgePage)
  },
  {
    path: 'statistics',
    loadComponent: () => import('./employer/stat/stat.component').then(m => m.AdminOvertimeStatsPage)
  },
];
