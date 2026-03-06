import { useState, useRef, useEffect, useCallback } from 'react'

const CROP_W = 340
const CROP_H = 400
const VIEW_W = 306
const VIEW_H = 360

export default function ImageCropper({ imageSrc, onConfirm, onCancel }) {
  const imgRef = useRef(null)
  const viewRef = useRef(null)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const pinchDist = useRef(null)

  const [imgLoaded, setImgLoaded] = useState(false)
  const [naturalW, setNaturalW] = useState(0)
  const [naturalH, setNaturalH] = useState(0)
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // 이미지 로드 → 최소 스케일(cover) 계산
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setNaturalW(img.naturalWidth)
      setNaturalH(img.naturalHeight)

      const scaleX = VIEW_W / img.naturalWidth
      const scaleY = VIEW_H / img.naturalHeight
      const coverScale = Math.max(scaleX, scaleY)

      setMinScale(coverScale)
      setScale(coverScale)
      setPos({
        x: (VIEW_W - img.naturalWidth * coverScale) / 2,
        y: (VIEW_H - img.naturalHeight * coverScale) / 2,
      })
      setImgLoaded(true)
    }
    img.src = imageSrc
  }, [imageSrc])

  // 경계 clamp
  const clamp = useCallback((x, y, s) => {
    const imgW = naturalW * s
    const imgH = naturalH * s
    const maxX = 0
    const maxY = 0
    const minX = VIEW_W - imgW
    const minY = VIEW_H - imgH
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    }
  }, [naturalW, naturalH])

  // 스케일 변경 시 clamp
  const applyScale = useCallback((newScale) => {
    const s = Math.max(minScale, Math.min(minScale * 4, newScale))
    setScale(s)
    setPos(prev => clamp(prev.x, prev.y, s))
  }, [minScale, clamp])

  // 마우스 드래그
  const handlePointerDown = (e) => {
    if (e.touches && e.touches.length === 2) return
    dragging.current = true
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    lastPos.current = { x: clientX, y: clientY }
  }

  const handlePointerMove = (e) => {
    // 핀치줌
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (pinchDist.current !== null) {
        const ratio = dist / pinchDist.current
        applyScale(scale * ratio)
      }
      pinchDist.current = dist
      return
    }

    if (!dragging.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = clientX - lastPos.current.x
    const dy = clientY - lastPos.current.y
    lastPos.current = { x: clientX, y: clientY }
    setPos(prev => clamp(prev.x + dx, prev.y + dy, scale))
  }

  const handlePointerUp = () => {
    dragging.current = false
    pinchDist.current = null
  }

  // 슬라이더
  const handleSlider = (e) => {
    const val = Number(e.target.value)
    applyScale(minScale + (minScale * 3) * (val / 100))
  }
  const sliderValue = minScale > 0 ? ((scale - minScale) / (minScale * 3)) * 100 : 0

  // 확인 → Canvas로 크롭
  const handleConfirm = () => {
    const canvas = document.createElement('canvas')
    canvas.width = CROP_W
    canvas.height = CROP_H
    const ctx = canvas.getContext('2d')

    // 뷰포트 좌표 → 출력 비율
    const outScale = CROP_W / VIEW_W
    const sx = -pos.x / scale
    const sy = -pos.y / scale
    const sw = VIEW_W / scale
    const sh = VIEW_H / scale

    const img = imgRef.current
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CROP_W, CROP_H)

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div className="cropper-overlay" onMouseUp={handlePointerUp} onTouchEnd={handlePointerUp}>
      <div className="cropper-modal">
        <div className="cropper-header">
          <span className="cropper-title">이미지 위치 조절</span>
          <button className="cropper-cancel-btn" onClick={onCancel}>취소</button>
        </div>

        <div
          ref={viewRef}
          className="cropper-viewport"
          style={{ width: VIEW_W, height: VIEW_H }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
        >
          {imgLoaded && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="crop"
              className="cropper-image"
              draggable={false}
              style={{
                width: naturalW * scale,
                height: naturalH * scale,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
            />
          )}
          {!imgLoaded && <div className="cropper-loading">이미지 로딩 중...</div>}
        </div>

        <div className="cropper-controls">
          <span className="cropper-zoom-label">-</span>
          <input
            type="range"
            className="cropper-zoom-slider"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSlider}
          />
          <span className="cropper-zoom-label">+</span>
        </div>

        <button className="cropper-confirm-btn" onClick={handleConfirm}>확인</button>
      </div>
    </div>
  )
}
