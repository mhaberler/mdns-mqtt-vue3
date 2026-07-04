<template>
  <div class="flex flex-col items-center justify-center h-full">
    <svg viewBox="0 0 100 60" class="w-full h-full max-h-full">
      <!-- track: 180° arc from (10,55) to (90,55), r=40 -->
      <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#e5e7eb" stroke-width="8"
            stroke-linecap="round" />
      <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" :stroke="color" stroke-width="8"
            stroke-linecap="round" :stroke-dasharray="`${arcLength} ${ARC_TOTAL}`"
            class="transition-all duration-300" />
      <text x="50" y="48" text-anchor="middle" class="font-bold" font-size="14" :fill="color">
        {{ display }}
      </text>
      <text v-if="widget.unit" x="50" y="58" text-anchor="middle" font-size="7" fill="#9ca3af">
        {{ widget.unit }}
      </text>
      <text x="10" y="59" text-anchor="middle" font-size="5" fill="#9ca3af">{{ min }}</text>
      <text x="90" y="59" text-anchor="middle" font-size="5" fill="#9ca3af">{{ max }}</text>
    </svg>
    <div v-if="binding?.error" class="text-xs text-error truncate max-w-full" :title="binding.error">
      ⚠ {{ binding.error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'
import type { WidgetConfig } from '../../types/dashboard'
import { useWidgetBindings } from '../../composables/useWidgetBindings'
import { formatValue, numericValue } from './format'

// half-circle arc r=40 → length = π·r
const ARC_TOTAL = Math.PI * 40

export default defineComponent({
  name: 'WidgetGauge',
  props: {
    widget: { type: Object as PropType<WidgetConfig>, required: true },
    dataEnabled: { type: Boolean, default: true }
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
      if (!props.dataEnabled) return 0
      const v = numericValue(binding.value?.value)
      if (v === null || max.value === min.value) return 0
      return Math.min(1, Math.max(0, (v - min.value) / (max.value - min.value)))
    })
    const arcLength = computed(() => fraction.value * ARC_TOTAL)
    const display = computed(() =>
      props.dataEnabled ? formatValue(binding.value?.value, props.widget.decimals) : '--'
    )
    const color = computed(() => {
      const c = binding.value?.props?.color
      return typeof c === 'string' ? c : '#2196F3'
    })
    return { binding, display, color, min, max, arcLength, ARC_TOTAL }
  }
})
</script>
