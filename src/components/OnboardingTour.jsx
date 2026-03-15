import { useState, useCallback, useRef, useEffect } from 'react'

const slides = [
  {
    emoji: '🎉',
    title: '전단지P에 오신 것을 환영합니다!',
    desc: '우리 동네 전단지를 모아보고\n포인트도 적립하는 새로운 방법',
  },
  {
    emoji: '🪙',
    title: '전단지를 긁어서 포인트를 모으세요',
    desc: '복권처럼 전단지를 긁으면\n숨겨진 포인트가 나타나요',
  },
  {
    emoji: '🧠',
    title: '퀴즈와 QR 방문으로 추가 포인트!',
    desc: '전단지 퀴즈를 풀거나\nQR코드로 매장 방문을 인증하면 보너스 포인트',
  },
  {
    emoji: '🎁',
    title: '모은 포인트로 기프티콘 교환!',
    desc: '적립한 포인트로\n다양한 기프티콘을 받아가세요',
  },
]

export default function OnboardingTour({ onComplete }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0) // -1 prev, 1 next
  const [animating, setAnimating] = useState(false)
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)

  const isLast = current === slides.length - 1

  const goTo = useCallback((next) => {
    if (animating || next < 0 || next >= slides.length || next === current) return
    setDirection(next > current ? 1 : -1)
    setAnimating(true)
    setTimeout(() => {
      setCurrent(next)
      setAnimating(false)
    }, 250)
  }, [current, animating])

  const handleNext = useCallback(() => {
    if (isLast) {
      localStorage.setItem('onboarding_done', 'true')
      onComplete()
    } else {
      goTo(current + 1)
    }
  }, [isLast, current, goTo, onComplete])

  const handleSkip = useCallback(() => {
    localStorage.setItem('onboarding_done', 'true')
    onComplete()
  }, [onComplete])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const handleTouchMove = useCallback((e) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }, [])

  const handleTouchEnd = useCallback(() => {
    const dx = touchDeltaX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0 && current < slides.length - 1) {
        goTo(current + 1)
      } else if (dx > 0 && current > 0) {
        goTo(current - 1)
      }
    }
  }, [current, goTo])

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const slide = slides[current]
  const slideClass = animating
    ? `onboarding-slide onboarding-slide-exit-${direction > 0 ? 'left' : 'right'}`
    : 'onboarding-slide onboarding-slide-enter'

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        {current > 0 && (
          <button
            className="onboarding-skip"
            onClick={handleSkip}
            type="button"
          >
            건너뛰기
          </button>
        )}

        <div
          className="onboarding-slide-area"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={slideClass} key={current}>
            <div className="onboarding-emoji">{slide.emoji}</div>
            <h2 className="onboarding-title">{slide.title}</h2>
            <p className="onboarding-desc">{slide.desc}</p>
          </div>
        </div>

        <div className="onboarding-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === current ? 'onboarding-dot-active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <button
          className="onboarding-btn"
          onClick={handleNext}
          type="button"
        >
          {isLast ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  )
}
