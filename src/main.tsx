import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

type HealthResponse = {
  status: string
  service: string
}

function App() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  const [health, setHealth] = useState<HealthResponse>()

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/v1/health`)
      .then((response) => response.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => undefined)
  }, [apiBaseUrl])

  return (
    <main>
      <p className="eyebrow">Chấm công &amp; xếp lịch làm việc</p>
      <h1>HR Attendance</h1>
      <div className="status-card">
        <span>Backend</span>
        <strong>{health ? `${health.status} · ${health.service}` : 'Đang kết nối...'}</strong>
      </div>
    </main>
  )
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
