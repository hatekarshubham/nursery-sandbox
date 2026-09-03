# Gayatri Nursery — clone `main` and run (Mac and Windows)

This repo is already set up. **Do not** run `ng new` or `firebase init`. Those were one-time steps.

After this guide you should have:

- Angular UI at [http://localhost:4200](http://localhost:4200)
- Firebase Emulator UI at [http://localhost:4000](http://localhost:4000)

The Firebase project is **`nursery-sandbox-94f65`**. Ask an existing Editor to add you in Firebase Console → **Users and permissions** if you need to deploy.

GitHub: `https://github.com/hatekarshubham/nursery-sandbox`

---

## 1. Install tools (once per machine)

### Node.js LTS

Download LTS from [https://nodejs.org/](https://nodejs.org/). Restart the terminal.

```bash
node -v
npm -v
```

### JDK 21 (required for emulators)

This is **not** in `package.json`. `java -version` must show 21.

**Mac**

```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
java -version
```

If `java` is not found (Apple Silicon):

```bash
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
```

Add those two lines to `~/.zshrc`. Intel Macs may use `/usr/local/opt/openjdk@21`.

**Windows (PowerShell)**

```powershell
winget install Microsoft.OpenJDK.21
```

Reopen PowerShell, then `java -version`. Set `JAVA_HOME` to the JDK folder, **not** `bin`.

### Firebase CLI

```bash
npm install -g firebase-tools
firebase --version
```

Angular CLI is optional globally. This repo uses `npx ng` from `nursery-ui`.

---

## 2. Clone and install

**Mac / Windows**

```bash
git clone https://github.com/hatekarshubham/nursery-sandbox.git
cd nursery-sandbox
```

If you already have a GitHub invite, clone with your account. Then:

```bash
cd nursery-ui
npm install
```

`node_modules` is not in Git. Everyone runs `npm install` locally.

---

## 3. Log in to Firebase (same project as the repo)

From the **repo root** (the folder that contains `firebase.json` and `.firebaserc`):

```bash
cd ..
firebase login
firebase use
```

You should see **`nursery-sandbox-94f65`**. If not:

```bash
firebase use nursery-sandbox-94f65
```

Do **not** run `firebase init` again. Config is already in the repo:

- `.firebaserc` — project id
- `firebase.json` — Hosting + emulator ports (Auth `9099`, Firestore `8080`, UI `4000`)
- `firestore.rules` / `firestore.indexes.json`
- `nursery-ui/src/environments/environment.ts` — web `firebaseConfig`
- `nursery-ui/src/app/app.config.ts` — connects to emulators when `ng serve` is in dev mode

---

## 4. Run locally (two terminals)

You need **both** processes. `ng serve` alone talks to empty local emulators and login will fail.

**Terminal A — emulators** (repo root):

```bash
firebase emulators:start
```

Open [http://localhost:4000](http://localhost:4000).

**Terminal B — Angular** :

```bash
cd nursery-ui
npx ng serve
```

Open [http://localhost:4200](http://localhost:4200).

### First login

Emulator Auth starts **empty**. Console users are **not** copied.

1. Emulator UI → **Authentication** → **Add user** (email + password).
2. Sign in on the Angular login page with that same pair.

---

## 5. Deploy (optional, needs Editor access)

```bash
cd nursery-ui
npx ng build
cd ..
firebase deploy
```

Live Hosting uses **production** Auth/Firestore, not the emulator. Create users in Firebase Console → Authentication for the live `.web.app` URL.

---

## 6. Daily Git workflow

```bash
git pull origin main
# ... edit code ...
git add .
git status
git commit -m "Short description of the change"
git push origin main
```

### Do not commit

- `node_modules/`
- `dist/`, `.angular/`
- `firebase-debug.log`, `*.log`, `.firebase/`
- `.DS_Store`
- `.agents/` (local Cursor skills, if present)
- Service account JSON files

`git status` must not list `node_modules`. If it does, stop and fix `.gitignore`.

---

## Checklist (new teammate)

1. Node LTS and JDK 21 installed
2. Repo cloned; `cd nursery-ui && npm install`
3. `firebase login` and `firebase use` → `nursery-sandbox-94f65`
4. Added as GitHub collaborator and (for deploy) Firebase Editor
5. `firebase emulators:start` **and** `npx ng serve` both running
6. Test user created in Emulator UI Auth, then login at `:4200`
