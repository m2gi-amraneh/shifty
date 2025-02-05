import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Scan QR Code</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Scan QR Code to Badge In/Out</h2>
      <p>Use the camera to scan the employee QR code.</p>

      <!-- QR Code Canvas -->
      <div class="qr-code-container">
        <canvas #qrCanvas></canvas>
      </div>
    </ion-content>
  `,
  styles: [
    `
      h2 {
        text-align: center;
        color: #1e3c72;
        font-size: 1.5rem;
        margin-bottom: 20px;
      }
      ion-button {
        --border-radius: 10px;
        --padding-top: 12px;
        --padding-bottom: 12px;
        margin-top: 20px;
      }
      .qr-code-container {
        display: flex;
        justify-content: center;
        margin: 20px 0;
      }
      canvas {
        max-width: 100%;
        border-radius: 10px;
        background: #f0f0f0;
        border: 2px solid #1e3c72;
      }
    `,
  ],
})
export class QrScannerPage implements OnInit, AfterViewInit {
  qrCodeContent: string = '';
  @ViewChild('qrCanvas') qrCanvasRef: ElementRef<HTMLCanvasElement> | undefined;

  ngOnInit() {
    this.updateQrCode();
    setInterval(() => this.updateQrCode(), 1000 * 60 * 60); // Update QR code every hour
  }

  ngAfterViewInit() {
    // Ensure the canvas reference is available after view is initialized
    if (this.qrCanvasRef) {
      const canvas = this.qrCanvasRef.nativeElement;
      this.generateQrCode(canvas); // Now generate the QR code after the canvas is available
    }
  }

  updateQrCode() {
    const currentHour = new Date().getHours();
    this.qrCodeContent = `badge-${currentHour}-${Date.now()}`;
    console.log('QR Code Updated:', this.qrCodeContent); // Log the QR code content

    if (this.qrCanvasRef) {
      const canvas = this.qrCanvasRef.nativeElement;
      this.generateQrCode(canvas); // Re-generate the QR code
    }
  }

  generateQrCode(canvas: HTMLCanvasElement) {
    QRCode.toCanvas(
      canvas,
      this.qrCodeContent,
      {
        width: 256, // Specify a width for the QR code
        margin: 2, // Margin around the QR code
      },
      (error: any) => {
        if (error) {
          console.error('Error generating QR code', error);
        } else {
          console.log('QR code generated!');
        }
      }
    );
  }
}
