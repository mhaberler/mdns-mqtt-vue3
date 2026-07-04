<template>
  <div ref="container" class="w-full h-full min-h-0"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watch, type PropType } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

export default defineComponent({
  name: 'UPlotChart',
  props: {
    data: {
      type: Array as unknown as PropType<uPlot.AlignedData>,
      required: true
    },
    series: {
      type: Array as PropType<uPlot.Series[]>,
      required: true
    },
    plugins: {
      type: Array as PropType<uPlot.Plugin[]>,
      default: () => []
    }
  },
  setup(props) {
    const container = ref<HTMLDivElement | null>(null)
    // uPlot instance kept out of Vue reactivity
    let chart: uPlot | null = null
    let resizeObserver: ResizeObserver | null = null

    function create() {
      if (!container.value || chart) return
      const { width, height } = container.value.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      const opts: uPlot.Options = {
        width: Math.floor(width),
        height: Math.floor(height),
        series: [{}, ...props.series],
        scales: { x: { time: true } },
        legend: { show: props.series.length > 1 },
        plugins: props.plugins
      }
      chart = new uPlot(opts, props.data, container.value)
    }

    function destroy() {
      if (chart) {
        chart.destroy()
        chart = null
      }
    }

    onMounted(() => {
      create()
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        if (width <= 0 || height <= 0) return
        if (!chart) {
          create()
        } else {
          chart.setSize({ width: Math.floor(width), height: Math.floor(height) })
        }
      })
      if (container.value) resizeObserver.observe(container.value)
    })

    onBeforeUnmount(() => {
      resizeObserver?.disconnect()
      resizeObserver = null
      destroy()
    })

    watch(() => props.data, (data) => {
      chart?.setData(data)
    })

    // series set changed (binding added/removed) → rebuild chart
    watch(() => props.series, () => {
      destroy()
      create()
    })

    return { container }
  }
})
</script>
