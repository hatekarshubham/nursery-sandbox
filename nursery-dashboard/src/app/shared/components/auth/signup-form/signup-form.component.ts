
import { Component, inject } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth';


@Component({
  selector: 'app-signup-form',
  imports: [
    LabelComponent,
    CheckboxComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
],
  templateUrl: './signup-form.component.html',
  styles: ``
})
export class SignupFormComponent {

  showPassword = false;
  isChecked = false;

  fname = '';
  lname = '';
  email = '';
  password = '';

  private authService = inject(AuthService);
  private router = inject(Router);

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSignUp() {
    if (!this.fname || !this.lname || !this.email || !this.password) {
      alert('Please fill in all fields');
      return;
    }

    if (!this.isChecked) {
      alert('Please agree to the Terms and Conditions');
      return;
    }

    try {
      await this.authService.signUp(this.email, this.password);
      console.log('Sign up successful');
      // Automatically login after signup
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      alert('Sign Up Error: ' + error.message);
    }
  }
}
