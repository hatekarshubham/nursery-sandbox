# Quick start

Clone this repo and run it. Do not run `ng new` or `firebase init`. Those steps are already done.

You need both processes below. The UI alone has nothing to sign in to, because development mode uses the local emulators.

After this you should have:

- App at http://localhost:4200
- Firebase Emulator UI at http://localhost:4000

Firebase project: `nursery-sandbox-94f65`.

## Avoiding version problems

Most setup errors come from mismatched versions. Follow these rules and they mostly disappear:

- Use Node **20.19+, 22.12+, or 24+**. Angular 21 refuses to run on older versions. `.nvmrc` at the repo root pins Node 24 (`nvm use` picks it up).
- Install with **`npm ci`**, not `npm install`. `npm ci` installs exactly what `package-lock.json` says, so every machine gets the same versions and npm does no dependency resolving. That is what causes `ERESOLVE` errors.
- **Never delete `package-lock.json`** to fix an error, and do not use `--force` or `--legacy-peer-deps`. The lockfile is committed and covers Mac, Windows and Linux.
- Run Angular through the project (`npm start` or `npx ng ...`), not a global `ng`.
- Run `npm install <package>` only when you are adding or upgrading a dependency. Then commit the changed `package-lock.json`.

## 1. Install tools once

### Node.js

Install the current LTS from https://nodejs.org/ (or use `nvm install 24`), then reopen the terminal.

```bash
node -v    # v20.19+, v22.12+, or v24+
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

Pick one.

**A. No install (no permission errors).** Prefix every `firebase` command in this guide with `npx firebase-tools`, for example:

```bash
npx firebase-tools --version
```

**B. Global install.** If `npm install -g firebase-tools` fails with `EACCES`, point npm at a folder you own first. Do not use `sudo`.

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm install -g firebase-tools
firebase --version
```

A global Angular CLI is not needed. This repo uses the one in `nursery-dashboard/node_modules`.

## 2. Clone and install

```bash
git clone https://github.com/hatekarshubham/nursery-sandbox.git
cd nursery-sandbox
ls
```

`git clone` creates a folder named after the repo, `nursery-sandbox`, inside the folder where you ran the command. It is not created anywhere else. If you cannot find it, run `pwd` and `ls` to see where you are. If you cloned with a different name (`git clone <url> my-folder`), use that name in the `cd`.

`ls` should show `firebase.json`, `docs` and `nursery-dashboard`. That folder is the repo root. Every "repo root" step below runs from there.

Then install the app's packages:

```bash
cd nursery-dashboard
npm ci
```

`node_modules` is not in Git. Each machine runs `npm ci`.

Only the branch you want is checked out. A fresh clone is on `main`. To work on a feature branch that is on GitHub:

```bash
git checkout feature/login
```

The `npm warn install-scripts ...` lines at the end are a notice, not an error. Ignore them unless a later step says a binary (for example esbuild) is missing. Then run `npm install-scripts approve esbuild` and `npm ci` again.

## 3. Select the Firebase project

From the repo root (the `nursery-sandbox` folder, which contains `firebase.json`):

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
- `firebase.json` — Hosting and emulator ports (Auth `9099`, Firestore `8080`, Storage `9199`, Functions `5001`, Hosting `5000`, Emulator UI `4000`)
- `firestore.rules`, `firestore.indexes.json` and `storage.rules`
- `nursery-dashboard/src/app/app.config.ts` — connects to the Auth, Firestore and Storage emulators when `ng serve` is in development mode

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
npm start
```

`npm start` runs `ng serve` from the project. Open http://localhost:4200. Sign in, then the app opens All Products.

## 5. First login

Sign-in checks Firebase Auth, then a Firestore profile at `users/{uid}`. Login fails with "User profile not found" when the Auth user exists and that document does not.

If you imported emulator data, use an account that is already in that export.

If the emulators started empty:

1. Emulator UI → **Authentication** → **Add user** (email and password). Copy the user's UID.
2. Emulator UI → **Firestore** → start a collection named `users`.
3. Use that UID as the document id. Set `name` (string) and `role` (string), for example `Admin`.
4. Sign in at http://localhost:4200 with the same email and password.

Production users are not copied into the emulator.

### Roles

The `role` field must be exactly `Admin` or `SalesPerson`. Any other value, or a missing profile, is refused at login and by the database rules.

| | Admin | SalesPerson |
|---|---|---|
| Products, categories, suppliers, warehouses, purchases, stock transfers, stock adjustments | View, add, edit, delete | View only |
| Print Barcodes | Yes | Yes |
| Create Sale | Yes | Yes |
| Sales History | All sales | Own sales only |
| `users` profiles | Read and change all | Read own, cannot change |

The rules live in `firestore.rules` (they read the role from `users/{uid}`). To test them: `firebase emulators:exec --only firestore --project rules-test "node scripts/test-rules.mjs"` (run `npm install` in `scripts/` once). Deploy them with `firebase deploy --only firestore:rules`, and the new sales index with `firebase deploy --only firestore:indexes`.

## 6. Deploy

This needs Editor access on the Firebase project. The full order (Storage, staff accounts, rules and indexes, backfill, function, website) is in [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md).

For a code-only change after that first deploy:

```bash
cd nursery-dashboard
npx ng build
cd ..
firebase deploy --only hosting
```

The live site uses production Auth, Firestore and Storage, not the emulator.

## 7. Daily Git

Work on a feature branch and open a pull request. Do not push straight to `main`.

```bash
git checkout main
git pull origin main
git checkout -b feature/short-name      # or: git checkout feature/short-name
# ... make changes ...
git status
git add .
git commit -m "Short description of the change"
git push origin feature/short-name
```

Then open a pull request on GitHub.

If Git says `Author identity unknown`, set it once:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

After pulling, if `package.json` or `package-lock.json` changed, run `npm ci` in `nursery-dashboard`.

Images: the app serves only what is in `nursery-dashboard/public/`. Put images the app uses in `public/images/`. Keep spare or unused images in `nursery-dashboard/unused-images/`, which is gitignored and not shipped.

Do not commit:

- `node_modules/`
- `nursery-dashboard/dist/` and `nursery-dashboard/.angular/`
- `nursery-dashboard/firebase-emulator-data/`
- `nursery-dashboard/unused-images/`
- `firebase-debug.log`, `firestore-debug.log`, and other logs
- `.firebase/`
- `.DS_Store`
- Service account JSON files

## Troubleshooting

| Message | Fix |
|---|---|
| `EACCES ... /usr/local/lib/node_modules` on `npm install -g` | Do not use `sudo`. Use `npx firebase-tools`, or set an npm prefix you own (see Firebase CLI above). |
| `zsh: command not found: ng` | Use `npm start` or `npx ng serve` inside `nursery-dashboard`. |
| `zsh: command not found: gh` | The GitHub CLI is optional. Plain `git push` works without it. |
| `The engine "node" is incompatible` | Your Node is too old. Install 20.19+, 22.12+, or 24+ (see `.nvmrc`). |
| `ERESOLVE unable to resolve dependency tree` | Use `npm ci`, not `npm install`. If you did use `npm ci`, wait a few minutes and retry (the npm registry can be briefly out of sync after a new Angular release). Do not use `--force`. |
| `Cannot find module @rollup/rollup-darwin-arm64` (or another platform) | `rm -rf node_modules` then `npm ci`. Do not delete `package-lock.json`. |
| `Author identity unknown` | Run the two `git config` commands in Daily Git. |
| `java: command not found` or wrong Java version | Install JDK 21 and set `JAVA_HOME` (see JDK 21 above). |
| `Port 4200 / 9099 / 8080 is already in use` | Stop the other process (an earlier `ng serve` or emulator run), then start again. |
| Login says "User profile not found" | The Auth user needs a `users/{uid}` document (see First login). |

## Checklist

1. Node 20.19+, 22.12+, or 24+ and JDK 21 are installed.
2. The repo is cloned and `cd nursery-dashboard && npm ci` has been run.
3. `firebase login` and `firebase use` show `nursery-sandbox-94f65`.
4. Emulators and `npm start` are both running.
5. The Auth user has a `users/{uid}` document, then login works at http://localhost:4200.
