import { Buffer } from 'buffer'
import process from 'process'

declare global {
  interface Window {
    Buffer: typeof Buffer
    process: typeof process
  }
}

// Make Buffer and process available globally
window.Buffer = Buffer as any
window.process = process as any
