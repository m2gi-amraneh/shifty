import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { addIcons } from 'ionicons';
import { logoFacebook, logoGoogle } from 'ionicons/icons';

addIcons({ logoGoogle, logoFacebook });

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Register</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="register-container">
        <img
          src="assets/images/images.jpg"
          alt="Futuristic Register"
          class="register-image"
        />

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
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
            [disabled]="!registerForm.valid"
            class="ion-margin-bottom"
          >
            Register
          </ion-button>

          <ion-button expand="block" fill="clear" routerLink="/login">
            Already have an account?
          </ion-button>
        </form>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .register-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 20px;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white;
      }

      .register-image {
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
export class RegisterPage {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      try {
        const { email, password } = this.registerForm.value;
        await this.authService.register(email, password);
        this.router.navigate(['/home']);
      } catch (error) {
        console.error('Registration error:', error);
      }
    }
  }

  async loginWithGoogle() {
    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Google login error:', error);
    }
  }

  async loginWithFacebook() {
    try {
      await this.authService.signInWithFacebook();
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Facebook login error:', error);
    }
  }
}
