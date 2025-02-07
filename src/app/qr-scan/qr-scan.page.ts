// qr-scan.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { BadgeService } from '../services/badge.service';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-qr-scan',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Scan Shift QR Code</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="scan-container">
        <ion-button 
          expand="block" 
          color="primary" 
          (click)="scanQRCode()"
        >
          <ion-icon name="qr-code-outline" slot="start"></ion-icon>
          Scan QR Code
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .scan-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
    }
  `]
})
export class QrScanPage implements OnInit {
  constructor(
    private badgeService: BadgeService,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  async scanQRCode() {
    try {
      // Request camera permission
      await BarcodeScanner.checkPermission({ force: true });

      // Start scanning
      BarcodeScanner.hideBackground();
      const result = await BarcodeScanner.startScan();

      if (result.hasContent) {
        this.processQRCode(result.content);
      }
    } catch (error) {
      console.error('Scanning error', error);
      this.showErrorAlert('Unable to scan QR code');
    } finally {
      // Always stop scanning
      BarcodeScanner.showBackground();
      BarcodeScanner.stopScan();
    }
  }

  async processQRCode(qrCode: string) {
    // Validate QR Code
    if (!this.badgeService.validateQRCode(qrCode)) {
      this.showErrorAlert('Invalid QR Code');
      return;
    }

    try {
      // Extract shift ID from QR code (customize based on your QR code format)
      const shiftId = qrCode.replace('SHIFT_', '');
      
      // Get current employee ID (replace with actual authentication)
      const employeeId = 'current-employee-id'; 

      // Create badged shift
      const badgeId = await this.badgeService.createBadgedShift(employeeId, shiftId);

      // Show success alert
      const alert = await this.alertController.create({
        header: 'Success',
        message: 'Shift successfully checked in',
        buttons: ['OK']
      });

      await alert.present();
    } catch (error) {
      console.error('Badge shift error', error);
      this.showErrorAlert('Unable to process shift');
    }
  }

  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }
}