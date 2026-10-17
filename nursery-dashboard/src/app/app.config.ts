import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
  connectFirestoreEmulator
} from '@angular/fire/firestore';
import { connectStorageEmulator, getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => {
      const auth = getAuth();
      if (isDevMode()) {
        connectAuthEmulator(auth, 'http://localhost:9099');
      }
      return auth;
    }),
    provideFirestore(() => {

      // Keep a copy of the data in the browser (IndexedDB), shared by
      // every open tab. After a page refresh Firestore then only reads
      // the documents that changed, not the whole collection again.
      //
      // This affects what is DISPLAYED only. Stock changes still run in
      // transactions that read the live value from the server.
      //
      // If this browser cannot use IndexedDB (private mode, old browser),
      // fall back to the normal in-memory cache.
      let firestore;

      try {

        firestore = initializeFirestore(
          getApp(),
          {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager()
            })
          }
        );

      } catch {

        firestore = getFirestore();

      }

      if (isDevMode()) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    provideStorage(() => {
      const storage = getStorage();
      if (isDevMode()) {
        connectStorageEmulator(storage, '127.0.0.1', 9199);
      }
      return storage;
    })
  ]
};
