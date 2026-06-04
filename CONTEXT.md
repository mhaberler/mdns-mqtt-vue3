# Context: mdns-mqtt-vue3

Glossary of domain terms for the MQTT broker discovery + connection app. Implementation-free.

## Glossary

### Instance name
The mDNS/NSD-advertised service instance name (e.g. "mosquitto", "test.mosquitto.org (WSS)").
Stored as `ServiceEntry.name`. Stable across app runs and across network changes — it does
**not** change when the broker's IP does. Forms half of the **broker identity**.

### Broker identity
The stable `(instance name, service type)` pair that identifies a broker across app runs.
Type pins the protocol (e.g. `_mqtt-ws._tcp.` vs `_mqtt-wss._tcp.`), so two advertisements
under the same instance name but different types are *different* brokers. Host and port are
**not** part of identity — see [volatile address].

### Volatile address
The host and port of a broker. Treated as volatile: on Android, NSD's `NsdManager` yields an
IP address rather than a hostname, and that IP can change between app runs (DHCP) or network
moves. Always re-sourced from the live **discovered brokers** list at connect time rather than
trusted from persisted storage.

### Discovered brokers
The live list of brokers currently visible via the open mDNS watch. Owned by a shared
singleton and updated continuously (added / removed / resolved events) while the app is in
the foreground. Holds only brokers found via discovery — distinct from the broader **broker
list** shown in the scanner (which also includes pre-configured and manual brokers).

### Broker list
Everything shown in the scanner view: pre-configured brokers, **discovered brokers**, and
manually-added brokers.

### Live host lookup (`liveHostFor`)
Looking up a broker's current **volatile address** from the **discovered brokers** list by its
**broker identity**. Named to avoid collision with mDNS "resolve" (DNS→IP, the `resolved`
event). Returns the current host, or nothing if the broker is not currently discovered.

### Preferred broker
The single broker the user has chosen to favour; persisted across app runs. For a *discovered*
preferred broker, only its **broker identity** is trustworthy after a restart — its
**volatile address** must be re-sourced via **live host lookup** before connecting.

### Not found on this network
State of a preferred discovered broker whose **broker identity** has not appeared in the
**discovered brokers** list within the discovery grace period (~12s) of a foreground scan.
The scan keeps running, so the broker still connects automatically if it later appears.
