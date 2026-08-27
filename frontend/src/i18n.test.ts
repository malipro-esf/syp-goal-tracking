import { expect, test } from 'vitest'

import { loadLocale } from './i18n'

test('loads the Finnish translation catalog on demand', async () => {
  const finnish = await loadLocale('fi')

  expect(finnish.navigation).toMatchObject({ signIn: 'Kirjaudu sisään' })
})

test('loads the Greek translation catalog on demand', async () => {
  const greek = await loadLocale('el')

  expect(greek.navigation).toMatchObject({ signIn: 'Σύνδεση' })
  expect(greek.plansPage).toMatchObject({ title: 'Οι στόχοι σας' })
})

test('loads the Swedish translation catalog on demand', async () => {
  const swedish = await loadLocale('sv')

  expect(swedish.navigation).toMatchObject({ signIn: 'Logga in' })
  expect(swedish.plansPage).toMatchObject({ title: 'Dina mål' })
})

test('loads the Danish translation catalog on demand', async () => {
  const danish = await loadLocale('da')

  expect(danish.navigation).toMatchObject({ signIn: 'Log ind' })
  expect(danish.plansPage).toMatchObject({ title: 'Dine mål' })
})

test('loads the Norwegian Bokmål translation catalog on demand', async () => {
  const norwegian = await loadLocale('nb')

  expect(norwegian.navigation).toMatchObject({ signIn: 'Logg inn' })
  expect(norwegian.plansPage).toMatchObject({ title: 'Dine mål' })
})

test('loads the Italian translation catalog on demand', async () => {
  const italian = await loadLocale('it')

  expect(italian.navigation).toMatchObject({ signIn: 'Accedi' })
  expect(italian.plansPage).toMatchObject({ title: 'I tuoi obiettivi' })
})

test('keeps the bundled English catalog available through the same interface', async () => {
  const english = await loadLocale('en')

  expect(english.navigation).toMatchObject({ signIn: 'Sign in' })
})

test('rejects an unsupported locale instead of silently loading incorrect text', async () => {
  await expect(loadLocale('unsupported' as never)).rejects.toThrow('Unsupported locale: unsupported')
})
