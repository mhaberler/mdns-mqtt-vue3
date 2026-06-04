<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useAppState } from './composables/useAppState'
import { useMqttConnection } from './composables/useMqttConnection'
import { useMqttDiscovery } from './composables/useMqttDiscovery'
import { useAppLifecycle } from './composables/useAppLifecycle'

function isDiscovered(broker: { source?: string; discovered?: boolean }): boolean {
  return broker.source ? broker.source === 'discovered' : !!broker.discovered
}

export default defineComponent({
  name: 'App',
  setup() {
    const { preferredBrokerRef } = useAppState()
    const mqttConn = useMqttConnection()
    const { discoveredBrokers } = useMqttDiscovery()
    const { isActive } = useAppLifecycle()

    // Auto-connect on startup for non-discovered preferred brokers (stable host).
    watch(preferredBrokerRef, (broker) => {
      if (
        broker &&
        broker.tested &&
        !isDiscovered(broker) &&
        mqttConn.connectionState.value === 'disconnected'
      ) {
        mqttConn.connect(broker)
      }
    }, { immediate: true })

    // Discovered preferred broker: arm, don't fire. The persisted host is volatile, so
    // wait until the broker's identity (name + type) reappears in the live discovered
    // list, then connect — connect() re-sources the host. Scan runs continuously, so a
    // later appearance still connects.
    watch(discoveredBrokers, () => {
      const broker = preferredBrokerRef.value
      if (
        broker &&
        broker.tested &&
        isDiscovered(broker) &&
        mqttConn.connectionState.value === 'disconnected' &&
        Object.values(discoveredBrokers.value).some(
          s => s.name === broker.name && s.type === broker.type && s.resolved
        )
      ) {
        mqttConn.connect(broker)
      }
    }, { deep: true })

    // Foreground/background lifecycle
    watch(isActive, (active) => {
      if (!active) {
        mqttConn.pause()
      } else {
        mqttConn.resume()
      }
    })
  }
})
</script>

