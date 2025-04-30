import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, UserMetadata } from '../../services/auth.service'; // Import UserMetadata type
import { addIcons } from 'ionicons';
import { logoFacebook, logoGoogle, mailOutline, lockClosedOutline, personAddOutline, helpCircleOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import {
  IonContent,
  IonItem,
  IonIcon,
  IonLabel,
  IonInput,
  IonButton,
  ToastController,
  LoadingController, // Import LoadingController
  IonSpinner // Import IonSpinner for inline loading state
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators'; // Import finalize if needed elsewhere

addIcons({
  logoGoogle,
  logoFacebook,
  mailOutline,
  lockClosedOutline,
  personAddOutline,
  helpCircleOutline,
  eyeOutline,
  eyeOffOutline,
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
    IonButton,
    IonSpinner, // Add IonSpinner
    AsyncPipe, // Keep AsyncPipe if used in template
  ],
  // Add isLoggingIn flag to template to disable button and show spinner
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
              <ion-button fill="clear" size="small" routerLink="/forgot-password" [disabled]="isLoggingIn">
                Forgot Password?
              </ion-button>
            </div>

            <ion-button
              expand="block"
              type="submit"
              [disabled]="!loginForm.valid || isLoggingIn"
              class="login-button">
              <ion-spinner *ngIf="isLoggingIn" name="crescent" color="light"></ion-spinner>
              <span *ngIf="!isLoggingIn">Sign In</span>
            </ion-button>

            <!-- Social Logins (Optional - Keep commented if not using) -->
            <!--
            <div class="divider"><span>OR</span></div>
            <div class="social-login">
              <ion-button class="google-btn" (click)="loginWithGoogle()" [disabled]="isLoggingIn">
                <ion-spinner *ngIf="isLoggingInGoogle" name="crescent"></ion-spinner>
                <ion-icon *ngIf="!isLoggingInGoogle" name="logo-google" slot="start"></ion-icon>
                <span *ngIf="!isLoggingInGoogle">Sign in with Google</span>
              </ion-button>
              <ion-button class="facebook-btn" (click)="loginWithFacebook()" [disabled]="isLoggingIn">
                 <ion-spinner *ngIf="isLoggingInFacebook" name="crescent" color="light"></ion-spinner>
                <ion-icon *ngIf="!isLoggingInFacebook" name="logo-facebook" slot="start"></ion-icon>
                 <span *ngIf="!isLoggingInFacebook">Sign in with Facebook</span>
              </ion-button>
            </div>
             -->
          </form>

           <!-- Registration Link (Optional - Keep commented if not using) -->
          <!--
          <div class="register-link">
            <p>Don't have an account?</p>
             <ion-button fill="clear" routerLink="/register" [disabled]="isLoggingIn">
               <ion-icon name="person-add-outline" slot="start"></ion-icon>
              Create Account
            </ion-button>
          </div>
           -->
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    /* Keep existing styles */
    /* Add styles for the spinner inside the button if needed */
    .login-button ion-spinner {
      margin-right: 8px; /* Adjust spacing */
      width: 20px; /* Adjust size */
      height: 20px;
    }
    .social-login ion-spinner {
        margin: 0 8px; /* Adjust as needed */
        width: 20px;
        height: 20px;
    }  .login-container {
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
}

ion-item ion-icon[slot="start"] {
  margin-right: 12px;
  min-width: 24px;
}

ion-item ion-label[position="floating"] {
  transform-origin: left top;
  transform: translateY(12px) scale(1);
}

ion-item.item-has-focus ion-label[position="floating"] {
  transform: translateY(0) scale(0.75);
}

ion-item.item-has-value ion-label[position="floating"] {
  transform: translateY(0) scale(0.75);
}

.password-toggle {
  margin-top: 8px;
  --padding-end: 4px;
  --padding-start: 4px;
  height: 40px;
}


    .error-message {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 6px;
      padding-left: 15px;
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
export class LoginPage implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = false;
  isLoggingIn = false; // Flag for general login state
  isLoggingInGoogle = false; // Specific flag for Google
  isLoggingInFacebook = false; // Specific flag for Facebook

  private authSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    // Removed LoadingController as we use inline spinners now
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit() {
    // Redirect logged-in users immediately if metadata is available
    this.authSubscription = this.authService.userMetadata$.subscribe(metadata => {
      if (metadata && !this.isLoggingIn) { // Avoid redirect during an active login attempt
        console.log("Login page: User metadata found, redirecting...");
        this.navigateBasedOnRole(metadata.role);
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (!this.loginForm.valid || this.isLoggingIn) {
      this.markFormTouched(); // Ensure errors show if invalid
      return;
    }

    this.isLoggingIn = true; // Set loading state

    try {
      const { email, password } = this.loginForm.value;
      const userMetadata = await this.authService.login(email, password);
      // Navigation happens only if login and metadata fetch succeed
      this.navigateBasedOnRole(userMetadata.role);
    } catch (error: any) {
      console.error('Login error:', error);
      this.showToast(error.message || 'Login failed. Please check credentials or contact support.');
    } finally {
      this.isLoggingIn = false; // Reset loading state
    }
  }

  async loginWithGoogle() {
    if (this.isLoggingIn) return; // Prevent concurrent logins

    this.isLoggingIn = true;
    this.isLoggingInGoogle = true;

    try {
      const userMetadata = await this.authService.signInWithGoogle();
      this.navigateBasedOnRole(userMetadata.role);
    } catch (error: any) {
      console.error('Google login error:', error);
      this.showToast(error.message || 'Google login failed.');
    } finally {
      this.isLoggingIn = false;
      this.isLoggingInGoogle = false;
    }
  }

  async loginWithFacebook() {
    if (this.isLoggingIn) return; // Prevent concurrent logins

    this.isLoggingIn = true;
    this.isLoggingInFacebook = true;

    try {
      const userMetadata = await this.authService.signInWithFacebook();
      this.navigateBasedOnRole(userMetadata.role);
    } catch (error: any) {
      console.error('Facebook login error:', error);
      // Handle specific error like "login already in progress" if needed
      if (error.message?.includes('already in progress')) {
        this.showToast('Login attempt already in progress. Please wait.');
      } else {
        this.showToast(error.message || 'Facebook login failed.');
      }
    } finally {
      this.isLoggingIn = false;
      this.isLoggingInFacebook = false;
    }
  }

  private navigateBasedOnRole(role: string | null) {
    if (!role) {
      // This case should ideally be handled by AuthService throwing an error,
      // but added as a safeguard.
      console.error("Cannot navigate, role is missing after login.");
      this.showToast("Login succeeded but role information is missing. Contact admin.");
      // Consider logging the user out again if this state is reached
      this.authService.logout();
      return;
    }

    console.log(`Navigating user with role: ${role}`);
    let targetRoute: string;

    // Use the specific role names defined ('employer_admin', 'employee')
    switch (role) {
      case 'admin':
        targetRoute = '/admin-dashboard'; // Adjust to your actual employer route
        break;
      case 'employee':
        targetRoute = '/employee-dashboard'; // Adjust to your actual employee route
        break;
      default:
        console.warn(`Unknown role encountered: ${role}. Navigating to default route.`);
        targetRoute = '/employee-dashboard'; // Define a safe default route
        break;
    }
    // Use replaceUrl to avoid the login page being in the back stack
    this.router.navigate([targetRoute], { replaceUrl: true });
  }

  private markFormTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  private async showToast(message: string, color: string = 'danger', duration: number = 3500) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'top',
      color: color,
      cssClass: 'custom-toast', // Optional custom styling
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    });
    await toast.present();
  }

  // Removed showLoading as using inline spinners now
}