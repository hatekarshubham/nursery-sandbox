import { inject, Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore,doc,getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private currentProfile: any = null;

  // Observable to track if user is logged in
  user$ = authState(this.auth);

  async login(email: string, pass: string) {

    // 1. Login using Firebase Authentication
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      pass
    );

    // 2. Get Firebase user's UID
    const uid = credential.user.uid;

   // 3. Get user's profile from Firestore
   const userDoc = await getDoc(
    doc(this.firestore, 'users', uid)
  );

  // 4. Make sure profile exists
  if (!userDoc.exists()) {
    throw new Error('User profile not found in Firestore');
  }

  // 5. Get profile data from Firestore
    //    and add email from Firebase Authentication
    const profile = {
      ...userDoc.data(),
      email: credential.user.email
    };

    // 6. Store profile in memory
    this.currentProfile = profile;

  // Print name and role
  // console.log('Logged-in user:', credential.user.email);
  // console.log('User UID:', uid);
  // console.log('User Name:', profile['name']);
  // console.log('User Role:', profile['role']);

  // 5. Return both Firebase user and Firestore profile
  return {
    user: credential.user,
    profile: userDoc.data()
  };

    // return signInWithEmailAndPassword(this.auth, email, pass);
  }

  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  getProfile() {
    return this.currentProfile;
  }
}