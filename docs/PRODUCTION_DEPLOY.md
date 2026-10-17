# Production deploy

Steps to put the app on the real Firebase project, `nursery-sandbox-94f65`. Run every command from the repo root unless the step says otherwise.

Development (`npm start`) uses the local emulators. A production build (`npx ng build`) does not: it talks to the real Auth, Firestore and Storage set in `nursery-dashboard/src/environments/environment.ts`. No code change is needed between the two.

## Before the first deploy (once)

1. **Plan.** The project must be on the Blaze (pay-as-you-go) plan. Storage and Cloud Functions do not work on the free plan.
2. **Sign in to the CLI** and check the project:

   ```bash
   firebase login
   firebase use nursery-sandbox-94f65
   ```

3. **Turn on Storage.** Firebase Console → Storage → Get started. Keep the default bucket, `nursery-sandbox-94f65.firebasestorage.app`. Product photos are stored there.
4. **Turn on email and password sign-in.** Firebase Console → Authentication → Sign-in method → Email/Password.
5. **Create the staff accounts.** For each person:
   - Firebase Console → Authentication → Add user. Copy the UID.
   - Firestore → collection `users` → a document whose id is that UID, with `name` (string) and `role` (string, exactly `Admin` or `SalesPerson`).

   Emulator accounts are not copied to production.

## Deploy, in this order

### 1. Rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

This publishes `firestore.rules`, `firestore.indexes.json` and `storage.rules`.

Then open Firebase Console → Firestore → Indexes and wait until every index shows **Enabled**. This can take several minutes. Until then the Products page, Create Sale search and long-range Sales History return errors in production.

### 2. Fill in fields on existing data

The app sorts and searches products using fields that older documents do not have (`totalQuantity`, `stockState`, `nameLower`, `searchPrefixes`, `categoryIsActive`). Products without them do not appear on the Products page.

```bash
gcloud auth application-default login
cd scripts
npm install          # first time only
node backfill.mjs --project nursery-sandbox-94f65            # dry run, writes nothing
node backfill.mjs --project nursery-sandbox-94f65 --apply
cd ..
```

The same run also:

- sets `expiresAt` on old sales,
- rebuilds `dailySummaries` from every sale,
- moves any product photo that was saved inside the product document into Storage.

It is safe to run again.

### 3. Daily summary function

```bash
cd functions
npm install          # first time only
cd ..
firebase deploy --only functions
```

The app already writes the daily summary when it records a sale. This function only covers sales created some other way.

### 4. The website

```bash
cd nursery-dashboard
npx ng build
cd ..
firebase deploy --only hosting
```

## Optional: delete old sales automatically

After the backfill has set `expiresAt` on every sale, Firestore can delete sales older than three years:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=sales --enable-ttl --project nursery-sandbox-94f65
```

Do this only after step 2.

## Check after deploying

Sign in as an Admin:

- Products lists every product, lowest stock first.
- Add a product without a photo: the 🪴 placeholder shows.
- Edit that product and upload a photo: it shows in the Products table, the details popup and Create Sale. Replace it, then remove it.
- Complete one sale: the stock on the card goes down, and Sales History shows the sale.

Sign in as a SalesPerson:

- Products can be viewed, not changed. The photo cannot be changed.
- Purchases shows no Amount column.
- Sales History shows only that person's sales.

## Later deploys

- Code only: step 4.
- `firestore.rules`, `firestore.indexes.json` or `storage.rules` changed: step 1, then step 4.
- `functions/` changed: step 3.
- A new stored field that old documents need: update `scripts/backfill.mjs`, then step 2.
