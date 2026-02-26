import { useState } from 'react'

export default function QuizModal({ quiz, onAnswer, onClose, result }) {
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return
    setSubmitting(true)
    await onAnswer(answer.trim())
    setSubmitting(false)
  }

  // 결과 화면
  if (result) {
    return (
      <div className="quiz-overlay" onClick={onClose}>
        <div className="quiz-modal quiz-result-modal" onClick={e => e.stopPropagation()}>
          <div className="quiz-result-icon">
            {result.isCorrect ? '🎉' : '😢'}
          </div>
          <div className="quiz-result-text">
            {result.isCorrect ? '정답입니다!' : '아쉽지만 오답이에요'}
          </div>
          {result.isCorrect && (
            <div className="quiz-result-points">+{result.earnedPoints}P 적립!</div>
          )}
          {!result.isCorrect && result.correctAnswer && (
            <div className="quiz-result-answer">
              정답: {result.correctAnswer}
            </div>
          )}
          <button className="quiz-close-btn" onClick={onClose}>확인</button>
        </div>
      </div>
    )
  }

  // 문제 출제 화면
  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-modal" onClick={e => e.stopPropagation()}>
        <div className="quiz-header">
          <span className="quiz-badge">퀴즈</span>
          <span className="quiz-point-badge">+{quiz.point}P</span>
        </div>
        <div className="quiz-question">{quiz.question}</div>
        <div className="quiz-answer-input-wrap">
          <input
            className="quiz-answer-input"
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="정답을 입력하세요"
            autoFocus
          />
          <button
            className="quiz-submit-btn"
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting}
          >
            {submitting ? '채점 중...' : '제출'}
          </button>
        </div>
      </div>
    </div>
  )
}
