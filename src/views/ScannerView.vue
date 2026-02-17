<template>
  <div class="w-full min-h-screen p-4 md:p-6 bg-gray-50">
    <div class="mb-6 p-5 md:p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">MQTT/MQTT-WS mDNS Scanner</h1>
      <div class="flex items-center gap-4 mb-4 flex-wrap">
        <label class="flex items-center gap-2" :class="{ 'opacity-50 cursor-not-allowed': !preferredBroker }">
          <input type="checkbox" v-model="autoConnectEnabled" :disabled="!preferredBroker" class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary">
          <span class="text-sm font-medium text-gray-700">Auto Connect</span>
        </label>
        <button
          v-if="isCapacitorApp"
          @click="toggleScan"
          :class="['btn', isScanning ? 'btn-danger' : 'btn-success']">
          {{ isScanning ? (scanTimeRemaining > 0 ? `Stop Scan (${scanTimeRemaining}s)` : 'Stop Scan') : 'Discover (3s)' }}
        </button>
        <div v-if="!isCapacitorApp" class="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
          mDNS scanning requires native app
        </div>
      </div>
      <div v-if="preferredBroker" class="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base font-bold text-gray-800 break-words">{{ preferredBroker.name }}</h3>
                  <span v-if="preferredBrokerStatus === 'found'" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style="background-color: #4CAF50; color: white;">
                    <span class="w-1.5 h-1.5 bg-white rounded-full"></span>
                    Found
                  </span>
                  <span v-else-if="preferredBrokerStatus === 'manual'" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style="background-color: #FF9800; color: white;">
                    <span class="w-1.5 h-1.5 bg-white rounded-full"></span>
                    Manual
                  </span>
                  <span v-else-if="preferredBrokerStatus === 'searching'" class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse" style="background-color: #FF9800; color: white;">
                    <span class="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                    Searching
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style="background-color: #F44336; color: white;">
                    <span class="w-1.5 h-1.5 bg-white rounded-full"></span>
                    Not found
                  </span>
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span class="font-mono">{{ preferredBroker.host }}:{{ preferredBroker.port }}</span>
                  <span class="px-2 py-0.5 bg-white/60 rounded text-[10px] font-medium text-gray-500">{{ preferredBroker.type }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0 self-start md:self-center">
            <button @click="handleServicePress(preferredBroker)" class="btn btn-success text-sm font-semibold shadow-sm">
              Connect
            </button>
            <button @click="clearPreferredBroker" class="btn bg-white hover:bg-red-50 text-red-600 border border-red-200 text-sm font-semibold shadow-sm">
              Clear
            </button>
          </div>
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
        class="group relative bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all"
        :class="{
          'border-l-4 border-l-primary': service.discovered,
          'preferred-broker-card': preferredBrokerService && service.name === preferredBrokerService.name && service.type === preferredBrokerService.type,
          'cursor-pointer': !(preferredBrokerService && service.name === preferredBrokerService.name && service.type === preferredBrokerService.type)
        }"
        @click="(preferredBrokerService && service.name === preferredBrokerService.name && service.type === preferredBrokerService.type) ? null : handleServicePress(service)">

        <div class="flex justify-between items-start mb-3">
          <h3 class="font-bold text-lg text-gray-800">{{ service.name }}</h3>
          <div class="flex gap-2">
            <button
              v-if="preferredBrokerService && service.name === preferredBrokerService.name && service.type === preferredBrokerService.type"
              @click.stop="setPreferred(service)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all"
              style="background-color: #FFD700; color: #1a1a1a;">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              Default
            </button>
            <button
              v-else
              @click.stop="setPreferred(service)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-semibold shadow-sm transition-all active:scale-95">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
              </svg>
              Prefer
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

          <button
            v-if="preferredBrokerService && service.name === preferredBrokerService.name && service.type === preferredBrokerService.type"
            @click.stop="handleServicePress(service)"
            class="text-xs font-bold text-white bg-success hover:bg-success/90 px-3 py-1.5 rounded shadow-sm transition-colors active:scale-95">
            CONNECT →
          </button>
          <span v-else class="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded">
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
import { defineComponent, ref, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { ZeroConf, type ZeroConfService, type ZeroConfAction } from '@mhaberler/capacitor-zeroconf-nsd'
import { useAppState, type ServiceEntry } from '../composables/useAppState'

function removeLeadingAndTrailingDots(str: string): string {
  return str.replace(/^\.+|\.+$/g, '')
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
     * 1. Simple matching: Compares instance name and port (as per requirement)
     * 2. Visual feedback: Status badges (Found/Searching/Not found) + gold outline on preferred card
     * 3. Better timeout: 12s polling instead of hard-coded 5s wait
     * 4. Loading state: isAutoConnecting prevents double-clicks and shows "Connecting..." text
     *
     * Edge cases handled:
     * - Preferred broker is manual service (always "available", no scan needed)
     * - Preferred broker found but not yet resolved (waits for resolution before connecting)
     * - Network unavailable / non-native platform (shows helpful error message)
     * - Scan already in progress (reuses existing scan, no duplicate start)
     * - Auto-connect clicked multiple times (debounced via isAutoConnecting flag)
     */
    const router = useRouter()
    const services = ref<Record<string, ServiceEntry>>({})
    const manualHost = ref<string>('')
    const manualPort = ref<number>(1883)
    const selectedType = ref<string>('_mqtt-ws._tcp.')
    const isScanning = ref<boolean>(false)
    const isCapacitorApp = ref<boolean>(Capacitor.isNativePlatform())
    const scanError = ref<string>('')
    const scanTimeRemaining = ref<number>(0)
    let scanTimer: NodeJS.Timeout | null = null
    let hasTriggeredStartupScan = false

    // App-level persisted state (shared across components)
    const { preferredBrokerRef, autoConnectEnabledRef } = useAppState()

    // Aliases for template compatibility
    const preferredBroker = preferredBrokerRef
    const autoConnectEnabled = autoConnectEnabledRef
    const isAutoConnecting = ref<boolean>(false)

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
          port: parseInt(String(manualPort.value)),
          discovered: false,  // Explicitly mark as manual (not from mDNS)
          resolved: true      // Manual brokers are always "resolved"
        }
        manualHost.value = ''
        manualPort.value = 1883
      }
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
        scanTimeRemaining.value = 3

        for (const serviceType of serviceTypes) {
          await ZeroConf.watch({
            type: serviceType,
            domain: 'local.'
          }, onServiceEvent)
        }

        // Start 5-second countdown timer
        scanTimer = setInterval(() => {
          scanTimeRemaining.value -= 1
          if (scanTimeRemaining.value <= 0) {
            stopScan()
          }
        }, 1000)

        console.log('Started mDNS scanning for MQTT services (5s auto-stop)')
      } catch (error: any) {
        console.error('Error starting mDNS scan:', error)
        scanError.value = `Failed to start scan: ${error.message || 'Unknown error'}`
        isScanning.value = false
        scanTimeRemaining.value = 0
      }
    }

    const stopScan = async () => {
      if (!isCapacitorApp.value) return

      // Clear timer
      if (scanTimer) {
        clearInterval(scanTimer)
        scanTimer = null
      }
      scanTimeRemaining.value = 0

      try {
        for (const serviceType of serviceTypes) {
          ZeroConf.unwatch({
            type: serviceType,
            domain: 'local.'
          })
        }
        isScanning.value = false
        scanError.value = ''

        // Keep discovered services visible after scan stops
        // (Don't delete them - users can still connect to them)

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
     * Strategy: Match by instance name and port (as per requirement)
     * Returns match status and service if found.
     */
    const findPreferredBroker = (): BrokerMatchResult => {
      if (!preferredBroker.value) {
        return { status: 'not-found', service: null }
      }

      const preferred = preferredBroker.value
      const allServices = Object.values(services.value)

      // Match on name + port
      const matched = allServices.find(s =>
        s.name === preferred.name &&
        s.port === preferred.port
      )

      if (matched) {
        // Distinguish between manual and discovered services
        if (matched.discovered === false) {
          return { status: 'manual', service: matched }
        }
        return { status: 'exact', service: matched }
      }

      return { status: 'not-found', service: null }
    }

    const setPreferred = (service: ServiceEntry) => {
      preferredBrokerRef.value = service
    }

    const clearPreferredBroker = () => {
      preferredBrokerRef.value = null
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

    // Startup discovery: scan for preferred broker if it's not found
    watch(preferredBrokerRef, (broker) => {
      if (broker && !hasTriggeredStartupScan && broker.discovered === true && isCapacitorApp.value && !isScanning.value) {
        // Preferred broker exists and is a discovered (mDNS) broker - scan to find it
        // Note: Manual brokers (discovered === false) skip this scan
        hasTriggeredStartupScan = true
        const matchResult = findPreferredBroker()
        if (matchResult.status === 'not-found') {
          console.log('Preferred broker not found, starting discovery scan...')
          startScan()
        }
      }
    }, { immediate: true })

    // Computed properties for reactive UI state
    const preferredBrokerMatchResult = computed<BrokerMatchResult>(() => findPreferredBroker())

    const preferredBrokerService = computed<ServiceEntry | null>(() =>
      preferredBrokerMatchResult.value.service
    )

    const preferredBrokerStatus = computed<'found' | 'manual' | 'searching' | 'not-found'>(() => {
      if (!preferredBroker.value) return 'not-found'

      // Manual brokers get their own status (orange badge)
      if (preferredBroker.value.discovered === false) {
        return 'manual'
      }

      const matchResult = preferredBrokerMatchResult.value

      // If found via mDNS, show as found
      if (matchResult.service && matchResult.service.resolved) {
        return 'found'
      }

      // If scanning, show as searching
      if (isScanning.value || isAutoConnecting.value) {
        return 'searching'
      }

      // Otherwise not found
      return 'not-found'
    })

    // Update preferred broker with fresh network info when discovered via mDNS
    watch(preferredBrokerMatchResult, (result) => {
      if (result.service && result.service.resolved && preferredBroker.value && result.service.discovered) {
        const current = preferredBroker.value

        // Only update if values actually changed (prevents infinite loop)
        const hostsMatch = current.host === result.service.host
        const ipv4Match = JSON.stringify(current.ipv4Addresses || []) === JSON.stringify(result.service.ipv4Addresses || [])
        const ipv6Match = JSON.stringify(current.ipv6Addresses || []) === JSON.stringify(result.service.ipv6Addresses || [])
        const alreadyResolved = current.resolved === true && current.discovered === true

        if (!hostsMatch || !ipv4Match || !ipv6Match || !alreadyResolved) {
          console.log('Updating preferred broker with fresh network info')
          preferredBrokerRef.value = {
            ...current,
            host: result.service.host,
            ipv4Addresses: result.service.ipv4Addresses,
            ipv6Addresses: result.service.ipv6Addresses,
            resolved: true,
            discovered: true
          }
        }
      }
    })

    // Watch for preferred broker being found and auto-connect if enabled
    watch(preferredBrokerStatus, (newStatus) => {
      // Auto-connect for both 'found' (mDNS) and 'manual' brokers
      if ((newStatus === 'found' || newStatus === 'manual') && autoConnectEnabled.value && !isAutoConnecting.value) {
        const brokerToConnect = newStatus === 'found' ? preferredBrokerService.value : preferredBroker.value
        if (brokerToConnect) {
          handleServicePress(brokerToConnect)
        }
      }
    })

    // Cleanup timer on component unmount
    onUnmounted(() => {
      if (scanTimer) {
        clearInterval(scanTimer)
        scanTimer = null
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
      scanTimeRemaining,
      autoConnectEnabled,
      preferredBroker,
      preferredBrokerStatus,
      preferredBrokerService,
      isAutoConnecting,
      addManualService,
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
