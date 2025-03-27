import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, updateDoc, deleteDoc, doc, orderBy } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { collectionData } from 'rxfire/firestore';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { deleteUser } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';

export interface Employee {
  id: string;
  name: string;
  role: string;
  badgeCode?: string; // Add badgeCode field
  contractHours?: number// Add other relevant fields here
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);

  constructor() { }
  getAllUsers(): Observable<any[]> {
    const usersRef = collection(this.firestore, 'users');
    const allUsersQuery = query(usersRef, orderBy('name'));
    return collectionData(allUsersQuery, { idField: 'id' }) as Observable<any[]>;
  }
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
  updateEmployee(employee: Employee): Promise<void> {
    const userRef = doc(this.firestore, `users/${employee.id}`);
    return updateDoc(userRef, { ...employee });
  }

  deleteEmployee(employeeId: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${employeeId}`);
    return deleteDoc(userRef).then(() => {
      const user = this.auth.currentUser;
      if (user && user.uid === employeeId) {
        return deleteUser(user);
      }
      return Promise.resolve();
    });
  }
}
