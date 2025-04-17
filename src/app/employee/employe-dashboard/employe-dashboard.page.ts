import { routes } from '../../app.routes';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar, IonIcon, IonButton,
  IonCard, IonButtons, IonCardHeader, IonCardTitle, IonCardSubtitle
} from '@ionic/angular/standalone';
import {
  calendarClearOutline,
  calendarNumberOutline,
  calendarOutline,
  chatbubbleEllipsesOutline,
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
import { AuthService } from '../../services/auth.service';
addIcons({
  personOutline,
  peopleOutline,
  calendarNumberOutline,
  documentOutline,
  calendarOutline, logOutOutline, qrCodeOutline, timeOutline, calendarClearOutline, fingerPrintOutline, chatbubbleEllipsesOutline
});

@Component({
  selector: 'app-employe-dashboard',
  templateUrl: './employe-dashboard.page.html',
  styleUrls: ['./employe-dashboard.page.scss'],
  standalone: true,
  imports: [IonCardSubtitle, IonCardTitle, IonCardHeader, IonButton, IonButtons, CommonModule, FormsModule, RouterModule, IonContent, IonIcon,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,],
})
export class EmployeDashboardPage {
  constructor(private authService: AuthService, private router: Router) {
    addIcons({ logOutOutline, fingerPrintOutline, calendarNumberOutline, calendarOutline, timeOutline, calendarClearOutline, chatbubbleEllipsesOutline });
  }


  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
