<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-3">
      <h2 class="text-lg font-bold">Widget settings — {{ local.type }}</h2>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label class="flex flex-col text-xs text-gray-500 col-span-2">
          Title
          <input v-model="local.title" class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
        </label>
        <label class="flex flex-col text-xs text-gray-500">
          Unit
          <input v-model="local.unit" class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
        </label>
        <label class="flex flex-col text-xs text-gray-500">
          Decimals
          <input v-model.number="local.decimals" type="number" min="0" max="6"
                 class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
        </label>
        <template v-if="local.type === 'gauge' || local.type === 'scale'">
          <label class="flex flex-col text-xs text-gray-500">
            Min
            <input v-model.number="local.min" type="number" class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
          </label>
          <label class="flex flex-col text-xs text-gray-500">
            Max
            <input v-model.number="local.max" type="number" class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
          </label>
        </template>
        <label v-if="local.type === 'plot'" class="flex flex-col text-xs text-gray-500">
          Max points
          <input v-model.number="local.maxPoints" type="number" min="10"
                 class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
        </label>
      </div>

      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">Topic bindings</h3>
        <button class="btn btn-primary text-xs !px-2 !py-1" @click="addBinding">+ Binding</button>
      </div>

      <div v-for="(row, idx) in local.topics" :key="row.id"
           class="border border-gray-200 rounded p-2 flex flex-col gap-2 bg-gray-50">
        <div class="flex gap-2 items-end">
          <label class="flex flex-col text-xs text-gray-500 flex-1">
            Topic (MQTT filter, + / # allowed)
            <input v-model="row.topic" placeholder="garage/ble/D4155C775668"
                   class="border border-gray-300 rounded px-2 py-1 text-sm font-mono text-gray-900" />
          </label>
          <label v-if="local.type === 'plot'" class="flex flex-col text-xs text-gray-500 w-28">
            Label
            <input v-model="row.label" class="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900" />
          </label>
          <button v-if="local.topics.length > 1" class="text-gray-400 hover:text-error px-1 pb-1"
                  title="Remove binding" @click="local.topics.splice(idx, 1)">✕</button>
        </div>
        <label class="flex flex-col text-xs text-gray-500">
          Value expression (JSONata)
          <input v-model="row.valueExpr" placeholder="$  or  tempc"
                 class="border border-gray-300 rounded px-2 py-1 text-sm font-mono text-gray-900"
                 :class="exprSyntaxError(row.valueExpr) ? 'border-error' : ''" />
          <span v-if="exprSyntaxError(row.valueExpr)" class="text-error">{{ exprSyntaxError(row.valueExpr) }}</span>
        </label>
        <label class="flex flex-col text-xs text-gray-500">
          Color expression (JSONata, optional)
          <input :value="row.propExprs?.color ?? ''" @input="setColorExpr(row, $event)"
                 placeholder="hum > 60 ? 'red' : 'green'"
                 class="border border-gray-300 rounded px-2 py-1 text-sm font-mono text-gray-900"
                 :class="row.propExprs?.color && exprSyntaxError(row.propExprs.color) ? 'border-error' : ''" />
          <span v-if="row.propExprs?.color && exprSyntaxError(row.propExprs.color)" class="text-error">
            {{ exprSyntaxError(row.propExprs.color) }}
          </span>
        </label>
        <div class="flex items-center gap-2">
          <button class="btn btn-primary text-xs !px-2 !py-1" :disabled="!row.topic"
                  @click="testBinding(row)">Test</button>
          <span v-if="testResults[row.id]"
                class="text-xs font-mono truncate"
                :class="testResults[row.id]!.error ? 'text-error' : 'text-gray-600'">
            {{ testResults[row.id]!.error ?? testResults[row.id]!.text }}
          </span>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, type PropType } from 'vue'
import type { WidgetConfig, TopicBinding } from '../types/dashboard'
import { uid } from '../types/dashboard'
import { compileExpr, evalExpr } from '../composables/useJsonata'
import { useTopicRouter } from '../composables/useTopicRouter'

type TestResult = { text?: string; error?: string }

export default defineComponent({
  name: 'WidgetConfigModal',
  props: {
    widget: { type: Object as PropType<WidgetConfig>, required: true }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const router = useTopicRouter()
    // edit a deep copy; apply on save only
    const local = reactive<WidgetConfig>(JSON.parse(JSON.stringify(props.widget)))
    const testResults = reactive<Record<string, TestResult | undefined>>({})

    function exprSyntaxError(expr: string): string | null {
      if (!expr) return null
      const compiled = compileExpr(expr)
      return compiled instanceof Error ? compiled.message : null
    }

    function setColorExpr(row: TopicBinding, event: Event) {
      const value = (event.target as HTMLInputElement).value
      if (value) {
        row.propExprs = { ...(row.propExprs ?? {}), color: value }
      } else if (row.propExprs) {
        delete row.propExprs.color
        if (Object.keys(row.propExprs).length === 0) delete row.propExprs
      }
    }

    function addBinding() {
      local.topics.push({ id: uid(), topic: '', valueExpr: '$' })
    }

    async function testBinding(row: TopicBinding) {
      const cached = router.getLatest(row.topic)
      if (!cached) {
        testResults[row.id] = { error: 'No cached message for this topic yet' }
        return
      }
      const result = await evalExpr(row.valueExpr || '$', cached.payload)
      if (result.error) {
        testResults[row.id] = { error: result.error }
        return
      }
      let text = `${cached.topic} → ${JSON.stringify(result.value)}`
      if (row.propExprs?.color) {
        const colorResult = await evalExpr(row.propExprs.color, cached.payload)
        text += colorResult.error ? ` (color: ${colorResult.error})` : ` (color: ${JSON.stringify(colorResult.value)})`
      }
      testResults[row.id] = { text }
    }

    function save() {
      emit('save', JSON.parse(JSON.stringify(local)) as WidgetConfig)
    }

    return { local, testResults, exprSyntaxError, setColorExpr, addBinding, testBinding, save }
  }
})
</script>
