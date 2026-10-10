import { Component, OnDestroy } from '@angular/core';

import { DropdownComponent } from '../../ui/dropdown/dropdown.component';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';

import { AuthService } from '../../../../services/auth';

import { Subscription } from 'rxjs';


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
export class UserDropdownComponent implements OnDestroy {

  isOpen = false;

  profile: any = null;

  private profileSubscription!: Subscription;


  constructor(private authService: AuthService) {

    // Profile changes ko listen karo
    this.profileSubscription =
      this.authService.profile$.subscribe((profile) => {

        console.log('Profile received:', profile);

        this.profile = profile;

      });
  }


  toggleDropdown() {

    this.isOpen = !this.isOpen;

    console.log('Dropdown:', this.isOpen);
  }


  closeDropdown() {

    this.isOpen = false;
  }


  async signOut() {

    await this.authService.logout();
  }


  ngOnDestroy() {

    this.profileSubscription?.unsubscribe();

  }
}