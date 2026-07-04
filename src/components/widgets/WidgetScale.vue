<template>
  <div class="flex flex-col justify-center h-full gap-1 px-1">
    <div class="flex items-baseline justify-between">
      <span class="text-lg font-bold" :style="{ color: color }">
        {{ display }}<span v-if="widget.unit" class="text-xs font-normal ml-1">{{ widget.unit }}</span>
      </span>
    </div>
    <div class="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
      <div class="h-full rounded-full transition-all duration-300"
           :style="{ width: `${fraction * 100}%`, backgroundColor: color }"></div>
    </div>
    <div class="flex justify-between text-xs text-gray-400">
      <span>{{ min }}</span>
      <span>{{ max }}</span>
    </div>
    <div v-if="binding?.error" class="text-xs text-error truncate" :title="binding.error">
      ⚠ {{ binding.error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'
import type { WidgetConfig } from '../../types/dashboard'
import { useWidgetBindings } from '../../composables/useWidgetBindings'
import { formatValue, numericValue } from './format'

export default defineComponent({
  name: 'WidgetScale',
  props: {
    widget: { type: Object as PropType<WidgetConfig>, required: true }
  },
  setup(props) {
    const { values } = useWidgetBindings(() => props.widget.topics)
    const binding = computed(() => {
      const first = props.widget.topics[0]
      return first ? values.value[first.id] : undefined
    })
    const min = computed(() => props.widget.min ?? 0)
    const max = computed(() => props.widget.max ?? 100)
    const fraction = computed(() => {
      const v = numericValue(binding.value?.value)
      if (v === null || max.value === min.value) return 0
      return Math.min(1, Math.max(0, (v - min.value) / (max.value - min.value)))
    })
    const display = computed(() => formatValue(binding.value?.value, props.widget.decimals))
    const color = computed(() => {
      const c = binding.value?.props?.color
      return typeof c === 'string' ? c : '#2196F3'
    })
    return { binding, display, color, min, max, fraction }
  }
})
</script>
