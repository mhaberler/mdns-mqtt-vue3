// src/composables/useWidgetBindings.ts
// Per-widget glue: subscribes the widget's TopicBindings via the topic router,
// runs valueExpr/propExprs per message, exposes reactive per-binding results.
// Subscriptions follow the component lifecycle and binding-set changes.
import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import type { TopicBinding } from '../types/dashboard'
import { useTopicRouter } from './useTopicRouter'
import { evalExpr } from './useJsonata'

export type BindingValue = {
  value: unknown | null       // last successful eval
  props: Record<string, unknown>
  topic?: string              // concrete topic of last message
  ts?: number
  error?: string | null
}

export function useWidgetBindings(
  bindingsGetter: () => TopicBinding[]
): { values: Ref<Record<string, BindingValue>> } {
  const router = useTopicRouter()
  const values = ref<Record<string, BindingValue>>({})
  // binding id → unsubscribe fn
  const subs = new Map<string, () => void>()

  async function apply(binding: TopicBinding, topic: string, payload: string, ts: number) {
    const prev = values.value[binding.id]
    const result = await evalExpr(binding.valueExpr || '$', payload)
    const props: Record<string, unknown> = { ...(prev?.props ?? {}) }
    let propError: string | undefined
    if (binding.propExprs) {
      for (const [name, expr] of Object.entries(binding.propExprs)) {
        if (!expr) continue
        const r = await evalExpr(expr, payload)
        if (r.error) propError = `${name}: ${r.error}`
        else props[name] = r.value
      }
    }
    values.value[binding.id] = {
      value: result.error === undefined ? (result.value ?? null) : (prev?.value ?? null),
      props,
      topic,
      ts,
      error: result.error ?? propError ?? null
    }
  }

  function subscribeBinding(binding: TopicBinding) {
    if (!binding.topic) return
    const unsub = router.subscribe(binding.topic, (topic, payload) => {
      void apply(binding, topic, payload, Date.now())
    })
    subs.set(binding.id, unsub)
    // seed from cache so a freshly added widget renders immediately
    const cached = router.getLatest(binding.topic)
    if (cached) void apply(binding, cached.topic, cached.payload, cached.ts)
  }

  function rebuild(bindings: TopicBinding[]) {
    // tear down all and rebuild — binding edits are rare, correctness over cleverness
    for (const unsub of subs.values()) unsub()
    subs.clear()
    const wanted = bindings.filter(b => b.topic)
    const wantedIds = new Set(wanted.map(b => b.id))
    for (const id of Object.keys(values.value)) {
      if (!wantedIds.has(id)) delete values.value[id]
    }
    for (const binding of wanted) subscribeBinding(binding)
  }

  // deep watch: re-sync on any binding edit (topic/expr change ⇒ resubscribe + re-seed)
  watch(bindingsGetter, rebuild, { deep: true, immediate: true })

  onBeforeUnmount(() => {
    for (const unsub of subs.values()) unsub()
    subs.clear()
  })

  return { values }
}
