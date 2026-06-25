// src/composables/useHostDiscovery.ts
import { ref, watch, type Ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { ZeroConf, type ZeroConfService, type ZeroConfAction } from '@mhaberler/capacitor-zeroconf-nsd'
import { useAppLifecycle } from './useAppLifecycle'

// Broad, commonly-advertised service types browsed solely to extract the .local
// hostnames behind them. There is no pure "enumerate mDNS hosts" query; we aggregate
// the hosts seen across these types. A device advertising none of these is not found.
const HOST_SERVICE_TYPES: string[] = [
  '_http._tcp.',
  '_workstation._tcp.',
  '_ssh._tcp.',
  '_device-info._tcp.',
  '_smb._tcp.',
  '_airplay._tcp.',
  '_googlecast._tcp.',
  '_companion-link._tcp.',
  '_sftp-ssh._tcp.'
]

function removeLeadingAndTrailingDots(str: string): string {
  return str.replace(/^\.+|\.+$/g, '')
}

// One row per discovered host (a .local machine, or its IP when no hostname is known).
export type HostEntry = {
  host: string
  ipv4Addresses: string[]
  ipv6Addresses: string[]
  serviceTypes: string[]
  resolved: boolean
}

// --- Singleton state (shared across views; survives navigation) ---
const discoveredHosts = ref<Record<string, HostEntry>>({})
let isWatching = false
let lifecycleWired = false

function mergeUnique(target: string[], extra?: string[]): string[] {
  if (!extra || extra.length === 0) return target
  const set = new Set(target)
  for (const v of extra) set.add(v)
  return Array.from(set)
}

function onServiceEvent(arg: { action: ZeroConfAction; service: ZeroConfService } | null) {
  if (!arg) return
  const { action, service } = arg
  // Host identity only becomes known on resolve. Ignore bare 'added'/'removed' — hosts are
  // deduped by name and the list is cleared on refresh (NSD 'removed' is slow/unreliable).
  if (action !== 'resolved') return

  const host = service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0]
  if (!host) return

  const st = removeLeadingAndTrailingDots(service.type || '')
  const existing = discoveredHosts.value[host]
  discoveredHosts.value[host] = {
    host,
    ipv4Addresses: mergeUnique(existing?.ipv4Addresses || [], service.ipv4Addresses),
    ipv6Addresses: mergeUnique(existing?.ipv6Addresses || [], service.ipv6Addresses),
    serviceTypes: st ? mergeUnique(existing?.serviceTypes || [], [st]) : (existing?.serviceTypes || []),
    resolved: true
  }
}

async function startScan() {
  if (!Capacitor.isNativePlatform() || isWatching) return
  isWatching = true
  try {
    await Promise.all(
      HOST_SERVICE_TYPES.map((serviceType) =>
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
    for (const serviceType of HOST_SERVICE_TYPES) {
      ZeroConf.unwatch({ type: serviceType, domain: 'local.' })
    }
  } catch (_) { /* ignore */ }
}

/**
 * Restart discovery from a clean slate: stop the watch, drop all known hosts, start again.
 * NSD/Bonjour `removed` events are slow or unreliable, so a vanished host can linger;
 * clearing is what actually refreshes the list.
 */
async function refresh() {
  await stopScan()
  discoveredHosts.value = {}
  await startScan()
}

/**
 * Singleton composable for shared mDNS host discovery state.
 * Self-manages a continuous mDNS watch that runs while the app is in the foreground
 * (native platforms only — no-op on web).
 */
export function useHostDiscovery() {
  if (!lifecycleWired) {
    lifecycleWired = true
    const { isActive } = useAppLifecycle()
    watch(isActive, (active) => {
      if (active) startScan()
      else stopScan()
    }, { immediate: true })
  }

  return {
    discoveredHosts: discoveredHosts as Ref<Record<string, HostEntry>>,
    startScan,
    stopScan,
    refresh
  }
}
