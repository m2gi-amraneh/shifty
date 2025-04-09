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
  deleteUser,
  signInWithCredential,
  AuthCredential,
  OAuthProvider,
  sendPasswordResetEmail,
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
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';

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
    this.firestore = getFirestore(this.firebaseApp);
    this.initializeAuthStateListener();

    // Initialize Google Auth on app startup
    if (Capacitor.isNativePlatform()) {
      // Attendez que l'application soit complètement chargée
      document.addEventListener('deviceready', () => {
        GoogleAuth.initialize();
        FacebookLogin.initialize({ appId: '1907280960089941' });

      }, false);
    }
  }

  async getUserToken(): Promise<string | null> {
    return await getToken(this.messaging, {
      vapidKey: 'BFSlzK2cM-aDi-1TsHFgh_U9PeqzUmR91ZOBF9Yv7tX2QSxXK4oDiMeDILIyAT0CqUS1-zuH-3Lg5cIfl6S3pu8',
    });
  }

  async getUserRole(uid: string): Promise<string | null> {
    try {
      const userRef = doc(this.firestore, `users/${uid}`);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return userDoc.data()?.['role'] || null;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  login(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  register(name: string, email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(this.auth, email, password).then(
      (userCredential) => {
        const user = userCredential.user;
        updateProfile(user, { displayName: name });
        return this.saveUserData(
          userCredential.user?.uid,
          name,
          email,
          'employee',
        );
      }
    );
  }

  private saveUserData(
    uid: string | undefined,
    name: string,
    email: string,
    role: string
  ) {
    const badgeCode = this.generateBadgeCode();
    const userRef = doc(this.firestore, `users/${uid}`);
    return setDoc(userRef, { id: uid, name, email, role, badgeCode });
  }

  private async checkAndAssignRole(uid: string, name: string, email: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const badgeCode = this.generateBadgeCode();
      await setDoc(userRef, { id: uid, name, email, role: 'employee', badgeCode });
    }
  }

  private generateBadgeCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async signInWithGoogle(): Promise<any> {
    try {
      if (Capacitor.isNativePlatform()) {
        console.log("Plateforme native détectée, tentative de connexion Google...");

        // Native implementation
        console.log("Initialisation de GoogleAuth...");

        await GoogleAuth.initialize();
        console.log("Appel de GoogleAuth.signIn()...");

        const googleUser = await GoogleAuth.signIn();
        console.log("Connexion Google réussie:", googleUser);


        // Create Firebase credential
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);

        // Sign in with Firebase using the credential
        const userCredential = await signInWithCredential(this.auth, credential);
        const user = userCredential.user;

        if (user) {
          await this.checkAndAssignRole(
            user.uid,
            googleUser.name || user.displayName || '',
            googleUser.email || user.email || ''
          );
        }

        return userCredential;
      } else {
        // Web implementation (keep existing code)
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(this.auth, provider);
        const user = credential.user;

        if (user) {
          await this.checkAndAssignRole(
            user.uid,
            user.displayName || '',
            user.email || ''
          );
        }

        return credential;
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  async signInWithFacebook(): Promise<any> {
    if (this.isFacebookLoginInProgress) {
      console.log("Facebook login is already in progress.");
      return; // Prevent overlapping calls
    }

    this.isFacebookLoginInProgress = true;

    try {
      if (Capacitor.isNativePlatform()) {
        // Initialize Facebook Login
        await FacebookLogin.initialize({ appId: '1907280960089941' });

        // Perform Facebook Login
        const result = await FacebookLogin.login({ permissions: ['email', 'public_profile'] });

        if (result && result.accessToken) {
          // Get Facebook user data
          const facebookData = await FacebookLogin.getProfile<{
            email: string;
            name: string;
          }>({ fields: ['email', 'name'] });

          // Create Firebase credential
          const credential = FacebookAuthProvider.credential(result.accessToken.token);

          // Sign in with Firebase using the credential
          const userCredential = await signInWithCredential(this.auth, credential);
          const user = userCredential.user;

          if (user) {
            await this.checkAndAssignRole(
              user.uid,
              facebookData.name || user.displayName || '',
              facebookData.email || user.email || ''
            );
          }

          return userCredential;
        } else {
          throw new Error('Facebook login failed');
        }
      } else {
        // Web implementation (keep existing code)
        const provider = new FacebookAuthProvider();
        const credential = await signInWithPopup(this.auth, provider);
        const user = credential.user;

        if (user) {
          await this.checkAndAssignRole(
            user.uid,
            user.displayName || '',
            user.email || ''
          );
        }

        return credential;
      }
    } catch (error) {
      console.error('Facebook Sign-In Error:', error);
      throw error;
    } finally {
      // Reset the flag after login attempt
      this.isFacebookLoginInProgress = false;
    }
  }
  private isFacebookLoginInProgress = false;

  logout(): Promise<void> {
    // Sign out from Google Auth if on native platform
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.signOut();
      FacebookLogin.logout();
    }

    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  getCurrentUser(): Observable<any> {
    return new Observable((observer) => {
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          const userRef = doc(this.firestore, `users/${user.uid}`);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            observer.next({ ...user, ...userDoc.data() });
          } else {
            observer.next(user);
          }
        } else {
          observer.next(null);
        }
      });
    });
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }

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

  deleteUser(uid: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user && user.uid === uid) {
      return deleteUser(user);
    }
    return Promise.resolve();
  }
  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }
}
