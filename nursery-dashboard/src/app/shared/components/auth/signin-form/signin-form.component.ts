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


  showPassword = false;

  isChecked = false;

  email = '';

  password = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSignIn() {
    const emailError = emailAddress(this.email, true);

    if (emailError || !this.password.trim()) {
      await this.dialog.alert(
        emailError || 'Please enter your password.'
      );
      return;
    }

    try {
      await this.authService.login(this.email, this.password);
      sessionStorage.removeItem('signedOut');
      await this.router.navigate(['/products'], { replaceUrl: true });
    } catch (error: any) {
      await this.dialog.alert('Login Error: ' + error.message);
    }
  }
}