<template>
  <div class="flex flex-col items-center justify-center h-full gap-1">
    <div class="text-3xl font-bold leading-none" :style="{ color: color }">
      {{ display }}<span v-if="widget.unit" class="text-base font-normal ml-1">{{ widget.unit }}</span>
    </div>
    <div v-if="binding?.error" class="text-xs text-error truncate max-w-full" :title="binding.error">
      ⚠ {{ binding.error }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'
import type { WidgetConfig } from '../../types/dashboard'
import { useWidgetBindings } from '../../composables/useWidgetBindings'
import { formatValue } from './format'

export default defineComponent({
  name: 'WidgetCard',
  props: {
    widget: { type: Object as PropType<WidgetConfig>, required: true }
  },
  setup(props) {
    const { values } = useWidgetBindings(() => props.widget.topics)
    const binding = computed(() => {
      const first = props.widget.topics[0]
      return first ? values.value[first.id] : undefined
    })
    const display = computed(() => formatValue(binding.value?.value, props.widget.decimals))
    const color = computed(() => {
      const c = binding.value?.props?.color
      return typeof c === 'string' ? c : 'inherit'
    })
    return { binding, display, color }
  }
})
</script>
