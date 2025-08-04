<template>
  <div class="mqtt-client-container">
    <div class="header">
      <div class="connection-info">
        <h2>{{ serviceName }}</h2>
        <div class="connection-status">
          <span>{{ connectionStatusText }}</span>
          <div :class="['status-indicator', connectionStatusClass]"></div>
        </div>
        <p class="broker-url">{{ brokerUrl }}</p>
      </div>

      <div class="header-buttons">
        <button
          :class="['connection-button', connected ? 'disconnect' : 'connect']"
          @click="connected ? disconnectClient() : connectToMQTT()"
          :disabled="connecting"
        >
          {{ connected ? 'Disconnect' : connecting ? 'Connecting...' : 'Connect' }}
        </button>
        <button @click="$router.back()" class="back-button">
          Back
        </button>
      </div>
    </div>

    <div v-if="error" class="error-container">
      <p>{{ error }}</p>
      <button @click="error = null" class="close-error">×</button>
    </div>

    <div v-if="connecting" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Connecting to MQTT broker...</p>
    </div>

    <!-- Message publishing section -->
    <div v-if="connected" class="publish-section">
      <h3>Publish Message</h3>
      <div class="publish-controls">
        <input
          v-model="publishTopic"
          placeholder="Topic (e.g., test/topic)"
          class="topic-input"
        >
        <textarea
          v-model="publishMessage"
          placeholder="Message payload"
          class="message-input"
          rows="2"
        ></textarea>
        <button @click="publishMessageToTopic" class="publish-button">
          Publish
        </button>
      </div>
    </div>

    <div class="messages-container">
      <div class="messages-header">
        <h3>Messages ({{ messages.length }})</h3>
        <button @click="clearMessages" class="clear-button">Clear</button>
      </div>

      <div v-if="messages.length === 0" class="empty-messages">
        <p>{{ connected ? 'Waiting for messages...' : 'Connect to start receiving messages' }}</p>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message-item', message.topic === 'system' ? 'system-message' : '']"
      >
        <div class="message-header">
          <span class="message-topic">{{ message.topic }}</span>
          <span class="message-timestamp">{{ message.timestamp }}</span>
        </div>
        <pre class="message-payload">{{ message.payload }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import * as mqtt from 'mqtt'

export default {
  name: 'MQTTClientView',
  setup() {
    const route = useRoute()
    const service = JSON.parse(route.params.service)

    const connected = ref(false)
    const connecting = ref(false)
    const messages = ref([])
    const error = ref(null)
    const publishTopic = ref('test/topic')
    const publishMessage = ref('Hello, MQTT!')
    let mqttClient = null

    const serviceName = computed(() => service.name || 'MQTT Service')

    const connectionStatusText = computed(() => {
      if (connecting.value) return 'Connecting...'
      if (connected.value) return 'Connected'
      return 'Disconnected'
    })

    const connectionStatusClass = computed(() => {
      if (connecting.value) return 'connecting'
      if (connected.value) return 'connected'
      return 'disconnected'
    })

    const wsPatterns = ['_mqtt-ws._tcp.', '_mqtt-wss._tcp.']
    const tlsPatterns = ['_mqtts._tcp.', '_mqtt-wss._tcp.']

    const brokerUrl = computed(() => {
      const isWebSocket = wsPatterns.some(pattern => service.type.includes(pattern))
      const isTls = tlsPatterns.some(pattern => service.type.includes(pattern))

      if (isWebSocket) {
        const protocol = isTls ? 'wss' : 'ws'
        return `${protocol}://${service.host}:${service.port}`
      } else {
        const protocol = isTls ? 'mqtts' : 'mqtt'
        return `${protocol}://${service.host}:${service.port}`
      }
    })

    const connectToMQTT = async () => {
      connecting.value = true
      error.value = null

      try {
        console.log('Connecting to:', brokerUrl.value)

        const options = {
          clientId: `mqtt_vue_${Math.random().toString(16).substr(2, 8)}`,
          username: '',
          password: '',
          clean: true,
          connectTimeout: 10000,
          reconnectPeriod: 0, // Disable auto-reconnect for cleaner error handling
        }

        // For WebSocket connections, we need special handling
        const isWebSocket = wsPatterns.some(pattern => service.type.includes(pattern))
        if (isWebSocket) {
          // For WebSocket, we might need to add '/mqtt' path
          const wsUrl = brokerUrl.value.includes('/mqtt') ? brokerUrl.value : `${brokerUrl.value}/mqtt`
          mqttClient = mqtt.connect(wsUrl, options)
        } else {
          mqttClient = mqtt.connect(brokerUrl.value, options)
        }

        mqttClient.on('connect', () => {
          console.log('Connected to MQTT broker')
          connected.value = true
          connecting.value = false

          // Subscribe to all topics
          mqttClient.subscribe('#', (err) => {
            if (err) {
              error.value = `Failed to subscribe: ${err.message}`
            } else {
              addMessage('system', 'Connected and subscribed to all topics (#)')
            }
          })
        })

        mqttClient.on('error', (err) => {
          console.error('MQTT connection error:', err)
          error.value = `Connection failed: ${err.message || 'Unknown error'}`
          connecting.value = false
          connected.value = false
        })

        mqttClient.on('close', () => {
          console.log('MQTT connection closed')
          connected.value = false
          connecting.value = false
          addMessage('system', 'Connection closed')
        })

        mqttClient.on('message', (topic, message) => {
          let payload
          try {
            const messageStr = message.toString()
            // Try to parse as JSON for pretty printing
            const parsed = JSON.parse(messageStr)
            payload = JSON.stringify(parsed, null, 2)
          } catch (e) {
            payload = message.toString()
          }
          addMessage(topic, payload)
        })

        // Set a timeout for connection
        setTimeout(() => {
          if (connecting.value) {
            error.value = 'Connection timeout - please check the broker address and port'
            connecting.value = false
            if (mqttClient) {
              mqttClient.end(true)
            }
          }
        }, 15000)

      } catch (err) {
        error.value = `Connection failed: ${err.message}`
        connecting.value = false
      }
    }

    const disconnectClient = () => {
      if (mqttClient) {
        mqttClient.end()
        mqttClient = null
      }
      connected.value = false
      addMessage('system', 'Disconnected from broker')
    }

    const publishMessageToTopic = () => {
      if (mqttClient && connected.value && publishTopic.value && publishMessage.value) {
        mqttClient.publish(publishTopic.value, publishMessage.value, (err) => {
          if (err) {
            error.value = `Failed to publish: ${err.message}`
          } else {
            addMessage('system', `Published to ${publishTopic.value}: ${publishMessage.value}`)
          }
        })
      }
    }

    const addMessage = (topic, payload) => {
      const timestamp = new Date().toLocaleTimeString()
      const newMessage = {
        id: `${timestamp}-${Math.random().toString(16).substr(2, 8)}`,
        topic,
        payload,
        timestamp
      }

      messages.value = [newMessage, ...messages.value].slice(0, 500) // Keep last 500 messages
    }

    const clearMessages = () => {
      messages.value = []
    }

    onMounted(() => {
      addMessage('system', `Configured for ${serviceName.value}`)
      // Don't auto-connect, let user initiate
    })

    onUnmounted(() => {
      disconnectClient()
    })

    return {
      service,
      serviceName,
      connected,
      connecting,
      messages,
      error,
      publishTopic,
      publishMessage,
      connectionStatusText,
      connectionStatusClass,
      brokerUrl,
      connectToMQTT,
      disconnectClient,
      publishMessageToTopic,
      clearMessages
    }
  }
}
</script>

<style scoped>
.mqtt-client-container {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.connection-info h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.broker-url {
  font-family: monospace;
  font-size: 0.9em;
  color: #666;
  margin: 0;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.connected {
  background-color: #4CAF50;
}

.status-indicator.connecting {
  background-color: #FFC107;
  animation: pulse 1.5s infinite;
}

.status-indicator.disconnected {
  background-color: #F44336;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.header-buttons {
  display: flex;
  gap: 10px;
  flex-direction: column;
}

.connection-button, .back-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  color: white;
  cursor: pointer;
  white-space: nowrap;
}

.connection-button.connect {
  background-color: #4CAF50;
}

.connection-button.disconnect {
  background-color: #F44336;
}

.back-button {
  background-color: #2196F3;
}

.connection-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-container {
  background-color: #FFEBEE;
  border: 1px solid #FFCDD2;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  position: relative;
}

.error-container p {
  margin: 0;
  color: #D32F2F;
  font-weight: 500;
}

.close-error {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #D32F2F;
}

.loading-container {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
  margin-bottom: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.publish-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.publish-section h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.publish-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.topic-input, .message-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
}

.topic-input {
  flex: 1;
  min-width: 200px;
}

.message-input {
  flex: 2;
  min-width: 300px;
  resize: vertical;
}

.publish-button {
  padding: 8px 16px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.messages-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.messages-header h3 {
  margin: 0;
  color: #333;
}

.clear-button {
  padding: 5px 10px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.9em;
}

.empty-messages {
  text-align: center;
  padding: 40px;
  color: #757575;
}

.message-item {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.message-item.system-message {
  background-color: #f8f9fa;
}

.message-item:last-child {
  border-bottom: none;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-topic {
  font-weight: bold;
  color: #333;
  font-family: monospace;
}

.message-timestamp {
  font-size: 0.85em;
  color: #757575;
}

.message-payload {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 3px;
}
</style>
