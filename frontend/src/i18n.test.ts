import { expect, test } from 'vitest'

import { loadLocale } from './i18n'

test('loads a non-English translation catalog on demand', async () => {
  const french = await loadLocale('fr')

  expect(french.navigation).toMatchObject({ signIn: 'Se connecter' })
})

test('keeps the bundled English catalog available through the same interface', async () => {
  const english = await loadLocale('en')

  expect(english.navigation).toMatchObject({ signIn: 'Sign in' })
})

test('rejects an unsupported locale instead of silently loading incorrect text', async () => {
  await expect(loadLocale('unsupported' as never)).rejects.toThrow('Unsupported locale: unsupported')
})
