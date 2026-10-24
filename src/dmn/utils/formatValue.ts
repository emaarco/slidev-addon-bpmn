export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '–'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}
