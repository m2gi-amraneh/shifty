import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy, // Optional: For ordering positions
  collectionData,
  docData,
  Unsubscribe, // If using manual onSnapshot
  serverTimestamp, // Optional
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable, BehaviorSubject, of, Subscription } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Import AuthService

// Define the interface for a Position
export interface Position {
  id?: string; // Document ID from Firestore
  name: string;
  description?: string; // Optional example field
  createdAt?: any; // Optional server timestamp
}

@Injectable({
  providedIn: 'root',
})
export class PositionsService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Inject AuthService

  private userMetadataSubscription: Subscription | null = null;
  // Optional: If you want a BehaviorSubject for positions similar to other services
  private positionsSubject = new BehaviorSubject<Position[]>([]);
  positions$ = this.positionsSubject.asObservable();
  private positionsListenerUnsubscribe: Unsubscribe | null = null;

  constructor() {
    console.log("PositionsService Initialized (Multi-Tenant Adapted)");
    // Optional: Initialize listener if using BehaviorSubject pattern
    this.initializeTenantListener();
  }

  // Optional: Listener setup if using BehaviorSubject pattern

  private initializeTenantListener(): void {
    this.userMetadataSubscription = this.authService.userMetadata$.pipe(
      // ... switchMap logic similar to other services ...
      switchMap(metadata => {
        // teardown listener
        if (metadata?.businessId) {
          const collectionPath = `business/${metadata.businessId}/positions`;
          const q = query(collection(this.firestore, collectionPath), orderBy('name'));
          // setup onSnapshot listener, update positionsSubject
          // this.positionsListenerUnsubscribe = onSnapshot(...)
          return of(true);
        } else {
          // clear subject
          this.positionsSubject.next([]);
          return of(false);
        }
      })
    ).subscribe();
  }

  private teardownListener(): void {
    if (this.positionsListenerUnsubscribe) {
      this.positionsListenerUnsubscribe();
      this.positionsListenerUnsubscribe = null;
    }
  }



  /** Utility to get the current business ID or throw an error */
  private getCurrentBusinessIdOrFail(): string {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("PositionsService Error: Operation failed. User is not associated with a business.");
    }
    return businessId;
  }

  // --- Tenant-Aware Methods ---

  /**
   * Gets all positions for the current business as an Observable for realtime updates.
   * Returns an empty array if the user is not logged in or has no businessId.
   */
  getPositions(): Observable<Position[]> {
    // Use switchMap to react to user/business changes
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.log("getPositions: No businessId, returning empty.");
          return of([]); // Return empty observable if no business context
        }
        const collectionPath = `business/${metadata.businessId}/positions`;
        console.log(`getPositions: Listening to ${collectionPath}`);
        const positionsQuery = query(
          collection(this.firestore, collectionPath),
          orderBy('name') // Example: order by name
        );
        // Use collectionData for real-time updates, automatically handles unsub
        return (collectionData(positionsQuery, { idField: 'id' }) as Observable<Position[]>).pipe(
          catchError(error => {
            console.error(`getPositions: Error fetching positions from ${collectionPath}:`, error);
            return of([]); // Return empty on error fetching data
          })
        );
      }),
      catchError(error => {
        console.error("getPositions: Error in outer auth stream:", error);
        return of([]); // Return empty on error in auth stream itself
      })
    );
  }

  /**
   * Gets a single position by its ID for the current business as an Observable.
   * Returns null if not found or no business context.
   */
  getPosition(id: string): Observable<Position | null> {
    if (!id) return of(null); // No ID provided

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.log(`getPosition(${id}): No businessId, returning null.`);
          return of(null);
        }
        const docPath = `business/${metadata.businessId}/positions/${id}`;
        console.log(`getPosition: Listening to ${docPath}`);
        // Use docData for real-time updates of a single document
        return (docData(doc(this.firestore, docPath), { idField: 'id' }) as Observable<Position>).pipe(
          map(position => position || null), // Ensure null is emitted if doc doesn't exist
          catchError(error => {
            console.error(`getPosition: Error fetching position ${id} from ${docPath}:`, error);
            return of(null); // Return null on error fetching data
          })
        );
      }),
      catchError(error => {
        console.error(`getPosition(${id}): Error in outer auth stream:`, error);
        return of(null); // Return null on error in auth stream itself
      })
    );
  }

  /**
   * Adds a new position to the current business's subcollection.
   * Requires the position object (e.g., { name: 'Manager' }).
   * Returns the ID of the newly created position.
   * Throws error if not logged into a business or if add fails.
   */
  async addPosition(position: Omit<Position, 'id' | 'createdAt'>): Promise<string> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const collectionPath = `business/${businessId}/positions`;
    const positionsRef = collection(this.firestore, collectionPath);

    const dataToAdd = {
      ...position,
      createdAt: serverTimestamp() // Optional: Add creation timestamp
    };

    console.log(`addPosition: Adding position to ${collectionPath}`);
    try {
      const docRef = await addDoc(positionsRef, dataToAdd);
      console.log(`addPosition: Success. New ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`addPosition: Error adding to ${collectionPath}:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * Updates an existing position within the current business's subcollection.
   * Requires the position ID and the data to update (e.g., { name: 'Senior Manager' }).
   * Throws error if not logged into a business or if update fails.
   */
  async updatePosition(id: string, positionUpdate: Partial<Omit<Position, 'id' | 'createdAt'>>): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    if (!id) throw new Error("updatePosition: Position ID is required.");

    const docPath = `business/${businessId}/positions/${id}`;
    const positionRef = doc(this.firestore, docPath);

    // Optionally add an updatedAt timestamp
    // const dataToUpdate = { ...positionUpdate, updatedAt: serverTimestamp() };

    console.log(`updatePosition: Updating position ${id} at ${docPath}`);
    try {
      await updateDoc(positionRef, positionUpdate); // Pass only the fields to update
      console.log(`updatePosition: Success.`);
    } catch (error) {
      console.error(`updatePosition: Error updating ${id} at ${docPath}:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * Deletes a position from the current business's subcollection.
   * Requires the position ID.
   * Throws error if not logged into a business or if delete fails.
   */
  async deletePosition(id: string): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    if (!id) throw new Error("deletePosition: Position ID is required.");

    const docPath = `business/${businessId}/positions/${id}`;
    const positionRef = doc(this.firestore, docPath);

    console.log(`deletePosition: Deleting position ${id} at ${docPath}`);
    try {
      await deleteDoc(positionRef);
      console.log(`deletePosition: Success.`);
    } catch (error) {
      console.error(`deletePosition: Error deleting ${id} at ${docPath}:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    // Unsubscribe from the auth service subscription if it exists
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("PositionsService: Unsubscribed from AuthService.");
    }
    // If using manual listener with BehaviorSubject, tear it down:
    // this.teardownListener();
  }
}