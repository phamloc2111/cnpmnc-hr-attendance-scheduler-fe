import { useEffect, useState } from 'react'
import { request } from '../../shared/api/client'
import type { ExplanationImage } from './api'

function PrivateImage({ image }: { image: ExplanationImage }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    let objectUrl = ''
    request<Blob>(image.url.replace(/^\/api\/v1/, ''), {}, false, 'blob')
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        if (active) setSrc(objectUrl)
        else URL.revokeObjectURL(objectUrl)
      })
      .catch(() => { if (active) setError(true) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [image.url])
  if (error) return <span role="alert" className="explanation-image-error">Không tải được ảnh</span>
  if (!src) return <span className="explanation-image-loading">Đang tải ảnh…</span>
  return <a href={src} target="_blank" rel="noreferrer" aria-label="Xem ảnh giải trình"><img src={src} alt="Ảnh minh chứng giải trình" /></a>
}

export function ExplanationImages({ images }: { images: ExplanationImage[] | undefined }) {
  if (!images?.length) return null
  return <div className="explanation-images" aria-label="Ảnh minh chứng">{images.map(image => <PrivateImage key={image.id} image={image} />)}</div>
}
