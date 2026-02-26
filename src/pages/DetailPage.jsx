import { useState, useEffect } from 'react'
import QuizModal from '../components/QuizModal'
import { getRandomQuiz, submitQuizAnswer } from '../api/index'

function formatPrice(price) {
  return price.toLocaleString() + '원'
}

function getDiscountRate(original, sale) {
  return Math.round((1 - sale / original) * 100)
}

function isExpired(validUntil) {
  const [y, m, d] = validUntil.split('.').map(Number)
  return new Date(y, m - 1, d + 1) <= new Date()
}

export default function DetailPage({ flyer, onBack, isBookmarked, onBookmarkToggle, userId, userRole, onQuizPoints }) {
  const expired = isExpired(flyer.validUntil)
  const [quiz, setQuiz] = useState(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState(null)
  const [quizAttempted, setQuizAttempted] = useState(false)

  useEffect(() => {
    if (!userId || !flyer.id || userRole === 'business') return
    getRandomQuiz(flyer.id, userId).then(res => {
      if (res.attempted) {
        setQuizAttempted(true)
      } else if (res.data) {
        setQuiz(res.data)
        setShowQuiz(true)
      }
    }).catch(() => {})
  }, [flyer.id, userId, userRole])

  const handleQuizAnswer = async (answer) => {
    try {
      const result = await submitQuizAnswer(userId, flyer.id, quiz.quizId, answer)
      setQuizResult(result)
      if (result.isCorrect && onQuizPoints) {
        onQuizPoints(result.earnedPoints, result.totalPoints)
      }
    } catch (e) {
      setQuizResult({ isCorrect: false, earnedPoints: 0, correctIdx: -1 })
    }
  }

  const handleQuizClose = () => {
    setShowQuiz(false)
    setQuizAttempted(true)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="detail-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="detail-header-title">{flyer.storeName}</div>
          <button
            className={`detail-bookmark-btn${isBookmarked ? ' bookmarked' : ''}`}
            onClick={onBookmarkToggle}
            title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* 히어로 섹션 */}
      <div
        className="detail-hero"
        style={{ background: `linear-gradient(160deg, ${flyer.storeColor}18, ${flyer.storeBgColor})` }}
      >
        {flyer.imageUrl ? (
          <img src={flyer.imageUrl} alt={flyer.storeName} className="detail-hero-img" />
        ) : (
          <div className="detail-store-emoji">{flyer.storeEmoji}</div>
        )}
        <div className="detail-title">{flyer.title}</div>
        <div className="detail-valid">
          📅 {flyer.validFrom} ~ {flyer.validUntil}
        </div>
        {flyer.subtitle && (
          <div className="detail-subtitle">{flyer.subtitle}</div>
        )}
      </div>

      {/* 퀴즈 상태 배지 */}
      {quizAttempted && (
        <div className="quiz-attempted-badge">
          ✅ 퀴즈 참여 완료
        </div>
      )}

      {/* 태그 */}
      <div className="detail-tags-wrap">
        {flyer.tags.map(tag => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>

      {/* 상품 목록 */}
      <div className="items-section">
        <div className="items-section-title">🏷️ 이번 주 특가 상품</div>
        {flyer.items.map((item, i) => {
          const rate = getDiscountRate(item.originalPrice, item.salePrice)
          return (
            <div key={i} className="item-row">
              <div className="item-name">{item.name}</div>
              <div className="item-price-wrap">
                <span className="item-original-price">{formatPrice(item.originalPrice)}</span>
                <span className="item-sale-price">
                  {formatPrice(item.salePrice)}
                  <span className="item-discount-rate">{rate}%</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 퀴즈 모달 */}
      {showQuiz && quiz && (
        <QuizModal
          quiz={quiz}
          onAnswer={handleQuizAnswer}
          onClose={handleQuizClose}
          result={quizResult}
        />
      )}
    </div>
  )
}
