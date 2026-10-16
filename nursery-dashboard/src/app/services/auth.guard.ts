import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

import { AuthService } from './auth';
import { RoleService } from './role.service';


// Signed in AND has a profile with a valid role.
//
// The profile is loaded here, before the screen opens, so
// every screen can read the role synchronously.
export const authGuard: CanActivateFn = async () => {

  const auth = inject(Auth);

  const authService = inject(AuthService);

  const router = inject(Router);

  await auth.authStateReady();

  if (!auth.currentUser) {

    return router.createUrlTree(['/login']);

  }

  const profile = await authService.ensureProfile();

  const role = profile?.role;

  if (role === 'Admin' || role === 'SalesPerson') {

    return true;

  }

  // Signed in but not allowed in: sign out so the login page
  // does not send the user straight back here.
  await authService.signOutQuietly();

  return router.createUrlTree(['/login']);

};


// Screens that add or change data. Sales people are sent to
// the products list instead.
export const adminGuard: CanActivateFn = () => {

  const roles = inject(RoleService);

  const router = inject(Router);

  return roles.isAdmin
    ? true
    : router.createUrlTree(['/products']);

};
