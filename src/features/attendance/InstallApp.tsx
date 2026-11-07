import { useEffect, useState } from 'react'
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const done = () => { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', ready); window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done) }
  }, [])
  if (installed) return null
  return <aside className="home-install"><h3>Mở ShiftSync nhanh hơn</h3>
    {prompt ? <button disabled={busy} onClick={() => {
      setBusy(true)
      void prompt.prompt().then(() => prompt.userChoice).then(choice => { if (choice.outcome === 'accepted') setInstalled(true) })
        .catch(() => { /* The browser menu remains available. */ }).finally(() => { setBusy(false); setPrompt(null) })
    }}>Thêm vào màn hình chính</button> : <p>Trên iPhone: mở bằng Safari → Chia sẻ → Thêm vào MH chính. Trên Android: mở menu trình duyệt → Cài đặt ứng dụng hoặc Thêm vào màn hình chính.</p>}
  </aside>
}
