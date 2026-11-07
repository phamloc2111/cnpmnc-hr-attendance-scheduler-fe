import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './features/auth/AuthProvider'
import { App } from './app/App'
import './style.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => { /* App stays usable if installation is unavailable. */ }) })
}

createRoot(document.getElementById('app')!).render(
  <StrictMode><AuthProvider><App /></AuthProvider></StrictMode>,
)
