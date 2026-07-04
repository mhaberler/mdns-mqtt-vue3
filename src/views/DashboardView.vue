<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Dashboard toolbar -->
    <div class="bg-white border-b border-gray-200 p-2 flex flex-wrap items-center gap-2">
      <button class="btn text-sm" :class="isEditMode ? 'btn-warning' : 'btn-success'"
              @click="toggleEditMode">
        {{ isEditMode ? 'Edit mode' : 'Run mode' }}
      </button>
      <label class="flex items-center gap-1 text-xs text-gray-500">
        Layout
        <select :value="state.activeName ?? ''" @change="onSelectLayout"
                class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900">
          <option v-for="name in layoutNames" :key="name" :value="name">
            {{ name }}{{ name === state.defaultName ? ' ★' : '' }}
          </option>
        </select>
      </label>
      <button class="btn btn-primary text-xs !px-2 !py-1" @click="onSaveAs">Save as…</button>
      <button class="btn btn-primary text-xs !px-2 !py-1"
              :disabled="!state.activeName || state.activeName === state.defaultName"
              @click="onSetDefault">Set default</button>
      <button class="btn btn-danger text-xs !px-2 !py-1" :disabled="layoutNames.length <= 1"
              @click="onDeleteLayout">Delete</button>
      <template v-if="isEditMode">
        <button class="btn text-xs !px-2 !py-1" @click="onCaptureBroker" title="Store current connection on this layout">
          Link broker
        </button>
        <button class="btn text-xs !px-2 !py-1" @click="onClearBroker" title="Make layout broker-less">
          Unlink broker
        </button>
      </template>
      <span class="flex-1"></span>
      <label class="flex items-center gap-1 text-xs text-gray-500">
        <input type="checkbox" v-model="exportCreds" />
        include credentials
      </label>
      <button class="btn btn-primary text-xs !px-2 !py-1" @click="downloadExport(exportCreds)">Export</button>
      <button class="btn btn-primary text-xs !px-2 !py-1" @click="fileInput?.click()">Import</button>
      <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onImport" />
    </div>

    <!-- I + E: tab-local connection indicator -->
    <div class="px-3 py-2 text-xs border-b"
         :class="indicatorClass">
      {{ connectionIndicator.message }}
    </div>

    <div v-if="toast" class="fixed top-16 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div class="bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg">{{ toast }}</div>
    </div>

    <div class="p-2 md:p-4 flex flex-col gap-4">
      <GridSection v-for="g in grids" :key="layoutKey + ':' + g.id"
                   :grid="g" :edit-mode="isEditMode" :data-enabled="dataEnabled"
                   @delete-grid="onDeleteGrid(g.id)" />
      <div v-if="isEditMode" class="flex items-center gap-3">
        <button class="btn btn-primary text-sm" @click="addGrid">+ Add grid</button>
        <span class="text-xs text-gray-400">
          Subscriptions: {{ activeFilters.length ? activeFilters.join(', ') : 'none' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue'
import { useDashboard } from '../composables/useDashboard'
import { useTopicRouter } from '../composables/useTopicRouter'
import GridSection from '../components/GridSection.vue'

export default defineComponent({
  name: 'DashboardView',
  components: { GridSection },
  setup() {
    const {
      state, isEditMode, layoutNames, displayGrids, connectionIndicator, dataEnabled,
      activateLayout, setEditMode, saveLayoutAs, deleteLayout, setDefaultLayout,
      addGrid, deleteGrid, downloadExport, importFile,
      captureBrokerOnLayout, clearBrokerOnLayout, activeLayout
    } = useDashboard()
    const { activeFilters } = useTopicRouter()

    const grids = displayGrids
    const layoutKey = computed(() => state.value.activeName ?? '')
    const fileInput = ref<HTMLInputElement | null>(null)
    const exportCreds = ref(false)
    const toast = ref<string | null>(null)
    let toastTimer: ReturnType<typeof setTimeout> | null = null

    function showToast(msg: string) {
      toast.value = msg
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => { toast.value = null }, 3000)
    }

    const indicatorClass = computed(() => {
      switch (connectionIndicator.value.variant) {
        case 'driven': return 'bg-success/10 text-success border-success/20'
        case 'brokerless': return 'bg-primary/10 text-primary border-primary/20'
        case 'mismatch': return 'bg-error/10 text-error border-error/20'
        default: return 'bg-warning/10 text-warning border-warning/20'
      }
    })

    function toggleEditMode() {
      setEditMode(!isEditMode.value)
    }

    function onSelectLayout(event: Event) {
      const name = (event.target as HTMLSelectElement).value
      const result = activateLayout(name)
      if (result.switched) showToast(`Switching connection to ${result.layoutName}…`)
    }

    function onSaveAs() {
      const name = window.prompt('Save layout as:', state.value.activeName ?? 'default')
      if (name) saveLayoutAs(name)
    }

    function onSetDefault() {
      if (state.value.activeName) setDefaultLayout(state.value.activeName)
    }

    function onDeleteLayout() {
      const name = state.value.activeName
      if (name && window.confirm(`Delete layout "${name}"?`)) deleteLayout(name)
    }

    function onDeleteGrid(gridId: string) {
      if (window.confirm('Delete this grid and all its widgets?')) {
        deleteGrid(gridId)
      }
    }

    function onCaptureBroker() {
      captureBrokerOnLayout()
      showToast('Current broker linked to this layout')
    }

    function onClearBroker() {
      clearBrokerOnLayout()
      showToast('Layout is now broker-less')
    }

    async function onImport(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      const text = await file.text()
      const result = importFile(text)
      if (!result.ok) {
        window.alert(`Import failed: ${result.error}`)
        return
      }
      if (result.needsPassword && result.broker) {
        const pw = window.prompt(`Password for ${result.broker.username}@${result.broker.host}:`)
        if (pw) {
          result.broker.password = pw
          const layout = activeLayout.value
          if (layout?.broker) layout.broker.password = pw
        }
      }
      if (result.layoutNames.length > 0) {
        const r = activateLayout(result.layoutNames[0])
        if (r.switched) showToast(`Switching connection to ${r.layoutName}…`)
      }
    }

    // X: drive connect only when Dashboard tab mounts (preferred auto-connect runs first in App.vue)
    onMounted(() => {
      const name = state.value.activeName
      if (name) {
        const r = activateLayout(name)
        if (r.switched) showToast(`Switching connection to ${r.layoutName}…`)
      }
    })

    return {
      state, isEditMode, layoutNames, grids, layoutKey,
      connectionIndicator, indicatorClass, dataEnabled,
      activeFilters, exportCreds, fileInput, toast,
      toggleEditMode, onSelectLayout, onSaveAs, onSetDefault, onDeleteLayout, onDeleteGrid,
      onCaptureBroker, onClearBroker,
      addGrid, downloadExport, onImport
    }
  }
})
</script>
