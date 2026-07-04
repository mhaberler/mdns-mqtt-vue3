// src/types/dashboard.ts
// Dashboard data model. Broker shape reuses the app's ServiceEntry.
export type { ServiceEntry, BrokerSource } from '../composables/useAppState'
import type { ServiceEntry } from '../composables/useAppState'

export type BrokerProtocol = 'ws' | 'wss'

// Import/export synthesizes the mDNS type string from the protocol
export function serviceTypeFor(protocol: BrokerProtocol): string {
  return protocol === 'wss' ? '_mqtt-wss._tcp.' : '_mqtt-ws._tcp.'
}

export type WidgetType = 'card' | 'gauge' | 'scale' | 'plot'

export type TopicBinding = {
  id: string                          // stable uuid
  topic: string                       // MQTT filter, + / # allowed
  valueExpr: string                   // JSONata payload → value, default '$'
  label?: string                      // series/legend label (plot)
  propExprs?: Record<string, string>  // e.g. { color: "hum > 60 ? 'red' : 'green'" }
}

export type WidgetConfig = {
  id: string
  type: WidgetType
  title?: string
  topics: TopicBinding[]              // plot = one per series, others use [0]
  unit?: string
  decimals?: number
  min?: number                        // gauge/scale
  max?: number
  maxPoints?: number                  // plot ring buffer, default 600
}

export type GridItem = {
  id: string
  x: number
  y: number
  w: number
  h: number
  widget: WidgetConfig
}

export type GridDef = {
  id: string
  title?: string
  items: GridItem[]
}

export type DashboardLayout = {
  name: string
  broker?: Partial<ServiceEntry>
  grids: GridDef[]
}

export type DashboardState = {
  version: 1
  layouts: DashboardLayout[]
  activeName: string | null
  defaultName: string | null
}

export type DashboardExportFile = {
  kind: 'iot-dashboard-export'
  version: 1
  exportedAt: string
  broker?: {
    host: string
    port: number
    protocol: BrokerProtocol
    username?: string
    password?: string               // present only when export toggle enabled
    rejectUnauthorized?: boolean
  }
  layouts: DashboardLayout[]
}

export function uid(): string {
  return Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4)
}

/** Compare two broker snapshots for activation / mismatch (host+port+type). */
export function brokersMatch(
  expected: Partial<ServiceEntry> | undefined,
  live: Partial<ServiceEntry> | null | undefined
): boolean {
  if (!expected?.host || !expected?.port || !live?.host || !live?.port) return false
  const expType = expected.type ?? serviceTypeFor('ws')
  const liveType = live.type ?? serviceTypeFor('ws')
  return expected.host === live.host && expected.port === live.port && expType === liveType
}

export function brokerFromExport(b: NonNullable<DashboardExportFile['broker']>): Partial<ServiceEntry> {
  return {
    name: b.host,
    type: serviceTypeFor(b.protocol ?? 'ws'),
    host: b.host,
    port: b.port,
    username: b.username,
    password: b.password,
    rejectUnauthorized: b.rejectUnauthorized,
    source: 'manual'
  }
}

export function brokerToServiceEntry(b: Partial<ServiceEntry>): ServiceEntry | null {
  if (!b.host || !b.port) return null
  return {
    name: b.name ?? b.host,
    type: b.type ?? serviceTypeFor('ws'),
    host: b.host,
    port: b.port,
    username: b.username,
    password: b.password,
    rejectUnauthorized: b.rejectUnauthorized,
    source: b.source ?? 'manual'
  }
}

export type ConnectionIndicatorVariant = 'driven' | 'brokerless' | 'mismatch' | 'offline'

export type ConnectionIndicator = {
  variant: ConnectionIndicatorVariant
  message: string
}
