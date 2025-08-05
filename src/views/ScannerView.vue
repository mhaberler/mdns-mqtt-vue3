<template>
  <div class="scanner-container">
    <div class="header">
      <h1>MQTT/MQTT-WS mDNS Scanner</h1>
      <div class="controls">
        <input
          v-model="manualHost"
          placeholder="Enter MQTT broker IP"
          class="host-input"
        >
        <input
          v-model="manualPort"
          placeholder="Port (1883)"
          type="number"
          class="port-input"
        >
        <select v-model="selectedType" class="type-select">
          <option value="_mqtt._tcp.">MQTT TCP</option>
          <option value="_mqtt-ws._tcp.">MQTT WebSocket</option>
          <option value="_mqtts._tcp.">MQTT TLS</option>
          <option value="_mqtt-wss._tcp.">MQTT WSS</option>
        </select>
        <button @click="addManualService" class="add-button">
          Add
        </button>
        <button 
          @click="toggleScan" 
          :class="['scan-button', { 'scanning': isScanning }]"
          :disabled="!isCapacitorApp"
        >
          {{ isScanning ? 'Stop Scan' : 'Start Scan' }}
        </button>
      </div>
      <div v-if="!isCapacitorApp" class="warning">
        <p>mDNS scanning is only available in the Capacitor app</p>
      </div>
      <div v-if="scanError" class="error">
        <p>{{ scanError }}</p>
      </div>
    </div>

    <div class="services-list">
      <div v-if="Object.keys(services).length === 0" class="empty-state">
        <p v-if="isCapacitorApp && !isScanning">
          No services found. Click "Start Scan" to discover MQTT brokers on your network, or add a manual broker above.
        </p>
        <p v-else-if="isCapacitorApp && isScanning">
          Scanning for MQTT services... This may take a few moments.
        </p>
        <p v-else>
          No services configured. Add a manual MQTT broker above.
        </p>
        <p class="hint">Common ports: 1883 (MQTT), 8883 (MQTTS), 9001 (WebSocket)</p>
      </div>

      <div
        v-for="(service, key) in services"
        :key="key"
        :class="['service-item', { 'discovered': service.discovered }]"
        @click="handleServicePress(service)"
      >
        <h3>{{ service.name }}</h3>
        <p>Type: {{ service.type }}</p>
        <p>Host: {{ service.host }}</p>
        <p>Port: {{ service.port }}</p>
        <p v-if="service.discovered" class="discovered-badge">Discovered via mDNS</p>
        <p class="tap-hint">Tap to connect</p>
        <button
          @click.stop="removeService(key)"
          class="remove-button"
          :title="service.discovered ? 'Remove discovered service' : 'Remove manual service'"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { ZeroConf } from 'capacitor-zeroconf'

export default {
  name: 'ScannerView',
  setup() {
    const router = useRouter()
    const services = ref({})
    const manualHost = ref('')
    const manualPort = ref(1883)
    const selectedType = ref('_mqtt._tcp.')
    const isScanning = ref(false)
    const isCapacitorApp = ref(Capacitor.isNativePlatform())
    const scanError = ref('')

    // Service types to scan for
    const serviceTypes = [
      '_mqtt._tcp',
      '_mqtt-ws._tcp',
      '_mqtts._tcp',
      '_mqtt-wss._tcp'
    ]

    // Add some default services for testing
    const defaultServices = {

    }

    services.value = { ...defaultServices }

    const addManualService = () => {
      if (manualHost.value && manualPort.value) {
        const key = `manual-${Date.now()}`
        services.value[key] = {
          name: `Manual MQTT (${manualHost.value}:${manualPort.value})`,
          type: selectedType.value,
          host: manualHost.value,
          port: parseInt(manualPort.value)
        }
        manualHost.value = ''
        manualPort.value = 1883
      }
    }

    const removeService = (key) => {
      delete services.value[key]
    }

    const handleServicePress = (service) => {
      router.push({
        name: 'MQTTClient',
        params: { service: JSON.stringify(service) }
      })
    }

    const onServiceEvent = (action, service) => {
      console.log('onServiceEvent:', action, service)
      return;
      const service = result.service
      const key = `${service.hostname}_${service.port}_${service.type}`
      
      services.value[key] = {
        name: service.name || `${service.type} Service`,
        type: service.type,
        host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0],
        port: service.port,
        discovered: true
      }
    }

    const onServiceLost = (result) => {
      console.log('Service lost:', result)
      const service = result.service
      const key = `${service.hostname}_${service.port}_${service.type}`
      if (services.value[key] && services.value[key].discovered) {
        delete services.value[key]
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
        
        // Start scanning for each service type with callbacks
        for (const serviceType of serviceTypes) {
          await ZeroConf.watch({
            type: serviceType + ".",
            domain: 'local.'
          }, onServiceEvent)
        }
        
        console.log('Started mDNS scanning for MQTT services')
      } catch (error) {
        console.error('Error starting mDNS scan:', error)
        scanError.value = `Failed to start scan: ${error.message || 'Unknown error'}`
        isScanning.value = false
      }
    }

    const stopScan = async () => {
      if (!isCapacitorApp.value) return

      try {
        await ZeroConf.unwatch()
        isScanning.value = false
        scanError.value = ''
        
        // Remove discovered services
        Object.keys(services.value).forEach(key => {
          if (services.value[key].discovered) {
            delete services.value[key]
          }
        })
        
        console.log('Stopped mDNS scanning')
      } catch (error) {
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

    // Cleanup on component unmount
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
}
</script>

<style scoped>
.scanner-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header h1 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  color: #333;
}

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.host-input, .port-input, .type-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.host-input {
  flex: 1;
  min-width: 200px;
}

.port-input {
  width: 100px;
}

.type-select {
  width: 150px;
}

.add-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.add-button:hover {
  background-color: #45a049;
}

.scan-button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.scan-button:hover {
  background-color: #1976D2;
}

.scan-button.scanning {
  background-color: #f44336;
}

.scan-button.scanning:hover {
  background-color: #d32f2f;
}

.scan-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.warning {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
}

.error {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;
}

.service-item:hover {
  transform: translateY(-2px);
}

.service-item.discovered {
  border-left: 4px solid #2196F3;
}

.service-item h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.service-item p {
  margin: 5px 0;
  color: #666;
}

.discovered-badge {
  color: #2196F3 !important;
  font-weight: 500;
  font-size: 0.9em;
}

.tap-hint {
  color: #4CAF50 !important;
  font-weight: 500;
  text-align: right;
  margin-top: 10px !important;
}

.remove-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-button:hover {
  background: #d32f2f;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #757575;
}

.hint {
  font-size: 0.9em;
  opacity: 0.8;
}
</style>
