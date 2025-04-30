import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, from, map, of, switchMap, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class EmployeeGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.authService.getCurrentUser().pipe(
      take(1),
      switchMap((user) => {
        if (user && user.uid) {
          return from(this.authService.getCurrentRoleOB()).pipe(
            map((role) => {
              if (role != 'admin') {
                return true;
              } else {
                return this.router.createUrlTree(['/admin-dashboard']);
              }
            })
          );
        } else {
          return of(this.router.createUrlTree(['/login']));
        }
      })
    );
  }
}
