# Gayatri Nursery

Inventory and billing dashboard for Gayatri Nursery. Staff sign in, then manage products, stock across warehouses, purchases, and sales.

The app is Angular. Data and sign-in are Firebase: Cloud Firestore, Authentication (email and password), Cloud Storage (product photos), Cloud Functions, and Hosting. The Firebase project is `nursery-sandbox-94f65`.

## Run it

Two terminals. Full setup, including a first-time machine, is in [docs/QUICKSTART.md](docs/QUICKSTART.md).

From the repo root, start the emulators:

```bash
firebase emulators:start --import=./nursery-dashboard/firebase-emulator-data --export-on-exit=./nursery-dashboard/firebase-emulator-data
```

In a second terminal, start the UI:

```bash
cd nursery-dashboard
npm ci        # first time only
npm start
```

- App: http://localhost:4200
- Emulator UI: http://localhost:4000

`ng serve` in development talks to the local Auth, Firestore and Storage emulators. It does not use production data.

## Deploy to production

Follow [docs/PRODUCTION_DEPLOY.md](docs/PRODUCTION_DEPLOY.md). It covers turning on Storage, staff accounts, rules and indexes, the one-time backfill, the daily summary function, and the website.

## What is in the repo

| Path | What it is |
|---|---|
| `nursery-dashboard/` | Angular app |
| `functions/` | Cloud Function that fills daily sales summaries |
| `scripts/` | Backfill and rules tests |
| `firebase.json` | Hosting, Firestore, Storage, Functions, and emulator ports |
| `.firebaserc` | Firebase project id |
| `firestore.rules` | Who can read and write data |
| `firestore.indexes.json` | Firestore indexes |
| `storage.rules` | Who can view and change product photos |
| `docs/QUICKSTART.md` | Install tools and run locally |
| `docs/PRODUCTION_DEPLOY.md` | Production deploy steps |
| `docs/COST_AND_SCALE_PLAN.md` | Read costs and scaling work |
| `docs/DATA_MODEL_v1.1.md` | Current data model |

Stock is stored per warehouse in `inventory`. Each product also keeps `totalQuantity`, the sum across warehouses, so lists can sort by stock. Each color of a plant is its own product. A product photo is stored in Storage under `products/{productId}/`, and the product keeps only its links.

## Screens

Login, products, categories, suppliers, warehouses, purchases, stock transfers, stock adjustments, and sales.

## Do not commit

`node_modules/`, `nursery-dashboard/dist/`, emulator exports, logs, and service-account JSON files. See `.gitignore`.
