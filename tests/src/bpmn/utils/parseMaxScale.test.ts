import { describe, expect, it } from 'vitest'
import { parseMaxScale } from '../../../../src/bpmn/utils/parseMaxScale'

describe('parseMaxScale', () => {
  it.each([
    [1, 1],
    [0.5, 0.5],
    ['3', 3],
  ])('accepts the positive scale %j', (input, expected) => {
    expect(parseMaxScale(input)).toBe(expected)
  })

  it.each([undefined, null, 0, -1, 'abc', Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to the default scale for %j',
    (input) => {
      expect(parseMaxScale(input)).toBeUndefined()
    },
  )
})
