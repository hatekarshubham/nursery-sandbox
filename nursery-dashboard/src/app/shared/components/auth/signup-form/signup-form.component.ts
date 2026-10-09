
import { Component, inject } from '@angular/core';
import { AppDialogService } from '../../../services/app-dialog.service';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth';
import { emailAddress, requiredText } from '../../../utils/form-validation';


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

  private readonly dialog = inject(AppDialogService);


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
    const error =
      requiredText(this.fname, 'first name', 40) ||
      requiredText(this.lname, 'last name', 40) ||
      emailAddress(this.email, true) ||
      (!this.password.trim()
        ? 'Please enter your password.'
        : '');

    if (error) {
      await this.dialog.alert(error);
      return;
    }

    if (!this.isChecked) {
      await this.dialog.alert('Please agree to the Terms and Conditions');
      return;
    }

    try {
      await this.authService.signUp(this.email, this.password);
      console.log('Sign up successful');
      // Automatically login after signup
      await this.authService.login(this.email, this.password);
      this.router.navigate(['/products']);
    } catch (error: any) {
      await this.dialog.alert('Sign Up Error: ' + error.message);
    }
  }
}
