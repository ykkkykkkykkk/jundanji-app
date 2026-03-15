const { Router } = require('express')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

const BANKS = [
  'KB국민은행', '신한은행', '하나은행', '우리은행', 'NH농협은행',
  'IBK기업은행', 'SC제일은행', '씨티은행', '카카오뱅크', '케이뱅크',
  '토스뱅크', '광주은행', '전북은행', '경남은행', '부산은행',
  '대구은행', '제주은행', '수협은행', '새마을금고',
]

// 은행 목록
// GET /api/withdrawals/banks
router.get('/banks', (req, res) => {
  res.json({ ok: true, data: BANKS })
})

// 출금 신청
// POST /api/withdrawals
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId
  const { amount, bankName, accountNumber, accountHolder } = req.body

  if (!amount || !bankName || !accountNumber || !accountHolder) {
    return res.status(400).json({ ok: false, message: '모든 항목을 입력해주세요.' })
  }

  if (!BANKS.includes(bankName)) {
    return res.status(400).json({ ok: false, message: '유효하지 않은 은행입니다.' })
  }

  const amt = Number(amount)
  if (!Number.isInteger(amt) || amt < 1000) {
    return res.status(400).json({ ok: false, message: '최소 출금 금액은 1,000P입니다.' })
  }
  if (amt > 500000) {
    return res.status(400).json({ ok: false, message: '최대 출금 금액은 500,000P입니다.' })
  }

  try {
    // 사용자 정보 조회
    const user = await db.prepare('SELECT id, points, created_at FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ ok: false, message: '사용자를 찾을 수 없습니다.' })
    }

    // 포인트 잔액 확인
    if (user.points < amt) {
      return res.status(400).json({ ok: false, message: '포인트가 부족합니다.' })
    }

    // 가입 7일 경과 확인
    if (user.created_at) {
      const createdAt = new Date(user.created_at.replace(' ', 'T'))
      const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        return res.status(403).json({ ok: false, message: `가입 후 7일이 지나야 출금할 수 있습니다. (${7 - diffDays}일 남음)` })
      }
    }

    // 대기 중인 출금 확인
    const pending = await db.prepare(
      "SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'"
    ).get(userId)
    if (pending) {
      return res.status(409).json({ ok: false, message: '이미 처리 대기 중인 출금 신청이 있습니다.' })
    }

    // 트랜잭션: 포인트 차감 + 출금 기록 + 포인트 내역
    const withdrawTx = db.transaction(async (txDb) => {
      await txDb.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(amt, userId)
      await txDb.prepare(
        'INSERT INTO withdrawals (user_id, amount, bank_name, account_number, account_holder) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, amt, bankName, accountNumber, accountHolder)
      await txDb.prepare(
        "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'use', ?)"
      ).run(userId, amt, `출금 신청 (${bankName} ${accountNumber})`)
    })
    await withdrawTx()

    res.json({ ok: true, message: '출금 신청이 완료되었습니다. 관리자 승인 후 입금됩니다.' })
  } catch (err) {
    console.error('[출금 신청 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 신청 중 오류가 발생했습니다.' })
  }
})

// 출금 내역 조회
// GET /api/withdrawals/history
router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.userId

  try {
    const rows = await db.prepare(
      'SELECT id, amount, bank_name, account_number, account_holder, status, admin_memo, created_at, processed_at FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId)

    res.json({ ok: true, data: rows })
  } catch (err) {
    console.error('[출금 내역 조회 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 내역 조회 중 오류가 발생했습니다.' })
  }
})

module.exports = router
