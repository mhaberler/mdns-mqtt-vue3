<!-- Use this file to provide workspace-specific custom instructions to Copilot. -->

# MQTT mDNS Vue 3 + Capacitor (updated)

Vue 3 + Capacitor app for MQTT broker discovery (mDNS/NSD) and client connectivity on Android, iOS, and web. This repository is undergoing an incremental TypeScript migration.

## Code style & TypeScript policy

- **Options API with `setup()`** — keep `export default { name, setup() { ... return { ... } } }`. Do **not** use `<script setup>`.
- **Incremental TypeScript migration** — new components and non-Vue modules should use TypeScript (`.ts` / `<script lang="ts">`). Existing JS is allowed while migrating; `tsconfig.json` uses `allowJs: true` to support that. `strict` mode is enabled — fix type errors on conversion.
- `src/shims-vue.d.ts` and ambient typings (e.g. `src/types/zero-conf.d.ts`) exist for plugin types.
- **Scoped CSS** in view components; global resets in `src/App.vue` and `src/style.css`.
- Design tokens/colors: use the existing Material hexs (`#4CAF50`, `#2196F3`, `#F44336`, `#FF9800`). Follow the BEM-like flat class names (e.g. `.scanner-container`, `.service-item`).
- **No path aliases** — use relative imports (`'../views/ScannerView.vue'`).

## Architecture (unchanged)

- Two views only: `ScannerView.vue` → `MQTTClientView.vue`.
- No shared global state — broker selection/config flows via URL query params; MQTT client lifecycle stays in `MQTTClientView`.
- mDNS discovery uses `@mhaberler/capacitor-zeroconf-nsd` (native-only). The repository now includes ambient typings for this plugin.

## Build, test & CI

- Local dev (bun):
  - `bun install`
  - `bun run dev` (Vite on :8102)
  - `bun run build` / `bun run sync` / `bun run android|ios`
- Type-checking (now automated):
  - `npm run typecheck` — runs `vue-tsc --noEmit` (CI also runs this on PRs)
- CI: GitHub Actions workflow `.github/workflows/typecheck.yml` runs `vue-tsc` on push/PRs.

## TypeScript / migration notes

- `tsconfig.json` is configured for incremental migration (`allowJs: true`) and `strict: true` is enabled.
- Preferred file types:
  - Vue components → `<script lang="ts">` + Options API
  - Utility modules → `.ts`
- Key TypeScript files added: `src/main.ts`, `src/polyfills.ts`, `src/router/index.ts`, `src/shims-vue.d.ts`, `src/types/zero-conf.d.ts`.
- Keep the polyfill import order: `src/main.ts` MUST import `./polyfills` first.

## Project conventions & runtime behavior

- MQTT connection behavior unchanged: `connectTimeout`, `reconnectPeriod: 0`, manual 15s fallback.
- Messages capped at 500, newest-first; JSON payloads are pretty-printed in the UI.
- Protocol detection still uses service-type pattern matching (WS/TLS vs TCP).
- Manual broker entries use keys like `manual-<timestamp>`.

## Integration points (typed)

- `@mhaberler/capacitor-zeroconf-nsd` — typed ambient declarations in `src/types/zero-conf.d.ts`. Use `ZeroConf.watch()` / `ZeroConf.unwatch()` and the declared `ZeroConfService` shape.
- `mqtt` — `mqtt.connect(url, opts)` in `MQTTClientView` (no service layer).

## When contributing

- Prefer TypeScript for new code; keep Options API with `setup()`.
- Run `npm run typecheck` before opening a PR.
- Keep changes scoped — this repo focuses only on discovery + client UI (no backend changes here).

---

If you want the older, JS-only conventions restored temporarily, say so and include the files to keep unchanged.
