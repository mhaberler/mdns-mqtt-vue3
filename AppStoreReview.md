# App Store Connect — Submission Pack

## App Review Notes (paste into "Notes" field)

mqtt-mdns-vue is a developer/IoT utility for discovering and interacting with
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

## Suggested metadata

- Category: Developer Tools (primary), Utilities (secondary)
- Age rating: 4+
- Support URL: https://github.com/<owner>/mdns-mqtt-vue3   <!-- TODO fill -->
- Marketing URL: same
- Privacy Policy URL: required even though no data collected — host a short
  one-paragraph page stating "This app collects no personal data."

## Suggested keywords

MQTT, IoT, Bonjour, mDNS, broker, publish, subscribe, developer, ESP32,
home automation

## Suggested description (short)

Discover MQTT brokers on your local network via Bonjour/mDNS, then publish
and subscribe to topics. Supports WS, WSS, and (on supported networks)
plain MQTT and MQTTS. Useful for IoT developers, ESP32/Arduino projects,
and home-automation tinkerers. No account, no tracking.

## Pre-submission checklist

- [ ] PrivacyInfo.xcprivacy added to the "App" target in Xcode (drag into
      App/App group, check "App" target in File Inspector → Target Membership).
- [ ] Bundle display name reviewed (currently "mqtt-mdns-vue" — fine for
      developer tool, consider title-case if marketing).
- [ ] Verify `armv7` → `arm64` change builds cleanly (Info.plist already
      patched).
- [ ] Privacy Policy URL hosted and entered in App Store Connect.
- [ ] Screenshots: scanner empty state + pre-configured broker visible,
      and MQTT client showing a message round-trip.
- [ ] Confirm "Local Network" prompt fires on first launch (it should —
      NSLocalNetworkUsageDescription and NSBonjourServices both present).
- [ ] Confirm no background modes are enabled (none should be).
