import { useEffect, useRef, useState } from 'react'

export default function QrScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanningRef = useRef(true)
  const [error, setError] = useState(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    let animFrame
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        // BarcodeDetector API 사용 (모바일 브라우저 지원)
        if ('BarcodeDetector' in window) {
          const detector = new BarcodeDetector({ formats: ['qr_code'] })
          const scanFrame = async () => {
            if (!scanningRef.current || !videoRef.current) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                scanningRef.current = false
                onScan(barcodes[0].rawValue)
                return
              }
            } catch {}
            animFrame = requestAnimationFrame(scanFrame)
          }
          videoRef.current.onloadedmetadata = () => {
            scanFrame()
          }
        } else {
          // BarcodeDetector 미지원 시 수동 입력 폴백
          setShowManual(true)
        }
      } catch (err) {
        console.error('카메라 접근 실패:', err)
        setHasCamera(false)
        setShowManual(true)
        setError('카메라에 접근할 수 없습니다.')
      }
    }

    startCamera()

    return () => {
      scanningRef.current = false
      cancelAnimationFrame(animFrame)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [onScan])

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim())
    }
  }

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-header">
        <button className="back-btn" onClick={onClose}>←</button>
        <span className="qr-scanner-title">QR 코드 스캔</span>
      </div>

      {hasCamera && (
        <div className="qr-scanner-view">
          <video ref={videoRef} className="qr-scanner-video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="qr-scanner-frame">
            <div className="qr-frame-corner tl" />
            <div className="qr-frame-corner tr" />
            <div className="qr-frame-corner bl" />
            <div className="qr-frame-corner br" />
          </div>
          <div className="qr-scanner-hint">매장의 QR 코드를 스캔해주세요</div>
        </div>
      )}

      {error && <div className="qr-scanner-error">{error}</div>}

      {showManual && (
        <div className="qr-manual-section">
          <p className="qr-manual-label">QR 코드를 직접 입력하세요</p>
          <div className="qr-manual-row">
            <input
              className="qr-manual-input"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="QR 코드 값 입력"
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
            />
            <button className="qr-manual-btn" onClick={handleManualSubmit}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
