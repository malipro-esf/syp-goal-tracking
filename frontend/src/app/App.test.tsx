import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { App } from './App'

afterEach(() => {
  vi.restoreAllMocks()
})

test('shows that the API is available after a successful health check', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ status: 'ok', service: 'SYP API', environment: 'test' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )

  render(<App />)

  expect(screen.getByText('Checking API status…')).toBeInTheDocument()
  expect(await screen.findByText('SYP API is available')).toBeInTheDocument()
})
