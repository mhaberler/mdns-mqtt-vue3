// src/composables/useDashboard.ts
// Singleton: persisted DashboardState, named-layout CRUD, edit/run mode,
// export/import (broker credentials only via export-time toggle).
import { ref, computed, watch } from 'vue'
import { usePersistedRef } from './usePersistedRef'
import { useMqttConnection } from './useMqttConnection'
import {
  uid, serviceTypeFor,
  type DashboardState, type DashboardLayout, type GridDef, type GridItem,
  type WidgetConfig, type WidgetType, type ServiceEntry,
  type DashboardExportFile, type BrokerProtocol
} from '../types/dashboard'

function emptyLayout(name: string): DashboardLayout {
  return { name, grids: [{ id: uid(), title: 'Grid 1', items: [] }] }
}

function defaultState(): DashboardState {
  return { version: 1, layouts: [emptyLayout('default')], activeName: 'default', defaultName: 'default' }
}

const state = usePersistedRef<DashboardState>('dashboardState', defaultState())
const isEditMode = ref(false)

// Activate the default layout once the persisted state loads (shallow watch:
// fires on the ref replacement done by usePersistedRef, not on user edits).
let defaultRestored = false
watch(state, () => {
  if (defaultRestored) return
  defaultRestored = true
  restoreDefault()
})

const activeLayout = computed<DashboardLayout | null>(() => {
  const s = state.value
  return s.layouts.find(l => l.name === s.activeName)
    ?? s.layouts.find(l => l.name === s.defaultName)
    ?? s.layouts[0]
    ?? null
})

const layoutNames = computed(() => state.value.layouts.map(l => l.name))

function activateLayout(name: string) {
  if (state.value.layouts.some(l => l.name === name)) {
    state.value.activeName = name
  }
}

function saveLayoutAs(name: string) {
  const current = activeLayout.value
  if (!current || !name.trim()) return
  const copy: DashboardLayout = JSON.parse(JSON.stringify({ ...current, name: name.trim() }))
  const idx = state.value.layouts.findIndex(l => l.name === copy.name)
  if (idx >= 0) state.value.layouts[idx] = copy
  else state.value.layouts.push(copy)
  state.value.activeName = copy.name
}

function deleteLayout(name: string) {
  const s = state.value
  s.layouts = s.layouts.filter(l => l.name !== name)
  if (s.layouts.length === 0) s.layouts.push(emptyLayout('default'))
  if (s.defaultName === name) s.defaultName = s.layouts[0].name
  if (s.activeName === name) s.activeName = s.defaultName
}

function setDefaultLayout(name: string) {
  if (state.value.layouts.some(l => l.name === name)) {
    state.value.defaultName = name
  }
}

// On startup, activate the default layout
function restoreDefault() {
  const s = state.value
  if (s.defaultName && s.layouts.some(l => l.name === s.defaultName)) {
    s.activeName = s.defaultName
  }
}

// --- grids ---

function addGrid() {
  const layout = activeLayout.value
  if (!layout) return
  layout.grids.push({ id: uid(), title: `Grid ${layout.grids.length + 1}`, items: [] })
}

function deleteGrid(gridId: string) {
  const layout = activeLayout.value
  if (!layout) return
  layout.grids = layout.grids.filter(g => g.id !== gridId)
}

// --- widgets ---

const WIDGET_DEFAULTS: Record<WidgetType, { w: number; h: number }> = {
  card: { w: 3, h: 2 },
  gauge: { w: 3, h: 3 },
  scale: { w: 4, h: 2 },
  plot: { w: 6, h: 3 }
}

function addWidget(grid: GridDef, type: WidgetType): GridItem {
  const widget: WidgetConfig = {
    id: uid(),
    type,
    title: type,
    topics: [{ id: uid(), topic: '', valueExpr: '$' }]
  }
  if (type === 'gauge' || type === 'scale') {
    widget.min = 0
    widget.max = 100
  }
  const size = WIDGET_DEFAULTS[type]
  const item: GridItem = {
    id: widget.id,
    x: (grid.items.length * size.w) % 12,
    y: 1000, // gridstack places at bottom
    w: size.w,
    h: size.h,
    widget
  }
  grid.items.push(item)
  return item
}

function removeWidget(grid: GridDef, itemId: string) {
  grid.items = grid.items.filter(i => i.id !== itemId)
}

// --- broker snapshot in layout / export ---

function protocolOf(broker: Partial<ServiceEntry>): BrokerProtocol {
  return broker.type?.includes('wss') ? 'wss' : 'ws'
}

function snapshotBroker(): Partial<ServiceEntry> | undefined {
  const { connectedBroker } = useMqttConnection()
  if (!connectedBroker.value) return undefined
  const b = connectedBroker.value
  return {
    name: b.name, type: b.type, host: b.host, port: b.port,
    username: b.username, rejectUnauthorized: b.rejectUnauthorized
  }
}

// --- export / import ---

function exportFile(includeCredentials: boolean): DashboardExportFile {
  const { connectedBroker } = useMqttConnection()
  const layout = activeLayout.value
  const file: DashboardExportFile = {
    kind: 'iot-dashboard-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    layouts: layout ? [JSON.parse(JSON.stringify(layout))] : []
  }
  const b = connectedBroker.value ?? (layout?.broker as ServiceEntry | undefined)
  if (b && b.host && b.port) {
    file.broker = {
      host: b.host,
      port: b.port,
      protocol: protocolOf(b),
      username: b.username,
      rejectUnauthorized: b.rejectUnauthorized
    }
    if (includeCredentials && b.password) file.broker.password = b.password
  }
  return file
}

function downloadExport(includeCredentials: boolean) {
  const file = exportFile(includeCredentials)
  const name = activeLayout.value?.name ?? 'dashboard'
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dashboard-${name}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportResult =
  | { ok: true; needsPassword: boolean; broker?: ServiceEntry; layoutNames: string[] }
  | { ok: false; error: string }

/** Parse + apply an export file. Returns broker (if any) so caller can
 *  prompt for a missing password before connecting. */
function importFile(text: string): ImportResult {
  let parsed: DashboardExportFile
  try {
    parsed = JSON.parse(text)
  } catch (_) {
    return { ok: false, error: 'Not valid JSON' }
  }
  if (parsed.kind !== 'iot-dashboard-export' || parsed.version !== 1) {
    return { ok: false, error: 'Not an iot-dashboard export file (kind/version mismatch)' }
  }
  if (!Array.isArray(parsed.layouts)) {
    return { ok: false, error: 'Export file has no layouts' }
  }
  const imported: string[] = []
  for (const layout of parsed.layouts) {
    if (!layout?.name || !Array.isArray(layout.grids)) continue
    const idx = state.value.layouts.findIndex(l => l.name === layout.name)
    if (idx >= 0) state.value.layouts[idx] = layout
    else state.value.layouts.push(layout)
    imported.push(layout.name)
  }
  if (imported.length > 0) state.value.activeName = imported[0]

  let broker: ServiceEntry | undefined
  let needsPassword = false
  if (parsed.broker?.host && parsed.broker?.port) {
    broker = {
      name: parsed.broker.host,
      type: serviceTypeFor(parsed.broker.protocol ?? 'ws'),
      host: parsed.broker.host,
      port: parsed.broker.port,
      username: parsed.broker.username,
      password: parsed.broker.password,
      rejectUnauthorized: parsed.broker.rejectUnauthorized,
      source: 'manual'
    }
    needsPassword = !!broker.username && !broker.password
  }
  return { ok: true, needsPassword, broker, layoutNames: imported }
}

export function useDashboard() {
  return {
    state,
    isEditMode,
    activeLayout,
    layoutNames,
    activateLayout,
    saveLayoutAs,
    deleteLayout,
    setDefaultLayout,
    restoreDefault,
    addGrid,
    deleteGrid,
    addWidget,
    removeWidget,
    snapshotBroker,
    downloadExport,
    importFile
  }
}
