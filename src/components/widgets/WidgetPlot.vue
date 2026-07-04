<template>
  <div class="h-full min-h-0 flex flex-col">
    <UPlotChart class="flex-1 min-h-0" :data="data" :series="series" />
    <div v-if="errorText" class="text-xs text-error truncate" :title="errorText">
      ⚠ {{ errorText }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, shallowRef, watch, type PropType } from 'vue'
import type uPlot from 'uplot'
import type { WidgetConfig } from '../../types/dashboard'
import { useWidgetBindings } from '../../composables/useWidgetBindings'
import { numericValue } from './format'
import UPlotChart from './UPlotChart.vue'

const SERIES_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4']

export default defineComponent({
  name: 'WidgetPlot',
  components: { UPlotChart },
  props: {
    widget: { type: Object as PropType<WidgetConfig>, required: true }
  },
  setup(props) {
    const { values } = useWidgetBindings(() => props.widget.topics)

    // ring buffer: xs (unix seconds) + one y-array per binding, aligned
    let xs: number[] = []
    let yss: (number | null)[][] = []
    const data = shallowRef<uPlot.AlignedData>([[], []])
    let rafPending = false

    const bindingIds = computed(() => props.widget.topics.map(t => t.id))

    const series = computed<uPlot.Series[]>(() =>
      props.widget.topics.map((t, i) => ({
        label: t.label || t.topic || `series ${i + 1}`,
        stroke: SERIES_COLORS[i % SERIES_COLORS.length],
        width: 2
      }))
    )

    function resetBuffer() {
      xs = []
      yss = bindingIds.value.map(() => [])
      data.value = [xs.slice(), ...yss.map(a => a.slice())] as uPlot.AlignedData
    }

    watch(bindingIds, resetBuffer, { immediate: true })

    function pushSample() {
      const maxPoints = props.widget.maxPoints ?? 600
      const now = Date.now() / 1000
      xs.push(now)
      bindingIds.value.forEach((id, i) => {
        yss[i].push(numericValue(values.value[id]?.value))
      })
      if (xs.length > maxPoints) {
        const drop = xs.length - maxPoints
        xs.splice(0, drop)
        yss.forEach(a => a.splice(0, drop))
      }
      if (!rafPending) {
        rafPending = true
        requestAnimationFrame(() => {
          rafPending = false
          data.value = [xs.slice(), ...yss.map(a => a.slice())] as uPlot.AlignedData
        })
      }
    }

    // any binding value update appends one sample row
    watch(values, pushSample, { deep: true })

    const errorText = computed(() => {
      for (const id of bindingIds.value) {
        const e = values.value[id]?.error
        if (e) return e
      }
      return null
    })

    return { data, series, errorText }
  }
})
</script>
