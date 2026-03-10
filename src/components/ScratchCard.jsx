import { useRef, useEffect, useState, useCallback } from 'react'

const CARD_W = 340
const CARD_H = 400
const BRUSH_RADIUS = 28
const REVEAL_THRESHOLD = 0.80

function formatPrice(price) {
  if (!price || isNaN(price)) return '0원'
  return price.toLocaleString() + '원'
}

function getDiscountRate(original, sale) {
  if (!original || !sale || original <= 0) return 0
  return Math.round((1 - sale / original) * 100)
}

export default function ScratchCard({ flyer, onComplete, onClose }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const [revealed, setRevealed] = useState(false)
  const [percentage, setPercentage] = useState(0)
  const checkInterval = useRef(null)

  // 캔버스에 은박 코팅 그리기 (고정 340x400)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
    if (isDark) {
      grad.addColorStop(0, '#3a3a3a')
      grad.addColorStop(0.5, '#4a4a4a')
      grad.addColorStop(1, '#3a3a3a')
    } else {
      grad.addColorStop(0, '#C8C8C8')
      grad.addColorStop(0.3, '#D8D8D8')
      grad.addColorStop(0.5, '#E0E0E0')
      grad.addColorStop(0.7, '#D0D0D0')
      grad.addColorStop(1, '#B8B8B8')
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CARD_W, CARD_H)

    // 은박 질감
    const imageData = ctx.getImageData(0, 0, CARD_W, CARD_H)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15
      data[i] += noise
      data[i + 1] += noise
      data[i + 2] += noise
    }
    ctx.putImageData(imageData, 0, 0)

    // 안내 텍스트
    ctx.fillStyle = isDark ? '#888' : '#999'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('손가락으로 긁어보세요!', CARD_W / 2, CARD_H / 2 - 16)
    ctx.font = '36px sans-serif'
    ctx.fillText('🎰', CARD_W / 2, CARD_H / 2 + 28)
  }, [])

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
    const ratio = transparent / (total / 4)
    setPercentage(Math.round(ratio * 100))
    if (ratio >= REVEAL_THRESHOLD) {
      setRevealed(true)
    }
  }, [revealed])

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
          {/* 아래 레이어: 전단지 포스터 (고정 340x400) */}
          <div
            className="scratch-flyer"
            style={{ background: flyer.storeBgColor }}
          >
            {/* 배경 이미지 or 이모지 — 340x400 전체를 꽉 채움 */}
            {flyer.imageUrl ? (
              <img src={flyer.imageUrl} alt={flyer.storeName} className="scratch-flyer-img" loading="lazy" />
            ) : (
              <div className="scratch-flyer-emoji-bg" style={{ color: flyer.storeColor + '25' }}>
                {flyer.storeEmoji}
              </div>
            )}

            {/* 상단: 가게명 + 포인트 */}
            <div className="scratch-flyer-top">
              <div className="scratch-flyer-store" style={{ background: flyer.storeColor }}>
                {flyer.storeEmoji} {flyer.storeName}
              </div>
              {flyer.sharePoint > 0 && (
                <div className="scratch-flyer-point">+{flyer.sharePoint}P</div>
              )}
            </div>

            {/* 하단: 제목 + 상품 목록 */}
            <div className="scratch-flyer-bottom">
              <div className="scratch-flyer-title">{flyer.title}</div>
              {flyer.subtitle && <div className="scratch-flyer-sub">{flyer.subtitle}</div>}

              {flyer.items && flyer.items.length > 0 && (
                <div className="scratch-flyer-items">
                  {flyer.items.slice(0, 3).map((item, i) => {
                    const rate = getDiscountRate(item.originalPrice, item.salePrice)
                    return (
                      <div key={i} className="scratch-flyer-item">
                        <span className="scratch-flyer-item-name">{item.name}</span>
                        <span className="scratch-flyer-item-right">
                          <span className="scratch-flyer-item-sale">{formatPrice(item.salePrice)}</span>
                          {rate > 0 && <span className="scratch-flyer-item-rate">{rate}%</span>}
                        </span>
                      </div>
                    )
                  })}
                  {flyer.items.length > 3 && (
                    <div className="scratch-flyer-item-more">외 {flyer.items.length - 3}건</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 위 레이어: 은박 캔버스 (고정 340x400) */}
          <canvas
            ref={canvasRef}
            className={`scratch-canvas ${revealed ? 'scratch-canvas-hide' : ''}`}
            width={CARD_W}
            height={CARD_H}
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
