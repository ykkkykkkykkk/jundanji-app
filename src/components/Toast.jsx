import { useEffect, useRef } from 'react'

const ICONS = {
  success: '\u2705',
  error: '\u274C',
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F',
}

export default function Toast({ message, type = 'info', visible, onClose }) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(() => {
        onClose()
      }, 3000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible, message])

  if (!visible) return null

  return (
    <div className={`toast toast-${type} toast-enter`}>
      <span className="toast-icon">{ICONS[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="닫기">&times;</button>
    </div>
  )
}
