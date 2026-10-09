# Building and signing MQTT Scout

How to build this app locally, and how to produce signed release builds — IPA
for iOS (TestFlight), APK and AAB for Android (Play internal track) — with the
GitHub Actions workflow
[.github/workflows/app-release.yml](.github/workflows/app-release.yml).

No certificate repository and no signing material in the repo: iOS uses Xcode's
automatic **cloud-managed signing** driven by an App Store Connect API key;
Android uses plain Gradle with an upload keystore.

- [Overview](#overview)
- [Do I need a Mac?](#do-i-need-a-mac)
- [Identifiers used by this app](#identifiers-used-by-this-app)
- [Local development builds](#local-development-builds)
- [Local release builds](#local-release-builds)
- [One-time setup: Apple / iOS](#one-time-setup-apple--ios)
- [One-time setup: Android keystore](#one-time-setup-android-keystore)
- [One-time setup: Google Play](#one-time-setup-google-play)
- [One-time setup: GitHub secrets](#one-time-setup-github-secrets)
- [Building releases in CI](#building-releases-in-ci)
- [What the jobs do, step by step](#what-the-jobs-do-step-by-step)
- [Versioning](#versioning)
- [Installing and distributing the builds](#installing-and-distributing-the-builds)
- [Rotating and revoking credentials](#rotating-and-revoking-credentials)
- [Troubleshooting](#troubleshooting)
- [Reference: files and secrets](#reference-files-and-secrets)

## Overview

```
 your Mac                        GitHub                        Apple / Google
 ────────                        ──────                        ──────────────
 .env (gitignored)               Actions secrets
   ASC_KEY_*      ─┐               ASC_KEY_P8, ASC_KEY_ID, ASC_ISSUER_ID
   ANDROID_*      ─┼─ sync-app ──► ANDROID_KEYSTORE, …PASSWORD, …ALIAS, …KEY_PASSWORD
   GOOGLE_PLAY_*  ─┘  -secrets.sh  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
                      (gh secret set)      │
                                           ▼
                                app-release.yml
                                 ├─ version (ubuntu): versionName from tag,
                                 │    versionCode = run_number + 100
                                 ├─ android (ubuntu): gradle assembleRelease
                                 │    bundleRelease, signed w/ keystore ──► APK, AAB
                                 ├─ play (ubuntu, tags): upload AAB ───────► Play internal (draft)
                                 ├─ ios (macos): xcodebuild archive (unsigned)
                                 │    → -exportArchive -allowProvisioningUpdates
                                 │      + API key ─── cloud signing ───────► IPA
                                 │      (tags: second export uploads) ─────► TestFlight
                                 └─ release (ubuntu, tags): gh release create
```

| Trigger | What you get |
|---|---|
| **Run workflow** (manual dispatch) | IPA + APK + AAB as workflow artifacts. No upload anywhere. |
| push tag `v<version>` | IPA → TestFlight; AAB → Play internal track (draft); IPA + APK + AAB attached to a GitHub Release for the tag. |

The web build is deployed to GitHub Pages by a separate workflow
([deploy.yml](.github/workflows/deploy.yml)) which triggers on **pushes to
`main`**, not on tags — so `v*` tags drive app releases only and the two never
collide.

## Do I need a Mac?

**Not for signed release builds.** All iOS signing happens on GitHub's
**macOS runner** (`macos-15`, which has Xcode and CocoaPods installed); you
never need a Mac or Xcode yourself to set up, build, sign or ship. The Apple
side is done in a browser, and the secrets can be set from any machine.

| Step | Where it happens | Mac needed? |
|---|---|---|
| Register the App ID (bundle ID) | developer.apple.com (browser) | no |
| Create the App Store Connect app record | appstoreconnect.apple.com (browser) | no |
| Create the **Admin** API key, download the `.p8` | App Store Connect (browser) | no |
| Create the Android upload keystore | `keytool` from any JDK | no |
| Create the Play service account | Google Cloud + Play Console (browser) | no |
| Put the secrets into the repo | `scripts/sync-app-secrets.sh` (bash + `gh`) or GitHub's web UI | no |
| Archive, sign (cloud-managed certificate), upload to TestFlight | GitHub `macos-15` runner | no — GitHub's Mac |
| Build and sign the Android APK/AAB, upload to Play | GitHub `ubuntu-24.04` runner | no |
| Install on an iPhone | TestFlight app | no |
| Install on an Android phone | Play internal testing, or sideload the APK | no |

What **does** need a Mac with Xcode: local iOS development (`bun run ios`,
live reload, Safari Web Inspector against the WebView) and bigger native
changes. Android development needs only the Android SDK and a JDK, on any OS.

## Identifiers used by this app

| What | Value | Where it's set |
|---|---|---|
| Bundle ID / application ID | `com.haberlerm.mqttmdns` | [capacitor.config.json](capacitor.config.json), [android/app/build.gradle](android/app/build.gradle), `PRODUCT_BUNDLE_IDENTIFIER` in the Xcode project |
| App name | `MQTT Scout` | `capacitor.config.json`, `CFBundleDisplayName` in [ios/App/App/Info.plist](ios/App/App/Info.plist) |
| Apple Developer Team ID | `HLX9TTSLFS` | `DEVELOPMENT_TEAM` in `ios/App/App.xcodeproj/project.pbxproj`, `teamID` in [ci/](ci/)`ExportOptions-*.plist` |
| GitHub repo | `mhaberler/mdns-mqtt-vue3` | |

The Team ID is not secret. To look yours up: <https://developer.apple.com/account>
→ **Membership details** → Team ID. If you fork this for another team, change it
in both places above.

## Local development builds

Prerequisites:

- [bun](https://bun.sh)
- **Android**: Android Studio or the Android SDK (compileSdk/targetSdk **36**,
  minSdk 23) + **JDK 21**. Gradle 9.5.0 comes from the committed wrapper.
- **iOS**: Xcode (deployment target **16.0**) and CocoaPods. This project uses
  CocoaPods, so the Xcode entry point is `ios/App/App.xcworkspace`, *not* the
  `.xcodeproj`.

```sh
bun install                   # must run first: the Podfile points at ../../node_modules
bun run build                 # vite build → dist/
bun run sync                  # cap sync: copies dist/ into ios/ and android/, runs pod install
```

Then run on a device:

```sh
bun run android               # cap run android (prompts for a target)
bun run ios                   # cap run ios
bun run run-on-galaxy-s24     # fixed --target device IDs, see package.json
bun run debug-android-s24     # live reload from the vite dev server (port 8102)
bun run debug-ios
bun run open-in-Android-Studio
bun run open-in-Xcode         # opens the .xcworkspace
```

List your own device IDs with `bunx cap run android --list` /
`bunx cap run ios --list` and edit the `--target` values in
[package.json](package.json).

Other useful scripts:

```sh
bun run typecheck             # vue-tsc --noEmit — the only CI gate besides the builds
bun run dev                   # vite dev server, port 8102, host-exposed (web only, no mDNS)
bun run apk:debug             # build + sync + gradlew assembleDebug
bun run apk:debug:install     # adb install -r the debug APK
bun run logcat:app            # filtered Android logs (Capacitor + ZeroConf)
```

Local iOS builds use **automatic signing with your Xcode account** (Xcode →
Settings → Accounts) and a development certificate — no API key needed. If
`cap run ios` fails with *"Signing for App requires a development team"*, the
`DEVELOPMENT_TEAM` in the Xcode project is missing or isn't a team your Xcode
account belongs to.

## Local release builds

Android, signed, exactly as CI does it:

```sh
bun install && bun run build && bunx cap sync android
cd android
ANDROID_KEYSTORE_PATH=~/.secrets.d/upload-key.keystore \
ANDROID_KEYSTORE_PASSWORD=… ANDROID_KEY_ALIAS=upload ANDROID_KEY_PASSWORD=… \
  ./gradlew assembleRelease bundleRelease -PversionCode=108 -PversionName=1.3.4
# → android/app/build/outputs/apk/release/app-release.apk
#   android/app/build/outputs/bundle/release/app-release.aab
```

`-PversionCode` / `-PversionName` are optional; without them
[android/app/build.gradle](android/app/build.gradle) falls back to the literals
checked into the file. Without `ANDROID_KEYSTORE_PATH` the release build is
simply left **unsigned**, so an unconfigured checkout still builds. Debug builds
are always signed with the SDK's debug key.

Verify the signature:

```sh
$ANDROID_HOME/build-tools/<ver>/apksigner verify --print-certs app-release.apk
```

iOS release builds are best left to CI — locally you would need a distribution
certificate, which is exactly what the cloud signing in CI avoids.

## One-time setup: Apple / iOS

You need a paid Apple Developer Program membership. Steps 1–2 are done once per
app, step 3 once per team (the key can be shared by all your apps and repos — if
you already have one from another project of the same team, reuse it).

### 1. Register the App ID (bundle ID)

Optional — automatic signing registers it on the first CI export — but the App
Store Connect app record (step 2) needs it in its dropdown, so doing it by hand
first is simplest.

1. <https://developer.apple.com/account/resources/identifiers/list> →
   **Identifiers** → **+**.
2. **App IDs** → Continue → type **App** → Continue.
3. Description: `MQTT Scout`. Bundle ID: **Explicit**, `com.haberlerm.mqttmdns`.
4. **Capabilities: leave all unchecked.** This app needs none — mDNS/Bonjour
   discovery and local-network access are driven purely by the
   `NSLocalNetworkUsageDescription` string and the `NSBonjourServices` list in
   `Info.plist` (both already present), not by an App ID capability.
5. Continue → Register.

### 2. Create the App Store Connect app record

Required for TestFlight uploads. The API cannot create apps, so this is manual.

1. <https://appstoreconnect.apple.com> → **Apps** → **+** → **New App**.
2. Platform **iOS**, Name `MQTT Scout` (must be unique on the App Store — pick
   another if taken; it's only the store name), primary language, Bundle ID
   `com.haberlerm.mqttmdns` (from step 1), SKU e.g. `mqttscout`, User Access
   **Full Access**.
3. Create.

Export compliance: `Info.plist` sets `ITSAppUsesNonExemptEncryption = false`, so
TestFlight builds don't stop at the encryption questionnaire.

### 3. Create an App Store Connect API key (Admin)

This key lets CI sign and upload without an Apple ID password or 2FA.

1. You must be the **Account Holder** or an **Admin**. In App Store Connect →
   **Users and Access** → **Integrations** → **App Store Connect API** →
   **Team Keys**. (The first time, request access / accept the terms.)
2. **Generate API Key** (**+**). Name: e.g. `ci`. Access: **Admin**.
   - **It must be Admin.** Only Admin keys may use cloud-managed distribution
     certificates. An App Manager key fails export with
     *"Cloud signing permission error"*. A key's role can't be changed later —
     generate a new one.
3. **Download API Key** → `AuthKey_<KEYID>.p8`. **Apple lets you download it
   only once.** Store it outside any repo, e.g.
   `~/.secrets.d/AuthKey_<KEYID>.p8`, `chmod 600`.
4. Note the two IDs on the page:
   - **Key ID** — 10 characters, in the key's row (also in the file name).
   - **Issuer ID** — a UUID above the keys table (same for all keys of the team).

What you end up with, for `.env`:

```sh
ASC_KEY_PATH=~/.secrets.d/AuthKey_ABCDE12345.p8
ASC_KEY_ID=ABCDE12345
ASC_ISSUER_ID=69a6de7e-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### How the iOS cloud signing works here

- CI builds the archive **unsigned** (`CODE_SIGNING_ALLOWED=NO`). Signing at
  archive time would make Xcode create a new *development* certificate on every
  fresh runner.
- `xcodebuild -exportArchive -allowProvisioningUpdates` with the API key then
  signs for **App Store Connect distribution**: Xcode registers the bundle ID if
  needed, creates/downloads the App Store provisioning profile, and signs with
  Apple's **cloud-managed distribution certificate** — its private key never
  leaves Apple, so there is nothing to store, export or renew.
- Export options: [ci/ExportOptions-export.plist](ci/ExportOptions-export.plist)
  (write an `.ipa`) and [ci/ExportOptions-upload.plist](ci/ExportOptions-upload.plist)
  (upload to App Store Connect). Both: `method = app-store-connect`,
  `signingStyle = automatic`, `teamID = HLX9TTSLFS`.
- Because this project uses CocoaPods, the archive is built from the
  **workspace** (`-workspace ios/App/App.xcworkspace -scheme App`), not the
  `.xcodeproj`. No `.xcscheme` is committed: `xcodebuild` auto-creates the `App`
  scheme from the target. Verify with
  `xcodebuild -list -workspace ios/App/App.xcworkspace`.

## One-time setup: Android keystore

You need one keystore holding a key that signs the release builds. If you
already have an upload keystore (one upload key can be used for several apps),
reuse it. Otherwise create one:

```sh
mkdir -p ~/.secrets.d && chmod 700 ~/.secrets.d
keytool -genkeypair -v \
  -keystore ~/.secrets.d/upload-key.keystore \
  -alias upload \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Your Name, O=Your Org, C=AT"
# prompts for the keystore password (and the key password — use the same one)
chmod 600 ~/.secrets.d/upload-key.keystore
```

Check it (lists the alias and the certificate fingerprints):

```sh
keytool -list -v -keystore ~/.secrets.d/upload-key.keystore
```

**Back up the keystore and its passwords.** For sideloaded APKs, losing it means
users must uninstall before installing an update signed with a new key. With
Google Play App Signing the upload key can be reset via Play Console support,
but it's a slow process.

What you end up with, for `.env`:

```sh
ANDROID_KEYSTORE_PATH=~/.secrets.d/upload-key.keystore
ANDROID_KEYSTORE_PASSWORD=…
ANDROID_KEY_ALIAS=upload
ANDROID_KEY_PASSWORD=…          # same as the store password if you used one
```

`ANDROID_KEYSTORE_ALIAS_PASSWORD` is accepted as a fallback for
`ANDROID_KEY_PASSWORD`.

[android/app/build.gradle](android/app/build.gradle) defines
`signingConfigs.release` from those environment variables, and only attaches it
to the release build type when `ANDROID_KEYSTORE_PATH` is set.

## One-time setup: Google Play

The `play` job uploads the AAB to the **internal** track as a **draft** release.

1. Create the app in [Play Console](https://play.google.com/console) with package
   `com.haberlerm.mqttmdns`, and enrol in **Play App Signing** (default for new
   apps — Google holds the app signing key, your keystore is the *upload* key).
2. Create a **service account** with upload rights:
   - Play Console → **Setup → API access** → link/choose a Google Cloud project
     → **Create new service account** → follow the link to Google Cloud IAM.
   - In Google Cloud: create the service account, then **Keys → Add key →
     Create new key → JSON**, download it, store it outside any repo (e.g.
     `~/.secrets.d/mqttmdns-play.json`, `chmod 600`).
   - Back in Play Console → API access → **Grant access** to that service
     account, with at least *Release to testing tracks* on this app.
3. Put the path in `.env`:

   ```sh
   GOOGLE_PLAY_JSON_KEY_PATH=~/.secrets.d/mqttmdns-play.json
   ```

Permissions take a few minutes to propagate; the first upload can fail with a
permission error until then.

## One-time setup: GitHub secrets

Personal GitHub accounts have no account-wide secrets, so each repo gets its own
copy. [scripts/sync-app-secrets.sh](scripts/sync-app-secrets.sh) pushes them
with `gh secret set` — values are piped, never printed.

1. Install and log in to the [GitHub CLI](https://cli.github.com):
   `gh auth login` (needs the `repo` scope).
2. Copy [.env.example](.env.example) to `.env` (gitignored) and fill in the
   values from the three sections above. `.env` is optional — the script also
   reads these variables if they are already exported in your shell.
3. Push:

   ```sh
   scripts/sync-app-secrets.sh --env-file .env                 # everything, this repo
   scripts/sync-app-secrets.sh --env-file .env --ios-only      # or --android-only / --play-only
   scripts/sync-app-secrets.sh --env-file .env --repo owner/other-repo
   ```

   It prints `set NAME` per secret, and refuses to run if a variable is missing,
   a file is unreadable or empty, or `ASC_KEY_PATH` isn't a `.p8` private key.
4. Check: `gh secret list` should show these eight.

| Secret | Content |
|---|---|
| `ASC_KEY_P8` | base64 of the `.p8` file |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ANDROID_KEYSTORE` | base64 of the keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | the Play service-account JSON, verbatim |

`.env` is read literally (no shell expansion), so passwords may contain `$` or
spaces; one pair of surrounding quotes is stripped. Values in the env file win
over variables already exported in your shell.

### Without the script (browser only)

Set the same eight secrets in the GitHub web UI: repository → **Settings →
Secrets and variables → Actions → New repository secret**. The two file secrets
must be **base64 on a single line**:

| OS | `.p8` key | keystore |
|---|---|---|
| macOS | `base64 -i AuthKey_XXXX.p8 \| pbcopy` | `base64 -i upload-key.keystore \| pbcopy` |
| Linux | `base64 -w0 AuthKey_XXXX.p8` | `base64 -w0 upload-key.keystore` |
| Windows (PowerShell) | `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXX.p8"))` | same with `upload-key.keystore` |

`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is pasted as plain JSON, not base64. Avoid
`certutil -encode` on Windows — it adds header lines and line breaks. The
workflow checks that `ASC_KEY_P8` decodes to a private key and fails early with
a clear message if not.

## Building releases in CI

### Test build (no upload)

```sh
gh workflow run app-release.yml   # or GitHub → Actions → app-release → Run workflow
gh run watch                      # follow it
gh run download <run-id>          # fetch artifacts: ios/*.ipa, android/*.apk, *.aab
```

The workflow must exist on the default branch for manual runs. A dispatch run
takes the version name from `package.json` and uploads nowhere.

### Release

Versions are driven by the git tag. `npm version` bumps
[package.json](package.json), commits, and creates the `vX.Y.Z` tag in one step:

```sh
bun run release:patch         # or release:minor / release:major
                              # = npm version <part> && git push --follow-tags
```

That pushes the commit and the tag; the tag build then produces everything,
uploads the IPA to TestFlight and the AAB to Play internal (draft), and creates
the GitHub Release `vX.Y.Z` with `mqtt-scout-X.Y.Z.ipa`, `.apk` and `.aab`.

`npm version` refuses a dirty working tree, so commit your work first.

## What the jobs do, step by step

| Job | Runner | Steps |
|---|---|---|
| `version` | ubuntu-latest | version name from the tag (`v1.3.4` → `1.3.4`) or `jq -r .version package.json` on a dispatch; version code = `github.run_number + 100` |
| `android` | ubuntu-24.04, JDK 21 (temurin), bun | `bun install` → `bunx vite build` → `bunx cap sync android` → `base64 -d` the `ANDROID_KEYSTORE` secret into `$RUNNER_TEMP` → `./gradlew --no-daemon assembleRelease bundleRelease -PversionCode -PversionName` with the signing env vars → rename outputs to `mqtt-scout-<version>.apk/.aab` → upload artifact `android` |
| `play` | ubuntu-latest, tags only | download the `android` artifact → `r0adkll/upload-google-play` with the service-account JSON, `packageName: com.haberlerm.mqttmdns`, `track: internal`, `status: draft` |
| `ios` | macos-15, newest Xcode, bun | `bun install` → `bunx vite build` → `bunx cap sync ios` (runs `pod install`) → decode + validate the API key as `AuthKey_<KEY_ID>.p8` → unsigned `xcodebuild archive -workspace ios/App/App.xcworkspace -scheme App` with `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` → `-exportArchive` with `ci/ExportOptions-export.plist` → IPA; on tags a second `-exportArchive` with `ci/ExportOptions-upload.plist` sends it to TestFlight → upload artifact `ios` |
| `release` | ubuntu-latest, tags only | download both artifacts → `gh release create <tag> out/*` |

Android pinning note: `ubuntu-24.04` is pinned rather than `ubuntu-latest`
because the job relies on the image's preinstalled Android SDK; check the SDK
version before moving to a newer image.

## Versioning

Nothing is committed back by CI; versions are injected at build time.

| | iOS | Android | Source |
|---|---|---|---|
| user-visible version | `MARKETING_VERSION` (CFBundleShortVersionString) | `versionName` | tag `vX.Y.Z` → `X.Y.Z`; dispatch runs: `package.json` `version` |
| build number | `CURRENT_PROJECT_VERSION` (CFBundleVersion) | `versionCode` | `github.run_number + 100` |

App Store Connect rejects a re-used build number for the same version, and Play
rejects a non-increasing `versionCode`; `run_number` is monotonic per workflow,
so both are satisfied.

**Why `+ 100`:** releases made before this workflow existed reached
`versionCode 7`. A brand-new workflow's `run_number` starts at 1, which Play
would reject as a regression. The offset puts the first CI build at 101 and
keeps every later one increasing. The literals still in
`android/app/build.gradle` and the Xcode project are only fallbacks for local
builds.

## Installing and distributing the builds

- **iOS / TestFlight:** after a tag build, the build appears in App Store
  Connect → your app → **TestFlight** after processing (typically 5–30 min).
  Internal testers (members of your team) can install right away via the
  TestFlight app; external testers need a group and a one-time beta review.
- **iOS IPA artifact:** signed for App Store distribution, so it cannot be
  sideloaded — use TestFlight (or Transporter to upload it manually).
- **Android, Play internal testing:** the AAB lands in the internal track as a
  **draft** — open Play Console and press *Review release → Start rollout* to
  release it to your internal testers (up to 100, added by email or Google
  Group). No review; available within minutes.
- **Android APK:** sideload with `adb install mqtt-scout-X.Y.Z.apk` or by
  opening the file on the phone (allow "install unknown apps"). An installed
  debug build (from `cap run`) has a different signature — uninstall it first.
- **Android AAB:** for Play only; it cannot be installed directly.

**Signing catch — pick one channel per tester.** A build installed from Play is
signed with **Google's app signing key**; the workflow's APK is signed with
**your upload key**. Android refuses to update one with the other, so switching
channels means uninstalling first — which also deletes the app's saved brokers
and preferences.

## Rotating and revoking credentials

- **API key compromised or no longer needed:** App Store Connect → Integrations
  → Team Keys → **Revoke**. Generate a new one, update `.env`, re-run
  `scripts/sync-app-secrets.sh --env-file .env --ios-only`.
- **Distribution certificate:** cloud-managed by Apple, nothing to rotate or
  back up.
- **Provisioning profiles:** created and refreshed automatically by the export.
- **Play service account:** delete the key in Google Cloud IAM, create a new
  one, re-run with `--play-only`.
- **Android upload key:** can't be rotated for sideloaded APKs without users
  reinstalling. With Play App Signing, request an upload key reset in Play
  Console.
- **Remove all CI secrets:** `gh secret delete <NAME>` for each of the eight.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| iOS: `xcodebuild: error: The workspace … does not contain a scheme named "App"` | Scheme autocreation didn't happen. Fix by committing a shared scheme: in Xcode, Product → Scheme → Manage Schemes → tick **Shared** for `App`, which writes `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`. Check with `xcodebuild -list -workspace ios/App/App.xcworkspace`. |
| iOS: pods not found / `Capacitor/Capacitor.h` missing | `bun install` must run **before** `cap sync ios`: the Podfile resolves pods through `../../node_modules`. |
| iOS: `The flag -authenticationKeyID is required when specifying -authenticationKeyPath` | `ASC_*` secrets not set. The workflow fails earlier with *"ASC_\* secrets missing"*. |
| iOS: `Invalid authentication key credential specified (…keyPathInvalid…)` | The `.p8` secret didn't decode to a key. The workflow validates it and writes it as `AuthKey_<KEY_ID>.p8`; the sync script refuses non-`.p8` files. |
| iOS: `Cloud signing permission error`, `No signing certificate "iOS Distribution" found`, `No profiles for 'com.haberlerm.mqttmdns' were found` | The API key isn't **Admin**. Generate an Admin key, update `.env`, re-sync `--ios-only`. |
| iOS upload: app not found / bundle ID unknown | The App Store Connect app record (Apple step 2) doesn't exist yet. |
| iOS upload: build number already used | Push a new tag rather than re-uploading an IPA by hand; `run_number` never repeats. |
| Play: `The caller does not have permission` | Service account not granted access on this app, or permissions haven't propagated yet. |
| Play: `Version code N has already been used` | A previous upload used that code. `run_number + 100` is monotonic, so this means a manual upload claimed it — bump past it. |
| Android: release APK installs but won't update an existing one | Signature mismatch (debug vs upload vs Play key). Uninstall first. |
| Local `cap run ios`: *Signing requires a development team* | `DEVELOPMENT_TEAM` missing in the Xcode project, or your Xcode account isn't on that team. |
| Local `cap add`: *Could not find installation of TypeScript* | `capacitor.config.ts` needs TypeScript; this app uses `capacitor.config.json`. |

Useful checks:

```sh
gh secret list                                   # which secrets are set (not their values)
gh run view <run-id> --log-failed                # failing step output
xcodebuild -list -workspace ios/App/App.xcworkspace
unzip -p mqtt-scout-X.Y.Z.ipa 'Payload/App.app/Info.plist' | plutil -p - | grep -E 'Version|Identifier'
apksigner verify --print-certs mqtt-scout-X.Y.Z.apk
```

## Reference: files and secrets

| File | Role |
|---|---|
| [.github/workflows/app-release.yml](.github/workflows/app-release.yml) | the CI workflow |
| [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | web build → GitHub Pages (pushes to `main`) |
| [.github/workflows/typecheck.yml](.github/workflows/typecheck.yml) | `vue-tsc --noEmit` on pushes and PRs |
| [ci/ExportOptions-export.plist](ci/ExportOptions-export.plist) | iOS export to `.ipa` |
| [ci/ExportOptions-upload.plist](ci/ExportOptions-upload.plist) | iOS export with upload to App Store Connect |
| [android/app/build.gradle](android/app/build.gradle) | `signingConfigs.release`, `-PversionCode/-PversionName` |
| `ios/App/App/Info.plist` | `NSLocalNetworkUsageDescription`, `NSBonjourServices`, `ITSAppUsesNonExemptEncryption` |
| `ios/App/Podfile` | CocoaPods dependencies (resolved via `node_modules`) |
| [scripts/sync-app-secrets.sh](scripts/sync-app-secrets.sh) | push signing secrets from `.env` to GitHub |
| [.env.example](.env.example) | template for `.env` (gitignored) |
