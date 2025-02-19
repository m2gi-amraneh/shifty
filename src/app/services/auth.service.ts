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
  updateProfile,
} from '@angular/fire/auth';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  messaging = getMessaging();

  private auth: Auth;
  private userSubject = new BehaviorSubject<any>(null);
  private firestore: Firestore;
  constructor(private router: Router, private firebaseApp: FirebaseApp) {
    this.auth = getAuth(this.firebaseApp);
    this.firestore = getFirestore(this.firebaseApp); // Get Firestore instance from FirebaseApp
    this.initializeAuthStateListener();
  }
  async getUserToken(): Promise<string | null> {
    return await getToken(this.messaging, {
      vapidKey: 'BFSlzK2cM-aDi-1TsHFgh_U9PeqzUmR91ZOBF9Yv7tX2QSxXK4oDiMeDILIyAT0CqUS1-zuH-3Lg5cIfl6S3pu8', // Get this from Firebase
    });
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
        const user = userCredential.user;
        updateProfile(user, { displayName: name });
        // Save user data including name
        return this.saveUserData(
          userCredential.user?.uid,
          name,
          email,
          'employee',
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
    const badgeCode = this.generateBadgeCode(); // Generate a short unique badge code

    const userRef = doc(this.firestore, `users/${uid}`);
    return setDoc(userRef, { name, email, role, badgeCode }); // Save name to Firestore
  }

  // Update checkAndAssignRole to include name
  private async checkAndAssignRole(uid: string, name: string, email: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const badgeCode = this.generateBadgeCode(); // Generate a short unique badge code
      await setDoc(userRef, { name, email, role: 'employee', badgeCode });
    }
  }

  // Generate a unique badge code
  private generateBadgeCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // Example: "X4Y9Z2"
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

  getCurrentUser(): Observable<any> {
    return new Observable((observer) => {
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          const userRef = doc(this.firestore, `users/${user.uid}`);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            observer.next({ ...user, ...userDoc.data() }); // Merge Firebase Auth and Firestore data
          } else {
            observer.next(user); // Return basic auth user data
          }
        } else {
          observer.next(null);
        }
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
