import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): Promise<boolean> {
    const auth = getAuth(); // Get the Auth instance

    // Check the authentication state
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(true); // User is authenticated
        } else {
          this.router.navigate(['/login']); // Redirect to login
          resolve(false); // User is not authenticated
        }
      });
    });
  }
}
