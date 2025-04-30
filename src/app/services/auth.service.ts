// auth.service.ts

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseApp } from '@angular/fire/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  Auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  deleteUser,
  signInWithCredential,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from '@angular/fire/auth';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  Timestamp, // Import Timestamp
} from '@angular/fire/firestore';
import { getMessaging, getToken } from '@angular/fire/messaging';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';

// Keep UserMetadata interface
export interface UserMetadata {
  uid: string;
  email: string;
  displayName?: string;
  role: 'employer_admin' | 'employee' | 'admin' | string; // Added 'admin' based on login page logic
  businessId: string;
  profilePicture?: string;
}

// Add interface for Business Data
export interface BusinessData {
  id?: string;
  name: string;
  createdAt: Timestamp;
  subscriptionEndDate: Timestamp; // Expecting a Firestore Timestamp
  isActive?: boolean; // Optional active flag
  adminUids?: string[];
  // Add other business metadata fields if they exist
}


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth;
  private firestore: Firestore;
  private messaging = getMessaging();

  // --- State Management ---
  private authUserSubject = new BehaviorSubject<User | null>(null);
  private userMetadataSubject = new BehaviorSubject<UserMetadata | null>(null);
  private isFacebookLoginInProgress = false;

  // --- Public Observables ---
  public authUser$: Observable<User | null> = this.authUserSubject.asObservable();
  public userMetadata$: Observable<UserMetadata | null> = this.userMetadataSubject.asObservable();
  public isAuthenticated$: Observable<boolean> = this.authUser$.pipe(map(user => !!user));
  public isFullyConfigured$: Observable<boolean> = this.userMetadata$.pipe(map(metadata => !!metadata));

  constructor(
    private router: Router,
    private firebaseApp: FirebaseApp
  ) {
    this.auth = getAuth(this.firebaseApp);
    this.firestore = getFirestore(this.firebaseApp);
    console.log("AuthService Initialized");
    this.initializeAuthStateListener();
    this.initializeNativeAuthProviders();
  }

  private initializeNativeAuthProviders(): void { /* ... same as before ... */
    if (!Capacitor.isNativePlatform()) return;
    const init = async () => { try { await GoogleAuth.initialize(); await FacebookLogin.initialize({ appId: '1907280960089941' }); console.log("Native auth providers initialized."); } catch (err) { console.error("Error initializing native auth providers:", err); } };
    if ((window as any).cordova) { document.addEventListener('deviceready', init, false); } else { init(); }
  }

  // --- Getters remain the same ---
  getCurrentAuthUser(): User | null { return this.authUserSubject.getValue(); }
  getCurrentUserMetadata(): UserMetadata | null { return this.userMetadataSubject.getValue(); }
  getCurrentUser(): Observable<UserMetadata | null> { return this.userMetadataSubject; } // Keep this one as LoginPage uses it
  getCurrentUserId(): string | null { return this.getCurrentAuthUser()?.uid ?? null; }
  getCurrentBusinessId(): string | null { return this.getCurrentUserMetadata()?.businessId ?? null; }
  getCurrentRole(): string | null { return this.getCurrentUserMetadata()?.role ?? null; }
  getCurrentRoleOB(): Observable<string | null> { return this.userMetadataSubject.pipe(map(metadata => metadata?.role ?? null)); }

  // --- Auth State Listener remains the same ---
  private initializeAuthStateListener(): void {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        if (this.userMetadataSubject.getValue()?.uid === user.uid) return; // Already loaded
        console.log("onAuthStateChanged: User detected. Fetching metadata for", user.uid);
        this.authUserSubject.next(user);
        try {
          // Fetch metadata FIRST (contains businessId needed for subscription check)
          const metadata = await this.fetchUserMetadata(user.uid);
          if (metadata) {
            // Check subscription BEFORE setting metadata subject fully
            await this.checkSubscriptionAndFinalizeLogin(metadata);
          } else {
            console.warn("onAuthStateChanged: User lacks valid metadata. Logging out.");
            await this.logoutInternal();
          }
        } catch (error: any) {
          console.error("onAuthStateChanged: Error during metadata/subscription check. Logging out.", error);
          // Check if it's a subscription error to show specific message potentially
          if (error.message?.includes('Subscription')) {
            // Optionally, navigate to a specific subscription page or show persistent message
            console.log("Redirecting due to subscription issue from auth state change.");
            // this.router.navigate(['/subscription-expired']); // Example redirect
          }
          await this.logoutInternal();
        }
      } else {
        console.log("onAuthStateChanged: No user detected. Clearing state.");
        if (this.authUserSubject.getValue() !== null) this.authUserSubject.next(null);
        if (this.userMetadataSubject.getValue() !== null) this.userMetadataSubject.next(null);
      }
    });
  }


  // --- Fetch User Metadata remains the same ---
  private async fetchUserMetadata(uid: string): Promise<UserMetadata | null> {
    if (!uid) { console.error("fetchUserMetadata: Called with null UID."); return null; }
    const userRef = doc(this.firestore, `users/${uid}`);
    try {
      const userDocSnap = await getDoc(userRef);
      if (!userDocSnap.exists()) { console.warn(`fetchUserMetadata: No doc found at /users/${uid}.`); return null; }
      const data = userDocSnap.data();
      if (!data || !data['businessId'] || !data['role']) { console.error(`fetchUserMetadata: User doc /users/${uid} missing required fields.`); return null; }
      const metadata: UserMetadata = {
        uid: uid, email: data['email'] || '', displayName: data['displayName'], role: data['role'], businessId: data['businessId'], profilePicture: data['profilePicture'] || undefined,
      };
      return metadata;
    } catch (error) { console.error(`fetchUserMetadata: Error fetching /users/${uid}:`, error); throw error; }
  }

  /**
   * MODIFIED Central handler: Fetches user meta, then business meta, checks subscription.
   */
  private async handleAuthenticationSuccess(user: User): Promise<UserMetadata> {
    if (!user) throw new Error('Auth Post-Processing Failed: User object null.');
    console.log("handleAuthSuccess: Processing for UID:", user.uid);
    this.authUserSubject.next(user); // Update Auth state

    try {
      // 1. Fetch User Metadata (contains businessId)
      const userMetadata = await this.fetchUserMetadata(user.uid);
      if (!userMetadata) {
        console.error(`handleAuthSuccess: User ${user.uid} lacks valid metadata. Aborting.`);
        await this.logoutInternal();
        throw new Error('Login Failed: Account configuration incomplete. Contact admin.');
      }

      // 2. Check Subscription & Finalize
      // This function now handles fetching business doc and checking date
      await this.checkSubscriptionAndFinalizeLogin(userMetadata);

      // 3. If checkSubscriptionAndFinalizeLogin didn't throw, login is valid
      console.log("handleAuthSuccess: Metadata & Subscription OK for UID:", user.uid);
      return userMetadata; // Return successfully fetched metadata

    } catch (error: any) {
      console.error(`handleAuthSuccess: Error during post-auth processing for UID ${user.uid}:`, error);
      // Ensure logout happened if error occurred
      if (this.authUserSubject.getValue()) { // Check if not already logged out by sub check
        await this.logoutInternal();
      }
      // Re-throw the specific error (e.g., config error, subscription error)
      throw error;
    }
  }

  /**
   * NEW: Fetches business data and checks subscription status.
   * Throws error if subscription invalid/expired, otherwise sets user metadata.
  */
  private async checkSubscriptionAndFinalizeLogin(userMetadata: UserMetadata): Promise<void> {
    const businessId = userMetadata.businessId;
    const businessDocRef = doc(this.firestore, `business/${businessId}`);

    try {
      console.log(`checkSubscription: Fetching business doc: business/${businessId}`);
      const businessDocSnap = await getDoc(businessDocRef);

      if (!businessDocSnap.exists()) {
        console.error(`checkSubscription: Business document ${businessId} not found!`);
        throw new Error('Login Failed: Associated business data not found.');
      }

      const businessData = businessDocSnap.data() as BusinessData;

      // Optional: Check if business is manually deactivated
      if (businessData.isActive === false) { // Explicitly check for false
        console.warn(`checkSubscription: Business ${businessId} is inactive.`);
        throw new Error('Login Failed: This business account is currently inactive.');
      }

      // Check for subscription end date
      if (!businessData.subscriptionEndDate || !(businessData.subscriptionEndDate instanceof Timestamp)) {
        console.error(`checkSubscription: Business ${businessId} has missing or invalid subscriptionEndDate.`);
        throw new Error('Login Failed: Business subscription information is invalid.');
      }

      const subscriptionEndDate = businessData.subscriptionEndDate.toDate();
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Optional: Check against start of today for leniency
      subscriptionEndDate.setHours(23, 59, 59, 999); // Check against end of subscription day

      console.log(`checkSubscription: Current Date: ${now.toISOString()}, Sub End Date: ${subscriptionEndDate.toISOString()}`);

      if (now > subscriptionEndDate) {
        console.warn(`checkSubscription: Subscription expired for business ${businessId} on ${subscriptionEndDate.toISOString()}`);
        throw new Error('Subscription Expired: Please renew your subscription to continue.');
      }

      // --- Subscription Valid ---
      console.log(`checkSubscription: Subscription valid for business ${businessId}. Finalizing login.`);
      // Set the user metadata *only after* subscription check passes
      this.userMetadataSubject.next(userMetadata);

    } catch (error) {
      // If error occurred during fetch/check, log out and re-throw
      console.error(`checkSubscription: Error for business ${businessId}. Logging out.`, error);
      await this.logoutInternal(); // Ensure logout on any failure in this critical step
      throw error; // Propagate the original error (e.g., "Subscription Expired")
    }
  }


  // --- Login Methods (No changes needed, they call handleAuthenticationSuccess) ---
  async login(email: string, password: string): Promise<UserMetadata> {
    // ... same implementation ...
    try { const userCredential = await signInWithEmailAndPassword(this.auth, email, password); return await this.handleAuthenticationSuccess(userCredential.user); }
    catch (error: any) { this.handleAuthError(error); if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') { throw new Error('Invalid email or password.'); } else if (error.message?.includes('Login Failed:') || error.message?.includes('Subscription Expired:')) { throw error; } throw new Error('Login failed. Please try again.'); }
  }
  async signInWithGoogle(): Promise<UserMetadata> {
    // ... same implementation ...
    try { let userCredential: UserCredential; if (Capacitor.isNativePlatform()) { const googleUser = await GoogleAuth.signIn(); if (!googleUser?.authentication?.idToken) throw new Error("Google Sign-In failed."); const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken); userCredential = await signInWithCredential(this.auth, credential); } else { const provider = new GoogleAuthProvider(); userCredential = await signInWithPopup(this.auth, provider); } return await this.handleAuthenticationSuccess(userCredential.user); }
    catch (error: any) { console.error('Google Sign-In Error:', error); this.handleAuthError(error); if (error.message?.includes('Login Failed:') || error.message?.includes('Subscription Expired:')) { throw error; } else if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('cancelled')) { throw new Error('Google Sign-In was cancelled.'); } throw new Error('Google Sign-In failed.'); }
  }
  async signInWithFacebook(): Promise<UserMetadata> {
    // ... same implementation ...
    if (this.isFacebookLoginInProgress) return Promise.reject(new Error("Facebook login already in progress.")); this.isFacebookLoginInProgress = true; try { let userCredential: UserCredential; if (Capacitor.isNativePlatform()) { const result = await FacebookLogin.login({ permissions: ['email', 'public_profile'] }); if (result?.accessToken?.token) { const credential = FacebookAuthProvider.credential(result.accessToken.token); userCredential = await signInWithCredential(this.auth, credential); } else { throw new Error('Facebook login was cancelled or failed.'); } } else { const provider = new FacebookAuthProvider(); userCredential = await signInWithPopup(this.auth, provider); } return await this.handleAuthenticationSuccess(userCredential.user); }
    catch (error: any) { console.error('Facebook Sign-In Error:', error); this.handleAuthError(error); if (error.message?.includes('Login Failed:') || error.message?.includes('Subscription Expired:')) { throw error; } else if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('cancelled')) { throw new Error('Facebook Sign-In was cancelled.'); } else if (error.code === 'auth/account-exists-with-different-credential') { throw new Error('Account exists with different credential.'); } throw new Error('Facebook Sign-In failed.'); }
    finally { this.isFacebookLoginInProgress = false; }
  }

  // --- Logout Methods (No changes needed) ---
  private async logoutInternal(): Promise<void> { /* ... same ... */
    try { if (Capacitor.isNativePlatform()) { await GoogleAuth.signOut().catch(e => console.warn(e)); await FacebookLogin.logout().catch(e => console.warn(e)); } await signOut(this.auth); } catch (error) { console.error("logoutInternal error:", error); } finally { this.authUserSubject.next(null); this.userMetadataSubject.next(null); }
  }
  async logout(): Promise<void> { /* ... same ... */
    await this.logoutInternal(); this.router.navigate(['/login'], { replaceUrl: true });
  }

  // --- Other Utilities (No changes needed) ---
  async getUserToken(): Promise<string | null> { /* ... same ... */
    try { const key = 'BFSlzK2cM-aDi-1TsHFgh_U9PeqzUmR91ZOBF9Yv7tX2QSxXK4oDiMeDILIyAT0CqUS1-zuH-3Lg5cIfl6S3pu8'; const token = await getToken(this.messaging, { vapidKey: key }); return token || null; } catch (error) { console.error('FCM token error:', error); return null; }
  }
  async resetPassword(email: string): Promise<void> { /* ... same ... */
    try { await sendPasswordResetEmail(this.auth, email); } catch (error: any) { this.handleAuthError(error); if (error.code === 'auth/user-not-found') throw new Error('No user found.'); if (error.code === 'auth/invalid-email') throw new Error('Invalid email.'); throw new Error('Failed to send password reset.'); }
  }
  async deleteUser(uid: string): Promise<void> { /* ... same (discouraged) ... */
    console.warn("Client-side user deletion via AuthService is discouraged."); throw new Error("Client-side deletion disabled.");
  }
  private handleAuthError(error: any): void { /* ... same ... */
    console.error("Auth Error Details:", error);
  }
}