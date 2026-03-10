const { Router } = require('express')
const db = require('../db')

const router = Router()

const GIFT_ITEMS = {
  // 카페
  starbucks_ame: { name: '스타벅스 아메리카노 Tall', points: 5000 },
  ediya_ame: { name: '이디야 아메리카노', points: 3000 },
  // 편의점
  cu_5000: { name: 'CU 5,000원 금액권', points: 5000 },
  gs25_5000: { name: 'GS25 5,000원 금액권', points: 5000 },
  // 백화점
  shinsegae_10000: { name: '신세계 상품권 1만원', points: 10000 },
  lotte_10000: { name: '롯데 상품권 1만원', points: 10000 },
  // 치킨
  bbq_gold: { name: 'BBQ 황금올리브', points: 15000 },
  kyochon_honey: { name: '교촌 허니콤보', points: 15000 },
  // 피자
  domino_pizza: { name: '도미노 피자 1판', points: 20000 },
  // 버거
  lotteria_set: { name: '롯데리아 세트 메뉴', points: 7000 },
  // 디저트
  br_pint: { name: '배스킨라빈스 파인트', points: 8000 },
  // 음료
  gongcha_large: { name: '공차 라지 음료', points: 4000 },
}

// 기프티콘 주문 내역 조회
// GET /api/users/:userId/gift-orders
router.get('/users/:userId/gift-orders', async (req, res) => {
  const { userId } = req.params

  await db.ensureUser(userId)

  const orders = await db.prepare(`
    SELECT id, gift_id, gift_name, amount, status, created_at, sent_at
    FROM gift_orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(Number(userId))

  res.json({ ok: true, data: orders })
})

// 기프티콘 목록 조회
// GET /api/gifts
router.get('/gifts', (req, res) => {
  const list = Object.entries(GIFT_ITEMS).map(([id, item]) => ({
    id,
    name: item.name,
    points: item.points,
  }))
  res.json({ ok: true, data: list })
})

// 기프티콘 교환 신청 (포인트 차감 + 주문 생성)
// POST /api/gift-orders
router.post('/gift-orders', async (req, res) => {
  const { userId, giftId } = req.body

  if (!userId || !giftId) {
    return res.status(400).json({ ok: false, message: '필수 값이 누락되었습니다.' })
  }

  const gift = GIFT_ITEMS[giftId]
  if (!gift) {
    return res.status(400).json({ ok: false, message: '존재하지 않는 기프티콘입니다.' })
  }

  await db.ensureUser(userId)

  const user = await db.prepare('SELECT points FROM users WHERE id = ?').get(Number(userId))
  if (!user || user.points < gift.points) {
    return res.status(400).json({ ok: false, message: '포인트가 부족합니다.' })
  }

  try {
    await db.batch([
      { sql: 'UPDATE users SET points = points - ? WHERE id = ?', args: [gift.points, Number(userId)] },
      { sql: "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'use', ?)", args: [Number(userId), gift.points, `기프티콘 교환 - ${gift.name}`] },
      { sql: "INSERT INTO gift_orders (user_id, gift_id, gift_name, amount, status) VALUES (?, ?, ?, ?, 'pending')", args: [Number(userId), giftId, gift.name, gift.points] },
    ])
  } catch (err) {
    console.error('[기프티콘 주문 오류]', err.message)
    return res.status(500).json({ ok: false, message: '처리 중 오류가 발생했습니다.' })
  }

  const updated = await db.prepare('SELECT points FROM users WHERE id = ?').get(Number(userId))

  res.json({
    ok: true,
    data: { remainPoints: updated.points },
    message: `${gift.name} 교환 신청 완료! 관리자 확인 후 카카오톡으로 발송됩니다.`,
  })
})

module.exports = router
