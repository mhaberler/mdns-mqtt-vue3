<template>
  <div>
    <div class="flex items-center gap-2 px-1 pb-1">
      <span class="text-sm font-semibold text-gray-500 flex-1">{{ grid.title }}</span>
      <template v-if="editMode">
        <button class="btn btn-primary text-xs !px-2 !py-1" @click="add('card')">+ Card</button>
        <button class="btn btn-primary text-xs !px-2 !py-1" @click="add('gauge')">+ Gauge</button>
        <button class="btn btn-primary text-xs !px-2 !py-1" @click="add('scale')">+ Scale</button>
        <button class="btn btn-primary text-xs !px-2 !py-1" @click="add('plot')">+ Plot</button>
        <button class="btn btn-danger text-xs !px-2 !py-1" title="Delete grid"
                @click="$emit('delete-grid')">✕ Grid</button>
      </template>
    </div>
    <div ref="gridEl" class="grid-stack rounded-lg" :class="editMode ? 'bg-gray-100' : ''">
      <div v-for="item in grid.items" :key="item.id" class="grid-stack-item"
           :gs-id="item.id" :gs-x="item.x" :gs-y="item.y" :gs-w="item.w" :gs-h="item.h">
        <div class="grid-stack-item-content !overflow-visible">
          <WidgetShell :widget="item.widget" :edit-mode="editMode"
                       @configure="configItem = item"
                       @delete="removeItem(item)" />
        </div>
      </div>
    </div>
    <div v-if="grid.items.length === 0" class="text-center text-sm text-gray-400 py-6">
      {{ editMode ? 'Empty grid — add a widget above' : 'Empty grid' }}
    </div>

    <WidgetConfigModal v-if="configItem" :widget="configItem.widget"
                       @close="configItem = null" @save="applyConfig" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick, onMounted, onBeforeUnmount, type PropType } from 'vue'
import { GridStack, type GridStackNode } from 'gridstack'
import type { GridDef, GridItem, WidgetConfig, WidgetType } from '../types/dashboard'
import { useDashboard } from '../composables/useDashboard'
import WidgetShell from './WidgetShell.vue'
import WidgetConfigModal from './WidgetConfigModal.vue'

export default defineComponent({
  name: 'GridSection',
  components: { WidgetShell, WidgetConfigModal },
  props: {
    grid: { type: Object as PropType<GridDef>, required: true },
    editMode: { type: Boolean, default: false }
  },
  emits: ['delete-grid'],
  setup(props) {
    const dashboard = useDashboard()
    const gridEl = ref<HTMLDivElement | null>(null)
    const configItem = ref<GridItem | null>(null)
    // GridStack instance must stay out of Vue reactivity (proxy breaks its internals)
    let gridstack: GridStack | null = null

    function mergePositions(nodes: GridStackNode[]) {
      for (const node of nodes) {
        const item = props.grid.items.find(i => i.id === String(node.id))
        if (item) {
          item.x = node.x ?? item.x
          item.y = node.y ?? item.y
          item.w = node.w ?? item.w
          item.h = node.h ?? item.h
        }
      }
    }

    onMounted(async () => {
      await nextTick()
      if (!gridEl.value) return
      gridstack = GridStack.init({
        column: 12,
        cellHeight: 60,
        margin: 4,
        float: false,
        handle: '.widget-drag-handle',
        staticGrid: !props.editMode
      }, gridEl.value)
      gridstack.on('change', (_event: Event, nodes: GridStackNode[]) => {
        mergePositions(nodes)
      })
    })

    onBeforeUnmount(() => {
      // Vue owns the DOM — destroy engine only
      gridstack?.destroy(false)
      gridstack = null
    })

    watch(() => props.editMode, (edit) => {
      gridstack?.setStatic(!edit)
    })

    async function add(type: WidgetType) {
      const item = dashboard.addWidget(props.grid, type)
      await nextTick()
      const el = gridEl.value?.querySelector<HTMLElement>(`[gs-id="${item.id}"]`)
      if (el && gridstack) {
        gridstack.makeWidget(el)
      }
      configItem.value = item
    }

    function removeItem(item: GridItem) {
      const el = gridEl.value?.querySelector<HTMLElement>(`[gs-id="${item.id}"]`)
      if (el && gridstack) {
        gridstack.removeWidget(el, false)
      }
      dashboard.removeWidget(props.grid, item.id)
      if (configItem.value?.id === item.id) configItem.value = null
    }

    function applyConfig(updated: WidgetConfig) {
      if (configItem.value) {
        configItem.value.widget = updated
      }
      configItem.value = null
    }

    return { gridEl, configItem, add, removeItem, applyConfig }
  }
})
</script>
