import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth';


export type UserRole = 'Admin' | 'SalesPerson';


// =========================================================
// ROLES
// =========================================================
//
// The role comes from the user's document at users/{uid}
// (field `role`). The same field is used by firestore.rules,
// so what the screens hide is also blocked on the server.
//
//   Admin        full access
//   SalesPerson  view everything, create sales, view own sales
//
// The profile is loaded before any dashboard screen opens
// (see authGuard), so these getters are safe to use in
// templates.
//
// =========================================================

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private authService = inject(AuthService);


  get role(): UserRole | null {

    const role = this.authService.getProfile()?.role;

    return role === 'Admin' || role === 'SalesPerson'
      ? role
      : null;

  }


  get isAdmin(): boolean {

    return this.role === 'Admin';

  }


  get isSalesPerson(): boolean {

    return this.role === 'SalesPerson';

  }


  // Add, edit, delete, activate/deactivate, complete and
  // cancel are admin-only.
  get canModify(): boolean {

    return this.isAdmin;

  }


  get userId(): string {

    return this.authService.getCreator().id;

  }

}
