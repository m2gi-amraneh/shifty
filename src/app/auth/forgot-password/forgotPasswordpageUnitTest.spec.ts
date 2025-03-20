import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular/standalone';
import { By } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ForgotPasswordPage } from './forgot-password.component';
import { ActivatedRoute } from '@angular/router';

describe('ForgotPasswordPage', () => {
  let component: ForgotPasswordPage;
  let fixture: ComponentFixture<ForgotPasswordPage>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;
  let toastControllerMock: jasmine.SpyObj<ToastController>;

  beforeEach(async () => {
    // Create mocks for dependencies
    authServiceMock = jasmine.createSpyObj('AuthService', ['resetPassword']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    const toastSpy = jasmine.createSpyObj('HTMLIonToastElement', ['present']);
    toastControllerMock = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerMock.create.and.returnValue(Promise.resolve(toastSpy));

    const activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: () => null
        }
      }
    };
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        ForgotPasswordPage
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastController, useValue: toastControllerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.resetForm.get('email')?.value).toBe('');
    expect(component.resetForm.valid).toBeFalsy();
  });

  it('should validate email field', () => {
    const emailControl = component.resetForm.get('email');

    // Empty email
    emailControl?.setValue('');
    expect(emailControl?.valid).toBeFalsy();
    expect(emailControl?.errors?.['required']).toBeTruthy();

    // Invalid email format
    emailControl?.setValue('invalid-email');
    expect(emailControl?.valid).toBeFalsy();
    expect(emailControl?.errors?.['email']).toBeTruthy();

    // Valid email
    emailControl?.setValue('valid@example.com');
    expect(emailControl?.valid).toBeTruthy();
    expect(emailControl?.errors).toBeNull();
  });

  it('should show validation messages when email field is touched and invalid', () => {
    // Set invalid email
    const emailControl = component.resetForm.get('email');
    emailControl?.setValue('');
    emailControl?.markAsTouched();
    fixture.detectChanges();

    // Check error message for required field
    let errorMessage = fixture.debugElement.query(By.css('.error-message span'));
    expect(errorMessage.nativeElement.textContent).toContain('Email is required');

    // Set invalid email format
    emailControl?.setValue('invalid-email');
    fixture.detectChanges();

    // Check error message for invalid email format
    errorMessage = fixture.debugElement.query(By.css('.error-message span'));
    expect(errorMessage.nativeElement.textContent).toContain('Please enter a valid email');
  });

  it('should enable submit button only when form is valid', () => {
    const submitButton = fixture.debugElement.query(By.css('ion-button[type="submit"]'));

    // Initially button should be disabled
    expect(submitButton.nativeElement.disabled).toBeTruthy();

    // Set valid email
    component.resetForm.get('email')?.setValue('valid@example.com');
    fixture.detectChanges();

    // Button should now be enabled
    expect(submitButton.nativeElement.disabled).toBeFalsy();
  });

  it('should call resetPassword service method on form submission', fakeAsync(() => {
    // Setup form with valid email
    const testEmail = 'test@example.com';
    component.resetForm.get('email')?.setValue(testEmail);
    fixture.detectChanges();

    // Mock successful password reset
    authServiceMock.resetPassword.and.returnValue(Promise.resolve() as Promise<any>);

    // Submit form
    component.onSubmit();
    tick();

    // Verify service was called with correct email
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(testEmail);

    // Verify toast was shown
    expect(toastControllerMock.create).toHaveBeenCalled();
    expect(toastControllerMock.create?.calls.mostRecent()?.args[0]?.message)
      .toContain('Password reset link sent to your email');

    // Verify navigation after delay
    tick(3000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('should handle error when password reset fails', fakeAsync(() => {
    // Setup form with valid email
    component.resetForm.get('email')?.setValue('test@example.com');

    // Mock error response
    const mockError = { code: 'auth/user-not-found' };
    authServiceMock.resetPassword.and.returnValue(Promise.reject(mockError));

    // Submit form
    component.onSubmit();
    tick();

    // Verify error toast was shown
    expect(toastControllerMock.create).toHaveBeenCalled();
    expect(toastControllerMock.create.calls.mostRecent()?.args[0]?.message)
      .toContain('No account found with this email address');

    // Should not navigate
    expect(routerMock.navigate).not.toHaveBeenCalled();
  }));

  it('should handle different error codes correctly', fakeAsync(() => {
    component.resetForm.get('email')?.setValue('test@example.com');

    // Test invalid-email error
    authServiceMock.resetPassword.and.returnValue(Promise.reject({ code: 'auth/invalid-email' }));
    component.onSubmit();
    tick();
    expect(toastControllerMock.create.calls.mostRecent().args[0]?.message)
      .toContain('The email address is not valid');

    // Test network error
    authServiceMock.resetPassword.and.returnValue(Promise.reject({ code: 'auth/network-request-failed' }));
    component.onSubmit();
    tick();
    expect(toastControllerMock.create.calls.mostRecent().args[0]?.message)
      .toContain('Network error');

    // Test default error
    authServiceMock.resetPassword.and.returnValue(Promise.reject({ code: 'auth/unknown-error' }));
    component.onSubmit();
    tick();
    expect(toastControllerMock.create.calls.mostRecent().args[0]?.message)
      .toContain('Failed to send reset email');
  }));

  it('should mark all fields as touched when submitting invalid form', () => {
    // Spy on markAsTouched method
    spyOn(component.resetForm.get('email') as any, 'markAsTouched');

    // Submit the form without filling it
    component.onSubmit();

    // Verify markAsTouched was called
    expect(component.resetForm.get('email')?.markAsTouched).toHaveBeenCalled();
  });
});
