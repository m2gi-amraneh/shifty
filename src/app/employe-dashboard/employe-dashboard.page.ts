import { routes } from './../app.routes';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonicModule,
} from '@ionic/angular';
import {
  calendarClearOutline,
  calendarNumberOutline,
  calendarOutline,
  documentOutline,
  fingerPrintOutline,
  logOutOutline,
  peopleOutline,
  personOutline,
  qrCode,
  qrCodeOutline,
  timeOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { AuthService } from '../services/auth.service';
addIcons({
  personOutline,
  peopleOutline,
  calendarNumberOutline,
  documentOutline,
  calendarOutline, logOutOutline, qrCodeOutline, timeOutline, calendarClearOutline, fingerPrintOutline
});

@Component({
  selector: 'app-employe-dashboard',
  templateUrl: './employe-dashboard.page.html',
  styleUrls: ['./employe-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class EmployeDashboardPage implements OnInit {
  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit() { }
  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
