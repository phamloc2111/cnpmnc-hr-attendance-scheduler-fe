import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({ title, busy, onClose, children, className }: {
  title: string; busy: boolean; onClose: () => void; children: ReactNode; className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog className={className ? `modal ${className}` : "modal"} ref={ref} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="modal-header"><h2 id={titleId}>{title}</h2>
      <button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}>×</button>
    </div>
    {children}
  </dialog>
}
