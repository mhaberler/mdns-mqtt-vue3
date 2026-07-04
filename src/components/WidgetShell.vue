<template>
  <div class="flex flex-col h-full bg-white rounded-lg shadow overflow-hidden">
    <div class="widget-drag-handle flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-200 select-none"
         :class="editMode ? 'cursor-move' : ''">
      <span class="text-xs font-medium text-gray-600 truncate flex-1">{{ widget.title || widget.type }}</span>
      <template v-if="editMode">
        <button class="text-gray-400 hover:text-primary text-sm leading-none px-1"
                title="Configure" @click="$emit('configure')">⚙</button>
        <button class="text-gray-400 hover:text-error text-sm leading-none px-1"
                title="Delete" @click="$emit('delete')">✕</button>
      </template>
    </div>
    <div class="flex-1 min-h-0 p-1">
      <component :is="widgetComponent" :widget="widget" :data-enabled="dataEnabled" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'
import type { WidgetConfig } from '../types/dashboard'
import WidgetCard from './widgets/WidgetCard.vue'
import WidgetGauge from './widgets/WidgetGauge.vue'
import WidgetScale from './widgets/WidgetScale.vue'
import WidgetPlot from './widgets/WidgetPlot.vue'

const WIDGET_COMPONENTS = {
  card: WidgetCard,
  gauge: WidgetGauge,
  scale: WidgetScale,
  plot: WidgetPlot
} as const

export default defineComponent({
  name: 'WidgetShell',
  props: {
    widget: { type: Object as PropType<WidgetConfig>, required: true },
    editMode: { type: Boolean, default: false },
    dataEnabled: { type: Boolean, default: true }
  },
  emits: ['configure', 'delete'],
  setup(props) {
    const widgetComponent = computed(() => WIDGET_COMPONENTS[props.widget.type] ?? WidgetCard)
    return { widgetComponent }
  }
})
</script>
