import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit, // Added limit for badge code query
  getDoc,
  DocumentData, // Added DocumentData
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { collectionData } from '@angular/fire/firestore'; // Using @angular/fire/firestore version
import { Observable, from, of, Subscription } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
// Removed firebase/auth deleteUser import - handle deletion securely elsewhere
import { Auth } from '@angular/fire/auth';
import { AuthService, UserMetadata } from './auth.service'; // Import AuthService

// Interface representing user data within a business context
// Keep your existing Employee interface
export interface Employee {
  id: string; // Corresponds to Firebase Auth UID and document ID in the subcollection
  name: string;
  email?: string;
  role: string; // Role *within this business*
  badgeCode?: string;
  contractHours?: number;
  profilePicture?: string;
  // Add other business-specific fields
}


@Injectable({
  providedIn: 'root',
})
export class UsersService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  // Auth might not be needed here if not performing Auth operations directly
  // private auth: Auth = inject(Auth);
  private authService: AuthService = inject(AuthService); // Inject AuthService

  private userMetadataSubscription: Subscription | null = null;

  constructor() {
    console.log("UsersService Initialized (Multi-Tenant Adapted)");
    // No global listener needed here if observables fetch reactively
  }

  /** Utility to get the current business ID or return null */
  private getCurrentBusinessId(): string | null {
    return this.authService.getCurrentBusinessId();
  }

  /** Utility to get the tenant-specific path */
  private getEmployeesCollectionPath(): string | null {
    const businessId = this.getCurrentBusinessId();
    return businessId ? `business/${businessId}/employees` : null;
  }


  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * ADAPTED: Gets an Observable stream of ALL users listed as employees
   * within the currently logged-in user's business.
   * Returns an empty array if the user is not logged in or has no businessId.
   */
  getAllUsers(): Observable<Employee[]> {
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) {
          console.log("getAllUsers: No businessId, returning empty.");
          return of([]); // Return empty array if no business context
        }
        const collectionPath = this.getEmployeesCollectionPath()
        console.log(`getAllUsers: Listening to ${collectionPath}`);
        const usersQuery = query(
          collectionPath ? collection(this.firestore, collectionPath) : (() => { throw new Error("Invalid collection path"); })(),
          orderBy('name') // Order globally listed users by name
        );
        // Use collectionData for real-time updates
        return (collectionData(usersQuery, { idField: 'id' }) as Observable<Employee[]>).pipe(
          catchError(error => {
            console.error(`getAllUsers: Error fetching users from ${collectionPath}:`, error);
            return of([]); // Return empty on error
          })
        );
      }),
      catchError(error => {
        console.error("getAllUsers: Error in outer stream:", error);
        return of([]); // Return empty on error in auth stream
      })
    );
  }

  /**
   * ADAPTED: Gets an Observable stream of users listed as employees
   * within the currently logged-in user's business.
   * (Effectively the same as getAllUsers in this multi-tenant context).
   * Returns an empty array if the user is not logged in or has no businessId.
   */
  getEmployees(): Observable<Employee[]> {
    // Logic is identical to the adapted getAllUsers in this context
    return this.getAllUsers();
    // If you needed to filter by role *within* the business subcollection:
    // return this.authService.userMetadata$.pipe(
    //    switchMap(metadata => {
    //        if (!metadata?.businessId) return of([]);
    //        const collectionPath = `business/${metadata.businessId}/employees`;
    //        const employeesQuery = query(
    //             collection(this.firestore, collectionPath),
    //             where('role', '!=', 'admin_within_business'), // Example filter if needed
    //             orderBy('name')
    //         );
    //        return (collectionData(employeesQuery, { idField: 'id' }) as Observable<Employee[]>).pipe(
    //            catchError(error => { console.error(...); return of([]); })
    //        );
    //    }),
    //    catchError(error => { console.error(...); return of([]); })
    // );
  }

  /**
   * ADAPTED: Gets an employee from the current business using their badge code.
   * Returns null if not found or if not logged into a business.
   */
  getUserByBadgeCode(badgeCode: string): Observable<Employee | null> {
    if (!badgeCode) return of(null);

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of(null); // No business context

        const collectionPath = `business/${metadata.businessId}/employees`;
        const badgeQuery = query(
          collection(this.firestore, collectionPath),
          where('badgeCode', '==', badgeCode),
          limit(1)
        );
        console.log(`getUserByBadgeCode: Querying for badge code ${badgeCode} in ${metadata.businessId}`);

        // Use getDocs for a one-time fetch based on the badge code
        return from(getDocs(badgeQuery)).pipe(
          map(snapshot => {
            if (snapshot.empty) {
              console.log(`getUserByBadgeCode: Not found.`);
              return null;
            } else {
              const doc = snapshot.docs[0];
              console.log(`getUserByBadgeCode: Found user ${doc.id}`);
              return { id: doc.id, ...doc.data() } as Employee;
            }
          }),
          catchError(err => {
            console.error(`getUserByBadgeCode: Error querying:`, err);
            return of(null);
          })
        );
      }),
      catchError(err => {
        console.error(`getUserByBadgeCode: Error in outer stream:`, err);
        return of(null);
      })
    );
  }

  /**
   * ADAPTED: Updates employee data within the current business's subcollection.
   * Throws error if not logged into a business or if update fails.
   */
  async updateEmployee(employeeData: Partial<Employee> & { id: string }): Promise<void> {
    const businessId = this.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("Cannot update employee: User not associated with a business.");
    }
    if (!employeeData?.id) {
      throw new Error("Cannot update employee: Employee ID is missing.");
    }

    const employeeId = employeeData.id;
    const docPath = `business/${businessId}/employees/${employeeId}`;
    const userRef = doc(this.firestore, docPath);

    const { id, ...dataToUpdate } = employeeData; // Exclude ID from payload

    console.log(`updateEmployee: Updating employee ${employeeId} in business ${businessId}`);
    try {
      await updateDoc(userRef, dataToUpdate);
      console.log(`updateEmployee: Success.`);
    } catch (error) {
      console.error(`updateEmployee: Error:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Deletes an employee record from the current business's subcollection.
   * Does NOT delete the Firebase Auth user.
   * Throws error if not logged into a business or if delete fails.
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    const businessId = this.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("Cannot delete employee: User not associated with a business.");
    }
    if (!employeeId) {
      throw new Error("Cannot delete employee: Employee ID is missing.");
    }

    const docPath = `business/${businessId}/employees/${employeeId}`;
    const userRef = doc(this.firestore, docPath);

    console.warn(`deleteEmployee: Deleting employee record ${employeeId} from business ${businessId}. This does NOT delete the Auth user.`);
    try {
      await deleteDoc(userRef);
      console.log(`deleteEmployee: Success.`);
      // ** REMOVED AUTH DELETION **
      // This needs a secure backend process (Cloud Function recommended)
    } catch (error) {
      console.error(`deleteEmployee: Error:`, error);
      throw error; // Re-throw Firestore error
    }
  }

  /**
   * ADAPTED: Gets the role of a user *within their assigned business* by querying
   * the business's employees subcollection.
   * Returns null if user not found in the business or not logged into a business.
   */
  getUserrole(userId: string): Observable<string | null> {
    if (!userId) return of(null);

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of(null); // No business context

        const docPath = `business/${metadata.businessId}/employees/${userId}`;
        const docRef = doc(this.firestore, docPath);
        console.log(`getUserrole: Fetching role for user ${userId} from ${docPath}`);

        // Use getDoc for a one-time fetch of the role
        return from(getDoc(docRef)).pipe(
          map(docSnap => {
            if (docSnap.exists()) {
              const role = docSnap.data()?.['role'] as string | undefined;
              console.log(`getUserrole: Found role: ${role}`);
              return role || null;
            } else {
              console.warn(`getUserrole: No employee record found for user ${userId} in business ${metadata.businessId}`);
              return null;
            }
          }),
          catchError(err => {
            console.error(`getUserrole: Error fetching doc ${docPath}:`, err);
            return of(null); // Return null on error
          })
        );
      }),
      catchError(err => {
        console.error(`getUserrole: Error in outer stream:`, err);
        return of(null);
      })
    );
  }

  /**
   * ADAPTED: Gets the full employee data for a specific user ID
   * within the current business's subcollection.
   * Returns null if not found or not logged into a business.
   */
  async getuserbyid(uid: string): Promise<Employee | null> { // Return type changed to Employee | null
    if (!uid) return null;
    const businessId = this.getCurrentBusinessId();
    if (!businessId) {
      console.warn("getuserbyid: Cannot fetch, user not associated with a business.");
      return null;
    }

    const docPath = `business/${businessId}/employees/${uid}`;
    const userRef = doc(this.firestore, docPath);
    console.log(`getuserbyid: Fetching user ${uid} from ${docPath}`);

    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Employee;
      } else {
        console.warn(`getuserbyid: No employee record found for user ${uid} in business ${businessId}`);
        return null;
      }
    } catch (error) {
      console.error(`getuserbyid: Error fetching doc ${docPath}:`, error);
      return null;
    }
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    // Unsubscribe from the auth service subscription if it exists
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("UsersService: Unsubscribed from AuthService.");
    }
    // Note: No global Firestore listeners were kept in this version,
    // so no specific listener teardown is needed here. Observables
    // created with collectionData/from(getDoc) typically clean up
    // themselves when the subscriber unsubscribes (e.g., via async pipe or ngOnDestroy).
  }
}