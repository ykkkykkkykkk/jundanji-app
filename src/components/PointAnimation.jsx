import { useEffect, useState } from 'react'

const COIN_POSITIONS = [
  { left: '15%', delay: 0 },
  { left: '30%', delay: 0.15 },
  { left: '50%', delay: 0.05 },
  { left: '65%', delay: 0.25 },
  { left: '80%', delay: 0.1 },
  { left: '22%', delay: 0.35 },
  { left: '72%', delay: 0.2 },
]

export default function PointAnimation({ points, onClose }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="point-overlay" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s' }}>
      <div className="point-modal">
        <div className="point-coins">
          {COIN_POSITIONS.map((pos, i) => (
            <span
              key={i}
              className="coin-particle"
              style={{
                left: pos.left,
                bottom: '10%',
                animationDelay: `${pos.delay}s`,
              }}
            >
              🪙
            </span>
          ))}
        </div>

        <span className="point-icon">🎉</span>

        <div className="point-amount">+{points.toLocaleString()}</div>
        <div className="point-label">포인트 적립!</div>

        <p className="point-msg">
          전단지를 공유해 주셔서 감사합니다!<br />
          포인트가 지급되었습니다.
        </p>

        <button className="point-close-btn" onClick={() => { setVisible(false); onClose() }}>
          확인
        </button>
      </div>
    </div>
  )
}
