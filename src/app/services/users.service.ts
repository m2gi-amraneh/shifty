import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { collectionData } from 'rxfire/firestore';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Employee {
  id: string;
  name: string;
  role: string;
  badgeCode?: string; // Add badgeCode field
  // Add other relevant fields here
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private firestore: Firestore = inject(Firestore);

  constructor() { }

  getEmployees(): Observable<Employee[]> {
    const usersRef = collection(this.firestore, 'users');
    const employeesQuery = query(usersRef, where('role', '!=', 'admin'));
    return collectionData(employeesQuery, { idField: 'id' }) as Observable<
      Employee[]
    >;
  }

  getUserByBadgeCode(badgeCode: string): Observable<Employee | null> {
    const usersRef = collection(this.firestore, 'users');
    const badgeQuery = query(usersRef, where('badgeCode', '==', badgeCode));

    return from(getDocs(badgeQuery)).pipe(
      map(snapshot => {
        if (snapshot.empty) {
          return null;
        } else {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() } as Employee;
        }
      })
    );
  }
}
