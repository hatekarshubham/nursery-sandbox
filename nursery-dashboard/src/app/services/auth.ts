import { inject, Injectable } from '@angular/core';
import { Auth, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  terminate,
  clearIndexedDbPersistence
} from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { AppDialogService } from '../shared/services/app-dialog.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
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

    let profile: any;

    try {

      profile = await this.loadProfile(credential.user, true);

      if (
        profile?.role !== 'Admin' &&
        profile?.role !== 'SalesPerson'
      ) {

        throw new Error(
          'Your account has no role assigned. Please contact the administrator.'
        );

      }

    } catch (error) {

      // Never leave a half signed-in account behind.
      await this.signOutQuietly();

      throw error;

    }

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

    // Firestore keeps a copy of the data in the browser so refreshes
    // are cheap. On a shared computer the next person must not be
    // able to see it, so wipe it on logout and reload clean.
    try {
      await terminate(this.firestore);
      await clearIndexedDbPersistence(this.firestore);
    } catch {
      // Another open tab may still be using the cache; the data is
      // then cleared the next time every tab is closed.
    }

    window.location.replace('/login');
  }

  // Signs out without navigating (used when an account is
  // rejected, so the login page does not bounce back).
  async signOutQuietly() {
    this.currentProfile = null;
    this.profile$.next(null);
    await signOut(this.auth);
  }

  getProfile() {
    return this.currentProfile;
  }

  // Resolves with the signed-in user's profile (loading it if
  // needed), or null when nobody is signed in or the profile
  // document does not exist.
  async ensureProfile() {

    if (this.currentProfile) {
      return this.currentProfile;
    }

    await this.auth.authStateReady();

    const user = this.auth.currentUser;

    if (!user) {
      return null;
    }

    return this.loadProfile(user);

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