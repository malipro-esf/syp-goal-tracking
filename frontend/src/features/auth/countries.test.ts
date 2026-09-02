import { expect, test } from 'vitest'

import { getCountryOptions } from './countries'

test('offers ISO countries with localized display names', () => {
  const countries = getCountryOptions('en')

  expect(countries.find(({ code }) => code === 'RO')?.name).toBe('Romania')
  expect(countries.find(({ code }) => code === 'US')?.name).toBe('United States')
  expect(new Set(countries.map(({ code }) => code)).size).toBe(countries.length)
})
