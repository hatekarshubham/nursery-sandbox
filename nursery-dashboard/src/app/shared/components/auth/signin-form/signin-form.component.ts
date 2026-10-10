import { Component, inject } from '@angular/core';

import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth';
import { AlertService } from '../../../../shared/services/alert.service';

@Component({
  selector: 'app-signin-form',

  imports: [
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
  ],

  templateUrl: './signin-form.component.html',

  styles: ``
})

export class SigninFormComponent {

  showPassword = false;

  isChecked = false;

  email = '';

  password = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private alertService = inject(AlertService);

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSignIn() {

    if (!this.email || !this.password) {

      this.alertService.warning(
        'Login Failed',
        'Please enter your email and password'
      );

      return;
    }

    try {

      await this.authService.login(this.email, this.password);

      console.log('Login successful');

      this.router.navigate(['/products']);

    } catch (error: any) {

      this.alertService.error(
        'Login Failed',
        error?.message || 'Invalid username or password.'
      );

    }
  }
}