# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: mdns-mqtt-vue3

Capacitor 8 + Vue 3 + MQTT.js cross-platform app. Discovers MQTT brokers via mDNS/NSD on native, connects via TCP/WS/TLS/WSS, subscribes and publishes. Web build also supported (WS/WSS only — no mDNS).

### Commands (Bun)

- `bun install` — deps
- `bun run dev` — Vite dev server, port 8102, host-exposed
- `bun run typecheck` — `vue-tsc --noEmit` (run before commits; CI runs on PRs)
- `bun run build` — production bundle to `dist/`
- `bun run sync` — `cap sync` after build, copies web assets + plugins to native
- `bun run android` / `bun run ios` — run on device
- `bun run debug-android-s24` / `debug-ios` — live-reload on specific target (see package.json for full target list)
- `bun run logcat:app` — filtered Android logs (Capacitor + ZeroConf tags)

No test runner configured. No lint script — type-check is the only gate.

### Architecture

- **Two views, one router** ([src/router/index.ts](src/router/index.ts)):
  - [ScannerView.vue](src/views/ScannerView.vue) — broker list, mDNS scan, manual add, preferred-broker persistence
  - [MQTTClientView.vue](src/views/MQTTClientView.vue) — MQTT.js connection, subscribe (`#`), publish, message history
- **mDNS** via `@mhaberler/capacitor-zeroconf-nsd` (native only). Scans service types `_mqtt._tcp.`, `_mqtt-ws._tcp.`, `_mqtts._tcp.`, `_mqtt-wss._tcp.`. Types in [src/types/zero-conf.d.ts](src/types/zero-conf.d.ts).
- **Persistence**: `@capacitor/preferences` for preferred broker. On startup, preferred broker loads as "Not found" → short (~5s) mDNS scan fills in IP/port. Manually-added brokers skip mDNS resolution (state = "manual", yellow bg, immediate auto-connect). See [prefer-broker.md](prefer-broker.md) for the full evolution of this flow.
- **Node polyfills** ([src/polyfills.ts](src/polyfills.ts)): `buffer`, `process`, `events`, `stream`, `crypto-browserify` — MQTT.js needs these in the browser/WebView.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` (no PostCSS). Tokens + button classes in [src/style.css](src/style.css). Inline utilities in templates; no scoped CSS.
- **Build**: Vite manual chunks split `mqtt` and `vue` from main bundle. Web target uses WSS only — TCP brokers won't work in the browser.

### Code style (enforced by convention, not tooling)

- Vue Options API with `setup()`: `export default { name, setup() { ... } }`. Don't convert to `<script setup>`.
- `<script lang="ts">` for new code; existing JS allowed (`allowJs: true`, `strict: true`).
- Relative imports only — no path aliases configured.
- Mobile-first Tailwind: defaults for small, `md:` for ≥768px. Full-width containers, no max-width.

### Capacitor specifics

- `capacitor.config.json` allows cleartext + mixed content (needed for plain MQTT/WS to local brokers).
- After native changes or plugin install: `bun run build && bun run sync`.
- Live-reload debug variants assume specific device serials — edit `package.json` `config.port` and `--target` if your devices differ.
