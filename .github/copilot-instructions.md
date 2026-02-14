<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# MQTT mDNS Vue 3 + Capacitor Project

Vue 3 + Capacitor app for MQTT broker discovery (mDNS/NSD) and client connectivity on Android, iOS, and web.

## Code Style

- **Options API with `setup()`** — components use `export default { name, setup() { ... return { ... } } }`, NOT `<script setup>`. Follow this pattern for new components (see `src/views/ScannerView.vue`).
- **Pure JavaScript** — no TypeScript in source files despite `vue-tsc` being installed. Use `.js`/`.vue` files.
- **Scoped CSS** in view components. Global resets live in `src/App.vue` and `src/style.css`.
- Hardcoded Material-palette hex colors (`#4CAF50`, `#2196F3`, `#F44336`, `#FF9800`). BEM-like flat class names (`.scanner-container`, `.service-item`).
- No path aliases — use relative imports (`'../views/ScannerView.vue'`).

## Architecture

- **Two views only**: `ScannerView.vue` (broker list + mDNS discovery) → `MQTTClientView.vue` (connect/subscribe/publish).
- **No shared state** — broker config is passed via **URL query params** (`router.push({ query: { name, type, host, port, txtRecord } })`). MQTTClientView reads `useRoute().query` on mount.
- **MQTT connections are in-component** — `mqtt.connect()` lives directly in MQTTClientView's `setup()`. No service layer or composable.
- **mDNS discovery** uses `@mhaberler/capacitor-zeroconf-nsd` plugin, gated by `Capacitor.isNativePlatform()` (disabled on web). Watches `_mqtt-ws._tcp.` and `_mqtt-wss._tcp.` service types.
- **No persistence** — broker list resets on refresh. Defaults are hardcoded in ScannerView.

## Build and Test

```bash
bun install              # Install dependencies (bun is the package manager)
bun run dev              # Vite dev server on 0.0.0.0:8102
bun run build            # Production build → dist/
bun run sync             # cap sync — copy web assets to native projects
bun run android          # cap run android
bun run ios              # cap run ios
bun run open:android     # Open in Android Studio
bun run open:ios         # Open in Xcode
bun run clean            # Remove dist/
```

No tests exist. No test framework is configured.

## Project Conventions

- **Polyfill ordering is critical**: `src/main.js` imports `'./polyfills'` FIRST (sets `window.Buffer` and `window.process`), before Vue or MQTT imports. `vite.config.js` provides `define` and `resolve.alias` for `buffer`, `process`, `stream-browserify`, `crypto-browserify`.
- **MQTT error handling**: 10s `connectTimeout` + 15s manual `setTimeout` fallback. `reconnectPeriod: 0` (no auto-reconnect). Errors shown in a dismissible banner.
- **Message cap**: 500 messages max, newest first. JSON payloads auto-formatted.
- **Protocol detection**: Service type → protocol mapping via `wsPatterns`/`tlsPatterns` arrays to determine `ws://`, `wss://`, `mqtt://`, or `mqtts://`.
- **Android cleartext**: `capacitor.config.json` enables `cleartext: true` + `allowMixedContent: true` for plain WS connections on Android.

## Integration Points

- `@mhaberler/capacitor-zeroconf-nsd` — `ZeroConf.watch({ type, domain }, callback)` / `ZeroConf.unwatch()`. Callback: `{ action: 'added'|'resolved'|'removed', service }`.
- `mqtt` (mqtt.js) — `mqtt.connect(url, opts)` over WebSocket. Subscribes to `#` wildcard on connect.
- Service key format: `${name}_${domain}_${normalizedType}` (dots stripped from type). Manual entries keyed as `manual-${Date.now()}`.
