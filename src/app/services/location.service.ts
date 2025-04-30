import { Injectable, signal, OnDestroy } from '@angular/core';
import { Firestore, doc, docData, DocumentReference } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { Observable, ReplaySubject, throwError, of, Subscription } from 'rxjs'; // Added 'Subscription'
import { map, tap, shareReplay, catchError, switchMap, distinctUntilChanged } from 'rxjs/operators'; // Added 'switchMap', 'distinctUntilChanged'
import { AuthService, UserMetadata } from './auth.service'; // Import AuthService

// Keep existing interfaces
export interface WorkLocationSettings {
  latitude: number;
  longitude: number;
  radiusKm: number;
  name?: string;
}

type GeolocationPositionCompatible = {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitudeAccuracy: number | null;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
  };
};


@Injectable({
  providedIn: 'root'
})
export class WorkLocationService implements OnDestroy {

  // Settings are now tenant-specific, no single fixed ref at init
  // private locationSettingsDocRef: DocumentReference<WorkLocationSettings>;

  // Observable that emits the settings for the *current* tenant
  private workLocationSettings$: Observable<WorkLocationSettings | null>;

  // Signal holding the current tenant's settings
  private _currentSettings = signal<WorkLocationSettings | null>(null);
  public readonly currentSettings = this._currentSettings.asReadonly(); // Readonly signal accessor

  private userMetadataSubscription: Subscription | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService // Inject AuthService
  ) {
    console.log("WorkLocationService Initialized (Multi-Tenant Adapted)");
    // Setup the reactive settings observable based on user's business context
    this.workLocationSettings$ = this.authService.userMetadata$.pipe(
      // Only react if the businessId actually changes
      map(metadata => metadata?.businessId), // Extract businessId or null
      distinctUntilChanged(), // Prevent unnecessary refetching if businessId hasn't changed
      tap(businessId => console.log(`WorkLocationService: Business context changed to: ${businessId}`)),
      switchMap(businessId => {
        // Teardown previous listener logic isn't needed here because
        // docData automatically handles unsubscribing when switchMap provides a new inner observable.

        if (businessId) {
          // --- User has a business context ---
          const settingsDocPath = `business/${businessId}/settings/location`; // Tenant-specific path
          console.log(`WorkLocationService: Fetching settings from ${settingsDocPath}`);
          const settingsDocRef = doc(this.firestore, settingsDocPath) as DocumentReference<WorkLocationSettings>;

          // Return the inner observable for this tenant's settings
          return docData<WorkLocationSettings>(settingsDocRef).pipe(
            map(locationData => {
              if (locationData && typeof locationData.latitude === 'number' && typeof locationData.longitude === 'number' && typeof locationData.radiusKm === 'number') {
                console.log(`WorkLocationService: Settings loaded for ${businessId}:`, locationData);
                return locationData;
              }
              console.warn(`Work location data not found or invalid in Firestore for business ${businessId} at ${settingsDocPath}.`);
              return null; // No valid settings found for this tenant
            }),
            catchError(err => {
              console.error(`Error fetching work location settings for business ${businessId}:`, err);
              return of(null); // Return null on error for this tenant
            })
          );
        } else {
          // --- No business context (logged out or metadata missing) ---
          console.log("WorkLocationService: No business context, returning null settings.");
          return of(null); // Return an observable emitting null immediately
        }
      }),
      // Update the signal whenever the effective settings change
      tap(settings => this._currentSettings.set(settings)),
      // Share the result to avoid multiple Firestore listeners if subscribed multiple times
      shareReplay(1)
    );

    // Keep the subscription active to update the signal
    this.userMetadataSubscription = this.workLocationSettings$.subscribe();
  }

  ngOnDestroy(): void {
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("WorkLocationService: Unsubscribed from settings stream.");
    }
  }

  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * ADAPTED: Gets an Observable stream of the work location settings
   * for the *currently logged-in user's business*. Emits null if no settings
   * are found, user is logged out, or an error occurs.
   */
  getWorkLocationSettings(): Observable<WorkLocationSettings | null> {
    // Returns the reactive observable set up in the constructor
    return this.workLocationSettings$;
  }

  /**
   * ADAPTED: Synchronously gets the *currently loaded* work location settings
   * for the logged-in user's business. Returns null if settings haven't loaded,
   * are invalid, or the user has no business context.
   */
  getCurrentWorkLocationSettings(): WorkLocationSettings | null {
    // Reads the current value from the signal, which is updated by the observable
    return this.currentSettings();
  }

  /**
   * Gets the current geographical position. (No multi-tenant changes needed here).
   * Handles native/web platforms and permissions.
   */
  async getCurrentPosition(): Promise<GeolocationPositionCompatible> {
    // Logic remains the same - it's platform/device dependent, not tenant dependent
    if (Capacitor.isNativePlatform()) {
      console.log('Using Capacitor Geolocation API (Native)');
      const position = await this.getCurrentPositionCapacitor();
      // ... (mapping to GeolocationPositionCompatible remains the same)
      return {
        timestamp: position.timestamp,
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
          speed: position.coords.speed,
          heading: position.coords.heading,
        },
      };
    } else if (navigator.geolocation) {
      console.log('Using Web Geolocation API');
      return this.getCurrentPositionWeb();
    } else {
      console.error('Geolocation is not supported on this platform/browser.');
      throw new Error('Geolocation is not supported.');
    }
  }

  // --- Native Geolocation (Capacitor) - No changes needed ---
  private async getCurrentPositionCapacitor(): Promise<Position> {
    // ... (implementation remains exactly the same)
    try {
      let permissionStatus: PermissionStatus = await Geolocation.checkPermissions();
      if (permissionStatus.location !== 'granted' && permissionStatus.coarseLocation !== 'granted') {
        permissionStatus = await Geolocation.requestPermissions();
      }
      if (permissionStatus.location === 'denied' || permissionStatus.coarseLocation === 'denied') {
        throw new Error('Location permission denied.');
      }
      if (permissionStatus.location !== 'granted' && permissionStatus.coarseLocation !== 'granted') {
        throw new Error('Location permission not granted.');
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      return position;
    } catch (error: any) {
      // ... (error handling remains the same)
      console.error('Capacitor Geolocation Error:', error);
      if (error.message && (error.message.includes('permission') || error.message.includes('denied'))) throw new Error('Location permission denied.');
      if (error.message && error.message.toLowerCase().includes('unavailable')) throw new Error('Location currently unavailable. Check GPS/Network.');
      if (error.message && error.message.toLowerCase().includes('timeout')) throw new Error('Location request timed out.');
      if (error.message && error.message.toLowerCase().includes('cancelled')) throw new Error('Location request cancelled.');
      throw new Error(`Could not get location: ${error.message || 'Native location error'}`);
    }
  }

  // --- Web Geolocation API - No changes needed ---
  private getCurrentPositionWeb(): Promise<GeolocationPositionCompatible> {
    // ... (implementation remains exactly the same)
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          const compatiblePosition: GeolocationPositionCompatible = { /* ... mapping ... */
            timestamp: position.timestamp,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            }
          };
          resolve(compatiblePosition);
        },
        (error: GeolocationPositionError) => {
          switch (error.code) { /* ... error mapping ... */
            case error.PERMISSION_DENIED: reject(new Error('Location permission denied.')); break;
            case error.POSITION_UNAVAILABLE: reject(new Error('Location currently unavailable. Check GPS/Network.')); break;
            case error.TIMEOUT: reject(new Error('Location request timed out.')); break;
            default: reject(new Error(`Could not get location: ${error.message || 'Unknown web error'}`)); break;
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  /**
   * ADAPTED: Checks if the user's current location is within the defined work area
   * FOR THE CURRENT BUSINESS.
   * Uses the tenant-specific settings loaded into the signal.
   * @returns A Promise resolving with true if within range, false otherwise.
   * @throws An error if work settings are not loaded for the current business or location cannot be obtained.
   */
  async isUserWithinWorkArea(): Promise<boolean> {
    // Get settings specific to the current tenant via the signal
    const settings = this.getCurrentWorkLocationSettings(); // This now gets tenant data

    if (!settings) {
      // Check if the reason is lack of login/business context vs. settings not configured
      if (!this.authService.getCurrentBusinessId()) {
        console.error("isUserWithinWorkArea: Cannot check - User not associated with a business.");
        throw new Error('Cannot verify location: User business context not available.');
      } else {
        console.error("isUserWithinWorkArea: Cannot check - Work location settings not loaded or invalid for the current business.");
        throw new Error('Work location settings not available for this business.');
      }
    }

    // Get current position (platform agnostic) - no change needed here
    const position = await this.getCurrentPosition();
    const { latitude: currentLat, longitude: currentLon } = position.coords;

    // Compare with the tenant's settings
    const { latitude: targetLat, longitude: targetLon, radiusKm } = settings;
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon);
    const isWithin = distance <= radiusKm;

    console.log(`WorkLocation Check: User at (${currentLat.toFixed(5)}, ${currentLon.toFixed(5)}). Target (${targetLat.toFixed(5)}, ${targetLon.toFixed(5)}). Distance: ${distance.toFixed(3)} km. Radius: ${radiusKm} km. Within range: ${isWithin}`);
    return isWithin;
  }


  // --- Helper Methods - No changes needed ---
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // ... (implementation remains the same)
    const R = 6371; const dLat = this.deg2rad(lat2 - lat1); const dLon = this.deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
