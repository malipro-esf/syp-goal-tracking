import { expect, test } from 'vitest'

import { getSupportedTimezones } from './timezones'

test('offers UTC and preserves the user current timezone', () => {
  const timezones = getSupportedTimezones('Pacific/Kiritimati')

  expect(timezones).toContain('UTC')
  expect(timezones).toContain('Pacific/Kiritimati')
  expect(timezones).toEqual([...timezones].sort((left, right) => left.localeCompare(right)))
})
