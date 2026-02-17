<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useAppState } from './composables/useAppState'
import { useMqttConnection } from './composables/useMqttConnection'
import { useAppLifecycle } from './composables/useAppLifecycle'

export default defineComponent({
  name: 'App',
  setup() {
    const { preferredBrokerRef } = useAppState()
    const mqttConn = useMqttConnection()
    const { isActive } = useAppLifecycle()

    // Auto-connect on startup: if preferred broker is set, tested, and not discovered
    // (discovered brokers need mDNS resolution first — handled in ScannerView)
    watch(preferredBrokerRef, (broker) => {
      if (
        broker &&
        broker.tested &&
        broker.source !== 'discovered' &&
        mqttConn.connectionState.value === 'disconnected'
      ) {
        mqttConn.connect(broker)
      }
    }, { immediate: true })

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

