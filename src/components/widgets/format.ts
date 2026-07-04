// Shared value formatting for widgets
export function formatValue(value: unknown, decimals?: number): string {
  if (value === null || value === undefined) return '--'
  if (typeof value === 'number') {
    return decimals !== undefined ? value.toFixed(decimals) : String(value)
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) return Number(value)
  return null
}
