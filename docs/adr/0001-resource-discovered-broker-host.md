# 1. Re-source discovered-broker host from live mDNS at connect time

Date: 2026-06-04

## Status

Accepted

## Context

A preferred broker is persisted across app runs (instance name, type, host, port).
When it was originally found via mDNS/NSD discovery, the persisted **host** is
untrustworthy on Android: `NsdManager` yields an **IP address** rather than a
hostname, and that IP can change between app runs (DHCP renewal) or when the device
moves networks. Connecting to the stale stored IP then fails.

Only the **broker identity** — the `(instance name, service type)` pair — is stable
across runs. The host and port are volatile and must be obtained fresh from whatever
the network currently advertises.

Previously, discovery ran as a user-triggered ~3s burst (the "Discover" button),
the discovered list lived locally inside `ScannerView` (invisible to the connection
layer and `App.vue`), and `connect()` used the persisted host directly.

## Decision

- **Broker identity is `(instance name, service type)`.** Host and port are volatile
  and always re-sourced at connect time for discovered brokers — never trusted from
  persisted storage.
- **A shared singleton owns discovery.** `useMqttDiscovery` holds the live
  `discoveredBrokers` list, self-manages a *continuous* mDNS watch that runs while the
  app is foregrounded (started/stopped off the app lifecycle), and exposes
  `liveHostFor(name, type)` for identity→host lookup. The "Discover" button and all
  scan-timer code are removed.
- **`connect()` re-sources the host** via `liveHostFor` for discovered brokers (gate
  uses *derived* source so query-param-reconstructed brokers are covered). This makes
  cold start, foreground-resume, and manual navigation all use a fresh host.
- **Auto-connect for a discovered preferred broker is armed, not fired.** `App.vue`
  watches `discoveredBrokers` and calls `connect()` only once a matching identity
  appears. No stale-host fallback for discovered brokers.
- **Manual refresh.** A "Refresh" button restarts the watch from a clean slate (stop →
  clear `discoveredBrokers` → start). NSD/Bonjour `removed` events are slow or unreliable,
  so a vanished broker can linger indefinitely; clearing is what actually drops it.
- **Visible timeout.** If no match appears within a ~12s grace period, the preferred
  card shows "Not found on this network"; the scan keeps running so a later appearance
  still connects.
- **Mid-session IP changes are out of scope.** A long-lived connection whose broker
  changes IP mid-session is a documented limitation; fresh host applies on cold start
  and on background→foreground resume only.

## Consequences

- Discovered brokers connect reliably across app runs and network moves on Android.
- Continuous foreground scanning keeps the radio active while the app is open — bounded
  by stopping the watch on background.
- The connection layer depends on the discovery singleton (`useMqttConnection` →
  `useMqttDiscovery`) for `liveHostFor`.
- A preferred discovered broker that is off or on another network never auto-connects;
  the user sees "Not found on this network" rather than a silent spinner.

## Alternatives considered

- **Fall back to the stale stored host (today's behaviour).** Rejected: it is exactly
  the Android bug being fixed. (On iOS the stored `.local` name often still resolves,
  but we want one consistent path.)
- **Hybrid: wait a grace period, then fall back to the stale host.** Rejected: the
  stale host is untrustworthy on Android, so the fallback mostly fails anyway and adds
  complexity.
- **One-shot / periodic scans instead of a continuous foreground watch.** Rejected:
  NSD/Bonjour `watch` is inherently a continuous subscription; a continuous watch gives
  immediate reactive connect with simpler lifecycle than re-arming timers.
- **Tear down and rebuild the MQTT client on every mid-session host change.** Deferred:
  separate concern with its own edge cases (reconnect storms, flapping); documented as
  a known limitation instead.
