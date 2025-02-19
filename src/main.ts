import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { enableProdMode } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { environment } from './environments/environment';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';

// Firebase imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore'; // Import Firestore modules
import { provideDatabase, getDatabase } from '@angular/fire/database'; // Import Database modules

// Firebase config (ensure this is your actual Firebase configuration)
const firebaseConfig = {
  apiKey: 'AIzaSyBtumbfL-GL7BeUfivtBgzInkSg5j3jnfc',
  authDomain: 'topic-app-4b583.firebaseapp.com',
  projectId: 'topic-app-4b583',
  storageBucket: 'topic-app-4b583.appspot.com',
  messagingSenderId: '385822540976',
  appId: '1:385822540976:web:01e3877e074fca89b6e775',
  measurementId: 'G-GJC296CELK',
};

if (environment.production) {
  enableProdMode();
}

// Bootstrap the application and initialize Firebase
bootstrapApplication(AppComponent, {
  providers: [
    // Initialize Firebase (ensure it's done before accessing Firebase services)
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAnimations(),
    // Provide Firebase services (Auth, Firestore, Database, etc.)
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()), // Add Firestore provider
    provideDatabase(() => getDatabase()), // Add Database provider (if needed)
    provideMessaging(() => getMessaging()), // Add Messaging provider (if needed)

    // Ionic setup
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),

    // Router setup with preloading strategy
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
