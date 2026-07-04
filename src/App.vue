<template>
  <div id="app" style="padding-top: calc(3.5rem + env(safe-area-inset-top));">
    <!-- Persistent top tab bar -->
    <nav class="fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 flex h-14"
      style="padding-top: env(safe-area-inset-top); height: calc(3.5rem + env(safe-area-inset-top));">
      <router-link v-for="tab in tabs" :key="tab.to" :to="tab.to"
        class="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-gray-400"
        :class="isTabActive(tab.to) ? 'text-primary' : ''">
        <span>{{ tab.label }}</span>
      </router-link>
    </nav>
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useRoute } from 'vue-router'
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
    const route = useRoute()
    const { preferredBrokerRef } = useAppState()
    const mqttConn = useMqttConnection()
    const { discoveredBrokers } = useMqttDiscovery()
    const { isActive } = useAppLifecycle()

    const tabs = [
      { to: '/', label: 'Scanner' },
      { to: '/hosts', label: 'Hosts' },
      { to: '/mqtt-client', label: 'MQTT Client' },
      { to: '/dashboard', label: 'Dashboard' }
    ]

    const isTabActive = (to: string): boolean =>
      to === '/' ? route.path === '/' : route.path.startsWith(to)

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
          // case-insensitive: Android NSD lowercases instance names
          s => s.name.toLowerCase() === broker.name.toLowerCase() && s.type === broker.type && s.resolved
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

    return { tabs, isTabActive }
  }
})
</script>

