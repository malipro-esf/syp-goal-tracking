import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'vazirmatn/Vazirmatn-Variable-font-face.css'

import { App } from './app/App'
import { AuthProvider } from './features/auth/AuthContext'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><App /></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
