<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# MQTT mDNS Vue 3 + Capacitor Project

This is a Vue 3 + Capacitor application for MQTT broker discovery and client connectivity with cross-platform support for Android and iOS.

## Project Structure
- `src/views/ScannerView.vue` - Main scanner interface for adding and managing MQTT brokers
- `src/views/MQTTClientView.vue` - MQTT client interface for connecting and messaging
- `src/router/index.js` - Vue Router configuration
- `src/polyfills.js` - Browser polyfills for Node.js APIs (Buffer, process)

## Development Guidelines
- Use Vue 3 Composition API for all new components
- Follow mobile-first design principles for responsive layouts
- Ensure MQTT WebSocket connections are properly handled with error recovery
- Include proper TypeScript types when adding new features
- Test on both Android and iOS devices using Capacitor
- Use semantic commit messages

## Key Features
- Manual MQTT broker configuration (TCP, WebSocket, TLS)
- Real-time message subscription and publishing
- Cross-platform mobile support via Capacitor
- Message history with JSON formatting
- Connection status indicators

## Technical Notes
- Uses polyfills for Node.js Buffer/process APIs in browser environment
- MQTT over WebSocket is preferred for web/mobile compatibility
- Error handling includes connection timeouts and retry logic
- Messages are limited to 500 for performance
