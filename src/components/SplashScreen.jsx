import { useState, useEffect } from 'react'

const FLYERS = [
  { emoji: '📄', left: '10%', delay: '0s' },
  { emoji: '🗞️', left: '20%', delay: '0.08s' },
  { emoji: '📋', left: '30%', delay: '0.16s' },
  { emoji: '📃', left: '40%', delay: '0.24s' },
  { emoji: '📰', left: '50%', delay: '0.32s' },
  { emoji: '📄', left: '60%', delay: '0.40s' },
  { emoji: '🗞️', left: '70%', delay: '0.48s' },
  { emoji: '📋', left: '80%', delay: '0.56s' },
  { emoji: '📃', left: '15%', delay: '0.64s' },
  { emoji: '📰', left: '35%', delay: '0.72s' },
  { emoji: '📄', left: '55%', delay: '0.80s' },
  { emoji: '🗞️', left: '75%', delay: '0.88s' },
]

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 2200)
    const finishTimer = setTimeout(() => onFinish(), 2700)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-circle1" />
      <div className="splash-circle2" />

      {FLYERS.map((f, i) => (
        <div
          key={i}
          className="splash-flyer"
          style={{ left: f.left, animationDelay: f.delay }}
        >
          {f.emoji}
        </div>
      ))}

      <div className="splash-character">
        <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 왼쪽 귀 */}
          <ellipse cx="38" cy="28" rx="14" ry="32" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
          <ellipse cx="38" cy="28" rx="8" ry="22" fill="#FFB0C0"/>
          {/* 오른쪽 귀 */}
          <ellipse cx="82" cy="28" rx="14" ry="32" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
          <ellipse cx="82" cy="28" rx="8" ry="22" fill="#FFB0C0"/>
          {/* 몸통 */}
          <ellipse cx="60" cy="108" rx="28" ry="24" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
          {/* 얼굴 */}
          <circle cx="60" cy="72" r="32" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
          {/* 왼쪽 눈 */}
          <circle cx="48" cy="68" r="5" fill="#1A1A1A"/>
          <circle cx="46.5" cy="66" r="2" fill="white"/>
          {/* 오른쪽 눈 */}
          <circle cx="72" cy="68" r="5" fill="#1A1A1A"/>
          <circle cx="70.5" cy="66" r="2" fill="white"/>
          {/* 볼터치 */}
          <ellipse cx="40" cy="78" rx="7" ry="4.5" fill="#FFB0C0" opacity="0.6"/>
          <ellipse cx="80" cy="78" rx="7" ry="4.5" fill="#FFB0C0" opacity="0.6"/>
          {/* 코 */}
          <ellipse cx="60" cy="75" rx="3" ry="2.2" fill="#FFB0C0"/>
          {/* 입 - 활짝 웃는 */}
          <path d="M54 80 Q57 86 60 80" stroke="#1A1A1A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M60 80 Q63 86 66 80" stroke="#1A1A1A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* 왼팔 (전단지 던지는 동작) */}
          <path d="M32 98 Q18 82 10 70" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
          <path d="M32 98 Q18 82 10 70" stroke="#E0E0E0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* 왼손에 전단지 */}
          <rect x="0" y="58" width="18" height="22" rx="2" fill="#FFF9C4" stroke="#FFD54F" strokeWidth="1.2" transform="rotate(-20 9 69)"/>
          <line x1="5" y1="65" x2="14" y2="63" stroke="#FFD54F" strokeWidth="1" opacity="0.6"/>
          <line x1="4" y1="70" x2="13" y2="68" stroke="#FFD54F" strokeWidth="1" opacity="0.6"/>
          {/* 오른팔 */}
          <path d="M88 98 Q96 90 100 95" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
          <path d="M88 98 Q96 90 100 95" stroke="#E0E0E0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* 왼발 */}
          <ellipse cx="48" cy="130" rx="10" ry="6" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
          {/* 오른발 */}
          <ellipse cx="72" cy="130" rx="10" ry="6" fill="white" stroke="#E0E0E0" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="splash-logo">
        <div className="splash-logo-title">전단지<span>P</span></div>
        <div className="splash-logo-sub">뿌리면 포인트 💰</div>
      </div>

      <div className="splash-dots">
        <div className="splash-dot" />
        <div className="splash-dot" />
        <div className="splash-dot" />
      </div>
    </div>
  )
}
