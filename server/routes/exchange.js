const { Router } = require('express')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

// 관리자 인증 미들웨어 (admin.js의 activeTokens를 참조)
function requireAdmin(req, res, next) {
  const adminModule = require('./admin')
  const token = req.headers['x-admin-token']
  if (!token || !adminModule.activeTokens || !adminModule.activeTokens.has(token)) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
  next()
}

// 교환 신청
// POST /api/exchange/request
router.post('/request', authMiddleware, async (req, res) => {
  const userId = req.user.userId
  const { product_name, product_emoji, points, phone } = req.body

  if (!product_name || !points || !phone) {
    return res.status(400).json({ ok: false, message: '필수 값이 누락되었습니다.' })
  }

  const user = await db.prepare('SELECT points, provider_id FROM users WHERE id = ?').get(Number(userId))
  if (!user) {
    return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  }
  if (user.points < points) {
    return res.status(400).json({ ok: false, message: '포인트가 부족합니다.' })
  }

  // gift_id = 이모지+이름 조합, gift_name = 상품명, amount = 포인트
  const giftId = `exchange_${Date.now()}`

  try {
    await db.batch([
      { sql: 'UPDATE users SET points = points - ? WHERE id = ?', args: [points, Number(userId)] },
      { sql: "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'use', ?)", args: [Number(userId), points, `상품 교환 - ${product_name}`] },
      { sql: "INSERT INTO gift_orders (user_id, gift_id, gift_name, amount, status, phone) VALUES (?, ?, ?, ?, 'pending', ?)", args: [Number(userId), giftId, `${product_emoji || ''} ${product_name}`.trim(), points, phone] },
      { sql: 'INSERT INTO exchange_requests (user_id, user_kakao_id, product_name, product_emoji, points, phone) VALUES (?, ?, ?, ?, ?, ?)', args: [String(userId), user.provider_id || null, product_name, product_emoji || null, points, phone] },
    ])
  } catch (err) {
    console.error('[교환 신청 오류]', err.message)
    return res.status(500).json({ ok: false, message: '처리 중 오류가 발생했습니다.' })
  }

  const updated = await db.prepare('SELECT points FROM users WHERE id = ?').get(Number(userId))

  res.json({
    ok: true,
    data: { remainPoints: updated.points },
    message: `${product_name} 교환 신청 완료! 관리자 확인 후 발송됩니다.`,
  })
})

// 관리자용 - 전체 교환 요청 목록
// GET /api/exchange/requests
router.get('/requests', requireAdmin, async (req, res) => {
  const rows = await db.prepare(`
    SELECT id, user_id, product_name, product_emoji, points, phone, status, created_at, sent_at
    FROM exchange_requests
    ORDER BY created_at DESC
  `).all()

  res.json({ ok: true, data: rows })
})

// 관리자용 - 교환 완료 처리
// POST /api/exchange/complete/:id
router.post('/complete/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  const row = await db.prepare('SELECT id, status FROM exchange_requests WHERE id = ?').get(Number(id))
  if (!row) {
    return res.status(404).json({ ok: false, message: '해당 요청을 찾을 수 없습니다.' })
  }
  if (row.status === 'completed') {
    return res.status(400).json({ ok: false, message: '이미 완료된 요청입니다.' })
  }

  await db.prepare("UPDATE exchange_requests SET status = 'completed', sent_at = datetime('now', 'localtime') WHERE id = ?").run(Number(id))

  res.json({ ok: true, message: '교환 완료 처리되었습니다.' })
})

module.exports = router
