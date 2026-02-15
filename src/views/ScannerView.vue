<template>
  <div class="w-full min-h-screen p-4 md:p-6 bg-gray-50">
    <div class="mb-6 p-5 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">MQTT/MQTT-WS mDNS Scanner</h1>
      <div class="flex flex-wrap gap-3">
        <input v-model="manualHost" placeholder="Enter MQTT broker IP" class="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none">
        <input v-model="manualPort" placeholder="Port (1883)" type="number" class="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none">
        <select v-model="selectedType" class="w-40 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white">
          <option value="_mqtt-ws._tcp.">MQTT WebSocket</option>
          <option value="_mqtt-wss._tcp.">MQTT WSS</option>
        </select>
        <button @click="addManualService" class="btn btn-primary">
          Add
        </button>
        <button @click="toggleScan" :class="['btn', isScanning ? 'btn-danger' : 'btn-success']" :disabled="!isCapacitorApp">
          {{ isScanning ? 'Stop Scan' : 'Start Scan' }}
        </button>
      </div>
      <div v-if="!isCapacitorApp" class="mt-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-100">
        <p>mDNS scanning is only available in the Capacitor app</p>
      </div>
      <div v-if="scanError" class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
        <p>{{ scanError }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-if="Object.keys(services).length === 0" class="col-span-full py-12 text-center text-gray-500">
        <p v-if="isCapacitorApp && !isScanning" class="mb-2 text-lg">
          No services found. Click "Start Scan" to discover MQTT brokers.
        </p>
        <p v-else-if="isCapacitorApp && isScanning" class="mb-2 text-lg animate-pulse">
          Scanning for MQTT services...
        </p>
        <p v-else class="mb-2 text-lg">
          No services configured. Add a manual MQTT broker above.
        </p>
        <p class="text-sm opacity-70 italic">Common ports: 1883 (MQTT), 8883 (MQTTS), 9001 (WebSocket)</p>
      </div>

      <div v-for="(service, key) in services" :key="key"
        class="group relative bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer"
        :class="{'border-l-4 border-l-primary': service.discovered}"
        @click="handleServicePress(service)">

        <div class="flex justify-between items-start mb-3">
          <h3 class="font-bold text-lg text-gray-800">{{ service.name }}</h3>
          <button @click.stop="removeService(key)"
            class="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 w-7 h-7 btn-danger rounded-full flex items-center justify-center shadow-lg hover:opacity-100 transition-all">
            ×
          </button>
        </div>

        <div class="space-y-1 text-sm text-gray-600">
          <p><span class="font-medium">Type:</span> {{ service.type }}</p>
          <p><span class="font-medium">Host:</span> {{ service.host }}</p>
          <p><span class="font-medium">Port:</span> {{ service.port }}</p>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
          <span v-if="service.discovered" class="text-xs font-semibold text-primary flex items-center gap-1">
            <span class="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
            mDNS {{ service.resolved ? '(Resolved)' : '(Resolving...)' }}
          </span>
          <span v-else class="text-xs font-semibold text-gray-400">Manual</span>

          <span class="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded">
            TAP TO CONNECT →
          </span>
        </div>

        <div v-if="service.txtRecord && Object.keys(service.txtRecord).length > 0" class="mt-3 text-[10px] font-mono bg-gray-50 p-2 rounded text-gray-400 overflow-x-auto">
          TXT: {{ JSON.stringify(service.txtRecord) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { ZeroConf, type ZeroConfService, type ZeroConfAction } from '@mhaberler/capacitor-zeroconf-nsd'

function removeLeadingAndTrailingDots(str: string): string {
  return str.replace(/^\.+|\.+$/g, '')
}

type ServiceEntry = {
  name: string
  type: string
  host: string
  port: number
  discovered?: boolean
  resolved?: boolean
  txtRecord?: Record<string, any>
  ipv4Addresses?: string[]
  ipv6Addresses?: string[]
}

export default defineComponent({
  name: 'ScannerView',
  setup() {
    const router = useRouter()
    const services = ref<Record<string, ServiceEntry>>({})
    const manualHost = ref<string>('')
    const manualPort = ref<number>(1883)
    const selectedType = ref<string>('_mqtt._tcp')
    const isScanning = ref<boolean>(false)
    const isCapacitorApp = ref<boolean>(Capacitor.isNativePlatform())
    const scanError = ref<string>('')

    // Service types to scan for
    const serviceTypes: string[] = [
      '_mqtt-ws._tcp.',
      '_mqtt-wss._tcp.'
    ]

    const defaultServices: Record<string, any> = {
      'test-mosquitto-wss': {
        name: 'test.mosquitto.org (WSS)',
        type: '_mqtt-wss._tcp.',
        host: 'test.mosquitto.org',
        port: 8081,
        discovered: false,
        resolved: true
      }
    }

    if (isCapacitorApp.value) {
      defaultServices['test-mosquitto-ws'] = {
        name: 'test.mosquitto.org (WS)',
        type: '_mqtt-ws._tcp.',
        host: 'test.mosquitto.org',
        port: 8080,
        discovered: false,
        resolved: true
      }
    }

    services.value = { ...defaultServices }

    const addManualService = () => {
      if (manualHost.value && manualPort.value) {
        const key = `manual-${Date.now()}`
        services.value[key] = {
          name: `Manual MQTT (${manualHost.value}:${manualPort.value})`,
          type: selectedType.value,
          host: manualHost.value,
          port: parseInt(String(manualPort.value))
        }
        manualHost.value = ''
        manualPort.value = 1883
      }
    }

    const removeService = (key: string) => {
      delete services.value[key]
    }

    const handleServicePress = (service: ServiceEntry) => {
      router.push({
        name: 'MQTTClient',
        query: {
          name: service.name,
          type: service.type,
          host: service.host,
          port: String(service.port),
          discovered: service.discovered ? 'true' : 'false',
          txtRecord: service.txtRecord ? JSON.stringify(service.txtRecord) : undefined
        }
      })
    }

    const onServiceEvent = (arg: { action: ZeroConfAction; service: ZeroConfService } | null) => {
      if (!arg) return
      const { action, service } = arg
      const st = removeLeadingAndTrailingDots(service.type || '')
      const key = `${service.name || 'unknown'}_${service.domain || 'local'}_${st}`
      console.log(`onServiceEvent: ${action}, "${key}", ${JSON.stringify(service, null, 2)}`)

      if (action === 'added') {
        services.value[key] = {
          name: service.name || `${service.type ?? 'service'} Service`,
          type: service.type || '',
          host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0] || 'Unknown',
          port: service.port || 0,
          discovered: true,
          resolved: false
        }
      } else if (action === 'removed') {
        if (services.value[key]) {
          if (services.value[key].discovered) {
            delete services.value[key]
          }
        }
      } else if (action === 'resolved' && service.port) {
        if (services.value[key]) {
          services.value[key] = {
            ...services.value[key],
            name: service.name || services.value[key].name,
            host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0] || services.value[key].host,
            port: service.port || services.value[key].port,
            resolved: true,
            txtRecord: service.txtRecord || {},
            ipv4Addresses: service.ipv4Addresses || [],
            ipv6Addresses: service.ipv6Addresses || []
          }
        }
      }
    }

    const startScan = async () => {
      if (!isCapacitorApp.value) {
        console.warn('mDNS scanning is only available in Capacitor apps')
        return
      }

      try {
        isScanning.value = true
        scanError.value = ''

        for (const serviceType of serviceTypes) {
          await ZeroConf.watch({
            type: serviceType,
            domain: 'local.'
          }, onServiceEvent)
        }

        console.log('Started mDNS scanning for MQTT services')
      } catch (error: any) {
        console.error('Error starting mDNS scan:', error)
        scanError.value = `Failed to start scan: ${error.message || 'Unknown error'}`
        isScanning.value = false
      }
    }

    const stopScan = async () => {
      if (!isCapacitorApp.value) return

      try {
        for (const serviceType of serviceTypes) {
          ZeroConf.unwatch({
            type: serviceType,
            domain: 'local.'
          })
        }
        isScanning.value = false
        scanError.value = ''

        Object.keys(services.value).forEach(key => {
          if (services.value[key].discovered) {
            delete services.value[key]
          }
        })

        console.log('Stopped mDNS scanning')
      } catch (error: any) {
        console.error('Error stopping mDNS scan:', error)
        scanError.value = `Failed to stop scan: ${error.message || 'Unknown error'}`
      }
    }

    const toggleScan = () => {
      if (isScanning.value) {
        stopScan()
      } else {
        startScan()
      }
    }

    onUnmounted(() => {
      if (isScanning.value) {
        stopScan()
      }
    })

    return {
      services,
      manualHost,
      manualPort,
      selectedType,
      isScanning,
      isCapacitorApp,
      scanError,
      addManualService,
      removeService,
      handleServicePress,
      toggleScan
    }
  }
})
</script>

<style scoped>
</style>
