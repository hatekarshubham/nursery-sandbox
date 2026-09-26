import { inject, Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  // Observable to track if user is logged in
  user$ = authState(this.auth);

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}