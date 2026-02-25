import { useRef, useEffect } from 'react'

// 간단한 QR 코드 표시 컴포넌트 (텍스트 + 복사)
export default function QrDisplay({ qrCode, storeName, qrPoint }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !qrCode) return
    // 간단한 QR placeholder 렌더링 (실제 QR은 서버에서 생성)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const size = 200
    canvas.width = size
    canvas.height = size

    // 배경
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, size, size)

    // QR 패턴 시뮬레이션 (실제 QR 대신 UUID를 시각적으로 표현)
    ctx.fillStyle = '#000'
    const cellSize = 6
    const chars = qrCode.replace(/-/g, '')
    for (let i = 0; i < chars.length && i < 600; i++) {
      const code = chars.charCodeAt(i % chars.length)
      if (code % 3 !== 0) {
        const col = (i * 7) % Math.floor(size / cellSize)
        const row = Math.floor((i * 7) / Math.floor(size / cellSize)) % Math.floor(size / cellSize)
        ctx.fillRect(col * cellSize, row * cellSize, cellSize - 1, cellSize - 1)
      }
    }

    // 중앙에 로고 영역
    ctx.fillStyle = '#fff'
    ctx.fillRect(size / 2 - 25, size / 2 - 25, 50, 50)
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('📱', size / 2, size / 2)

    // 테두리 마커
    const drawMarker = (x, y) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(x, y, 42, 42)
      ctx.fillStyle = '#fff'
      ctx.fillRect(x + 6, y + 6, 30, 30)
      ctx.fillStyle = '#000'
      ctx.fillRect(x + 12, y + 12, 18, 18)
    }
    drawMarker(6, 6)
    drawMarker(size - 48, 6)
    drawMarker(6, size - 48)
  }, [qrCode])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode)
      alert('QR 코드가 복사되었습니다!')
    } catch {
      // 폴백
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
