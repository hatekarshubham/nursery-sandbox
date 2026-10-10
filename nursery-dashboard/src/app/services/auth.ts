import { inject, Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  authState
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  private currentProfile: any = null;

  // Profile ko reactive rakhenge
  private profileSubject = new BehaviorSubject<any>(null);

  // Components isko subscribe kar sakte hain
  profile$ = this.profileSubject.asObservable();

  // Firebase authentication state
  user$ = authState(this.auth);


  constructor() {

    // Browser refresh ke baad Firebase user restore karega
    this.user$.subscribe(async (user) => {

      if (!user) {
        this.currentProfile = null;
        this.profileSubject.next(null);
        return;
      }

      try {

        const userDoc = await getDoc(
          doc(this.firestore, 'users', user.uid)
        );

        if (userDoc.exists()) {

          this.currentProfile = {
            ...userDoc.data(),
            email: user.email
          };

          // Component ko new profile batao
          this.profileSubject.next(this.currentProfile);

          console.log(
            'Profile restored:',
            this.currentProfile
          );

        } else {

          console.warn(
            'User profile not found in Firestore'
          );

        }

      } catch (error) {

        console.error(
          'Error loading profile:',
          error
        );

      }
    });
  }


  async login(email: string, pass: string) {

    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      pass
    );

    const uid = credential.user.uid;

    const userDoc = await getDoc(
      doc(this.firestore, 'users', uid)
    );

    if (!userDoc.exists()) {
      throw new Error(
        'User profile not found in Firestore'
      );
    }

    const profile = {
      ...userDoc.data(),
      email: credential.user.email
    };

    this.currentProfile = profile;

    // Profile ko components tak bhejo
    this.profileSubject.next(profile);

    console.log(
      'Logged-in profile:',
      profile
    );

    return {
      user: credential.user,
      profile: profile
    };
  }


  async signUp(email: string, pass: string) {

    return createUserWithEmailAndPassword(
      this.auth,
      email,
      pass
    );
  }


  async logout() {

    await signOut(this.auth);

    this.currentProfile = null;
    this.profileSubject.next(null);

    this.router.navigate(['/login'],{replaceUrl:true});
  }


  getProfile() {

    return this.currentProfile;
  }
}