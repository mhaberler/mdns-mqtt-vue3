type ServiceEntry = {
  name: string
  type: string
  host: string
  port: number
  discovered?: boolean
  resolved?: boolean
  txtRecord?: Record<string, any>
  ipv4Addresses?: string[]
  ipv6Addresses?: string[]
}

const PREFERRED_BROKER_KEY = 'preferredBroker'
const AUTO_SCAN_KEY = 'autoScanEnabled'

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