import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DropdownComponent } from '../../ui/dropdown/dropdown.component';

import { CommonModule } from '@angular/common';

import { RouterModule } from '@angular/router';

import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';

import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  styles: [`
    @keyframes user-avatar-breathe {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-1.5px) scale(1.06); }
    }

    .user-avatar-icon {
      animation: user-avatar-breathe 2.4s ease-in-out infinite;
    }
  `],
  imports: [
    CommonModule,
    RouterModule,
    DropdownComponent,
    DropdownItemTwoComponent
  ]
})
export class UserDropdownComponent implements OnInit {

  isOpen = false;

  profile: any = null;

  private destroyRef = inject(DestroyRef);

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.profile = this.authService.getProfile();

    this.authService.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(profile => {
        this.profile = profile;
      });
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