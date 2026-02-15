// src/composables/useAppState.ts
import { usePersistedRef } from './usePersistedRef'

/** How the broker was added to the list */
export type BrokerSource = 'preconfigured' | 'discovered' | 'manual'

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
  discovered?: boolean  // kept for backward compat; prefer `source`
  resolved?: boolean
  txtRecord?: Record<string, any>
  ipv4Addresses?: string[]
  ipv6Addresses?: string[]
  autoConnect?: boolean  // Auto-connect to this broker when preferred and status is found/manual
  source?: BrokerSource
  username?: string
  password?: string
  rejectUnauthorized?: boolean  // TLS certificate verification (default true)
  tested?: boolean  // true after a successful inline test-connect
}

/**
 * App-level persisted state using Capacitor Preferences.
 * These refs are shared across all components that import this composable.
 * Values are automatically saved when mutated and loaded on app startup.
 */

// Create persisted refs at module scope (shared singleton pattern)
const preferredBrokerRef = usePersistedRef<ServiceEntry | null>('preferredBroker', null)

/**
 * Returns shared app-level state refs.
 * All components calling this get the same ref instances.
 */
export function useAppState() {
  return {
    preferredBrokerRef
  }
}
