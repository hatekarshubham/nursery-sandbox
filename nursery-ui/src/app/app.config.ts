import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import { getFirestore, provideFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => {
      const db = getFirestore();
      if (isDevMode()) {
        connectFirestoreEmulator(db, 'localhost', 8080);
      }
      return db;
    }),
    provideAuth(() => {
      const auth = getAuth();
      if (isDevMode()) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
  ],
};
