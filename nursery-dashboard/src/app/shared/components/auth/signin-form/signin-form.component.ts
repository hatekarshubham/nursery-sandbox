
import { Component, inject } from '@angular/core';
import { AppDialogService } from '../../../services/app-dialog.service';
import { emailAddress } from '../../../utils/form-validation';

import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-signin-form',

  imports: [
    LabelComponent,
    CheckboxComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
  ],

  templateUrl: './signin-form.component.html',

  styles: ``
})
export class SigninFormComponent {

  private readonly dialog = inject(AppDialogService);
  private authService = inject(AuthService);
  private router = inject(Router);

  showPassword = false;
  isChecked = false;

  email = '';
  password = '';

  // Tracks login processing and prevents duplicate submissions.
  isLoading = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSignIn() {

    // Prevent multiple simultaneous login requests.
    if (this.isLoading) {
      return;
    }

    const emailError = emailAddress(this.email, true);

    if (emailError || !this.password.trim()) {
      await this.dialog.alert(
        emailError || 'Please enter your password.'
      );
      return;
    }

    // Display spinner immediately after validation.
    this.isLoading = true;

    try {

      // Wait for Firebase Authentication and Firestore role validation.
      await this.authService.login(this.email, this.password);

      sessionStorage.removeItem('signedOut');

      // Keep loading until navigation finishes.
      const navigated = await this.router.navigate(
        ['/products'],
        { replaceUrl: true }
      );

      if (!navigated) {
        throw new Error('Unable to open the Products page.');
      }

    } catch (error: any) {

      await this.dialog.alert(
        'Login Error: ' + (error?.message || 'Something went wrong.')
      );

    } finally {

      // Reset spinner on error or if the login component remains mounted.
      this.isLoading = false;

    }
  }
}
