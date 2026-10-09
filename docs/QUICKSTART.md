# Quick start

Clone this repo and run it. Do not run `ng new` or `firebase init`. Those steps are already done.

You need both processes below. The UI alone has nothing to sign in to, because development mode uses the local emulators.

After this you should have:

- App at http://localhost:4200
- Firebase Emulator UI at http://localhost:4000

Firebase project: `nursery-sandbox-94f65`.

## 1. Install tools once

### Node.js LTS

Install the current LTS from https://nodejs.org/, then reopen the terminal.

```bash
node -v
npm -v
```

### JDK 21

The Firestore emulator needs Java 21. `java -version` must show 21. This is not an npm package.

**Mac**

```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
java -version
```

If `java` is not found on Apple Silicon:

```bash
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
```

Add those two lines to `~/.zshrc`. Intel Macs may use `/usr/local/opt/openjdk@21`.

**Windows (PowerShell)**

```powershell
winget install Microsoft.OpenJDK.21
```

Reopen PowerShell and run `java -version`. Set `JAVA_HOME` to the JDK folder, not to `bin`.

### Firebase CLI

```bash
npm install -g firebase-tools
firebase --version
```

A global Angular CLI is optional. This repo uses `npx ng` inside `nursery-dashboard`.

## 2. Clone and install

```bash
git clone https://github.com/hatekarshubham/nursery-sandbox.git
cd nursery-sandbox
cd nursery-dashboard
npm install
```

`node_modules` is not in Git. Each machine runs `npm install`.

## 3. Select the Firebase project

From the repo root (the folder that contains `firebase.json`):

```bash
cd ..
firebase login
firebase use
```

You should see `nursery-sandbox-94f65`. If not:

```bash
firebase use nursery-sandbox-94f65
```

Config already in the repo:

- `.firebaserc` — project id
- `firebase.json` — Hosting and emulator ports (Auth `9099`, Firestore `8080`, Emulator UI `4000`)
- `firestore.rules` and `firestore.indexes.json`
- `nursery-dashboard/src/app/app.config.ts` — connects to the emulators when `ng serve` is in development mode

## 4. Run locally

**Terminal A — emulators** (repo root):

```bash
firebase emulators:start --import=./nursery-dashboard/firebase-emulator-data --export-on-exit=./nursery-dashboard/firebase-emulator-data
```

Open http://localhost:4000.

`--import` loads the saved Auth and Firestore data in `nursery-dashboard/firebase-emulator-data`. That folder is gitignored, so a fresh clone does not have it. If the folder is missing, start without the flags:

```bash
firebase emulators:start
```

Then create a user (next section). `--export-on-exit` writes the emulator data back to that folder when you stop the emulators, so the next start can import it.

**Terminal B — Angular**

```bash
cd nursery-dashboard
npx ng serve
```

Open http://localhost:4200. Sign in, then the app opens All Products.

## 5. First login

Sign-in checks Firebase Auth, then a Firestore profile at `users/{uid}`. Login fails with "User profile not found" when the Auth user exists and that document does not.

If you imported emulator data, use an account that is already in that export.

If the emulators started empty:

1. Emulator UI → **Authentication** → **Add user** (email and password). Copy the user's UID.
2. Emulator UI → **Firestore** → start a collection named `users`.
3. Use that UID as the document id. Set `name` (string) and `role` (string), for example `Admin`.
4. Sign in at http://localhost:4200 with the same email and password.

Production users are not copied into the emulator.

## 6. Deploy

This needs Editor access on the Firebase project.

```bash
cd nursery-dashboard
npx ng build
cd ..
firebase deploy
```

The live site uses production Auth and Firestore, not the emulator. Create those users in Firebase Console → Authentication, and add a matching `users/{uid}` document in production Firestore.

## 7. Daily Git

```bash
git pull origin main
git status
git add .
git commit -m "Short description of the change"
git push origin main
```

Do not commit:

- `node_modules/`
- `nursery-dashboard/dist/` and `nursery-dashboard/.angular/`
- `nursery-dashboard/firebase-emulator-data/`
- `firebase-debug.log`, `firestore-debug.log`, and other logs
- `.firebase/`
- `.DS_Store`
- Service account JSON files

## Checklist

1. Node LTS and JDK 21 are installed.
2. The repo is cloned and `cd nursery-dashboard && npm install` has been run.
3. `firebase login` and `firebase use` show `nursery-sandbox-94f65`.
4. Emulators and `npx ng serve` are both running.
5. The Auth user has a `users/{uid}` document, then login works at http://localhost:4200.
