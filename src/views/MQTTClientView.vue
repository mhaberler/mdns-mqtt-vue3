<template>
  <div class="w-full min-h-screen p-3 md:p-6 bg-gray-50">
    <!-- Header row: name + status dot + buttons -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <div :class="['w-2.5 h-2.5 rounded-full shrink-0',
          mqttConn.isTrying.value ? 'bg-warning animate-pulse' :
          mqttConn.isConnected.value ? 'bg-success shadow-[0_0_6px_rgba(76,175,80,0.6)]' :
          'bg-error']"></div>
        <h2 class="text-lg font-bold text-gray-800 truncate">{{ serviceName }}</h2>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button
          :class="['btn text-sm py-1.5 px-3 font-bold',
            mqttConn.isConnected.value ? 'btn-danger' :
            mqttConn.isTrying.value ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'btn-primary']"
          @click="mqttConn.isConnected.value ? mqttConn.disconnect() : connectToBroker()"
          :disabled="mqttConn.isTrying.value"
        >
          {{ mqttConn.isConnected.value ? 'Disconnect' : mqttConn.isTrying.value ? 'Connecting…' : 'Connect' }}
        </button>
        <button @click="goBack" class="btn text-sm py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">
          Back
        </button>
      </div>
    </div>

    <!-- Broker URL -->
    <p class="font-mono text-[10px] text-gray-400 break-all mb-3">{{ mqttConn.brokerUrl.value }}</p>

    <div v-if="mqttConn.error.value" class="mb-3 p-2 bg-error/10 border border-error/20 rounded-lg flex justify-between items-center">
      <p class="text-error text-xs font-medium">{{ mqttConn.error.value }}</p>
      <button @click="mqttConn.error.value = null" class="w-6 h-6 flex items-center justify-center text-error/40 hover:text-error text-lg font-bold">×</button>
    </div>

    <div v-if="mqttConn.isTrying.value" class="mb-3 p-4 bg-white border border-gray-100 rounded-lg text-center">
      <div class="inline-block w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
      <p class="text-gray-500 text-sm">Connecting…</p>
    </div>

    <!-- Publish section -->
    <div v-if="mqttConn.isConnected.value" class="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
      <h3 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
        <span class="w-1.5 h-4 bg-primary rounded-sm"></span>
        Publish
      </h3>
      <div class="flex flex-col gap-2">
        <input
          v-model="publishTopic"
          placeholder="Topic"
          class="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none font-mono text-xs"
        >
        <textarea
          v-model="publishMessage"
          placeholder="Payload"
          class="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary outline-none font-mono text-xs resize-none"
          rows="2"
        ></textarea>
        <button @click="publishMessageToTopic" class="btn btn-success text-sm py-1.5 w-full md:w-auto md:ml-auto active:scale-95">
          Publish →
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-[300px]">
      <div class="p-3 border-b border-gray-50 flex justify-between items-center">
        <h3 class="text-sm font-bold text-gray-800">Messages <span class="text-primary font-mono ml-1">({{ mqttConn.messages.value.length }})</span></h3>
        <button @click="mqttConn.clearMessages()" class="text-[10px] font-bold text-gray-400 hover:text-error transition-colors uppercase tracking-wider">Clear</button>
      </div>

      <div v-if="mqttConn.messages.value.length === 0" class="flex-1 flex flex-col items-center justify-center p-6 text-gray-400">
        <div class="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        </div>
        <p class="text-xs">{{ mqttConn.isConnected.value ? 'Waiting for messages…' : 'Connect to start receiving' }}</p>
      </div>

      <div class="p-1.5 space-y-1 overflow-y-auto max-h-[50vh]">
        <div
          v-for="message in mqttConn.messages.value"
          :key="message.id"
          class="p-2 rounded transition-all"
          :class="[message.topic === 'system' ? 'bg-gray-50 border-l-3 border-gray-400 text-gray-600 italic' : 'bg-white border border-gray-100 shadow-sm']"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary" v-if="message.topic !== 'system'">{{ message.topic }}</span>
            <span class="text-[10px] font-bold font-mono text-gray-400 uppercase" v-else>SYS</span>
            <span class="text-[10px] font-mono text-gray-300">{{ message.timestamp }}</span>
          </div>
          <pre class="text-[11px] font-mono break-all whitespace-pre-wrap text-gray-700 bg-gray-50 p-1.5 rounded border border-gray-100/50 overflow-x-auto">{{ message.payload }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMqttConnection, buildBrokerUrl } from '../composables/useMqttConnection'
import type { ServiceEntry } from '../composables/useAppState'

export default defineComponent({
  name: 'MQTTClientView',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const mqttConn = useMqttConnection()

    // Build service from query params (backward compat) or use connected broker
    const service: ServiceEntry = mqttConn.connectedBroker.value ?? {
      name: (route.query.name as string) || 'Unknown Service',
      type: (route.query.type as string) || '_mqtt._tcp.',
      host: (route.query.host as string) || 'localhost',
      port: parseInt((route.query.port as string) || '8883', 10) || 8883,
      discovered: (route.query.discovered as string) === 'true',
      txtRecord: route.query.txtRecord ? JSON.parse(route.query.txtRecord as string) : {}
    }

    const publishTopic = ref<string>('test/topic')
    const publishMessage = ref<string>('Hello, MQTT!')

    const serviceName = computed(() => service.name || 'MQTT Service')



    const connectToBroker = () => {
      mqttConn.connect(service)
    }

    const publishMessageToTopic = async () => {
      if (mqttConn.isConnected.value && publishTopic.value && publishMessage.value) {
        try {
          await mqttConn.publish(publishTopic.value, publishMessage.value)
        } catch (_) {
          // error is set in composable
        }
      }
    }

    const goBack = () => {
      // Don't disconnect — connection persists in background
      router.back()
    }

    onMounted(() => {
      mqttConn.clearMessages()
      mqttConn.addMessage('system', `Configured for ${serviceName.value}`)
      // If not already connected, auto-connect
      if (mqttConn.connectionState.value === 'disconnected') {
        connectToBroker()
      }
    })

    return {
      service,
      serviceName,
      publishTopic,
      publishMessage,
      mqttConn,
      connectToBroker,
      publishMessageToTopic,
      goBack
    }
  }
})
</script>

<style scoped>
</style>

