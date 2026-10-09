# Gayatri Nursery

Inventory and billing dashboard for Gayatri Nursery. Staff sign in, then manage products, stock across warehouses, purchases, and sales.

The app is Angular. Data and sign-in are Firebase: Cloud Firestore, Authentication (email and password), and Hosting. The Firebase project is `nursery-sandbox-94f65`.

## Run it

Two terminals. Full setup, including a first-time machine, is in [docs/QUICKSTART.md](docs/QUICKSTART.md).

From the repo root, start the emulators:

```bash
firebase emulators:start --import=./nursery-dashboard/firebase-emulator-data --export-on-exit=./nursery-dashboard/firebase-emulator-data
```

In a second terminal, start the UI:

```bash
cd nursery-dashboard
npx ng serve
```

- App: http://localhost:4200
- Emulator UI: http://localhost:4000

`ng serve` in development talks to the local Auth and Firestore emulators. It does not use production data.

## What is in the repo

| Path | What it is |
|---|---|
| `nursery-dashboard/` | Angular app |
| `firebase.json` | Hosting, Firestore, and emulator ports |
| `.firebaserc` | Firebase project id |
| `firestore.rules` | Who can read and write data |
| `firestore.indexes.json` | Firestore indexes |
| `docs/QUICKSTART.md` | Install tools and run locally |
| `docs/DATA_MODEL_v1.1.md` | Current data model |

Stock is stored per warehouse in `warehouse_stock`, not as one number on the product. Each color of a plant is its own product.

## Screens

Login, products, categories, suppliers, warehouses, purchases, stock transfers, stock adjustments, and sales.

## Do not commit

`node_modules/`, `nursery-dashboard/dist/`, emulator exports, logs, and service-account JSON files. See `.gitignore`.
