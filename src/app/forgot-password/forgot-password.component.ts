import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  arrowBackOutline,
  helpCircleOutline
} from 'ionicons/icons';
import {
  IonContent,
  IonItem,
  IonIcon,
  IonLabel,
  IonInput,
  IonButton,
  ToastController
} from '@ionic/angular/standalone';

addIcons({
  mailOutline,
  arrowBackOutline,
  helpCircleOutline
});

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonContent,
    IonItem,
    IonIcon,
    IonLabel,
    IonInput,
    IonButton
  ],
  template: `
    <ion-content>
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <img src="assets/images/images.jpg" alt="Logo" class="login-logo" />
            <h1>Reset Password</h1>
            <p>Enter your email to receive a password reset link</p>
          </div>

          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <ion-item lines="full" class="ion-no-padding custom-item">
                <ion-icon name="mail-outline" slot="start"></ion-icon>
                <ion-label position="floating">Email Address</ion-label>
                <ion-input
                  type="email"
                  formControlName="email"
                  [clearInput]="true"
                  (ionBlur)="resetForm.get('email')?.markAsTouched()"
                ></ion-input>
              </ion-item>
              <div class="error-message" *ngIf="resetForm.get('email')?.touched && resetForm.get('email')?.invalid">
                <span *ngIf="resetForm.get('email')?.errors?.['required']">Email is required</span>
                <span *ngIf="resetForm.get('email')?.errors?.['email']">Please enter a valid email</span>
              </div>
            </div>

            <ion-button expand="block" type="submit" [disabled]="!resetForm.valid" class="login-button">
              Send Reset Link
            </ion-button>
          </form>

          <div class="register-link">
            <p>Remember your password?</p>
            <ion-button fill="clear" routerLink="/login">
              <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
              Back to Login
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      height: 100%;
    }

    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 450px;
      padding: 40px 30px;
      overflow: hidden;
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .login-logo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 20px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .login-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #333;
      margin: 0;
    }

    .login-header p {
      font-size: 16px;
      color: #666;
      margin-top: 8px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .custom-item {
      --inner-padding-end: 8px;
      --inner-padding-start: 8px;
      --padding-start: 15px;
      --padding-end: 15px;
      --background: #f5f7fa;
      --border-radius: 10px;
      --min-height: 56px;
      --highlight-color-focused: #4361ee;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    ion-item ion-icon[slot="start"] {
      margin-right: 12px;
      min-width: 24px;
      color: #7f8c8d;
    }

    ion-item ion-label[position="floating"] {
      transform-origin: left top;
      transform: translateY(12px) scale(1);
      color: #7f8c8d !important;
      font-weight: 500;
    }

    ion-item.item-has-focus ion-label[position="floating"] {
      transform: translateY(0) scale(0.75);
    }

    ion-item.item-has-value ion-label[position="floating"] {
      transform: translateY(0) scale(0.75);
    }

    .error-message {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 6px;
      padding-left: 15px;
    }

    .login-button {
      --background: #4361ee;
      --background-hover: #3a56d4;
      --border-radius: 10px;
      --color: white;
      height: 52px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 10px rgba(67, 97, 238, 0.3);
      margin: 15px 0 25px;
    }

    .register-link {
      display: flex;
      align-items: center;
      justify-content: center;
      border-top: 1px solid #f0f0f0;
      padding-top: 25px;
      margin-top: 10px;
    }

    .register-link p {
      color: #7f8c8d;
      margin: 0;
      font-size: 15px;
    }

    .register-link ion-button {
      --color: #4361ee;
      font-weight: 500;
      text-transform: none;
    }

    /* Responsive styles */
    @media (max-width: 576px) {
      .login-card {
        padding: 30px 20px;
        border-radius: 15px;
      }

      .login-logo {
        width: 80px;
        height: 80px;
      }

      .login-header h1 {
        font-size: 24px;
      }

      .login-header p {
        font-size: 14px;
      }
    }
  `],
})
export class ForgotPasswordPage {
  resetForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async onSubmit() {
    if (this.resetForm.valid) {
      try {
        const { email } = this.resetForm.value;
        await this.authService.resetPassword(email);
        this.showToast('Password reset link sent to your email', 'success');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      } catch (error: any) {
        console.error('Password reset error:', error);

        let errorMessage = 'Failed to send reset email. Please try again.';

        if (error.code) {
          switch (error.code) {
            case 'auth/user-not-found':
              errorMessage = 'No account found with this email address.';
              break;
            case 'auth/invalid-email':
              errorMessage = 'The email address is not valid.';
              break;
            case 'auth/network-request-failed':
              errorMessage = 'Network error. Please check your connection.';
              break;
            default:
              errorMessage = 'Failed to send reset email. Please try again.';
          }
        }

        this.showToast(errorMessage, 'danger');
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.resetForm.controls).forEach(key => {
        this.resetForm.get(key)?.markAsTouched();
      });
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: color,
      cssClass: 'custom-toast',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}
