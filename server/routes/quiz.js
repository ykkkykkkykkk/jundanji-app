const { Router } = require('express')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

// 퀴즈 일괄 등록 (사업자 전용)
// POST /api/flyers/:flyerId/quizzes
router.post('/flyers/:flyerId/quizzes', authMiddleware, (req, res) => {
  const { flyerId } = req.params
  const { quizzes } = req.body

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.userId)
  if (!user || user.role !== 'business') {
    return res.status(403).json({ ok: false, message: '사업자만 퀴즈를 등록할 수 있습니다.' })
  }

  const flyer = db.prepare('SELECT id, owner_id FROM flyers WHERE id = ?').get(flyerId)
  if (!flyer) {
    return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })
  }

  if (!Array.isArray(quizzes) || quizzes.length < 3 || quizzes.length > 5) {
    return res.status(400).json({ ok: false, message: '퀴즈는 3~5개를 등록해야 합니다.' })
  }

  for (const q of quizzes) {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
      return res.status(400).json({ ok: false, message: '각 퀴즈에 질문과 최소 2개 선택지가 필요합니다.' })
    }
    if (q.answerIdx === undefined || q.answerIdx < 0 || q.answerIdx >= q.options.length) {
      return res.status(400).json({ ok: false, message: '올바른 정답 인덱스를 지정해주세요.' })
    }
    const point = Number(q.point) || 10
    if (point < 10 || point > 50) {
      return res.status(400).json({ ok: false, message: '포인트는 10~50 사이여야 합니다.' })
    }
  }

  const insertTx = db.transaction(() => {
    // 기존 퀴즈 삭제 후 재등록
    db.prepare('DELETE FROM quizzes WHERE flyer_id = ?').run(flyerId)
    const insert = db.prepare(`
      INSERT INTO quizzes (flyer_id, question, options, answer_idx, point, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    quizzes.forEach((q, idx) => {
      insert.run(flyerId, q.question, JSON.stringify(q.options), q.answerIdx, Number(q.point) || 10, idx)
    })
  })

  insertTx()
  res.status(201).json({ ok: true, data: { count: quizzes.length } })
})

// 퀴즈 목록 조회 (사업자용 - 전단지별)
// GET /api/flyers/:flyerId/quizzes
router.get('/flyers/:flyerId/quizzes', (req, res) => {
  const { flyerId } = req.params
  const quizzes = db.prepare('SELECT * FROM quizzes WHERE flyer_id = ? ORDER BY sort_order').all(flyerId)
  res.json({
    ok: true,
    data: quizzes.map(q => ({
      id: q.id,
      flyerId: q.flyer_id,
      question: q.question,
      options: JSON.parse(q.options),
      answerIdx: q.answer_idx,
      point: q.point,
    })),
  })
})

// 랜덤 1문제 출제
// GET /api/flyers/:flyerId/quiz?userId=X
router.get('/flyers/:flyerId/quiz', (req, res) => {
  const { flyerId } = req.params
  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ ok: false, message: 'userId 필수입니다.' })
  }

  // 이미 응시했는지 확인
  const attempted = db.prepare(
    'SELECT id FROM quiz_attempts WHERE user_id = ? AND flyer_id = ?'
  ).get(userId, flyerId)

  if (attempted) {
    return res.json({ ok: true, data: null, attempted: true })
  }

  // 랜덤 1문제
  const quizzes = db.prepare('SELECT * FROM quizzes WHERE flyer_id = ?').all(flyerId)
  if (!quizzes.length) {
    return res.json({ ok: true, data: null, attempted: false })
  }

  const quiz = quizzes[Math.floor(Math.random() * quizzes.length)]
  res.json({
    ok: true,
    data: {
      quizId: quiz.id,
      question: quiz.question,
      options: JSON.parse(quiz.options),
      point: quiz.point,
    },
    attempted: false,
  })
})

// 퀴즈 정답 제출
// POST /api/quiz/attempt
router.post('/quiz/attempt', (req, res) => {
  const { userId, flyerId, quizId, selectedIdx } = req.body

  if (!userId || !flyerId || !quizId || selectedIdx === undefined) {
    return res.status(400).json({ ok: false, message: '필수 항목이 누락되었습니다.' })
  }

  const user = db.prepare('SELECT id, points FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND flyer_id = ?').get(quizId, flyerId)
  if (!quiz) return res.status(404).json({ ok: false, message: '퀴즈를 찾을 수 없습니다.' })

  // 이미 응시 체크
  const existing = db.prepare('SELECT id FROM quiz_attempts WHERE user_id = ? AND flyer_id = ?').get(userId, flyerId)
  if (existing) {
    return res.status(409).json({ ok: false, message: '이미 퀴즈에 참여했습니다.' })
  }

  const isCorrect = selectedIdx === quiz.answer_idx
  const earnedPoints = isCorrect ? quiz.point : 0

  const attemptTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO quiz_attempts (user_id, flyer_id, quiz_id, selected_idx, is_correct, points_earned)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, flyerId, quizId, selectedIdx, isCorrect ? 1 : 0, earnedPoints)

    if (isCorrect) {
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(earnedPoints, userId)
      db.prepare(`
        INSERT INTO point_transactions (user_id, amount, type, description)
        VALUES (?, ?, 'earn', ?)
      `).run(userId, earnedPoints, `퀴즈 정답 (${quiz.question.slice(0, 20)}...)`)
    }
  })

  attemptTx()

  const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId)
  res.json({
    ok: true,
    data: {
      isCorrect,
      earnedPoints,
      totalPoints: updatedUser.points,
      correctIdx: quiz.answer_idx,
    },
  })
})

// 퀴즈 응시 내역
// GET /api/users/:userId/quiz-history
router.get('/users/:userId/quiz-history', (req, res) => {
  const { userId } = req.params

  const history = db.prepare(`
    SELECT qa.id, qa.flyer_id, qa.quiz_id, qa.selected_idx, qa.is_correct,
           qa.points_earned, qa.attempted_at,
           q.question, q.options,
           f.store_name, f.store_emoji, f.title
    FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    JOIN flyers f ON f.id = qa.flyer_id
    WHERE qa.user_id = ?
    ORDER BY qa.attempted_at DESC
  `).all(userId)

  res.json({
    ok: true,
    data: history.map(h => ({
      id: h.id,
      flyerId: h.flyer_id,
      storeName: h.store_name,
      storeEmoji: h.store_emoji,
      flyerTitle: h.title,
      question: h.question,
      options: JSON.parse(h.options),
      selectedIdx: h.selected_idx,
      isCorrect: !!h.is_correct,
      pointsEarned: h.points_earned,
      attemptedAt: h.attempted_at,
    })),
  })
})

module.exports = router
