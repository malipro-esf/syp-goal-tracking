import { describe, expect, it } from 'vitest'

import { formatNumber } from './format-number'

describe('formatNumber', () => {
  it('removes insignificant trailing zeros', () => {
    expect(formatNumber('10.0000')).toBe('10')
    expect(formatNumber('30.00')).toBe('30')
  })

  it('keeps meaningful decimal digits', () => {
    expect(formatNumber('10.5000')).toBe('10.5')
    expect(formatNumber('12.3456')).toBe('12.3456')
  })
})
