import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  text: string
  tone: 'ok' | 'warn'
}

export default function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 2200)
    return () => window.clearTimeout(t)
  }, [toast.id, onClose])

  return (
    <div className={`toast toast--${toast.tone}`} role="status" aria-live="polite">
      <span className="toast__dot" aria-hidden="true" />
      {toast.text}
    </div>
  )
}
