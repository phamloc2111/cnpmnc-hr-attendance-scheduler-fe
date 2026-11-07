import { useEffect, useState } from 'react'
import { request } from '../../shared/api/client'

export function AttendancePhoto({ src, alt, className }: { src: string; alt: string; className: string }) {
  const privatePhoto = /^\/api\/v1\/attendance\/events\/[^/]+\/photo$/.test(src)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!privatePhoto) return
    let active = true, objectUrl = ''
    setUrl(''); setError('')
    request<Blob>(src.slice('/api/v1'.length), {}, false, 'blob').then(blob => {
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) }
    }).catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Không tải được ảnh điểm danh.') })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src, privatePhoto])
  if (!privatePhoto) return <img src={src} alt={alt} className={className} />
  if (error) return <span role="alert">{error}<span> Đóng và mở lại chi tiết để thử lại.</span></span>
  if (!url) return <span role="status" aria-label={alt}>Đang tải ảnh…</span>
  return <img src={url} alt={alt} className={className} onError={() => setError('Không hiển thị được ảnh.')} />
}
