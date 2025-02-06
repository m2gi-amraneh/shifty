import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import { logoFacebook, logoGoogle } from 'ionicons/icons';

addIcons({ logoGoogle, logoFacebook });

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    AsyncPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="login-container">
        <img
          src="assets/images/images.jpg"
          alt="Futuristic Login"
          class="login-image"
        />

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <ion-item class="ion-margin-bottom">
            <ion-label position="floating">Email</ion-label>
            <ion-input type="email" formControlName="email"></ion-input>
          </ion-item>

          <ion-item class="ion-margin-bottom">
            <ion-label position="floating">Password</ion-label>
            <ion-input type="password" formControlName="password"></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="!loginForm.valid"
            class="ion-margin-bottom"
          >
            Login
          </ion-button>

          <ion-button expand="block" fill="clear" routerLink="/register">
            Create Account
          </ion-button>

          <ion-button expand="block" fill="clear" routerLink="/forgot-password">
            Forgot Password?
          </ion-button>

          <div class="social-login">
            <ion-button
              expand="block"
              color="danger"
              (click)="loginWithGoogle()"
            >
              <ion-icon name="logo-google" slot="start"></ion-icon>
              Sign in with Google
            </ion-button>

            <ion-button
              expand="block"
              color="primary"
              (click)="loginWithFacebook()"
            >
              <ion-icon name="logo-facebook" slot="start"></ion-icon>
              Sign in with Facebook
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 20px;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white;
      }

      .login-image {
        width: 400px;
        height: 250px;
        margin-bottom: 20px;
        border-radius: 50%;
        object-fit: cover;
      }

      ion-item {
        --background: transparent;
        --color: white;
        --border-color: rgba(255, 255, 255, 0.3);
        --highlight-color-focused: white;
        --highlight-color-valid: white;
        --highlight-color-invalid: #ff6b6b;
      }

      ion-button {
        --border-radius: 8px;
        --padding-top: 16px;
        --padding-bottom: 16px;
        margin-top: 10px;
      }

      .social-login {
        width: 100%;
        margin-top: 20px;
      }

      .social-login ion-button {
        margin-bottom: 10px;
      }
    `,
  ],
})
export class LoginPage {
  loginForm: FormGroup;

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
    });
    await toast.present();
  }
}
