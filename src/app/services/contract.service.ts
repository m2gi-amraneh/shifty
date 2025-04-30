import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc, // Keep for potential future use
  doc,
  query,
  where,
  getDocs,
  collectionData,
  orderBy,
  Timestamp, // Import Timestamp for conversion
  serverTimestamp, // Useful for createdAt/updatedAt
  limit // Added for getContractByEmployeeId
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable, from, map, of, Subscription, switchMap, catchError, take } from 'rxjs';
import { AuthService } from './auth.service'; // Import AuthService

// Keep your existing Contract interface (Uses Date objects)
export interface Contract {
  id?: string;
  employeeId: string;
  employeeName: string;
  startDate: Date; // Uses Date object
  endDate?: Date; // Uses Date object
  contractType: 'full-time' | 'part-time' | 'temporary';
  contractHours: number;
  position: string;
  positionName?: string;
  salary: number;
  status: 'active' | 'expired' | 'terminated';
  createdAt: Date; // Uses Date object
  updatedAt: Date; // Uses Date object
  terminatedAt?: Date; // Uses Date object
  signed: boolean;
  signedAt?: Date; // Uses Date object
  contractUrl?: string;
}

// Helper type for data stored in Firestore (uses Timestamp)
type ContractFirestoreData = Omit<Contract, 'id' | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'terminatedAt' | 'signedAt'> & {
  startDate: Timestamp;
  endDate?: Timestamp | null; // Allow null for Firestore optional dates
  createdAt: Timestamp;
  updatedAt: Timestamp;
  terminatedAt?: Timestamp | null;
  signedAt?: Timestamp | null;
};


@Injectable({
  providedIn: 'root',
})
export class ContractService implements OnDestroy {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Inject AuthService

  private userMetadataSubscription: Subscription | null = null;

  constructor() {
    console.log("ContractService Initialized (Multi-Tenant Adapted, Date Objects)");
    // Subscribe to auth state primarily for cleanup purposes
    this.userMetadataSubscription = this.authService.userMetadata$.subscribe();
  }

  /** Utility to get the current business ID or throw an error */
  private getCurrentBusinessIdOrFail(): string {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("ContractService Error: Operation failed. User is not associated with a business.");
    }
    return businessId;
  }

  /** Utility to get the tenant-specific path */
  private getContractsCollectionPath(): string | null {
    const businessId = this.authService.getCurrentBusinessId();
    return businessId ? `business/${businessId}/contracts` : null;
  }

  /**
   * Helper: Converts Firestore Timestamps in fetched data to JS Date objects.
   */
  private convertTimestampsToDate(data: any): Contract {
    if (!data) return data;
    const result = { ...data };
    const dateFields: (keyof Contract)[] = [ // Specify keys of Contract type
      'startDate', 'endDate', 'createdAt',
      'updatedAt', 'terminatedAt', 'signedAt'
    ];

    dateFields.forEach(field => {
      const value = result[field];
      // Check if it's a Firestore Timestamp using the toDate method check
      if (value && typeof value.toDate === 'function') {
        result[field] = value.toDate(); // Convert to Date object
      } else if (value instanceof Date) {
        // Already a Date, do nothing
      } else if (value) {
        // Handle cases where it might be a string or number (e.g., from older data)
        // Try converting, but be cautious
        try {
          const potentialDate = new Date(value);
          // Basic validation: check if the converted date is valid
          if (!isNaN(potentialDate.getTime())) {
            result[field] = potentialDate;
          } else {
            console.warn(`Field ${field} has non-Timestamp/Date value: ${value}. Could not convert.`);
            result[field] = undefined; // Or null, or keep original invalid value
          }
        } catch (e) {
          console.warn(`Error converting field ${field} value: ${value} to Date.`);
          result[field] = undefined;
        }
      } else {
        // Ensure optional fields that are null/undefined remain so
        result[field] = undefined;
      }
    });
    return result as Contract;
  }

  /**
  * Helper: Converts JS Date objects in input data to Firestore Timestamps
  * for saving/updating. Handles undefined optional fields.
  */
  private convertDatesToTimestamp(data: Partial<Contract>): Partial<ContractFirestoreData> {
    const result: Partial<ContractFirestoreData> = { ...data } as any;
    const dateFields: (keyof Contract)[] = [
      'startDate', 'endDate', 'createdAt',
      'updatedAt', 'terminatedAt', 'signedAt'
    ];

    dateFields.forEach(field => {
      const value = data[field];
      if (value instanceof Date) {
        // Check if date is valid before converting
        if (!isNaN(value.getTime())) {
          (result as any)[field] = Timestamp.fromDate(value);
        } else {
          console.warn(`Invalid Date object passed for field ${field}. Omitting.`);
          (result as any)[field] = undefined; // Or null
        }
      } else if (value === undefined || value === null) {
        if (field in result) {
          (result as any)[field] = null; // Explicitly set optional dates to null for Firestore
        }
      } else if (typeof value === 'string') {
        // Optional: Try converting ISO strings if they might be passed
        try {
          const dateFromString = new Date(value);
          if (!isNaN(dateFromString.getTime())) {
            (result as any)[field] = Timestamp.fromDate(dateFromString);
          } else {
            console.warn(`Invalid date string "${value}" passed for field ${field}. Omitting.`);
            (result as any)[field] = undefined; // Or null
          }
        } catch (e) {
          console.warn(`Error converting string "${value}" to Timestamp for field ${field}. Omitting.`);
          (result as any)[field] = undefined; // Or null
        }
      }
      // Ignore if already a Timestamp or other type
    });

    // Ensure core required Date fields are converted Timestamps or throw
    if (!result.startDate || !(result.startDate instanceof Timestamp)) {
      throw new Error("startDate must be provided as a valid Date object or ISO string.");
    }
    if (!result.createdAt || !(result.createdAt instanceof Timestamp)) {
      // Set default if missing, but ideally should be provided or set via serverTimestamp
      console.warn("createdAt missing or invalid, setting to current time.");
      result.createdAt = Timestamp.now();
    }
    if (!result.updatedAt || !(result.updatedAt instanceof Timestamp)) {
      console.warn("updatedAt missing or invalid, setting to current time.");
      result.updatedAt = Timestamp.now();
    }


    return result;
  }


  // --- Adapted Methods (Keeping Original Names) ---

  /**
   * ADAPTED: Gets all contracts WITHIN the current business with real-time updates.
   * Converts Timestamps to Date objects.
   */
  getContracts(): Observable<Contract[]> {
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of([]);
        const collectionPath = `business/${metadata.businessId}/contracts`;
        console.log(`getContracts: Listening to ${collectionPath}`);
        const contractsQuery = query(
          collection(this.firestore, collectionPath),
          orderBy('createdAt', 'desc')
        );
        return (collectionData(contractsQuery, { idField: 'id' }) as Observable<any[]>).pipe(
          map(contracts => contracts.map(contract => this.convertTimestampsToDate(contract))), // Convert Timestamps
          catchError(error => {
            console.error(`getContracts: Error fetching from ${collectionPath}:`, error);
            return of([]);
          })
        );
      }),
      catchError(error => {
        console.error("getContracts: Error in outer auth stream:", error);
        return of([]);
      })
    );
  }

  /**
   * ADAPTED: Gets the first ACTIVE contract for an employee (one-time fetch)
   * WITHIN the current business. Converts Timestamps to Date objects.
   */
  getContractByEmployeeId(employeeId: string): Observable<Contract | null> {
    if (!employeeId) return of(null);

    return this.authService.userMetadata$.pipe(
      take(1),
      switchMap(async metadata => {
        if (!metadata?.businessId) return null;
        const collectionPath = `business/${metadata.businessId}/contracts`;
        console.log(`getContractByEmployeeId: Querying ${collectionPath} for employee ${employeeId}`);
        const q = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId),
          where('status', '==', 'active'),
          limit(1)
        );
        try {
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const contractDoc = snapshot.docs[0];
            // Convert Timestamps to Dates after fetching
            return this.convertTimestampsToDate({ id: contractDoc.id, ...contractDoc.data() });
          } else {
            return null;
          }
        } catch (error) {
          console.error(`getContractByEmployeeId: Error fetching from ${collectionPath}:`, error);
          return null;
        }
      }),
      catchError(error => {
        console.error("getContractByEmployeeId: Error in outer auth stream:", error);
        return of(null);
      })
    );
  }


  /**
   * ADAPTED: Gets the active contract for an employee ID (real-time updates)
   * WITHIN the current business. Converts Timestamps to Date objects.
   */
  getActiveContractByEmployeeId(employeeId: string): Observable<Contract | null> {
    if (!employeeId) return of(null);

    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of(null);
        const collectionPath = `business/${metadata.businessId}/contracts`;
        console.log(`getActiveContractByEmployeeId: Listening to ${collectionPath} for employee ${employeeId}`);
        const q = query(
          collection(this.firestore, collectionPath),
          where('employeeId', '==', employeeId),
          where('status', '==', 'active'),
          limit(1)
        );
        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(contracts => {
            if (contracts && contracts.length > 0) {
              // Convert Timestamps from the first contract
              return this.convertTimestampsToDate(contracts[0]);
            }
            return null;
          }),
          catchError(error => {
            console.error(`getActiveContractByEmployeeId: Error fetching from ${collectionPath}:`, error);
            return of(null);
          })
        );
      }),
      catchError(error => {
        console.error("getActiveContractByEmployeeId: Error in outer auth stream:", error);
        return of(null);
      })
    );
  }

  // Removed the specific ISO conversion helper as we now convert to Date objects
  // convertTimestampsToIso(data: any): any { ... }

  /**
   * ADAPTED: Creates a new contract WITHIN the current business's subcollection.
   * Converts Date objects in input to Timestamps before saving.
   */
  async createContract(contract: Partial<Contract>): Promise<string> { // Input uses Date objects
    const businessId = this.getCurrentBusinessIdOrFail();
    const collectionPath = `business/${businessId}/contracts`;
    const contractsRef = collection(this.firestore, collectionPath);

    // Prepare data for Firestore, converting Date objects and setting defaults
    const dataToSave = this.convertDatesToTimestamp({
      ...contract,
      createdAt: contract.createdAt || new Date(), // Use provided or set now
      updatedAt: contract.updatedAt || new Date(), // Use provided or set now
      status: contract.status || 'active',
      signed: contract.signed || false,
    });

    // Validate required fields after conversion
    if (!dataToSave.employeeId || !dataToSave.startDate || !dataToSave.contractType || !dataToSave.contractHours || !dataToSave.position || !dataToSave.salary) {
      throw new Error("Missing required contract fields (employeeId, startDate, contractType, contractHours, position, salary).");
    }

    console.log(`createContract: Adding contract to ${collectionPath}`);
    try {
      // Add the document with Timestamp dates
      const docRef = await addDoc(contractsRef, dataToSave);
      console.log(`createContract: Success. New ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error(`createContract: Error adding to ${collectionPath}:`, error);
      throw error;
    }
  }

  /**
   * ADAPTED: Updates an existing contract WITHIN the current business's subcollection.
   * Converts Date objects in updates to Timestamps.
   */
  async updateContract(id: string, contractUpdate: Partial<Contract>): Promise<void> { // Input uses Date objects
    const businessId = this.getCurrentBusinessIdOrFail();
    if (!id) throw new Error("updateContract: Contract ID is required.");

    const docPath = `business/${businessId}/contracts/${id}`;
    const contractRef = doc(this.firestore, docPath);

    // Prepare update data, converting Dates and adding updatedAt
    const { id: contractId, createdAt, ...updatePayloadInput } = contractUpdate; // Exclude id and createdAt
    const dataToUpdate = this.convertDatesToTimestamp({
      ...updatePayloadInput,
      updatedAt: new Date(), // Always update 'updatedAt' (will be converted)
    });

    console.log(`updateContract: Updating contract ${id} at ${docPath}`);
    try {
      // Update document with Timestamp dates
      await updateDoc(contractRef, dataToUpdate);
      console.log(`updateContract: Success.`);
    } catch (error) {
      console.error(`updateContract: Error updating ${id} at ${docPath}:`, error);
      throw error;
    }
  }

  /**
   * ADAPTED: Checks if an employee has an active contract (one-time fetch)
   * WITHIN the current business.
   */
  async checkActiveContract(employeeId: string): Promise<boolean> {
    if (!employeeId) return false;
    const businessId = this.authService.getCurrentBusinessId(); // Get ID, don't fail immediately
    if (!businessId) {
      console.warn("checkActiveContract: Cannot check, user not associated with a business.");
      return false;
    }

    const collectionPath = `business/${businessId}/contracts`;
    console.log(`checkActiveContract: Querying ${collectionPath} for active contract for employee ${employeeId}`);
    const q = query(
      collection(this.firestore, collectionPath),
      where('employeeId', '==', employeeId),
      where('status', '==', 'active'),
      limit(1)
    );

    try {
      const snapshot = await getDocs(q);
      const isActive = !snapshot.empty;
      console.log(`checkActiveContract: Active contract exists: ${isActive}`);
      return isActive;
    } catch (error) {
      console.error(`checkActiveContract: Error querying ${collectionPath}:`, error);
      return false;
    }
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe();
      console.log("ContractService: Unsubscribed from AuthService.");
    }
  }
}