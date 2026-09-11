import { Component, inject } from '@angular/core';

import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth';

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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSignIn() {
    if (!this.email || !this.password) {
      alert('Please enter your email and password');
      return;
    }

    try {
      await this.authService.login(this.email, this.password);
      console.log('Login successful');
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      alert('Login Error: ' + error.message);
    }
  }
}