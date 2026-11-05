import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './features/auth/AuthProvider'
import { App } from './app/App'
import './style.css'

createRoot(document.getElementById('app')!).render(
  <StrictMode><AuthProvider><App /></AuthProvider></StrictMode>,
)
