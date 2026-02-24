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

      <div className="splash-character">🧑‍💼</div>
      <div className="splash-arm">🤚</div>

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
