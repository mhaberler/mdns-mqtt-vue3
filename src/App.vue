<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useAppState } from './composables/useAppState'
import { useMqttConnection } from './composables/useMqttConnection'

export default defineComponent({
  name: 'App',
  setup() {
    const { preferredBrokerRef } = useAppState()
    const mqttConn = useMqttConnection()

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
  }
})
</script>

