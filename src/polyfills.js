import { Buffer } from 'buffer'
import process from 'process'

// Make Buffer and process available globally
window.Buffer = Buffer
window.process = process

// NOTE: this file is deprecated — migrated to `src/polyfills.ts`. Please delete this file when ready.