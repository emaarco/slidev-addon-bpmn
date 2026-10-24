import { describe, it, expect } from 'vitest'
import { formatValue } from '../../../../plugins/dmn/utils/formatValue'

describe('formatValue', () => {
  it('renders a dash for a missing value', () => {
    expect(formatValue(null)).toBe('–')
    expect(formatValue(undefined)).toBe('–')
  })

  it('returns strings unchanged', () => {
    expect(formatValue('Spareribs')).toBe('Spareribs')
    expect(formatValue('')).toBe('')
  })

  it('serialises every other value as JSON', () => {
    expect(formatValue(42)).toBe('42')
    expect(formatValue(false)).toBe('false')
    expect(formatValue(['a', 1])).toBe('["a",1]')
    expect(formatValue({ dish: 'Stew' })).toBe('{"dish":"Stew"}')
  })
})
