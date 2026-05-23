# Store Submission Pack — MQTT Scout

Covers both Apple App Store Connect and Google Play Console.

---

## Apple App Store Connect

### App Review Notes (paste into "Notes" field)

MQTT Scout is a developer/IoT utility for discovering and interacting with
MQTT brokers (a standard IoT messaging protocol, ISO/IEC 20922).

How to test in the Apple review environment:
1. Launch the app. When prompted, allow the "Local Network" permission. This
   is used for mDNS/Bonjour discovery of MQTT brokers on the local network,
   declared in Info.plist via NSBonjourServices for _mqtt._tcp, _mqtt-ws._tcp,
   _mqtts._tcp, and _mqtt-wss._tcp.
2. On the Scanner screen a pre-configured public broker
   "test.mosquitto.org (WSS)" is shown. Tap the arrow icon next to it to open
   the client and auto-connect (WSS on port 8081, public test server, no
   credentials required).
3. The MQTT Client view subscribes to "#" (wildcard) by default and renders
   incoming messages. Use the Publish form to send any payload to topic
   "test/hello" — it will round-trip back via the subscription.
4. The "Discover" button runs an mDNS scan. In the Apple lab Wi-Fi no
   brokers will be advertised; this is expected. The pre-configured WSS
   broker exercises the full core loop.

No account, no in-app purchase, no advertising, no tracking, no analytics,
no data collection. App is a thin Vue/Capacitor wrapper around the open
MQTT.js client.

Transport security: NSAllowsLocalNetworking is set so the app can connect
to user-chosen MQTT brokers on the local network (typical IoT deployment).
All Internet/demo traffic uses TLS (WSS).

Privacy manifest (PrivacyInfo.xcprivacy) declares no tracking, no collected
data types, and the required-reason UserDefaults API category CA92.1
(used only for storing the user's preferred broker via @capacitor/preferences).

### Suggested metadata (iOS)

- Category: Developer Tools (primary), Utilities (secondary)
- Age rating: 4+
- Support URL: https://github.com/<owner>/mdns-mqtt-vue3   <!-- TODO fill -->
- Marketing URL: same
- Privacy Policy URL: required even though no data collected — host a short
  one-paragraph page stating "This app collects no personal data."

### Suggested keywords

MQTT, IoT, Bonjour, mDNS, broker, publish, subscribe, developer, ESP32,
home automation

### Suggested description (short)

Discover MQTT brokers on your local network via Bonjour/mDNS, then publish
and subscribe to topics. Supports WS, WSS, and (on supported networks)
plain MQTT and MQTTS. Useful for IoT developers, ESP32/Arduino projects,
and home-automation tinkerers. No account, no tracking.

### iOS pre-submission checklist

- [ ] PrivacyInfo.xcprivacy added to the "App" target in Xcode (drag into
      App/App group, check "App" target in File Inspector → Target Membership).
- [ ] Bundle display name now "MQTT Scout".
- [ ] Verify `armv7` → `arm64` change builds cleanly (Info.plist already
      patched).
- [ ] Bump `CURRENT_PROJECT_VERSION` (build number) for every upload —
      App Store Connect rejects duplicate (version, build) pairs.
- [ ] Privacy Policy URL hosted and entered in App Store Connect.
- [ ] Screenshots: scanner empty state + pre-configured broker visible,
      and MQTT client showing a message round-trip.
- [ ] Confirm "Local Network" prompt fires on first launch (it should —
      NSLocalNetworkUsageDescription and NSBonjourServices both present).
- [ ] Confirm no background modes are enabled (none should be).

---

## Google Play Console

### Data Safety form (fill exactly)

- Data collected: **None**
- Data shared: **None**
- Data encrypted in transit: **Yes**
  (TLS for WSS/MQTTS; user-chosen scheme for LAN brokers, justified by
  NSAllowsLocalNetworking / scoped network_security_config.)
- User can request data deletion: **N/A — no data collected**
- Tracking / advertising IDs: **No**

### Store listing copy (Android)

Short description (80 chars):
> Discover and use MQTT brokers on your network. For IoT, ESP32 and home automation.

Full description: same as iOS description above.

### Permissions justification (for store listing or in-app rationale)

- `INTERNET`, `ACCESS_NETWORK_STATE`: MQTT broker connectivity.
- `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`: mDNS multicast lock
  for Bonjour discovery on the LAN.
- `NEARBY_WIFI_DEVICES` (Android 13+, `neverForLocation` flag):
  required to perform NSD service discovery on the local network.
- **Not requested:** Location, camera, microphone, contacts, storage, ads.

### Signing — Play App Signing

1. Generate upload keystore (one-time, keep safe):

   ```sh
   keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 \
           -validity 25 -alias upload
   ```

2. Export env vars (or put in `~/.gradle/gradle.properties` with the
   Gradle-style prefix `ANDROID_*` mapped manually):

   ```sh
   export ANDROID_KEYSTORE_PATH=/abs/path/to/upload.jks
   export ANDROID_KEYSTORE_PASSWORD=...
   export ANDROID_KEY_ALIAS=upload
   export ANDROID_KEY_PASSWORD=...
   ```

3. Build signed AAB:

   ```sh
   bun run build && bun run sync
   cd android && ./gradlew bundleRelease
   # → android/app/build/outputs/bundle/release/app-release.aab
   ```

4. First upload: enroll the app in **Play App Signing**. Google will hold
   the distribution key; you keep the upload key.

### Android pre-submission checklist

- [ ] Audit final merged manifest — confirm `ACCESS_FINE/COARSE_LOCATION`
  are absent (we strip with `tools:node="remove"`). Run:

```sh
cd android && ./gradlew :app:processReleaseManifest
cat app/build/intermediates/merged_manifest/release/AndroidManifest.xml
```

- [ ] Generate upload keystore + configure env vars (see above).
- [ ] Enroll in Play App Signing on first upload.
- [ ] Fill Data Safety form: nothing collected, TLS in transit.
- [ ] Bump `versionCode` for every upload (Play rejects duplicates).
- [ ] Host Privacy Policy URL; link in Play listing.
- [ ] Screenshots: scanner with pre-configured broker, client with message.
- [ ] Confirm app name now reads "MQTT Scout" in launcher
      (`android/app/src/main/res/values/strings.xml`).
- [ ] Pre-launch report: expect mDNS scan to find nothing on Google's
      robot devices — empty-state hint covers this.
