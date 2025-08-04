# MQTT mDNS Scanner - Vue 3 + Capacitor

A cross-platform mobile application built with Vue 3 and Capacitor for discovering and connecting to MQTT brokers.

## Features

- 📱 **Cross-platform**: Runs on Android, iOS, and web browsers
- 🔍 **MQTT Broker Management**: Add and manage MQTT brokers manually
- 🌐 **Multiple Protocols**: Support for MQTT over TCP, WebSocket, TLS, and WSS
- 💬 **Real-time Messaging**: Subscribe to topics and publish messages
- 📊 **Message History**: View received messages with JSON formatting
- 🔧 **Connection Management**: Real-time connection status and error handling

## Tech Stack

- **Vue 3** with Composition API
- **Capacitor** for cross-platform mobile development
- **MQTT.js** for MQTT protocol support
- **Vue Router** for navigation
- **Vite** for fast development and building

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Sync with Capacitor platforms
npm run sync
```

### Mobile Development

```bash
# Add platforms (already included)
npx cap add android
npx cap add ios

# Run on Android
npm run android

# Run on iOS
npm run ios

# Open in native IDEs
npm run open:android
npm run open:ios
```

## Usage

1. **Add MQTT Broker**: Enter the broker IP address, port, and select the protocol type
2. **Connect**: Tap on a configured broker to open the MQTT client
3. **Subscribe**: The app automatically subscribes to all topics (#)
4. **Publish**: Use the publish section to send messages to specific topics
5. **Monitor**: View real-time messages in the message history

## Default Test Brokers

The app includes some pre-configured test brokers:
- Local MQTT Broker (192.168.1.100:1883)
- Local WebSocket (192.168.1.100:9001)
- Mosquitto Test Server (test.mosquitto.org:8080)

## Configuration

### Common MQTT Ports
- **1883**: Standard MQTT over TCP
- **8883**: MQTT over TLS
- **9001**: MQTT over WebSocket
- **8080**: MQTT over WebSocket (some brokers)

### Supported Service Types
- `_mqtt._tcp.`: MQTT over TCP
- `_mqtt-ws._tcp.`: MQTT over WebSocket
- `_mqtts._tcp.`: MQTT over TLS
- `_mqtt-wss._tcp.`: MQTT over WebSocket Secure

## Architecture

```
src/
├── views/
│   ├── ScannerView.vue      # Main broker management interface
│   └── MQTTClientView.vue   # MQTT client and messaging
├── router/
│   └── index.js             # Vue Router configuration
├── polyfills.js             # Node.js compatibility for browsers
├── App.vue                  # Root component
└── main.js                  # Application entry point
```

## Building for Production

```bash
# Build web assets
npm run build

# Sync with mobile platforms
npm run sync

# Generate signed APK/IPA through native IDEs
npm run open:android  # or open:ios
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both web and mobile platforms
5. Submit a pull request

## License

MIT License - see LICENSE file for details
