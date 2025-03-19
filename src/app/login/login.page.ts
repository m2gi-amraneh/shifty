import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import { logoFacebook, logoGoogle, mailOutline, lockClosedOutline, personAddOutline, helpCircleOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
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
  logoGoogle,
  logoFacebook,
  mailOutline,
  lockClosedOutline,
  personAddOutline,
  helpCircleOutline,
  eyeOutline,
  eyeOffOutline
});

@Component({
  selector: 'app-login',
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
            <h1>Welcome Back</h1>
            <p>Sign in to continue to your dashboard</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
    <ion-item lines="full" class="ion-no-padding custom-item">
      <ion-icon name="mail-outline" slot="start"></ion-icon>
      <ion-label position="floating">Email Address</ion-label>
      <ion-input
        type="email"
        formControlName="email"
        [clearInput]="true"
        (ionBlur)="loginForm.get('email')?.markAsTouched()"
      ></ion-input>
    </ion-item>
    <div class="error-message" *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid">
      <span *ngIf="loginForm.get('email')?.errors?.['required']">Email is required</span>
      <span *ngIf="loginForm.get('email')?.errors?.['email']">Please enter a valid email</span>
    </div>
  </div>

  <div class="form-group">
    <ion-item lines="full" class="ion-no-padding custom-item">
      <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
      <ion-label position="floating">Password</ion-label>
      <ion-input
        [type]="showPassword ? 'text' : 'password'"
        formControlName="password"
        [clearInput]="true"
        (ionBlur)="loginForm.get('password')?.markAsTouched()"
      ></ion-input>
      <ion-button fill="clear" slot="end" (click)="togglePassword()" class="password-toggle">
        <ion-icon [name]="showPassword ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
      </ion-button>
    </ion-item>
    <div class="error-message" *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid">
      <span *ngIf="loginForm.get('password')?.errors?.['required']">Password is required</span>
      <span *ngIf="loginForm.get('password')?.errors?.['minlength']">Password must be at least 6 characters</span>
    </div>
  </div>

            <div class="forgot-password">
              <ion-button fill="clear" size="small" routerLink="/forgot-password">
                Forgot Password?
              </ion-button>
            </div>

            <ion-button expand="block" type="submit" [disabled]="!loginForm.valid" class="login-button">
              Sign In
            </ion-button>

            <div class="divider">
              <span>OR</span>
            </div>

            <div class="social-login">
              <ion-button class="google-btn" (click)="loginWithGoogle()">
                <ion-icon name="logo-google" slot="start"></ion-icon>
                Sign in with Google
              </ion-button>

              <ion-button class="facebook-btn" (click)="loginWithFacebook()">
                <ion-icon name="logo-facebook" slot="start"></ion-icon>
                Sign in with Facebook
              </ion-button>
            </div>
          </form>

          <div class="register-link">
            <p>Don't have an account?</p>
            <ion-button fill="clear" routerLink="/register">
              <ion-icon name="person-add-outline" slot="start"></ion-icon>
              Create Account
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
      --background: #f5f7fa;
      --border-radius: 10px;
      --padding-start: 15px;
      --padding-end: 15px;
      --min-height: 56px;
      --highlight-color-focused: #4361ee;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    ion-item ion-icon {
      color: #7f8c8d;
      margin-right: 8px;
    }

    ion-label {
      color: #7f8c8d !important;
      font-weight: 500;
    }

    .error-message {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 6px;
      padding-left: 15px;
    }

    .password-toggle {
      --color: #7f8c8d;
      --padding-end: 0;
      --padding-start: 0;
      margin: 0;
    }

    .forgot-password {
      text-align: right;
      margin-bottom: 20px;
    }

    .forgot-password ion-button {
      --color: #4361ee;
      font-size: 14px;
      font-weight: 500;
      text-transform: none;
      margin: 0;
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

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 25px 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e0e0e0;
    }

    .divider span {
      padding: 0 10px;
      color: #7f8c8d;
      font-size: 14px;
    }

    .social-login {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 30px;
    }

    .google-btn {
      --background: white;
      --color: #444;
      --border-radius: 10px;
      border: 1px solid #dfe1e5;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      height: 48px;
      font-weight: 500;
    }

    .facebook-btn {
      --background: #3b5998;
      --background-hover: #344e86;
      --border-radius: 10px;
      --color: white;
      height: 48px;
      font-weight: 500;
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
export class LoginPage {
  loginForm: FormGroup;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      try {
        const { email, password } = this.loginForm.value;
        const userCredential = await this.authService.login(email, password);
        const uid = userCredential.user?.uid;

        if (uid) {
          const role = await this.authService.getUserRole(uid);
          if (role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/employee-dashboard']);
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        this.showToast('Invalid email or password');
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  async loginWithGoogle() {
    try {
      const userCredential = await this.authService.signInWithGoogle();
      await this.handleSocialLogin(userCredential.user?.uid);
    } catch (error) {
      console.error('Google login error:', error);
      this.showToast('Google login failed');
    }
  }

  async loginWithFacebook() {
    try {
      const userCredential = await this.authService.signInWithFacebook();
      await this.handleSocialLogin(userCredential.user?.uid);
    } catch (error) {
      console.error('Facebook login error:', error);
      this.showToast('Facebook login failed');
    }
  }

  private async handleSocialLogin(uid: string | undefined) {
    if (!uid) return;
    const role = await this.authService.getUserRole(uid);
    if (role === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/employee-dashboard']);
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'danger',
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
