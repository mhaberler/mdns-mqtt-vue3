<template>
  <div class="w-full min-h-screen p-4 md:p-6 bg-gray-50">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 p-5 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100 gap-4">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold text-gray-800">{{ serviceName }}</h2>
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-500">{{ connectionStatusText }}</span>
          <div :class="['w-3 h-3 rounded-full',
            mqttConn.isTrying.value ? 'bg-warning animate-pulse' :
            mqttConn.isConnected.value ? 'bg-success shadow-[0_0_8px_rgba(76,175,80,0.6)]' :
            'bg-error']"></div>
        </div>
        <p class="font-mono text-xs text-gray-400 break-all">{{ mqttConn.brokerUrl.value }}</p>
      </div>

      <div class="flex gap-2 w-full md:w-auto">
        <button
          :class="['btn flex-1 md:flex-none font-bold',
            mqttConn.isConnected.value ? 'btn-danger' :
            mqttConn.isTrying.value ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'btn-primary']"
          @click="mqttConn.isConnected.value ? mqttConn.disconnect() : connectToBroker()"
          :disabled="mqttConn.isTrying.value"
        >
          {{ mqttConn.isConnected.value ? 'Disconnect' : mqttConn.isTrying.value ? 'Connecting...' : 'Connect' }}
        </button>
        <button @click="goBack" class="btn bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold shadow-sm">
          Back
        </button>
      </div>
    </div>

    <div v-if="mqttConn.error.value" class="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex justify-between items-center animate-in fade-in slide-in-from-top-4">
      <p class="text-error text-sm font-medium">{{ mqttConn.error.value }}</p>
      <button @click="mqttConn.error.value = null" class="w-8 h-8 flex items-center justify-center text-error/40 hover:text-error text-xl font-bold">×</button>
    </div>

    <div v-if="mqttConn.isTrying.value" class="mb-6 p-8 bg-white border border-gray-100 rounded-xl text-center">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-gray-500 font-medium">Connecting to MQTT broker...</p>
    </div>

    <!-- Message publishing section -->
    <div v-if="mqttConn.isConnected.value" class="mb-6 p-5 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in zoom-in-95">
      <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-2 h-5 bg-primary rounded-sm"></span>
        Publish Message
      </h3>
      <div class="flex flex-col gap-3">
        <input
          v-model="publishTopic"
          placeholder="Topic (e.g., test/topic)"
          class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
        >
        <textarea
          v-model="publishMessage"
          placeholder="Message payload"
          class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm resize-none"
          rows="3"
        ></textarea>
        <button @click="publishMessageToTopic" class="btn btn-success w-full md:w-auto md:ml-auto px-10 shadow-md active:scale-95">
          Publish →
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
      <div class="p-5 md:p-6 border-b border-gray-50 flex justify-between items-center">
        <h3 class="text-lg font-bold text-gray-800">Messages <span class="text-primary font-mono ml-1">({{ mqttConn.messages.value.length }})</span></h3>
        <button @click="mqttConn.clearMessages()" class="text-xs font-bold text-gray-400 hover:text-error transition-colors uppercase tracking-wider">Clear Log</button>
      </div>

      <div v-if="mqttConn.messages.value.length === 0" class="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        </div>
        <p>{{ mqttConn.isConnected.value ? 'Waiting for messages...' : 'Connect to start receiving messages' }}</p>
      </div>

      <div class="p-2 space-y-2 overflow-y-auto max-h-[60vh]">
        <div
          v-for="message in mqttConn.messages.value"
          :key="message.id"
          class="p-4 rounded-lg transition-all"
          :class="[message.topic === 'system' ? 'bg-gray-50 border-l-4 border-gray-400 text-gray-600 italic' : 'bg-white border border-gray-100 shadow-sm']"
        >
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary" v-if="message.topic !== 'system'">{{ message.topic }}</span>
            <span class="text-xs font-bold font-mono text-gray-400 uppercase" v-else>SYSTEM</span>
            <span class="text-[10px] font-mono text-gray-300">{{ message.timestamp }}</span>
          </div>
          <pre class="text-xs font-mono break-all whitespace-pre-wrap text-gray-700 bg-gray-50 p-2 rounded border border-gray-100/50 overflow-x-auto">{{ message.payload }}</pre>
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
      port: parseInt((route.query.port as string) || '1883', 10) || 1883,
      discovered: (route.query.discovered as string) === 'true',
      txtRecord: route.query.txtRecord ? JSON.parse(route.query.txtRecord as string) : {}
    }

    const publishTopic = ref<string>('test/topic')
    const publishMessage = ref<string>('Hello, MQTT!')

    const serviceName = computed(() => service.name || 'MQTT Service')

    const connectionStatusText = computed(() => {
      if (mqttConn.isTrying.value) return 'Connecting...'
      if (mqttConn.isConnected.value) return 'Connected'
      return 'Disconnected'
    })

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
      connectionStatusText,
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

