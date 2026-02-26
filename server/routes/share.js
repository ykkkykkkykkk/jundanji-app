const { Router } = require('express')
const db = require('../db')

const router = Router()

// 공유 처리 (포인트 적립)
// POST /api/share
// body: { userId, flyerId }
router.post('/share', (req, res) => {
  const { userId, flyerId } = req.body

  if (!userId || !flyerId) {
    return res.status(400).json({ ok: false, message: 'userId, flyerId 필수입니다.' })
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  }

  // 사업자 계정은 포인트 획득 불가
  if (user.role === 'business') {
    return res.status(403).json({ ok: false, message: '사업자 계정은 포인트를 획득할 수 없습니다.' })
  }

  const flyer = db.prepare('SELECT id, share_point, owner_id FROM flyers WHERE id = ?').get(flyerId)
  if (!flyer) {
    return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })
  }

  // 사업자 예산 부족 체크
  if (flyer.owner_id) {
    const owner = db.prepare('SELECT point_budget FROM users WHERE id = ?').get(flyer.owner_id)
    if (owner && owner.point_budget < flyer.share_point) {
      return res.status(400).json({ ok: false, message: '이 전단지의 포인트 예산이 소진되었습니다.' })
    }
  }

  // 중복 공유 체크
  const alreadyShared = db.prepare(
    'SELECT id FROM share_history WHERE user_id = ? AND flyer_id = ?'
  ).get(userId, flyerId)

  if (alreadyShared) {
    return res.status(409).json({ ok: false, message: '이미 공유한 전단지입니다.' })
  }

  const earnedPoints = flyer.share_point

  // 트랜잭션으로 공유 내역 + 포인트 적립 + shareCount +1 처리
  const shareTx = db.transaction(() => {
    db.prepare(
      'INSERT INTO share_history (user_id, flyer_id, points) VALUES (?, ?, ?)'
    ).run(userId, flyerId, earnedPoints)

    db.prepare(
      'UPDATE users SET points = points + ? WHERE id = ?'
    ).run(earnedPoints, userId)

    db.prepare(
      'UPDATE flyers SET share_count = share_count + 1 WHERE id = ?'
    ).run(flyerId)

    db.prepare(
      'INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, earnedPoints, 'earn', `전단지 공유 - flyerId:${flyerId}`)

    // 사업자 예산 차감
    if (flyer.owner_id) {
      db.prepare('UPDATE users SET point_budget = point_budget - ? WHERE id = ?')
        .run(earnedPoints, flyer.owner_id)
    }
  })

  shareTx()

  const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId)

  res.json({
    ok: true,
    data: {
      earnedPoints,
      totalPoints: updatedUser.points,
    },
  })
})

// 유저 포인트 조회
// GET /api/users/:userId/points
router.get('/users/:userId/points', (req, res) => {
  const { userId } = req.params

  const user = db.prepare('SELECT id, nickname, points FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  }

  res.json({ ok: true, data: { points: user.points, nickname: user.nickname } })
})

// 유저 공유 내역 조회
// GET /api/users/:userId/share-history
router.get('/users/:userId/share-history', (req, res) => {
  const { userId } = req.params

  const history = db.prepare(`
    SELECT
      sh.id, sh.flyer_id, sh.points, sh.shared_at,
      f.store_name, f.store_emoji, f.store_color, f.title
    FROM share_history sh
    JOIN flyers f ON f.id = sh.flyer_id
    WHERE sh.user_id = ?
    ORDER BY sh.shared_at DESC
  `).all(userId)

  const data = history.map(row => ({
    id: row.id,
    flyerId: row.flyer_id,
    storeName: row.store_name,
    storeEmoji: row.store_emoji,
    storeColor: row.store_color,
    title: row.title,
    points: row.points,
    sharedAt: row.shared_at,
  }))

  res.json({ ok: true, data })
})

// 포인트 사용
// POST /api/points/use  { userId, amount, description }
router.post('/points/use', (req, res) => {
  const { userId, amount, description } = req.body
  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ ok: false, message: 'userId, amount(양수) 필수입니다.' })
  }

  const user = db.prepare('SELECT id, points FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  if (user.points < amount) {
    return res.status(400).json({ ok: false, message: `포인트가 부족합니다. (보유: ${user.points}P)` })
  }

  const useTx = db.transaction(() => {
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(amount, userId)
    db.prepare(
      'INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, amount, 'use', description || '포인트 사용')
  })
  useTx()

  const updated = db.prepare('SELECT points FROM users WHERE id = ?').get(userId)
  res.json({ ok: true, data: { usedPoints: amount, remainPoints: updated.points } })
})

// 포인트 거래 내역
// GET /api/users/:userId/point-history
router.get('/users/:userId/point-history', (req, res) => {
  const { userId } = req.params
  const history = db.prepare(`
    SELECT id, amount, type, description, created_at
    FROM point_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId)
  res.json({ ok: true, data: history })
})

module.exports = router
