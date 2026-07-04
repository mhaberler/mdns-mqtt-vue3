// src/composables/useTopicRouter.ts
// Singleton: ref-counted MQTT filter registry with wildcard dispatch and a
// latest-value cache (seeds newly added widgets, powers expr test-eval).
import { computed, ref } from 'vue'
import { useMqttConnection, type RawMessageHandler } from './useMqttConnection'

export function topicMatches(filter: string, topic: string): boolean {
  const f = filter.split('/'), t = topic.split('/')
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true
    if (t[i] === undefined || (f[i] !== '+' && f[i] !== t[i])) return false
  }
  return f.length === t.length
}

export type CachedMessage = { topic: string; payload: string; ts: number }

const CACHE_CAP = 500

// filter → handlers (ref-count = set size)
const registry = new Map<string, Set<RawMessageHandler>>()
// concrete topic → latest payload (insertion order used for eviction)
const latestCache = new Map<string, CachedMessage>()
// bumped on registry mutation so activeFilters stays reactive
const filtersVersion = ref(0)

let wired = false

function wire() {
  if (wired) return
  wired = true
  const conn = useMqttConnection()
  conn.onMessage((topic, payload) => {
    // update cache (delete+set keeps Map insertion order ≈ recency for eviction)
    latestCache.delete(topic)
    latestCache.set(topic, { topic, payload, ts: Date.now() })
    if (latestCache.size > CACHE_CAP) {
      const oldest = latestCache.keys().next().value
      if (oldest !== undefined) latestCache.delete(oldest)
    }
    for (const [filter, handlers] of registry) {
      if (topicMatches(filter, topic)) {
        handlers.forEach(h => h(topic, payload))
      }
    }
  })
}

function subscribe(filter: string, handler: RawMessageHandler): () => void {
  wire()
  const conn = useMqttConnection()
  let handlers = registry.get(filter)
  if (!handlers) {
    handlers = new Set()
    registry.set(filter, handlers)
    conn.subscribeTopic(filter)
    filtersVersion.value++
  }
  handlers.add(handler)
  return () => {
    const set = registry.get(filter)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) {
      registry.delete(filter)
      conn.unsubscribeTopic(filter)
      filtersVersion.value++
    }
  }
}

function getLatest(filter: string): CachedMessage | null {
  let newest: CachedMessage | null = null
  for (const msg of latestCache.values()) {
    if (topicMatches(filter, msg.topic) && (!newest || msg.ts > newest.ts)) {
      newest = msg
    }
  }
  return newest
}

const activeFilters = computed(() => {
  void filtersVersion.value
  return Array.from(registry.keys())
})

export function useTopicRouter() {
  wire()
  return { subscribe, getLatest, activeFilters, topicMatches }
}
