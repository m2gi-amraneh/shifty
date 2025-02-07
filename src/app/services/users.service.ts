import { Injectable } from '@angular/core';
import { Firestore, collection, query, where } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { collectionData } from 'rxfire/firestore';
import { Observable } from 'rxjs';

export interface Employee {
  id: string;
  name: string;
  role: string;
  // Add other relevant fields here
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private firestore: Firestore = inject(Firestore);

  constructor() {}

  getEmployees(): Observable<Employee[]> {
    const usersRef = collection(this.firestore, 'users');
    const employeesQuery = query(usersRef, where('role', '!=', 'admin'));
    return collectionData(employeesQuery, { idField: 'id' }) as Observable<
      Employee[]
    >;
  }
}
