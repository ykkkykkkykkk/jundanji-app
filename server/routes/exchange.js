const { Router } = require('express')
const jwt = require('jsonwebtoken')
const db = require('../db')
const authMiddleware = require('../middleware/auth')
const { encrypt, decrypt } = require('../crypto-utils')

const router = Router()

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'fallback-admin-secret'

// 관리자 인증 미들웨어 (JWT 기반, admin.js와 동일한 시크릿 사용)
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET)
    if (payload.role !== 'admin') throw new Error('권한 없음')
    next()
  } catch {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
}

// 교환 신청
// POST /api/exchange/request
router.post('/request', authMiddleware, async (req, res) => {
  const userId = req.user.userId
  const { product_name, product_emoji, points, phone } = req.body

  if (!product_name || !points || !phone) {
    return res.status(400).json({ ok: false, message: '필수 값이 누락되었습니다.' })
  }

  const pointsNum = Number(points)
  if (!Number.isInteger(pointsNum) || pointsNum <= 0) {
    return res.status(400).json({ ok: false, message: 'points는 양의 정수여야 합니다.' })
  }

  const user = await db.prepare('SELECT points, provider_id, created_at FROM users WHERE id = ?').get(Number(userId))
  if (!user) {
    return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  }

  // 가입 7일 경과 확인
  if (user.created_at) {
    const createdAt = new Date(user.created_at.replace(' ', 'T'))
    const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 7) {
      return res.status(403).json({ ok: false, message: `가입 후 7일이 지나야 교환할 수 있습니다. (${7 - diffDays}일 남음)` })
    }
  }

  if (user.points < pointsNum) {
    return res.status(400).json({ ok: false, message: '포인트가 부족합니다.' })
  }

  // gift_id = 이모지+이름 조합, gift_name = 상품명, amount = 포인트
  const giftId = `exchange_${Date.now()}`

  // 전화번호 AES-256-GCM 암호화 후 저장
  const encryptedPhone = encrypt(phone)

  try {
    await db.batch([
      { sql: 'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?', args: [pointsNum, Number(userId), pointsNum] },
      { sql: "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'use', ?)", args: [Number(userId), pointsNum, `상품 교환 - ${product_name}`] },
      { sql: "INSERT INTO gift_orders (user_id, gift_id, gift_name, amount, status, phone) VALUES (?, ?, ?, ?, 'pending', ?)", args: [Number(userId), giftId, `${product_emoji || ''} ${product_name}`.trim(), pointsNum, encryptedPhone] },
      { sql: 'INSERT INTO exchange_requests (user_id, user_kakao_id, product_name, product_emoji, points, phone) VALUES (?, ?, ?, ?, ?, ?)', args: [String(userId), user.provider_id || null, product_name, product_emoji || null, pointsNum, encryptedPhone] },
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

  // 어드민은 전화번호 복호화 후 반환 (기존 평문 데이터 하위 호환 포함)
  const decryptedRows = rows.map(row => {
    if (!row.phone) return row
    try {
      return { ...row, phone: decrypt(row.phone) }
    } catch (_) {
      return row
    }
  })

  res.json({ ok: true, data: decryptedRows })
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
