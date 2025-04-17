import { Injectable, signal } from '@angular/core';
import { Firestore, doc, docData, DocumentReference } from '@angular/fire/firestore';
// Import Capacitor core for platform detection
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation'; // Capacitor Geolocation types/functions
import { Observable, ReplaySubject, throwError, of } from 'rxjs'; // Added 'of'
import { map, tap, shareReplay, catchError } from 'rxjs/operators';

// Interface for the work location settings stored in Firestore
export interface WorkLocationSettings {
  latitude: number;
  longitude: number;
  radiusKm: number; // Allowed radius in kilometers
  name?: string; // Optional name for the location
}

// Define a type compatible with both Capacitor Position and Web GeolocationPosition
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
export class WorkLocationService {

  private locationSettingsDocRef: DocumentReference<WorkLocationSettings>;
  private workLocationSettings$: Observable<WorkLocationSettings | null>;

  private _currentSettings = signal<WorkLocationSettings | null>(null);
  public readonly currentSettings = this._currentSettings.asReadonly();

  constructor(private firestore: Firestore) {
    this.locationSettingsDocRef = doc(this.firestore, 'settings/location') as DocumentReference<WorkLocationSettings>;

    const settingsSubject = new ReplaySubject<WorkLocationSettings | null>(1);

    docData<WorkLocationSettings>(this.locationSettingsDocRef).pipe(
      map(locationData => {
        if (locationData && typeof locationData.latitude === 'number' && typeof locationData.longitude === 'number' && typeof locationData.radiusKm === 'number') {
          return locationData;
        }
        console.warn('Work location data not found or invalid in Firestore.');
        return null;
      }),
      tap(settings => this._currentSettings.set(settings)),
      catchError(err => {
        console.error("Error fetching work location settings:", err);
        this._currentSettings.set(null);
        // Allow app to continue, but signal settings aren't available
        // No need to throw here unless a consuming part absolutely needs to stop
        settingsSubject.next(null); // Push null to subscribers
        return of(null); // Complete the observable stream gracefully after error
      })
    ).subscribe(settingsSubject);

    this.workLocationSettings$ = settingsSubject.asObservable();
  }

  getWorkLocationSettings(): Observable<WorkLocationSettings | null> {
    return this.workLocationSettings$;
  }

  getCurrentWorkLocationSettings(): WorkLocationSettings | null {
    return this.currentSettings();
  }

  /**
   * Gets the current geographical position using Capacitor Geolocation on native platforms,
   * otherwise falls back to the Web Geolocation API.
   * Handles permissions appropriately for each platform.
   * @returns A Promise resolving with a compatible Position object.
   * @throws An error if permission is denied or location cannot be obtained.
   */
  async getCurrentPosition(): Promise<GeolocationPositionCompatible> {
    // Use isNativePlatform() for a more reliable check
    if (Capacitor.isNativePlatform()) {
      console.log('Using Capacitor Geolocation API (Native)');
      // On native, we *can* and *should* use Capacitor's permission handling
      const position = await this.getCurrentPositionCapacitor();
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
      // On web, use the standard Web API, which handles its own permissions
      console.log('Using Web Geolocation API');
      return this.getCurrentPositionWeb();
    } else {
      // If neither is available
      console.error('Geolocation is not supported on this platform/browser.');
      throw new Error('Geolocation is not supported.');
    }
  }

  // --- Capacitor Geolocation Implementation (for Native) ---
  private async getCurrentPositionCapacitor(): Promise<Position> {
    try {
      // 1. Check Permissions
      let permissionStatus: PermissionStatus = await Geolocation.checkPermissions();
      console.log('Capacitor initial permission status:', permissionStatus);

      // 2. Request Permissions if not granted
      // Important: Only request if necessary, check status first
      if (permissionStatus.location !== 'granted' && permissionStatus.coarseLocation !== 'granted') {
        console.log('Requesting Capacitor location permissions...');
        permissionStatus = await Geolocation.requestPermissions(); // This is VALID on native
        console.log('Capacitor permission status after request:', permissionStatus);
      }

      // 3. Check Status *after* potential request
      if (permissionStatus.location === 'denied' || permissionStatus.coarseLocation === 'denied') {
        console.error('Capacitor location permission explicitly denied.');
        throw new Error('Location permission denied.');
      }
      // Handle case where permission is still not granted (e.g., user dismissed prompt)
      if (permissionStatus.location !== 'granted' && permissionStatus.coarseLocation !== 'granted') {
        console.error('Capacitor location permission not granted after prompt.');
        throw new Error('Location permission not granted.');
      }


      // 4. Get Position
      console.log('Getting Capacitor current position...');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000
      });
      console.log('Capacitor Position obtained:', position);
      return position; // Capacitor's Position is compatible
    } catch (error: any) {
      console.error('Capacitor Geolocation Error:', error);
      if (error.message && (error.message.includes('permission') || error.message.includes('denied'))) {
        throw new Error('Location permission denied.');
      } else if (error.message && error.message.toLowerCase().includes('unavailable')) {
        throw new Error('Location currently unavailable. Check GPS/Network.');
      } else if (error.message && error.message.toLowerCase().includes('timeout')) {
        throw new Error('Location request timed out.');
      } else if (error.message && error.message.toLowerCase().includes('cancelled')) {
        throw new Error('Location request cancelled.'); // Handle cancellation if possible
      }
      else {
        throw new Error(`Could not get location: ${error.message || 'Native location error'}`);
      }
    }
  }

  // --- Web Geolocation API Implementation (for Web) ---
  private getCurrentPositionWeb(): Promise<GeolocationPositionCompatible> {
    return new Promise((resolve, reject) => {
      // No need to check navigator.geolocation again, already done in dispatch method

      console.log('Getting Web current position...');
      // The browser will automatically handle the permission prompt if needed here.
      // We DO NOT call requestPermissions on the web.
      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          console.log('Web Position obtained:', position);
          const compatiblePosition: GeolocationPositionCompatible = {
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
          console.error('Web Geolocation Error:', error);
          switch (error.code) {
            case error.PERMISSION_DENIED: // 1
              reject(new Error('Location permission denied.'));
              break;
            case error.POSITION_UNAVAILABLE: // 2
              reject(new Error('Location currently unavailable. Check GPS/Network.'));
              break;
            case error.TIMEOUT: // 3
              reject(new Error('Location request timed out.'));
              break;
            default: // 0 or other unknown
              reject(new Error(`Could not get location: ${error.message || 'Unknown web error'}`));
              break;
          }
        },
        { // GeolocationOptions
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0 // Force fresh location
        }
      );
    });
  }


  /**
   * Checks if the user's current location is within the defined work area.
   * Uses the platform-agnostic getCurrentPosition method.
   * @returns A Promise resolving with true if within range, false otherwise.
   * @throws An error if work settings are not loaded or location cannot be obtained/verified.
   */
  async isUserWithinWorkArea(): Promise<boolean> {
    const settings = this.getCurrentWorkLocationSettings();

    if (!settings) {
      console.error("Work location settings are not loaded or invalid.");
      throw new Error('Work location settings not available.');
    }

    const position = await this.getCurrentPosition(); // This now correctly dispatches
    const { latitude: currentLat, longitude: currentLon } = position.coords;
    const { latitude: targetLat, longitude: targetLon, radiusKm } = settings;

    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon);
    const isWithin = distance <= radiusKm;

    console.log(`Distance to target: ${distance.toFixed(3)} km. Radius: ${radiusKm} km. Within range: ${isWithin}`);
    return isWithin;
  }


  // --- Helper Methods ---
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
