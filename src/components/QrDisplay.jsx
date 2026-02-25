import { useRef, useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QrDisplay({ qrCode, storeName, qrPoint }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !qrCode) return
    QRCode.toCanvas(canvasRef.current, qrCode, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(() => setReady(true)).catch(() => {})
  }, [qrCode])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode)
      alert('QR 코드가 복사되었습니다!')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = qrCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('QR 코드가 복사되었습니다!')
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-${storeName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!qrCode) {
    return <div className="qr-display-empty">QR 코드가 아직 생성되지 않았습니다.</div>
  }

  return (
    <div className="qr-display">
      <canvas ref={canvasRef} className="qr-display-canvas" />
      <div className="qr-display-info">
        <div className="qr-display-store">{storeName}</div>
        <div className="qr-display-point">방문 인증 시 +{qrPoint}P</div>
      </div>
      <div className="qr-display-code">{qrCode}</div>
      <div className="qr-display-actions">
        <button className="qr-action-btn" onClick={handleCopy}>복사</button>
        <button className="qr-action-btn" onClick={handleDownload}>다운로드</button>
      </div>
    </div>
  )
}
