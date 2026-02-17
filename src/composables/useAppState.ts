// src/composables/useAppState.ts
import { usePersistedRef } from './usePersistedRef'

/**
 * Service entry representing an MQTT broker.
 *
 * Matching Strategy:
 * Preferred broker is matched against discovered services by comparing
 * instance name and port number.
 */
export type ServiceEntry = {
  name: string
  type: string
  host: string
  port: number
  domain?: string  // e.g., 'local' - added for robust broker matching
  discovered?: boolean
  resolved?: boolean
  txtRecord?: Record<string, any>
  ipv4Addresses?: string[]
  ipv6Addresses?: string[]
}

/**
 * App-level persisted state using Capacitor Preferences.
 * These refs are shared across all components that import this composable.
 * Values are automatically saved when mutated and loaded on app startup.
 */

// Create persisted refs at module scope (shared singleton pattern)
const preferredBrokerRef = usePersistedRef<ServiceEntry | null>('preferredBroker', null)
const autoConnectEnabledRef = usePersistedRef<boolean>('autoConnectEnabled', false)

/**
 * Returns shared app-level state refs.
 * All components calling this get the same ref instances.
 */
export function useAppState() {
  return {
    preferredBrokerRef,
    autoConnectEnabledRef
  }
}
