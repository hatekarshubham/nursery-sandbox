import { Component } from '@angular/core';

import { DropdownComponent } from '../../ui/dropdown/dropdown.component';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';

import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports: [
    CommonModule,
    RouterModule,
    DropdownComponent,
    DropdownItemTwoComponent
  ]
})
export class UserDropdownComponent {

  isOpen = false;

  profile: any = null;

  constructor(private authService: AuthService) {
    this.profile = this.authService.getProfile();

    console.log('Dashboard Profile:', this.profile);
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  async signOut() {
    await this.authService.logout();
  }
}