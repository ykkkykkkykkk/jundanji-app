import { useRef, useEffect, useState, useCallback } from 'react'

const BRUSH_RADIUS = 28
const REVEAL_THRESHOLD = 0.80

export default function ScratchCard({ flyer, onComplete, onClose }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const [revealed, setRevealed] = useState(false)
  const [percentage, setPercentage] = useState(0)
  const checkInterval = useRef(null)

  const getCanvasPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  const scratch = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const checkReveal = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || revealed) return
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparent = 0
    const total = pixels.length / 4
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) transparent++
    }
    const ratio = (transparent / (total / 4))
    setPercentage(Math.round(ratio * 100))
    if (ratio >= REVEAL_THRESHOLD) {
      setRevealed(true)
    }
  }, [revealed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    // 회색 배경 그리기
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    ctx.fillStyle = isDark ? '#333' : '#C0C0C0'
    ctx.fillRect(0, 0, w, h)

    // 힌트 텍스트
    ctx.fillStyle = isDark ? '#888' : '#888'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('손가락으로 긁어보세요!', w / 2, h / 2 - 20)
    ctx.font = '40px sans-serif'
    ctx.fillText('🎰', w / 2, h / 2 + 30)
  }, [])

  useEffect(() => {
    if (revealed) {
      clearInterval(checkInterval.current)
      setTimeout(() => onComplete(flyer), 800)
    }
  }, [revealed, flyer, onComplete])

  const handleStart = (e) => {
    e.preventDefault()
    isDrawing.current = true
    const pos = getCanvasPos(e, canvasRef.current)
    scratch(pos.x, pos.y)
    if (!checkInterval.current) {
      checkInterval.current = setInterval(checkReveal, 300)
    }
  }

  const handleMove = (e) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const pos = getCanvasPos(e, canvasRef.current)
    scratch(pos.x, pos.y)
  }

  const handleEnd = () => {
    isDrawing.current = false
    checkReveal()
  }

  return (
    <div className={`scratch-overlay ${revealed ? 'scratch-revealed' : ''}`}>
      <div className="scratch-container">
        <button className="scratch-close-btn" onClick={onClose}>✕</button>

        <div className="scratch-progress">
          <div className="scratch-progress-bar" style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>

        <div className="scratch-card-inner">
          {/* 아래 레이어: 전단지 미리보기 */}
          <div className="scratch-preview" style={{ background: `linear-gradient(160deg, ${flyer.storeColor}22, ${flyer.storeBgColor})` }}>
            {flyer.imageUrl ? (
              <img src={flyer.imageUrl} alt={flyer.storeName} className="scratch-preview-img" />
            ) : (
              <div className="scratch-preview-emoji">{flyer.storeEmoji}</div>
            )}
            <div className="scratch-preview-store">{flyer.storeName}</div>
            <div className="scratch-preview-title">{flyer.title}</div>
            <div className="scratch-preview-sub">{flyer.subtitle}</div>
            {flyer.sharePoint > 0 && (
              <div className="scratch-preview-point">+{flyer.sharePoint}P</div>
            )}
          </div>

          {/* 위 레이어: 긁기 캔버스 */}
          <canvas
            ref={canvasRef}
            className={`scratch-canvas ${revealed ? 'scratch-canvas-hide' : ''}`}
            width={340}
            height={400}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        {revealed && (
          <div className="scratch-complete-msg">전단지가 공개되었습니다!</div>
        )}
      </div>
    </div>
  )
}
