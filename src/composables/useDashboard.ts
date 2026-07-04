// src/composables/useDashboard.ts
// Singleton: persisted DashboardState, named-layout CRUD, edit/run mode,
// export/import (broker credentials only via export-time toggle).
// Behavioral: T1/P activation drives connect; L draft commit on leave edit;
// I/E connection indicator + data gating for widgets.
import { ref, computed, watch } from 'vue'
import { usePersistedRef } from './usePersistedRef'
import { useMqttConnection } from './useMqttConnection'
import {
  uid, serviceTypeFor, brokersMatch, brokerFromExport, brokerToServiceEntry,
  type DashboardState, type DashboardLayout, type GridDef, type GridItem,
  type WidgetConfig, type WidgetType, type ServiceEntry,
  type DashboardExportFile, type BrokerProtocol, type ConnectionIndicator
} from '../types/dashboard'

function emptyLayout(name: string): DashboardLayout {
  return { name, grids: [{ id: uid(), title: 'Grid 1', items: [] }] }
}

function defaultState(): DashboardState {
  return { version: 1, layouts: [emptyLayout('default')], activeName: 'default', defaultName: 'default' }
}

function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return JSON.parse(JSON.stringify(layout))
}

const state = usePersistedRef<DashboardState>('dashboardState', defaultState())
const isEditMode = ref(false)
// L: in-memory draft while editing — positions/widgets mutate here until leave edit
const layoutDraft = ref<DashboardLayout | null>(null)

const activeLayout = computed<DashboardLayout | null>(() => {
  const s = state.value
  return s.layouts.find(l => l.name === s.activeName)
    ?? s.layouts.find(l => l.name === s.defaultName)
    ?? s.layouts[0]
    ?? null
})

const layoutNames = computed(() => state.value.layouts.map(l => l.name))

/** Grids bound by the view: draft while editing, persisted layout in run mode. */
const displayGrids = computed(() => getWorkingLayout()?.grids ?? [])

function getWorkingLayout(): DashboardLayout | null {
  if (isEditMode.value && layoutDraft.value) return layoutDraft.value
  return activeLayout.value
}

function beginEditDraft() {
  if (activeLayout.value) {
    layoutDraft.value = cloneLayout(activeLayout.value)
  }
}

function commitDraft() {
  if (!layoutDraft.value || !state.value.activeName) return
  const idx = state.value.layouts.findIndex(l => l.name === state.value.activeName)
  if (idx >= 0) {
    state.value.layouts[idx] = cloneLayout(layoutDraft.value)
  }
  layoutDraft.value = null
}

function setEditMode(edit: boolean) {
  if (edit === isEditMode.value) return
  if (edit) {
    beginEditDraft()
    isEditMode.value = true
  } else {
    commitDraft()
    isEditMode.value = false
  }
}

function protocolOf(broker: Partial<ServiceEntry>): BrokerProtocol {
  return broker.type?.includes('wss') ? 'wss' : 'ws'
}

/** P + T1: connect to layout.broker when present and different from live. B1: skip if absent. */
function driveConnectionForLayout(layout: DashboardLayout | null): boolean {
  if (!layout?.broker?.host || !layout.broker?.port) return false
  const want = brokerToServiceEntry(layout.broker)
  if (!want) return false
  const conn = useMqttConnection()
  if (brokersMatch(layout.broker, conn.connectedBroker.value)) return false
  conn.connect(want)
  return true
}

export type ActivateResult = { switched: boolean; layoutName: string }

/** T1: picker selection is activation — scene switch + optional connect (P, B1). */
function activateLayout(name: string): ActivateResult {
  const empty: ActivateResult = { switched: false, layoutName: name }
  if (!state.value.layouts.some(l => l.name === name)) return empty

  if (isEditMode.value) commitDraft()

  state.value.activeName = name

  if (isEditMode.value) beginEditDraft()

  const layout = activeLayout.value
  const switched = driveConnectionForLayout(layout)
  return { switched, layoutName: name }
}

function saveLayoutAs(name: string) {
  const current = getWorkingLayout()
  if (!current || !name.trim()) return
  const copy = cloneLayout({ ...current, name: name.trim() })
  const idx = state.value.layouts.findIndex(l => l.name === copy.name)
  if (idx >= 0) state.value.layouts[idx] = copy
  else state.value.layouts.push(copy)
  state.value.activeName = copy.name
  if (isEditMode.value) layoutDraft.value = cloneLayout(copy)
}

function deleteLayout(name: string) {
  const s = state.value
  s.layouts = s.layouts.filter(l => l.name !== name)
  if (s.layouts.length === 0) s.layouts.push(emptyLayout('default'))
  if (s.defaultName === name) s.defaultName = s.layouts[0].name
  if (s.activeName === name) {
    s.activeName = s.defaultName
    if (isEditMode.value) beginEditDraft()
  }
}

function setDefaultLayout(name: string) {
  if (state.value.layouts.some(l => l.name === name)) {
    state.value.defaultName = name
  }
}

// On startup restore active name only — connect waits for Dashboard mount (X)
let defaultRestored = false
watch(state, () => {
  if (defaultRestored) return
  defaultRestored = true
  restoreDefault()
})

function restoreDefault() {
  const s = state.value
  if (s.defaultName && s.layouts.some(l => l.name === s.defaultName)) {
    s.activeName = s.defaultName
  }
}

// --- I + E: tab-local connection indicator ---

const connectionIndicator = computed<ConnectionIndicator>(() => {
  const layout = activeLayout.value
  const conn = useMqttConnection()
  const live = conn.connectedBroker.value
  const connected = conn.isConnected.value
  const layoutName = layout?.name ?? 'layout'

  if (!layout?.broker?.host) {
    if (!connected) {
      return { variant: 'offline', message: 'No connection — widgets wait for data' }
    }
    return {
      variant: 'brokerless',
      message: `Using current connection (${live!.host}:${live!.port})`
    }
  }

  const exp = layout.broker
  if (!connected) {
    return {
      variant: 'offline',
      message: `${layoutName} expects ${exp.host}:${exp.port} — not connected`
    }
  }
  if (!brokersMatch(exp, live)) {
    return {
      variant: 'mismatch',
      message: `${layoutName} expects ${exp.host}:${exp.port}, now on ${live!.host}:${live!.port}`
    }
  }
  return {
    variant: 'driven',
    message: `Data from: ${layoutName} (${exp.host}:${exp.port})`
  }
})

/** D + E: suppress widget values on offline/mismatch; broker-less uses live conn. */
const dataEnabled = computed(() => {
  const v = connectionIndicator.value.variant
  return v === 'driven' || v === 'brokerless'
})

// --- grids ---

function addGrid() {
  const layout = getWorkingLayout()
  if (!layout) return
  layout.grids.push({ id: uid(), title: `Grid ${layout.grids.length + 1}`, items: [] })
}

function deleteGrid(gridId: string) {
  const layout = getWorkingLayout()
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
    y: 1000,
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

function snapshotBroker(): Partial<ServiceEntry> | undefined {
  const { connectedBroker } = useMqttConnection()
  if (!connectedBroker.value) return undefined
  const b = connectedBroker.value
  return {
    name: b.name, type: b.type, host: b.host, port: b.port,
    username: b.username, rejectUnauthorized: b.rejectUnauthorized
  }
}

/** Attach current live broker to the active layout (B1 opt-in capture). */
function captureBrokerOnLayout() {
  const layout = getWorkingLayout()
  const snap = snapshotBroker()
  if (layout && snap) layout.broker = snap
}

function clearBrokerOnLayout() {
  const layout = getWorkingLayout()
  if (layout) delete layout.broker
}

// --- export / import ---

function exportFile(includeCredentials: boolean): DashboardExportFile {
  const { connectedBroker } = useMqttConnection()
  const layout = activeLayout.value
  const file: DashboardExportFile = {
    kind: 'iot-dashboard-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    layouts: layout ? [cloneLayout(layout)] : []
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

function importFile(text: string): ImportResult {
  let parsed: DashboardExportFile
  try {
    parsed = JSON.parse(text)
  } catch (_) {
    return { ok: false, error: 'Not valid JSON' }
  }
  if (parsed.kind !== 'iot-dashboard-export' && parsed.kind !== 'mqtt-dashboard-export') {
    return { ok: false, error: 'Not an iot-dashboard export file (kind/version mismatch)' }
  }
  if (parsed.version !== 1) {
    return { ok: false, error: 'Unsupported export version' }
  }
  if (!Array.isArray(parsed.layouts)) {
    return { ok: false, error: 'Export file has no layouts' }
  }

  const rootBroker = parsed.broker ? brokerFromExport(parsed.broker) : undefined

  const imported: string[] = []
  for (const layout of parsed.layouts) {
    if (!layout?.name || !Array.isArray(layout.grids)) continue
    if (!layout.broker && rootBroker) layout.broker = { ...rootBroker }
    const idx = state.value.layouts.findIndex(l => l.name === layout.name)
    if (idx >= 0) state.value.layouts[idx] = layout
    else state.value.layouts.push(layout)
    imported.push(layout.name)
  }

  let broker: ServiceEntry | undefined
  let needsPassword = false
  if (rootBroker?.host && rootBroker?.port) {
    broker = brokerToServiceEntry(rootBroker) ?? undefined
    needsPassword = !!broker?.username && !broker?.password
  }

  return { ok: true, needsPassword, broker, layoutNames: imported }
}

export function useDashboard() {
  return {
    state,
    isEditMode,
    activeLayout,
    displayGrids,
    layoutNames,
    connectionIndicator,
    dataEnabled,
    activateLayout,
    setEditMode,
    saveLayoutAs,
    deleteLayout,
    setDefaultLayout,
    restoreDefault,
    addGrid,
    deleteGrid,
    addWidget,
    removeWidget,
    snapshotBroker,
    captureBrokerOnLayout,
    clearBrokerOnLayout,
    downloadExport,
    importFile
  }
}
