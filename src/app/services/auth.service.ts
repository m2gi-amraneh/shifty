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
  onAuthStateChanged,
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
    this.initializeAuthStateListener();
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

  // Update the register method to accept name
  register(name: string, email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(this.auth, email, password).then(
      (userCredential) => {
        // Save user data including name
        return this.saveUserData(
          userCredential.user?.uid,
          name,
          email,
          'employee'
        );
      }
    );
  }

  // Update saveUserData to include name
  private saveUserData(
    uid: string | undefined,
    name: string,
    email: string,
    role: string
  ) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return setDoc(userRef, { name, email, role }); // Save name to Firestore
  }

  // Update checkAndAssignRole to include name
  private async checkAndAssignRole(
    uid: string,
    name: string,
    email: string
  ): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // New user, assign "employee" role and save name
      await setDoc(userRef, { name, email, role: 'employee' });
    }
  }

  // Update social login methods to include name
  async signInWithGoogle(): Promise<any> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      const user = credential.user;

      if (user) {
        await this.checkAndAssignRole(
          user.uid,
          user.displayName || '',
          user.email || ''
        ); // Pass display name
      }

      return credential;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  async signInWithFacebook(): Promise<any> {
    try {
      const provider = new FacebookAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      const user = credential.user;

      if (user) {
        await this.checkAndAssignRole(
          user.uid,
          user.displayName || '',
          user.email || ''
        ); // Pass display name
      }

      return credential;
    } catch (error) {
      console.error('Facebook Sign-In Error:', error);
      throw error;
    }
  }

  // Logout
  logout(): Promise<void> {
    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  // Get current user as Observable

  getCurrentUser() {
    return this.userSubject.asObservable();
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
  private initializeAuthStateListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.userSubject.next(user);
      } else {
        this.userSubject.next(null);
      }
    });
  }
}
