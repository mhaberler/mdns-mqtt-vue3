// src/composables/useMqttConnection.ts
import { ref, computed, type Ref } from 'vue'
import mqtt, { type MqttClient } from 'mqtt'
import type { ServiceEntry } from './useAppState'
import { useMqttDiscovery } from './useMqttDiscovery'

export type ConnectionState = 'disconnected' | 'trying' | 'connected'

export type MessageItem = {
  id: string
  topic: string
  payload: string
  timestamp: string
}

export type RawMessageHandler = (topic: string, payload: string) => void

// Protocol helpers (shared with MQTTClientView)
const wsPatterns = ['_mqtt-ws._tcp.', '_mqtt-wss._tcp.', '._mqtt-ws._tcp', '._mqtt-wss._tcp']
const tlsPatterns = ['_mqtts._tcp.', '_mqtt-wss._tcp.', '._mqtts._tcp.', '._mqtt-wss._tcp.']

function isWebSocketType(type: string): boolean {
  return wsPatterns.some(p => type.includes(p))
}

function isTlsType(type: string): boolean {
  return tlsPatterns.some(p => type.includes(p))
}

export function buildBrokerUrl(broker: ServiceEntry): string {
  const isWs = isWebSocketType(broker.type)
  const isTls = isTlsType(broker.type)
  if (isWs) {
    return `${isTls ? 'wss' : 'ws'}://${broker.host}:${broker.port}`
  }
  return `${isTls ? 'mqtts' : 'mqtt'}://${broker.host}:${broker.port}`
}

function buildConnectUrl(broker: ServiceEntry): string {
  const base = buildBrokerUrl(broker)
  if (isWebSocketType(broker.type)) {
    const wsPath = broker.txtRecord?.path || '/mqtt'
    return `${base}${wsPath}`
  }
  return base
}

// --- Singleton state (survives across view navigations) ---
const connectionState = ref<ConnectionState>('disconnected')
const error = ref<string | null>(null)
const messages = ref<MessageItem[]>([])
const connectedBroker = ref<ServiceEntry | null>(null)
let mqttClient: MqttClient | null = null
let connectionTimeout: ReturnType<typeof setTimeout> | null = null
let suspendedBroker: ServiceEntry | null = null

// Dashboard routing layer: desired filters kept while disconnected,
// (re-)issued on every connect. Additive — the '#' subscribe for the
// MQTT Client view is unaffected.
const subscribedFilters = new Set<string>()
const messageHandlers = new Set<RawMessageHandler>()
const reconnectHandlers = new Set<() => void>()

const MESSAGE_CAP = 10

function addMessage(topic: string, payload: string) {
  const timestamp = new Date().toLocaleTimeString()
  const newMsg: MessageItem = {
    id: `${timestamp}-${Math.random().toString(16).substr(2, 8)}`,
    topic,
    payload,
    timestamp
  }
  messages.value = [newMsg, ...messages.value].slice(0, MESSAGE_CAP)
}

function clearMessages() {
  messages.value = []
}

function onMessage(handler: RawMessageHandler): () => void {
  messageHandlers.add(handler)
  return () => messageHandlers.delete(handler)
}

function onReconnect(handler: () => void): () => void {
  reconnectHandlers.add(handler)
  return () => reconnectHandlers.delete(handler)
}

function subscribeTopic(filter: string) {
  if (subscribedFilters.has(filter)) return
  subscribedFilters.add(filter)
  if (mqttClient && connectionState.value === 'connected') {
    mqttClient.subscribe(filter, (err) => {
      if (err) error.value = `Failed to subscribe ${filter}: ${err.message}`
    })
  }
}

function unsubscribeTopic(filter: string) {
  if (!subscribedFilters.delete(filter)) return
  if (mqttClient && connectionState.value === 'connected') {
    mqttClient.unsubscribe(filter)
  }
}

function cleanup() {
  if (connectionTimeout) {
    clearTimeout(connectionTimeout)
    connectionTimeout = null
  }
  if (mqttClient) {
    try {
      mqttClient.removeAllListeners()
      mqttClient.end(true)
    } catch (_) { /* ignore */ }
    mqttClient = null
  }
  // clearMessages()
}

// Derive how the broker was sourced. Query-param-reconstructed brokers carry only
// `discovered` (no `source`), so fall back to it — matches sourceOf() in ScannerView.
function derivedSource(broker: ServiceEntry): string {
  if (broker.source) return broker.source
  if (broker.discovered) return 'discovered'
  return 'preconfigured'
}

// For a discovered broker, the persisted host is volatile (Android NSD yields IPs that
// change between runs). Re-source host+port from the live discovered list by broker
// identity (name + type). Returns the broker unchanged if not discovered, or if no live
// match exists (caller proceeds with whatever host it has).
function withLiveHost(broker: ServiceEntry): ServiceEntry {
  if (derivedSource(broker) !== 'discovered') return broker
  const live = useMqttDiscovery().liveHostFor(broker.name, broker.type)
  if (!live) return broker
  return { ...broker, host: live.host, port: live.port }
}

function connect(brokerArg: ServiceEntry) {
  const broker = withLiveHost(brokerArg)

  // If already connected to the same broker, do nothing
  if (
    mqttClient &&
    connectionState.value === 'connected' &&
    connectedBroker.value &&
    connectedBroker.value.host === broker.host &&
    connectedBroker.value.port === broker.port &&
    connectedBroker.value.type === broker.type
  ) {
    return
  }

  // Disconnect any existing connection first
  cleanup()

  connectionState.value = 'trying'
  error.value = null
  connectedBroker.value = broker

  try {                                          // <-- ADD
    const url = buildConnectUrl(broker)
    console.log('MQTT connecting to:', url)

    const options: Record<string, unknown> = {
      clientId: `mqtt_vue_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 3000
    }

    if (broker.username) options.username = broker.username
    if (broker.password) options.password = broker.password

    if (isTlsType(broker.type)) {
      options.rejectUnauthorized = broker.rejectUnauthorized !== false
    }

    mqttClient = mqtt.connect(url, options)

    mqttClient.on('connect', () => {
      connectionState.value = 'connected'
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
        connectionTimeout = null
      }

      mqttClient!.subscribe('#', (err) => {
        if (err) {
          error.value = `Failed to subscribe: ${err.message}`
        } else {
          addMessage('system', `Connected and subscribed to all topics (#)`)
        }
      })

      // Re-issue dashboard filter subscriptions (fresh connect and reconnect)
      for (const filter of subscribedFilters) {
        mqttClient!.subscribe(filter, (err) => {
          if (err) error.value = `Failed to subscribe ${filter}: ${err.message}`
        })
      }
      reconnectHandlers.forEach(h => h())
    })

    mqttClient.on('error', (err: Error) => {
      error.value = `Connection failed: ${err?.message || 'Unknown error'}`
      connectionState.value = 'disconnected'
    })

    mqttClient.on('close', () => {
      connectionState.value = 'disconnected'
      addMessage('system', 'Connection closed')
    })

    mqttClient.on('message', (topic: string, message: Buffer) => {
      const messageStr = message.toString()
      messageHandlers.forEach(h => h(topic, messageStr))
      let payload: string
      try {
        const parsed = JSON.parse(messageStr)
        payload = JSON.stringify(parsed, null, 2)
      } catch (_) {
        payload = messageStr
      }
      addMessage(topic, payload)
    })

    // 15s hard timeout
    connectionTimeout = setTimeout(() => {
      if (connectionState.value === 'trying') {
        error.value = 'Connection timeout — check broker address and port'
        connectionState.value = 'disconnected'
        cleanup()
      }
    }, 15000)
  } catch (err: unknown) {                       // <-- ADD
    const msg = err instanceof Error ? err.message : 'Unknown error'
    error.value = `Connection failed: ${msg}`
    connectionState.value = 'disconnected'
    connectedBroker.value = null
  }                                              // <-- ADD
}

function disconnect() {
  cleanup()
  connectionState.value = 'disconnected'
  connectedBroker.value = null
  suspendedBroker = null // manual disconnect — no auto-resume
  addMessage('system', 'Disconnected from broker')
}

/**
 * Gracefully pause the connection (app going to background).
 * Preserves connectedBroker identity so UI still shows which broker was active.
 */
function pause() {
  if (connectionState.value === 'disconnected' && !suspendedBroker) return
  if (connectedBroker.value) {
    suspendedBroker = { ...connectedBroker.value }
  }
  cleanup()
  connectionState.value = 'disconnected'
  addMessage('system', 'Paused (app backgrounded)')
}

/**
 * Resume connection after returning to foreground.
 * Only reconnects if pause() saved a broker and no manual disconnect occurred.
 */
function resume() {
  if (!suspendedBroker || connectionState.value !== 'disconnected') return
  const broker = suspendedBroker
  suspendedBroker = null
  addMessage('system', 'Resuming connection…')
  connect(broker)
}

function publish(topic: string, payload: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mqttClient || connectionState.value !== 'connected') {
      reject(new Error('Not connected'))
      return
    }
    mqttClient.publish(topic, payload, (err?: Error) => {
      if (err) {
        error.value = `Failed to publish: ${err.message}`
        reject(err)
      } else {
        addMessage('system', `Published to ${topic}: ${payload}`)
        resolve()
      }
    })
  })
}

/**
 * Inline test-connect: connect → subscribe to test topic → publish → verify echo → disconnect.
 * Returns true on success, false on failure. Does not touch the main connection state
 * if a different broker is already connected — uses a separate temporary client.
 */
async function testConnect(broker: ServiceEntry, timeoutMs: number = 15000): Promise<boolean> {
  const url = buildConnectUrl(broker)
  const testTopic = `__test/${Math.random().toString(16).substr(2, 8)}`
  const testPayload = `test-${Date.now()}`

  const options: Record<string, unknown> = {
    clientId: `mqtt_test_${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    connectTimeout: timeoutMs,
    reconnectPeriod: 0
  }

  if (broker.username) options.username = broker.username
  if (broker.password) options.password = broker.password
  if (isTlsType(broker.type)) {
    options.rejectUnauthorized = broker.rejectUnauthorized !== false
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false
    const finish = (result: boolean) => {
      if (resolved) return
      resolved = true
      try { testClient.removeAllListeners(); testClient.end(true) } catch (_) { /* ignore */ }
      clearTimeout(timer)
      resolve(result)
    }

    const testClient = mqtt.connect(url, options)

    const timer = setTimeout(() => finish(false), timeoutMs)

    testClient.on('connect', () => {
      testClient.subscribe(testTopic, (err) => {
        if (err) { finish(false); return }
        testClient.publish(testTopic, testPayload)
      })
    })

    testClient.on('message', (topic: string, message: Buffer) => {
      if (topic === testTopic && message.toString() === testPayload) {
        finish(true)
      }
    })

    testClient.on('error', () => finish(false))
    testClient.on('close', () => finish(false))
  })
}

// --- Computed helpers ---
const brokerUrl = computed(() => {
  if (!connectedBroker.value) return ''
  return buildBrokerUrl(connectedBroker.value)
})

const isConnected = computed(() => connectionState.value === 'connected')
const isTrying = computed(() => connectionState.value === 'trying')

/**
 * Singleton composable for shared MQTT connection state.
 * The connection persists across view navigations.
 */
export function useMqttConnection() {
  return {
    // State
    connectionState: connectionState as Ref<ConnectionState>,
    error,
    messages,
    connectedBroker,
    brokerUrl,
    isConnected,
    isTrying,

    // Actions
    connect,
    disconnect,
    pause,
    resume,
    publish,
    testConnect,
    clearMessages,
    addMessage,

    // Routing hooks (dashboard)
    onMessage,
    onReconnect,
    subscribeTopic,
    unsubscribeTopic
  }
}
