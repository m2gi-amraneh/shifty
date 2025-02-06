import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonicModule,
} from '@ionic/angular';
import {
  calendarNumberOutline,
  calendarOutline,
  documentOutline,
  peopleOutline,
  qrCodeOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
addIcons({
  qrCodeOutline,
  peopleOutline,
  calendarNumberOutline,
  documentOutline,
  calendarOutline,
});

@Component({
  selector: 'app-employe-dashboard',
  templateUrl: './employe-dashboard.page.html',
  styleUrls: ['./employe-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class EmployeDashboardPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
