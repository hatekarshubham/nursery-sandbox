import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { AuthPageLayoutComponent } from '../../../shared/layout/auth-page-layout/auth-page-layout.component';
import { SigninFormComponent } from '../../../shared/components/auth/signin-form/signin-form.component';

@Component({
  selector: 'app-sign-in',
  imports: [
    AuthPageLayoutComponent,
    SigninFormComponent,
  ],
  templateUrl: './sign-in.component.html',
  styles: ``
})
export class SignInComponent implements OnInit, OnDestroy {

  private auth = inject(Auth);
  private router = inject(Router);

  private onBack = () => {
    history.pushState(null, '', location.href);
  };

  ngOnInit() {
    authState(this.auth).pipe(take(1)).subscribe(user => {
      if (user) {
        this.router.navigate(['/products'], { replaceUrl: true });
        return;
      }

      if (sessionStorage.getItem('signedOut') === '1') {
        history.pushState(null, '', location.href);
        window.addEventListener('popstate', this.onBack);
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('popstate', this.onBack);
  }

}
