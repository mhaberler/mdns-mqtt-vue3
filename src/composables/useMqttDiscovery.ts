// src/composables/useMqttDiscovery.ts
import { ref, watch, type Ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ZeroConf, type ZeroConfService, type ZeroConfAction } from '@mhaberler/capacitor-zeroconf-nsd'
import type { ServiceEntry } from './useAppState'
import { useAppLifecycle } from './useAppLifecycle'

// Service types scanned for MQTT brokers (WS/WSS only — the app connects over WebSocket).
const SERVICE_TYPES: string[] = ['_mqtt-ws._tcp.', '_mqtt-wss._tcp.']

function removeLeadingAndTrailingDots(str: string): string {
  return str.replace(/^\.+|\.+$/g, '')
}

// --- Singleton state (shared across views; survives navigation) ---
// Live list of brokers currently visible via the open mDNS watch (foreground only).
const discoveredBrokers = ref<Record<string, ServiceEntry>>({})
let isWatching = false
let lifecycleWired = false

function onServiceEvent(arg: { action: ZeroConfAction; service: ZeroConfService } | null) {
  if (!arg) return
  const { action, service } = arg
  const st = removeLeadingAndTrailingDots(service.type || '')
  const key = `${service.name || 'unknown'}_${service.domain || 'local'}_${st}`

  const port = service.port ?? 0

  if (action === 'added') {
    discoveredBrokers.value[key] = {
      name: service.name || `${service.type ?? 'service'} Service`,
      type: service.type || '',
      host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0] || 'Unknown',
      port: port > 0 ? port : 0,
      domain: service.domain,
      discovered: true,
      resolved: false,
      source: 'discovered'
    }
  } else if (action === 'removed') {
    delete discoveredBrokers.value[key]
  } else if (action === 'resolved' && port > 0) {
    const existing = discoveredBrokers.value[key]
    discoveredBrokers.value[key] = {
      name: service.name || existing?.name || `${service.type ?? 'service'} Service`,
      type: service.type || existing?.type || '',
      host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0] || existing?.host || 'Unknown',
      port,
      domain: service.domain || existing?.domain,
      discovered: true,
      resolved: true,
      source: 'discovered',
      txtRecord: service.txtRecord || existing?.txtRecord || {},
      ipv4Addresses: service.ipv4Addresses || existing?.ipv4Addresses || [],
      ipv6Addresses: service.ipv6Addresses || existing?.ipv6Addresses || []
    }
  }
}

async function startScan() {
  if (!Capacitor.isNativePlatform() || isWatching) return
  isWatching = true
  try {
    await Promise.all(
      SERVICE_TYPES.map((serviceType) =>
        ZeroConf.watch({ type: serviceType, domain: 'local.' }, onServiceEvent)
      )
    )
  } catch (_) {
    isWatching = false
  }
}

async function stopScan() {
  if (!Capacitor.isNativePlatform() || !isWatching) return
  isWatching = false
  try {
    for (const serviceType of SERVICE_TYPES) {
      ZeroConf.unwatch({ type: serviceType, domain: 'local.' })
    }
  } catch (_) { /* ignore */ }
}

/**
 * Restart discovery from a clean slate: stop the watch, drop all currently-known
 * brokers, then start again. NSD/Bonjour `removed` events are slow or unreliable, so a
 * vanished broker can linger indefinitely; clearing is what actually refreshes the list.
 */
async function refresh() {
  await stopScan()
  discoveredBrokers.value = {}
  await startScan()
}

/**
 * Look up a broker's current host from the live discovered list by its broker identity
 * (instance name + service type). Returns null if the broker is not currently discovered
 * (or not resolved yet). The host returned is whatever the network currently advertises —
 * on Android NSD this is an IP that may differ from any previously persisted value.
 * Name comparison is case-insensitive: Android NSD lowercases instance names, so a
 * persisted name may differ in case from the live advertisement.
 */
function liveHostFor(name: string, type: string): { host: string; port: number } | null {
  const match = Object.values(discoveredBrokers.value).find(
    s => s.name.toLowerCase() === name.toLowerCase() && s.type === type && s.resolved
  )
  if (!match) return null
  return { host: match.host, port: match.port }
}

/**
 * Singleton composable for shared mDNS discovery state.
 * Self-manages a continuous mDNS watch that runs while the app is in the foreground
 * (native platforms only — no-op on web).
 */
export function useMqttDiscovery() {
  if (!lifecycleWired) {
    lifecycleWired = true
    const { isActive } = useAppLifecycle()
    watch(isActive, (active) => {
      if (active) startScan()
      else stopScan()
    }, { immediate: true })
  }

  return {
    discoveredBrokers: discoveredBrokers as Ref<Record<string, ServiceEntry>>,
    liveHostFor,
    startScan,
    stopScan,
    refresh
  }
}
