import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginPage } from './login/login.page';
import { RegisterPage } from './register/register.page';
import { HomePage } from './home/home.page';
import { TopicDetailsPage } from './topic-details.page/topic-details.page.component';

export const routes: Routes = [
  {
    path: 'home',
    //canActivate: [AuthGuard],
    component: HomePage,
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  { path: 'login', component: LoginPage },
  {
    path: 'register',
    component: RegisterPage,
  },
  {
    path: 'topics/:topicId',
    component: TopicDetailsPage,
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
];
