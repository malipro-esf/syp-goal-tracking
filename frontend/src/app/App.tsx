import { useEffect, useState } from 'react'

import { getHealth, type HealthStatus } from '../api/health'
import './app.css'

type ApiState =
  | { status: 'loading' }
  | { status: 'available'; health: HealthStatus }
  | { status: 'unavailable' }

export function App() {
  const [apiState, setApiState] = useState<ApiState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    getHealth(controller.signal)
      .then((health) => setApiState({ status: 'available', health }))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setApiState({ status: 'unavailable' })
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="page-shell">
      <section className="status-card" aria-labelledby="page-title">
        <p className="eyebrow">Progress over perfection.</p>
        <h1 id="page-title">SYP development foundation</h1>
        <p className="description">
          The first milestone connects the React interface to the versioned FastAPI API.
        </p>

        <div className={`api-status api-status--${apiState.status}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {apiState.status === 'loading' && 'Checking API status…'}
          {apiState.status === 'available' && `${apiState.health.service} is available`}
          {apiState.status === 'unavailable' && 'API is unavailable'}
        </div>
      </section>
    </main>
  )
}

