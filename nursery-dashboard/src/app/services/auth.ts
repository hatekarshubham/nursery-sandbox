import { inject, Injectable } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore,doc,getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { AppDialogService } from '../shared/services/app-dialog.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private dialog = inject(AppDialogService);
  private currentProfile: any = null;

  readonly profile$ = new BehaviorSubject<any>(null);

  // Observable to track if user is logged in
  user$ = authState(this.auth);

  constructor() {
    this.user$.subscribe(user => {
      if (!user) {
        this.currentProfile = null;
        this.profile$.next(null);
        return;
      }

      void this.loadProfile(user);
    });
  }

  async login(email: string, pass: string) {

    // 1. Login using Firebase Authentication
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      pass
    );

    const profile = await this.loadProfile(credential.user, true);

    return {
      user: credential.user,
      profile
    };

    // return signInWithEmailAndPassword(this.auth, email, pass);
  }

  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async logout() {
    this.currentProfile = null;
    this.profile$.next(null);
    sessionStorage.setItem('signedOut', '1');
    this.dialog.dismiss();
    await signOut(this.auth);
    this.dialog.dismiss();
    await this.router.navigate(['/login'], { replaceUrl: true });
    this.dialog.dismiss();
  }

  getProfile() {
    return this.currentProfile;
  }

  getCreator(): { id: string; name: string } {

    const profile = this.currentProfile;

    const user = this.auth.currentUser;

    return {
      id: profile?.uid || user?.uid || '',
      name: (
        profile?.name ||
        profile?.email ||
        user?.email ||
        ''
      ).trim()
    };

  }

  private async loadProfile(user: User, required = false) {
    const userDoc = await getDoc(
      doc(this.firestore, 'users', user.uid)
    );

    if (!userDoc.exists()) {
      if (required) {
        throw new Error('User profile not found in Firestore');
      }

      return null;
    }

    const profile = {
      ...userDoc.data(),
      uid: user.uid,
      email: user.email
    };

    this.currentProfile = profile;
    this.profile$.next(profile);

    return profile;
  }
}