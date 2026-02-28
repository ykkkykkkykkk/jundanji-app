const { Router } = require('express')
const crypto = require('crypto')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

// QR 코드 생성 (사업자 전용)
// POST /api/flyers/:flyerId/qr/generate
router.post('/flyers/:flyerId/qr/generate', authMiddleware, (req, res) => {
  const { flyerId } = req.params

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.userId)
  if (!user || user.role !== 'business') {
    return res.status(403).json({ ok: false, message: '사업자만 QR 코드를 생성할 수 있습니다.' })
  }

  const flyer = db.prepare('SELECT id, qr_code FROM flyers WHERE id = ?').get(flyerId)
  if (!flyer) {
    return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })
  }

  const qrCode = crypto.randomUUID()
  db.prepare('UPDATE flyers SET qr_code = ? WHERE id = ?').run(qrCode, flyerId)

  res.json({ ok: true, data: { qrCode, flyerId: Number(flyerId) } })
})

// QR 코드 데이터 조회
// GET /api/flyers/:flyerId/qr
router.get('/flyers/:flyerId/qr', (req, res) => {
  const { flyerId } = req.params

  const flyer = db.prepare('SELECT id, store_name, qr_code, qr_point FROM flyers WHERE id = ?').get(flyerId)
  if (!flyer) {
    return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })
  }

  res.json({
    ok: true,
    data: {
      qrCode: flyer.qr_code,
      qrPoint: flyer.qr_point,
      storeName: flyer.store_name,
      flyerId: flyer.id,
    },
  })
})

// QR 스캔 인증
// POST /api/qr/verify
router.post('/qr/verify', (req, res) => {
  const { userId, qrCode } = req.body

  if (!userId || !qrCode) {
    return res.status(400).json({ ok: false, message: 'userId, qrCode 필수입니다.' })
  }

  db.ensureUser(userId)
  const user = db.prepare('SELECT id, points, role FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })

  // 사업자 계정은 포인트 획득 불가
  if (user.role === 'business') {
    return res.status(403).json({ ok: false, message: '사업자 계정은 방문 인증 포인트를 획득할 수 없습니다.' })
  }

  const flyer = db.prepare('SELECT id, store_name, title, qr_point FROM flyers WHERE qr_code = ?').get(qrCode)
  if (!flyer) {
    return res.status(404).json({ ok: false, message: '유효하지 않은 QR 코드입니다.' })
  }

  // 1일 1회 방문 인증 체크
  const existing = db.prepare(
    `SELECT id FROM visit_verifications
     WHERE user_id = ? AND flyer_id = ? AND DATE(verified_at) = DATE('now', 'localtime')`
  ).get(userId, flyer.id)

  if (existing) {
    return res.status(409).json({ ok: false, message: '오늘 이미 방문 인증을 완료했습니다. 내일 다시 인증할 수 있어요!' })
  }

  const earnedPoints = flyer.qr_point || 100

  // 사업자 예산 부족 체크
  const flyerFull = db.prepare('SELECT owner_id FROM flyers WHERE id = ?').get(flyer.id)
  if (flyerFull && flyerFull.owner_id) {
    const owner = db.prepare('SELECT point_budget FROM users WHERE id = ?').get(flyerFull.owner_id)
    if (owner && owner.point_budget < earnedPoints) {
      return res.status(400).json({ ok: false, message: '이 매장의 포인트 예산이 소진되었습니다.' })
    }
  }

  const verifyTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO visit_verifications (user_id, flyer_id, points_earned)
      VALUES (?, ?, ?)
    `).run(userId, flyer.id, earnedPoints)

    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(earnedPoints, userId)

    db.prepare(`
      INSERT INTO point_transactions (user_id, amount, type, description)
      VALUES (?, ?, 'earn', ?)
    `).run(userId, earnedPoints, `방문 인증: ${flyer.store_name}`)

    // 사업자 예산 차감
    if (flyerFull && flyerFull.owner_id) {
      db.prepare('UPDATE users SET point_budget = point_budget - ? WHERE id = ?')
        .run(earnedPoints, flyerFull.owner_id)
    }
  })

  try {
    verifyTx()
  } catch (err) {
    console.error('[QR 인증 오류]', err.message)
    return res.status(500).json({ ok: false, message: 'QR 인증 중 오류가 발생했습니다.' })
  }

  const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId)
  res.json({
    ok: true,
    data: {
      earnedPoints,
      totalPoints: updatedUser.points,
      storeName: flyer.store_name,
      flyerTitle: flyer.title,
    },
  })
})

// 방문 인증 내역
// GET /api/users/:userId/visit-history
router.get('/users/:userId/visit-history', (req, res) => {
  const { userId } = req.params

  const history = db.prepare(`
    SELECT vv.id, vv.flyer_id, vv.points_earned, vv.verified_at,
           f.store_name, f.store_emoji, f.title
    FROM visit_verifications vv
    JOIN flyers f ON f.id = vv.flyer_id
    WHERE vv.user_id = ?
    ORDER BY vv.verified_at DESC
  `).all(userId)

  res.json({
    ok: true,
    data: history.map(h => ({
      id: h.id,
      flyerId: h.flyer_id,
      storeName: h.store_name,
      storeEmoji: h.store_emoji,
      flyerTitle: h.title,
      pointsEarned: h.points_earned,
      verifiedAt: h.verified_at,
    })),
  })
})

module.exports = router
