import { useState } from 'react'

export default function QuizModal({ quiz, onAnswer, onClose, result }) {
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSelect = async (idx) => {
    if (result || submitting) return
    setSelected(idx)
    setSubmitting(true)
    await onAnswer(idx)
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
          {!result.isCorrect && (
            <div className="quiz-result-answer">
              정답: {quiz.options[result.correctIdx]}
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
        <div className="quiz-options">
          {quiz.options.map((opt, idx) => (
            <button
              key={idx}
              className={`quiz-option ${selected === idx ? 'quiz-option-selected' : ''}`}
              onClick={() => handleSelect(idx)}
              disabled={submitting}
            >
              <span className="quiz-option-num">{idx + 1}</span>
              <span className="quiz-option-text">{opt}</span>
            </button>
          ))}
        </div>
        {submitting && <div className="quiz-loading">채점 중...</div>}
      </div>
    </div>
  )
}
