# Store Submission Pack — MQTT Scout

Covers both Apple App Store Connect and Google Play Console.

---

## Apple App Store Connect

### App Review Notes (paste into "Notes" field)

MQTT Scout is a developer/IoT utility for discovering MQTT brokers via Bonjour/mDNS
and publishing/subscribing over MQTT (ISO/IEC 20922). Native Bonjour discovery uses
NetService (not a website wrapper).

How to test in the Apple review environment:

1. Launch the app. When prompted, allow **Local Network** access. Required for
   Bonjour/mDNS discovery (`NSLocalNetworkUsageDescription` + `NSBonjourServices` in
   Info.plist). MQTT types: `_mqtt._tcp`, `_mqtt-ws._tcp`, `_mqtts._tcp`,
   `_mqtt-wss._tcp`. Hosts tab also browses common LAN types (`_http._tcp`,
   `_ssh._tcp`, etc.) to list `.local` machines.

2. On Scanner, tap the arrow on **test.mosquitto.org (WSS)** (port 8081, TLS).
   Do **not** use a plain WS entry — iOS does not show one; cleartext WS to
   internet hosts is blocked by App Transport Security.

3. MQTT Client auto-connects, subscribes to `#`, and shows incoming messages.
   Publish any payload to topic `test/hello` to verify round-trip.

4. mDNS discovery runs continuously while the app is foregrounded. In Apple's
   review Wi‑Fi, no LAN brokers may appear — expected. The WSS test broker
   exercises the full core loop without LAN hardware. **Refresh** restarts the scan.

5. **Hosts** tab (optional): aggregates `.local` hostnames from common Bonjour
   service types — separate from MQTT broker discovery.

No account, no in-app purchase, no advertising, no tracking, no analytics,
no data collection.

Transport: `NSAllowsLocalNetworking` enables user-chosen plain MQTT/WS to LAN
brokers (typical IoT). Internet demo traffic uses WSS/TLS only.

Privacy: `PrivacyInfo.xcprivacy` declares no tracking, no collected data types,
and UserDefaults (CA92.1) for storing the user's preferred broker locally via
`@capacitor/preferences`. Privacy policy:
https://github.com/mhaberler/mdns-mqtt-vue3/blob/main/PRIVACY.md

### Suggested metadata (iOS)

- Category: Developer Tools (primary), Utilities (secondary)
- Age rating: 4+
- Support URL: https://github.com/mhaberler/mdns-mqtt-vue3
- Marketing URL: same
- Privacy Policy URL: https://github.com/mhaberler/mdns-mqtt-vue3/blob/main/PRIVACY.md

### Suggested keywords

MQTT, IoT, Bonjour, mDNS, broker, publish, subscribe, developer, ESP32,
home automation

### Suggested description (short)

Discover MQTT brokers on your local network via Bonjour/mDNS, then publish
and subscribe to topics. Supports WS, WSS, and (on supported networks)
plain MQTT and MQTTS. Useful for IoT developers, ESP32/Arduino projects,
and home-automation tinkerers. No account, no tracking.

### iOS pre-submission checklist

- [x] PrivacyInfo.xcprivacy in App target Copy Bundle Resources
- [x] Bundle display name "MQTT Scout"
- [x] `arm64` only (Info.plist)
- [x] NSLocalNetworkUsageDescription + NSBonjourServices present
- [x] ITSAppUsesNonExemptEncryption = false in Info.plist
- [x] In-app Privacy Policy link (Scanner footer)
- [ ] Bump `CURRENT_PROJECT_VERSION` (build number) for every upload
- [ ] Privacy Policy URL entered in App Store Connect (same as PRIVACY.md link above)
- [ ] Screenshots: scanner with pre-configured WSS broker, MQTT client message round-trip
- [ ] Confirm Local Network prompt on first launch (delete/reinstall after plist changes)
- [ ] Confirm no background modes enabled
- [ ] Xcode Archive → Generate Privacy Report (merged manifests clean)

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
- [ ] Privacy Policy URL in Play listing (same GitHub link as iOS).
- [ ] Screenshots: scanner with pre-configured broker, client with message.
- [ ] Confirm app name reads "MQTT Scout" in launcher
      (`android/app/src/main/res/values/strings.xml`).
- [ ] Pre-launch report: expect mDNS scan to find nothing on Google's
      robot devices — empty-state hint covers this.
