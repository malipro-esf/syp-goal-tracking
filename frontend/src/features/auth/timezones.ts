const fallbackTimezones = [
  'UTC',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Istanbul',
  'Asia/Jakarta',
  'Asia/Kolkata',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Bucharest',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Stockholm',
] as const

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[]
}

export function detectBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function getSupportedTimezones(currentTimezone?: string): string[] {
  const supportedValuesOf = (Intl as IntlWithSupportedValues).supportedValuesOf
  const browserTimezones = supportedValuesOf ? supportedValuesOf('timeZone') : [...fallbackTimezones]
  const timezones = new Set(['UTC', ...browserTimezones])
  if (currentTimezone) timezones.add(currentTimezone)
  return [...timezones].sort((left, right) => left.localeCompare(right))
}
