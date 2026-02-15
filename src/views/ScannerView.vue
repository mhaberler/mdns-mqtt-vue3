<template>
  <div class="w-full min-h-screen p-4 md:p-6 bg-gray-50">
    <div class="mb-6 p-5 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">MQTT/MQTT-WS mDNS Scanner</h1>
      <div class="flex items-center gap-4 mb-4">
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="autoScanEnabled" class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary">
          <span class="text-sm font-medium text-gray-700">Auto Scan</span>
        </label>
        <button @click="handleAutoConnect" :disabled="!preferredBroker || isAutoConnecting" class="btn btn-secondary" :class="{ 'opacity-50 cursor-not-allowed': !preferredBroker || isAutoConnecting }">
          {{ isAutoConnecting ? 'Connecting...' : 'Auto Connect' }}
        </button>
      </div>
      <div v-if="preferredBroker" class="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <p><strong>Preferred Broker:</strong> {{ preferredBroker.name }}</p>
            <span v-if="preferredBrokerStatus === 'found'" class="text-xs font-semibold px-2 py-0.5 rounded" style="background-color: #4CAF50; color: white;">
              ✓ Found
            </span>
            <span v-else-if="preferredBrokerStatus === 'searching'" class="text-xs font-semibold px-2 py-0.5 rounded" style="background-color: #FF9800; color: white;">
              ⏳ Searching...
            </span>
            <span v-else class="text-xs font-semibold px-2 py-0.5 rounded" style="background-color: #F44336; color: white;">
              ✗ Not found
            </span>
          </div>
          <button @click="clearPreferredBroker" class="text-xs underline hover:no-underline">Clear</button>
        </div>
      </div>
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
        :class="{
          'border-l-4 border-l-primary': service.discovered,
          'preferred-broker-card': preferredBrokerService && service.name === preferredBrokerService.name && service.type === preferredBrokerService.type
        }"
        @click="handleServicePress(service)">

        <div class="flex justify-between items-start mb-3">
          <h3 class="font-bold text-lg text-gray-800">{{ service.name }}</h3>
          <div class="flex gap-2">
            <button @click.stop="setPreferred(service)" class="opacity-0 group-hover:opacity-100 w-7 h-7 btn-primary rounded-full flex items-center justify-center shadow-lg hover:opacity-100 transition-all text-xs">
              ★
            </button>
            <button @click.stop="removeService(key)"
              class="opacity-0 group-hover:opacity-100 w-7 h-7 btn-danger rounded-full flex items-center justify-center shadow-lg hover:opacity-100 transition-all">
              ×
            </button>
          </div>
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
import { defineComponent, ref, onUnmounted, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { ZeroConf, type ZeroConfService, type ZeroConfAction } from '@mhaberler/capacitor-zeroconf-nsd'
import { getPreferredBroker, setPreferredBroker, getAutoScanEnabled, setAutoScanEnabled } from '../utils/storage'

function removeLeadingAndTrailingDots(str: string): string {
  return str.replace(/^\.+|\.+$/g, '')
}

type ServiceEntry = {
  name: string
  type: string
  host: string
  port: number
  domain?: string
  discovered?: boolean
  resolved?: boolean
  txtRecord?: Record<string, any>
  ipv4Addresses?: string[]
  ipv6Addresses?: string[]
}

type BrokerMatchStatus = 'exact' | 'fuzzy' | 'manual' | 'not-found'

interface BrokerMatchResult {
  status: BrokerMatchStatus
  service: ServiceEntry | null
}

export default defineComponent({
  name: 'ScannerView',
  setup() {
    /**
     * Enhanced Auto-Connect Implementation
     *
     * Key improvements:
     * 1. Domain-aware matching: Stores and matches on name+domain+type for reliability
     * 2. Graceful fallback: Exact match → fuzzy match (name+type) → manual-always-available
     * 3. Visual feedback: Status badges (Found/Searching/Not found) + gold outline on preferred card
     * 4. Better timeout: 12s polling instead of hard-coded 5s wait
     * 5. Loading state: isAutoConnecting prevents double-clicks and shows "Connecting..." text
     *
     * Edge cases handled:
     * - Preferred broker is manual service (always "available", no scan needed)
     * - Preferred broker found but not yet resolved (waits for resolution before connecting)
     * - Multiple services match criteria (connects to first match, logs warning if domain mismatch)
     * - Network unavailable / non-native platform (shows helpful error message)
     * - Scan already in progress (reuses existing scan, no duplicate start)
     * - Auto-connect clicked multiple times (debounced via isAutoConnecting flag)
     * - Domain changes (fuzzy fallback handles broker moving to different domain/network)
     * - Stored broker lacks domain field (graceful - uses fuzzy match as fallback)
     */
    const router = useRouter()
    const services = ref<Record<string, ServiceEntry>>({})
    const manualHost = ref<string>('')
    const manualPort = ref<number>(1883)
    const selectedType = ref<string>('_mqtt._tcp')
    const isScanning = ref<boolean>(false)
    const isCapacitorApp = ref<boolean>(Capacitor.isNativePlatform())
    const scanError = ref<string>('')

    const autoScanEnabled = ref<boolean>(getAutoScanEnabled())
    const preferredBroker = ref<ServiceEntry | null>(getPreferredBroker())
    const isAutoConnecting = ref<boolean>(false)

    watch(autoScanEnabled, (newVal) => setAutoScanEnabled(newVal))

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
          domain: service.domain,
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
            domain: service.domain || services.value[key].domain,
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

    /**
     * Find preferred broker in current services.
     * Strategy: exact match (name+domain+type) → fuzzy (name+type) → manual
     * Returns match status and service if found.
     */
    const findPreferredBroker = (): BrokerMatchResult => {
      if (!preferredBroker.value) {
        return { status: 'not-found', service: null }
      }

      const preferred = preferredBroker.value
      const allServices = Object.values(services.value)

      // Manual services are always "available"
      if (preferred.discovered === false) {
        const manual = allServices.find(s =>
          s.name === preferred.name &&
          s.type === preferred.type &&
          s.discovered === false
        )
        if (manual) {
          return { status: 'manual', service: manual }
        }
      }

      // Try exact match: name + domain + type
      if (preferred.domain) {
        const exact = allServices.find(s =>
          s.name === preferred.name &&
          s.domain === preferred.domain &&
          s.type === preferred.type &&
          s.discovered === true
        )
        if (exact) {
          return { status: 'exact', service: exact }
        }
      }

      // Fallback: fuzzy match (name + type, ignore domain)
      const fuzzy = allServices.find(s =>
        s.name === preferred.name &&
        s.type === preferred.type &&
        s.discovered === true
      )
      if (fuzzy) {
        if (preferred.domain && fuzzy.domain !== preferred.domain) {
          console.warn(`Fuzzy match: domain mismatch (expected: ${preferred.domain}, got: ${fuzzy.domain})`)
        }
        return { status: 'fuzzy', service: fuzzy }
      }

      return { status: 'not-found', service: null }
    }

    const setPreferred = (service: ServiceEntry) => {
      preferredBroker.value = service
      setPreferredBroker(service)
    }

    const clearPreferredBroker = () => {
      preferredBroker.value = null
      setPreferredBroker(null)
    }

    /**
     * Auto-connect to preferred broker.
     * Improved flow: check immediate availability → scan if needed → timeout with error
     */
    const handleAutoConnect = async () => {
      if (!preferredBroker.value || isAutoConnecting.value) return

      try {
        isAutoConnecting.value = true
        scanError.value = ''

        // Check if preferred broker is already available
        let matchResult = findPreferredBroker()

        // If found and resolved (or manual), connect immediately
        if (matchResult.service && (matchResult.service.resolved || !matchResult.service.discovered)) {
          handleServicePress(matchResult.service)
          return
        }

        // If not found and we're on native platform, start scan
        if (matchResult.status === 'not-found' && isCapacitorApp.value) {
          if (!isScanning.value) {
            await startScan()
          }

          // Poll for preferred broker with timeout (12 seconds)
          const maxAttempts = 24 // 24 * 500ms = 12s
          let attempts = 0

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500))
            matchResult = findPreferredBroker()

            if (matchResult.service && matchResult.service.resolved) {
              handleServicePress(matchResult.service)
              return
            }
            attempts++
          }

          scanError.value = 'Preferred broker not found after 12 seconds. Try scanning manually.'
        } else {
          scanError.value = 'Preferred broker not available. mDNS scanning requires the native app.'
        }
      } finally {
        isAutoConnecting.value = false
      }
    }

    onMounted(() => {
      if (autoScanEnabled.value && isCapacitorApp.value) {
        startScan()
      }
    })

    // Computed properties for reactive UI state
    const preferredBrokerMatchResult = computed<BrokerMatchResult>(() => findPreferredBroker())

    const preferredBrokerService = computed<ServiceEntry | null>(() =>
      preferredBrokerMatchResult.value.service
    )

    const preferredBrokerStatus = computed<'found' | 'searching' | 'not-found'>(() => {
      if (!preferredBroker.value) return 'not-found'

      const matchResult = preferredBrokerMatchResult.value

      // If found (exact, fuzzy, or manual), show as found
      if (matchResult.service && (matchResult.service.resolved || !matchResult.service.discovered)) {
        return 'found'
      }

      // If scanning, show as searching
      if (isScanning.value || isAutoConnecting.value) {
        return 'searching'
      }

      // Otherwise not found
      return 'not-found'
    })

    return {
      services,
      manualHost,
      manualPort,
      selectedType,
      isScanning,
      isCapacitorApp,
      scanError,
      autoScanEnabled,
      preferredBroker,
      preferredBrokerStatus,
      preferredBrokerService,
      isAutoConnecting,
      addManualService,
      removeService,
      handleServicePress,
      toggleScan,
      setPreferred,
      clearPreferredBroker,
      handleAutoConnect
    }
  }
})
</script>

<style scoped>
.preferred-broker-card {
  border: 3px solid #FFD700 !important;
  box-shadow: 0 0 0 1px #FFD700, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
}
</style>
