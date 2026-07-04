<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Dashboard toolbar -->
    <div class="bg-white border-b border-gray-200 p-2 flex flex-wrap items-center gap-2">
      <button class="btn text-sm" :class="isEditMode ? 'btn-warning' : 'btn-success'"
              @click="isEditMode = !isEditMode">
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
      <span class="flex-1"></span>
      <label class="flex items-center gap-1 text-xs text-gray-500">
        <input type="checkbox" v-model="exportCreds" />
        include credentials
      </label>
      <button class="btn btn-primary text-xs !px-2 !py-1" @click="downloadExport(exportCreds)">Export</button>
      <button class="btn btn-primary text-xs !px-2 !py-1" @click="fileInput?.click()">Import</button>
      <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onImport" />
    </div>

    <div v-if="!isConnected" class="px-3 py-2 text-xs text-warning bg-warning/10">
      Not connected — pick a broker on the Scanner tab (or import a layout with broker info).
    </div>

    <div class="p-2 md:p-4 flex flex-col gap-4">
      <GridSection v-for="g in grids" :key="layoutKey + ':' + g.id"
                   :grid="g" :edit-mode="isEditMode"
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
import { defineComponent, computed, ref } from 'vue'
import { useDashboard } from '../composables/useDashboard'
import { useTopicRouter } from '../composables/useTopicRouter'
import { useMqttConnection } from '../composables/useMqttConnection'
import GridSection from '../components/GridSection.vue'

export default defineComponent({
  name: 'DashboardView',
  components: { GridSection },
  setup() {
    const {
      state, isEditMode, activeLayout, layoutNames,
      activateLayout, saveLayoutAs, deleteLayout, setDefaultLayout,
      addGrid, deleteGrid, downloadExport, importFile
    } = useDashboard()
    const { activeFilters } = useTopicRouter()
    const conn = useMqttConnection()

    const grids = computed(() => activeLayout.value?.grids ?? [])
    const layoutKey = computed(() => activeLayout.value?.name ?? '')
    const fileInput = ref<HTMLInputElement | null>(null)
    const exportCreds = ref(false)

    function onSelectLayout(event: Event) {
      activateLayout((event.target as HTMLSelectElement).value)
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
      if (result.broker) {
        if (result.needsPassword) {
          const pw = window.prompt(`Password for ${result.broker.username}@${result.broker.host}:`)
          if (pw) result.broker.password = pw
        }
        conn.connect(result.broker)
      }
    }

    return {
      state, isEditMode, layoutNames, grids, layoutKey,
      isConnected: conn.isConnected,
      activeFilters, exportCreds, fileInput,
      onSelectLayout, onSaveAs, onSetDefault, onDeleteLayout, onDeleteGrid,
      addGrid, downloadExport, onImport
    }
  }
})
</script>
