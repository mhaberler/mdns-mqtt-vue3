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
      </div>
    </div>

    <div class="services-list">
      <div v-if="Object.keys(services).length === 0" class="empty-state">
        <p>No services configured. Add a manual MQTT broker above.</p>
        <p class="hint">Common ports: 1883 (MQTT), 8883 (MQTTS), 9001 (WebSocket)</p>
      </div>

      <div 
        v-for="(service, key) in services" 
        :key="key"
        class="service-item"
        @click="handleServicePress(service)"
      >
        <h3>{{ service.name }}</h3>
        <p>Type: {{ service.type }}</p>
        <p>Host: {{ service.host }}</p>
        <p>Port: {{ service.port }}</p>
        <p class="tap-hint">Tap to connect</p>
        <button 
          @click.stop="removeService(key)" 
          class="remove-button"
          title="Remove service"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'ScannerView',
  setup() {
    const router = useRouter()
    const services = ref({})
    const manualHost = ref('')
    const manualPort = ref(1883)
    const selectedType = ref('_mqtt._tcp.')

    // Add some default services for testing
    const defaultServices = {
      'local-mqtt': {
        name: 'Local MQTT Broker',
        type: '_mqtt._tcp.',
        host: '192.168.1.100',
        port: 1883
      },
      'local-mqtt-ws': {
        name: 'Local MQTT WebSocket',
        type: '_mqtt-ws._tcp.',
        host: '192.168.1.100',
        port: 9001
      },
      'mosquitto-test': {
        name: 'Mosquitto Test Server',
        type: '_mqtt-ws._tcp.',
        host: 'test.mosquitto.org',
        port: 8080
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

    return {
      services,
      manualHost,
      manualPort,
      selectedType,
      addManualService,
      removeService,
      handleServicePress
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

.service-item h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.service-item p {
  margin: 5px 0;
  color: #666;
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
