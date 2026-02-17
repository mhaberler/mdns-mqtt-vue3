---
name: addAppLifecycle
description: Add foreground/background lifecycle handling to a Capacitor or hybrid mobile app.
argument-hint: The framework (e.g., Vue, React, Angular) and what should happen on pause/resume (e.g., disconnect MQTT, stop scanning).
---
Add proper foreground/background app lifecycle handling to the specified hybrid mobile app.

## Steps

1. **Identify the lifecycle plugin or API** appropriate for the platform:
   - Capacitor: `@capacitor/app` (`appStateChange` event) — covers iOS, Android, and web (Page Visibility API) uniformly.
   - Cordova: `document.addEventListener('pause'/'resume')`.
   - Web-only: `document.addEventListener('visibilitychange')`.

2. **Create a lifecycle composable/service** (singleton pattern preferred):
   - Expose a reactive `isActive` boolean that reflects whether the app is in the foreground.
   - Register the platform listener once (guard against duplicate registration).
   - Keep it minimal — consumers watch the reactive state rather than registering callbacks.

3. **Add `pause()` and `resume()` to affected services** (e.g., network connections, real-time subscriptions, scanning):
   - `pause()`: gracefully suspend the resource, **preserve enough state to resume** (e.g., save the connected broker/endpoint identity). Do NOT treat this as a full teardown — the user didn't explicitly disconnect.
   - `resume()`: reconnect/restart using the saved state. Only resume if `pause()` was the reason for disconnection (not a manual user action).
   - Manual disconnect/stop should clear the saved state so `resume()` becomes a no-op.

4. **Wire lifecycle into the app root component**:
   - Watch `isActive`: `false` → call `pause()` on each managed service; `true` → call `resume()`.
   - Keep this watcher in the root component so it runs regardless of which view is active.

5. **Wire lifecycle into view-specific resources** (e.g., device scanning, location tracking):
   - Stop the resource on background (saves battery, avoids OS-suspended zombie state).
   - Decide whether to auto-restart on foreground or require manual user action (prefer manual for battery-intensive operations like mDNS/BLE scanning).

6. **Handle safe area insets** if not already done:
   - Add `viewport-fit=cover` to the HTML viewport meta tag.
   - Add `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` to the body.

## Verification

- Type-check and build must pass after changes.
- Test on device: connect to a service → background the app → foreground → verify silent reconnection.
- Test manual disconnect → background → foreground → verify NO auto-reconnect.
- Test web: switch browser tabs and verify the same pause/resume behavior.
