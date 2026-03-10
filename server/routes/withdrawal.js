const { Router } = require('express')
const db = require('../db')

const router = Router()

const MIN_WITHDRAWAL = 5000
const MAX_WITHDRAWAL = 500000

const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'SC제일은행',
  '기업은행', '농협은행', '카카오뱅크', '토스뱅크', '케이뱅크',
  '우체국', '새마을금고', '수협은행', '대구은행', '부산은행',
  '광주은행', '전북은행', '경남은행', '제주은행',
]

// 출금 신청
// POST /api/withdrawals
router.post('/withdrawals', async (req, res) => {
  const { userId, amount, bankName, accountNumber, accountHolder } = req.body

  if (!userId || !amount || !bankName || !accountNumber || !accountHolder) {
    return res.status(400).json({ ok: false, message: '모든 항목을 입력해주세요.' })
  }

  if (!Number.isInteger(amount) || amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ ok: false, message: `최소 출금액은 ${MIN_WITHDRAWAL.toLocaleString()}P입니다.` })
  }

  if (amount > MAX_WITHDRAWAL) {
    return res.status(400).json({ ok: false, message: `최대 출금액은 ${MAX_WITHDRAWAL.toLocaleString()}P입니다.` })
  }

  if (!BANKS.includes(bankName)) {
    return res.status(400).json({ ok: false, message: '유효하지 않은 은행입니다.' })
  }

  const accountNumClean = accountNumber.replace(/[^0-9-]/g, '')
  if (accountNumClean.length < 8 || accountNumClean.length > 20) {
    return res.status(400).json({ ok: false, message: '계좌번호 형식이 올바르지 않습니다.' })
  }

  if (accountHolder.trim().length < 2) {
    return res.status(400).json({ ok: false, message: '예금주명을 정확히 입력해주세요.' })
  }

  await db.ensureUser(userId)

  // 포인트 충분한지 확인
  const user = await db.prepare('SELECT points FROM users WHERE id = ?').get(userId)
  if (!user || user.points < amount) {
    return res.status(400).json({ ok: false, message: '포인트가 부족합니다.' })
  }

  // 대기 중인 출금 신청이 있는지 확인
  const pending = await db.prepare(
    "SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'"
  ).get(userId)
  if (pending) {
    return res.status(409).json({ ok: false, message: '이미 대기 중인 출금 신청이 있습니다. 처리 완료 후 다시 신청해주세요.' })
  }

  try {
    const result = await db.prepare(`
      INSERT INTO withdrawals (user_id, amount, bank_name, account_number, account_holder)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, amount, bankName, accountNumClean, accountHolder.trim())

    res.json({
      ok: true,
      data: {
        withdrawalId: result.lastInsertRowid,
        amount,
        bankName,
        accountNumber: accountNumClean,
        message: '출금 신청이 완료되었습니다. 관리자 승인 후 입금됩니다.',
      },
    })
  } catch (err) {
    console.error('[출금 신청 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 신청 중 오류가 발생했습니다.' })
  }
})

// 출금 내역 조회
// GET /api/users/:userId/withdrawals
router.get('/users/:userId/withdrawals', async (req, res) => {
  const { userId } = req.params

  await db.ensureUser(userId)

  const withdrawals = await db.prepare(`
    SELECT id, amount, status, bank_name, account_number, account_holder, created_at, processed_at
    FROM withdrawals
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(Number(userId))

  res.json({ ok: true, data: withdrawals })
})

// 은행 목록 조회
// GET /api/banks
router.get('/banks', (req, res) => {
  res.json({ ok: true, data: BANKS })
})

module.exports = router
