# Build on macOS — mdns-mqtt-vue3

Step-by-step from a fresh clone to running on Android device/emulator and iOS device/simulator. macOS only (Apple Silicon or Intel).

## 1. Prerequisites

### Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, follow the printed instructions to add `brew` to your shell PATH (Apple Silicon adds it under `/opt/homebrew/bin`).

### Core tools

```bash
brew install node bun git
brew install --cask android-studio
brew install --cask temurin@21         # JDK 21, required by AGP 8.x / Gradle 9.x
brew install cocoapods                 # iOS pod manager
brew install ruby                      # for cap live-reload on iOS (uses fastlane chain)
```

Xcode (App Store, free, ~10 GB) is required for iOS — install it, launch once to accept the license:

```bash
sudo xcodebuild -license accept
xcode-select --install                 # command-line tools
```

### Environment variables

Append to `~/.zshrc`:

```bash
# JDK 21 (Temurin via brew)
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"

# Android SDK (Android Studio installs it here by default)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# Homebrew Ruby ahead of system Ruby (needed for the debug-ios script)
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
```

Reload: `source ~/.zshrc`.

### Android SDK packages

Open Android Studio once → **More Actions** → **SDK Manager** → install:

- **SDK Platforms**: Android 15 (API 35)
- **SDK Tools**: Android SDK Build-Tools 35, Android SDK Platform-Tools, Android SDK Command-line Tools (latest), Android Emulator

Accept all licenses:

```bash
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
```

### iOS device (optional — only for physical iPhone/iPad)

- Sign into Xcode with an Apple ID: **Xcode → Settings → Accounts**
- Connect device, trust the Mac when prompted, enable Developer Mode on the device (**Settings → Privacy & Security → Developer Mode**)
- For live-reload over USB, install `idevicesyslog`: `brew install libimobiledevice`

## 2. Clone and install

```bash
git clone <repo-url> mdns-mqtt-vue3
cd mdns-mqtt-vue3
bun install
```

## 3. Build web assets

```bash
bun run build                  # outputs to dist/
bun run sync                   # copies dist/ + plugins into android/ and ios/
```

`sync` runs `cap sync`, which also runs `pod install` for iOS — first run downloads CocoaPods specs and may take several minutes.

## 4. Run on Android

### Emulator

In Android Studio: **Device Manager → Create Device** (e.g. Pixel 7, API 35). Start it, then:

```bash
bun run android
```

Or open the project in Android Studio:

```bash
bun run open:android
```

…and press **Run**.

### Physical device

Enable USB debugging on the device (**Settings → About → tap Build Number 7×**, then **Settings → Developer options → USB debugging**), connect via USB, then:

```bash
adb devices                    # confirm device listed
bun run android                # picks first device
```

For live-reload on a specific device, edit `package.json` `scripts.debug-android-*` to use your device's serial (`adb devices` shows it) and run e.g. `bun run debug-android-s24`.

Logs:

```bash
bun run logcat:app             # filtered Capacitor + ZeroConf logs
```

## 5. Run on iOS

### Simulator

```bash
bun run ios
```

Or open in Xcode and pick a simulator + Run:

```bash
bun run open:ios
```

### Physical device

Connect device, trust the Mac. In Xcode (`bun run open:ios`):

1. Select the **App** target → **Signing & Capabilities**
2. Tick **Automatically manage signing**, pick your Apple ID team
3. Change **Bundle Identifier** to something unique (e.g. `com.yourname.mqttmdnsvue`) — the default ID is registered to the original developer
4. Select your device in the device dropdown, press **Run**

For live-reload on a specific device, edit `scripts.debug-ios` in `package.json` with your device UDID (Xcode → Window → Devices and Simulators), then `bun run debug-ios`.

Logs (USB):

```bash
bun run ios-log                # idevicesyslog stream
```

## 6. Verify

App opens with **Scanner** view. On the same Wi-Fi as an MQTT broker advertising `_mqtt._tcp.` (or one of the WS/TLS variants), tap **Start Scan** — broker should appear within ~5 s. Tap to open the client view, **Connect**, then publish/subscribe.

Web build (no mDNS — manual broker entry only):

```bash
bun run dev                    # http://localhost:8102
```

## Troubleshooting

- **Gradle error `getDefaultProguardFile('proguard-android.txt') is no longer supported`** — already fixed in this repo (uses `proguard-android-optimize.txt`). If it returns from a plugin, ensure all `@mhaberler/capacitor-zeroconf-nsd` deps are ≥ 5.0.4: `bun update @mhaberler/capacitor-zeroconf-nsd`.
- **`SDK location not found`** — `ANDROID_HOME` not set, or `android/local.properties` is stale. Delete `android/local.properties` and re-run `bun run sync`.
- **`pod install` fails on Apple Silicon** — ensure `cocoapods` was installed via brew (not the system Ruby gem). Re-run: `cd ios/App && pod install`.
- **Xcode "No account found"** — add Apple ID in **Xcode → Settings → Accounts**.
- **App can't reach broker on Android** — local network discovery needs `cleartext` traffic (already enabled in `capacitor.config.json`) and on Android 13+ the runtime **Nearby devices** permission. Grant when prompted.
- **mDNS finds nothing on simulator** — iOS Simulator and Android Emulator both have flaky multicast support; test mDNS on a physical device.

## Project versions in this repo

- Node ≥ 20 (Bun 1.3+ shipped via brew works fine)
- JDK 21 (Temurin)
- Gradle 9.4.1 (wrapper, auto-downloads)
- AGP 8.x
- Android compileSdk/targetSdk 35, minSdk 23
- iOS deployment target 16.0
- Capacitor 8.3.x
