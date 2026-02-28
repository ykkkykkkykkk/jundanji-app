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
    if (!q.question || !q.answer) {
      return res.status(400).json({ ok: false, message: '각 퀴즈에 질문과 정답이 필요합니다.' })
    }
    const point = Number(q.point) || 10
    if (point < 10 || point > 50) {
      return res.status(400).json({ ok: false, message: '포인트는 10~50 사이여야 합니다.' })
    }
  }

  const insertTx = db.transaction(() => {
    db.prepare('DELETE FROM quizzes WHERE flyer_id = ?').run(flyerId)
    const insert = db.prepare(`
      INSERT INTO quizzes (flyer_id, question, answer, point, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `)
    quizzes.forEach((q, idx) => {
      insert.run(flyerId, q.question, q.answer.trim(), Number(q.point) || 10, idx)
    })
  })

  try {
    insertTx()
  } catch (err) {
    console.error('[퀴즈 등록 오류]', err.message)
    return res.status(500).json({ ok: false, message: '퀴즈 등록 중 오류가 발생했습니다.' })
  }
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
      answer: q.answer,
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

  // 사업자 계정은 퀴즈 풀기 불가
  const quizUser = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)
  if (quizUser && quizUser.role === 'business') {
    return res.status(403).json({ ok: false, message: '사업자 계정은 퀴즈를 풀 수 없습니다.' })
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
      point: quiz.point,
    },
    attempted: false,
  })
})

// 퀴즈 정답 제출
// POST /api/quiz/attempt
router.post('/quiz/attempt', (req, res) => {
  const { userId, flyerId, quizId, answer } = req.body

  if (!userId || !flyerId || !quizId || !answer) {
    return res.status(400).json({ ok: false, message: '필수 항목이 누락되었습니다.' })
  }

  // 사업자 계정은 퀴즈 풀기 불가
  const attemptUser = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)
  if (attemptUser && attemptUser.role === 'business') {
    return res.status(403).json({ ok: false, message: '사업자 계정은 퀴즈를 풀 수 없습니다.' })
  }

  db.ensureUser(userId)
  const user = db.prepare('SELECT id, points FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND flyer_id = ?').get(quizId, flyerId)
  if (!quiz) return res.status(404).json({ ok: false, message: '퀴즈를 찾을 수 없습니다.' })

  // 이미 응시 체크
  const existing = db.prepare('SELECT id FROM quiz_attempts WHERE user_id = ? AND flyer_id = ?').get(userId, flyerId)
  if (existing) {
    return res.status(409).json({ ok: false, message: '이미 퀴즈에 참여했습니다.' })
  }

  // 사업자 예산 부족 체크
  const flyerForBudget = db.prepare('SELECT owner_id FROM flyers WHERE id = ?').get(flyerId)
  if (flyerForBudget && flyerForBudget.owner_id) {
    const owner = db.prepare('SELECT point_budget FROM users WHERE id = ?').get(flyerForBudget.owner_id)
    if (owner && owner.point_budget < quiz.point) {
      return res.status(400).json({ ok: false, message: '이 전단지의 포인트 예산이 소진되었습니다.' })
    }
  }

  // 정답 비교 (공백 제거, 대소문자 무시)
  const isCorrect = answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()
  const earnedPoints = isCorrect ? quiz.point : 0

  const attemptTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO quiz_attempts (user_id, flyer_id, quiz_id, selected_idx, is_correct, points_earned)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(userId, flyerId, quizId, isCorrect ? 1 : 0, earnedPoints)

    if (isCorrect) {
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(earnedPoints, userId)
      db.prepare(`
        INSERT INTO point_transactions (user_id, amount, type, description)
        VALUES (?, ?, 'earn', ?)
      `).run(userId, earnedPoints, `퀴즈 정답 (${quiz.question.slice(0, 20)}...)`)

      // 사업자 예산 차감
      const flyerOwner = db.prepare('SELECT owner_id FROM flyers WHERE id = ?').get(flyerId)
      if (flyerOwner && flyerOwner.owner_id) {
        db.prepare('UPDATE users SET point_budget = point_budget - ? WHERE id = ?')
          .run(earnedPoints, flyerOwner.owner_id)
      }
    }
  })

  try {
    attemptTx()
  } catch (err) {
    console.error('[퀴즈 응시 오류]', err.message)
    return res.status(500).json({ ok: false, message: '퀴즈 응시 중 오류가 발생했습니다.' })
  }

  const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId)
  res.json({
    ok: true,
    data: {
      isCorrect,
      earnedPoints,
      totalPoints: updatedUser.points,
      correctAnswer: quiz.answer,
    },
  })
})

// 퀴즈 응시 내역
// GET /api/users/:userId/quiz-history
router.get('/users/:userId/quiz-history', (req, res) => {
  const { userId } = req.params

  const history = db.prepare(`
    SELECT qa.id, qa.flyer_id, qa.quiz_id, qa.is_correct,
           qa.points_earned, qa.attempted_at,
           q.question, q.answer,
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
      correctAnswer: h.answer,
      isCorrect: !!h.is_correct,
      pointsEarned: h.points_earned,
      attemptedAt: h.attempted_at,
    })),
  })
})

module.exports = router
