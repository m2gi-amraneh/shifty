import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc, query, where, getDocs, collectionData } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Contract {
  id?: string;
  employeeId: string;
  employeeName: string;
  startDate: Date;
  endDate?: Date;
  contractType: 'full-time' | 'part-time' | 'temporary';
  contractHours: number;
  position: string;
  positionName?: string;
  salary: number;
  status: 'active' | 'expired' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
  terminatedAt?: Date;
  signed: boolean;
  signedAt?: Date;
  contractUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContractService {
  private firestore: Firestore = inject(Firestore);

  // Get all contracts with real-time updates
  getContracts(): Observable<Contract[]> {
    const contractsRef = collection(this.firestore, 'contracts');
    return collectionData(query(contractsRef), { idField: 'id' }).pipe(
      map(contracts => contracts.map(contract => this.convertTimestampsToIso(contract)) as Contract[])
    );
  }

  // Get contract by employee ID
  getContractByEmployeeId(employeeId: string): Observable<Contract | null> {
    const contractsRef = collection(this.firestore, 'contracts');
    const q = query(contractsRef,
      where('employeeId', '==', employeeId),
      where('status', '==', 'active')
    );

    return new Observable(observer => {
      getDocs(q).then(snapshot => {
        const contractDoc = snapshot.docs[0];
        if (contractDoc) {
          const contractData = contractDoc.data();
          // Convert Firestore Timestamps to ISO strings
          const convertedData = this.convertTimestampsToIso(contractData);
          observer.next({ id: contractDoc.id, ...convertedData } as Contract);
        } else {
          observer.next(null);
        }
        observer.complete();
      }).catch(error => observer.error(error));
    });
  }

  // Get active contract by employee ID (real-time updates)
  getActiveContractByEmployeeId(employeeId: string): Observable<Contract | null> {
    const contractsRef = collection(this.firestore, 'contracts');
    const q = query(
      contractsRef,
      where('employeeId', '==', employeeId),
      where('status', '==', 'active')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map(contracts => {
        if (contracts && contracts.length > 0) {
          return this.convertTimestampsToIso(contracts[0]) as Contract;
        }
        return null;
      })
    );
  }

  // Helper method to convert Timestamps to ISO strings
  convertTimestampsToIso(data: any): any {
    const result = { ...data };

    const timestampFields = [
      'startDate', 'endDate', 'createdAt',
      'updatedAt', 'terminatedAt', 'signedAt'
    ];

    timestampFields.forEach(field => {
      if (result[field] && typeof result[field].toDate === 'function') {
        result[field] = result[field].toDate().toISOString();
      }
    });

    return result;
  }

  // Create a new contract
  async createContract(contract: any): Promise<string> {
    const contractsRef = collection(this.firestore, 'contracts');
    // Ensure dates are in a proper format for Firestore (e.g., Date objects or ISO strings)
    const docRef = await addDoc(contractsRef, contract);
    return docRef.id;
  }

  // Update an existing contract
  async updateContract(id: string, contract: any): Promise<void> {
    const contractRef = doc(this.firestore, 'contracts', id);
    await updateDoc(contractRef, contract);
  }

  // Check if employee has active contract
  async checkActiveContract(employeeId: string): Promise<boolean> {
    const contractsRef = collection(this.firestore, 'contracts');
    const q = query(
      contractsRef,
      where('employeeId', '==', employeeId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }
}
