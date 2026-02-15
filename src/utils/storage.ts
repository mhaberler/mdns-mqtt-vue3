/**
 * Service entry representing an MQTT broker.
 *
 * Matching Strategy:
 * Preferred broker is matched against discovered services by comparing
 * instance name and port number.
 */
type ServiceEntry = {
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

const PREFERRED_BROKER_KEY = 'preferredBroker'
const AUTO_SCAN_KEY = 'autoScanEnabled'
const AUTO_CONNECT_KEY = 'autoConnectEnabled'

export function getPreferredBroker(): ServiceEntry | null {
  try {
    const stored = localStorage.getItem(PREFERRED_BROKER_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error loading preferred broker:', error)
    return null
  }
}

export function setPreferredBroker(broker: ServiceEntry | null): void {
  try {
    if (broker) {
      localStorage.setItem(PREFERRED_BROKER_KEY, JSON.stringify(broker))
    } else {
      localStorage.removeItem(PREFERRED_BROKER_KEY)
    }
  } catch (error) {
    console.error('Error saving preferred broker:', error)
  }
}

export function getAutoScanEnabled(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_SCAN_KEY)
    return stored ? JSON.parse(stored) : false
  } catch (error) {
    console.error('Error loading auto scan setting:', error)
    return false
  }
}

export function setAutoScanEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SCAN_KEY, JSON.stringify(enabled))
  } catch (error) {
    console.error('Error saving auto scan setting:', error)
  }
}

export function getAutoConnectEnabled(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_CONNECT_KEY)
    return stored ? JSON.parse(stored) : false
  } catch (error) {
    console.error('Error loading auto connect setting:', error)
    return false
  }
}

export function setAutoConnectEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_CONNECT_KEY, JSON.stringify(enabled))
  } catch (error) {
    console.error('Error saving auto connect setting:', error)
  }
}