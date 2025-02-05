import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseApp } from '@angular/fire/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  Auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from '@angular/fire/auth';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth;
  private userSubject = new BehaviorSubject<any>(null);
  private firestore: Firestore;
  constructor(private router: Router, private firebaseApp: FirebaseApp) {
    this.auth = getAuth(this.firebaseApp);
    this.firestore = getFirestore(this.firebaseApp); // Get Firestore instance from FirebaseApp
  }
  // Fetch user role from Firestore
  async getUserRole(uid: string): Promise<string | null> {
    try {
      const userRef = doc(this.firestore, `users/${uid}`);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return userDoc.data()?.['role'] || null;
      } else {
        return null; // No role found
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }
  // Email/Password Login
  login(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password).then(
      (userCredential) => {
        // Sauvegarder le rôle dans Firestore
        return this.saveUserData(userCredential.user?.uid, email, 'employee'); // Force "employee" role
      }
    );
  }
  private saveUserData(uid: string | undefined, email: string, role: string) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return setDoc(userRef, { email, role });
  }
  async signInWithGoogle(): Promise<any> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      const user = credential.user;

      if (user) {
        await this.checkAndAssignRole(user.uid, user.email || '');
      }

      return credential; // ✅ Return the user credential
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error; // Rethrow error so it can be handled in the calling function
    }
  }

  // Facebook Sign-In with Role Assignment
  async signInWithFacebook(): Promise<any> {
    try {
      const provider = new FacebookAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      const user = credential.user;

      if (user) {
        await this.checkAndAssignRole(user.uid, user.email || '');
      }

      return credential; // ✅ Return the user credential
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error; // Rethrow error so it can be handled in the calling function
    }
  }
  private async checkAndAssignRole(uid: string, email: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // New user, assign "employee" role
      await setDoc(userRef, { email, role: 'employee' });
    }
  }
  // Logout
  logout(): Promise<void> {
    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  // Get current user as Observable
  getCurrentUser(): Observable<string | null> {
    return new Observable((observer) => {
      this.auth.onAuthStateChanged((user) => {
        observer.next(user ? user.uid : null);
      });
    });
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }

  // Check authentication status
  isAuthenticated(): Observable<boolean> {
    return new Observable((observer) => {
      this.auth.onAuthStateChanged((user) => {
        observer.next(!!user);
      });
    });
  }
}
