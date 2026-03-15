const { Router } = require('express')
const db = require('../db')
const authMiddleware = require('../middleware/auth')
const { encrypt, decrypt } = require('../crypto-utils')

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

// DB에서 설정값 조회 헬퍼 (fallback 기본값 포함)
async function getSetting(key, fallback) {
  try {
    const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key)
    return row ? row.value : fallback
  } catch (_) {
    return fallback
  }
}

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

  // DB에서 설정값 조회
  const minAmount = Number(await getSetting('withdrawal_min_amount', '1000'))
  const maxAmount = Number(await getSetting('withdrawal_max_amount', '500000'))
  const waitingDays = Number(await getSetting('withdrawal_waiting_days', '7'))

  const amt = Number(amount)
  if (!Number.isInteger(amt) || amt < minAmount) {
    return res.status(400).json({ ok: false, message: `최소 출금 금액은 ${minAmount.toLocaleString()}P입니다.` })
  }
  if (amt > maxAmount) {
    return res.status(400).json({ ok: false, message: `최대 출금 금액은 ${maxAmount.toLocaleString()}P입니다.` })
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

    // 가입 대기일 경과 확인
    if (user.created_at) {
      const createdAt = new Date(user.created_at.replace(' ', 'T'))
      const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < waitingDays) {
        return res.status(403).json({ ok: false, message: `가입 후 ${waitingDays}일이 지나야 출금할 수 있습니다. (${waitingDays - diffDays}일 남음)` })
      }
    }

    // 대기 중인 출금 확인
    const pending = await db.prepare(
      "SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'"
    ).get(userId)
    if (pending) {
      return res.status(409).json({ ok: false, message: '이미 처리 대기 중인 출금 신청이 있습니다.' })
    }

    // 계좌번호/예금주 AES-256-GCM 암호화 후 저장
    const encryptedAccountNumber = encrypt(accountNumber)
    const encryptedAccountHolder = encrypt(accountHolder)

    // 포인트 내역 description에는 계좌 뒷 4자리만 포함 (평문 저장 최소화)
    const accountSuffix = accountNumber.slice(-4)

    // 트랜잭션: 포인트 차감 + 출금 기록 + 포인트 내역
    const withdrawTx = db.transaction(async (txDb) => {
      const result = await txDb.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?').run(amt, userId, amt)
      if (result.changes === 0) {
        throw new Error('INSUFFICIENT_POINTS')
      }
      await txDb.prepare(
        'INSERT INTO withdrawals (user_id, amount, bank_name, account_number, account_holder) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, amt, bankName, encryptedAccountNumber, encryptedAccountHolder)
      await txDb.prepare(
        "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'use', ?)"
      ).run(userId, amt, `출금 신청 (${bankName} ****${accountSuffix})`)
    })
    await withdrawTx()

    res.json({ ok: true, message: '출금 신청이 완료되었습니다. 관리자 승인 후 입금됩니다.' })
  } catch (err) {
    if (err.message === 'INSUFFICIENT_POINTS') {
      return res.status(400).json({ ok: false, message: '포인트가 부족합니다.' })
    }
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

    // 사용자에게는 계좌번호 복호화 후 마스킹 처리 (뒷 4자리만 노출)
    const masked = rows.map(row => {
      let accountNumber = row.account_number
      let accountHolder = row.account_holder
      try {
        const decrypted = decrypt(accountNumber)
        accountNumber = decrypted.length > 4
          ? '*'.repeat(decrypted.length - 4) + decrypted.slice(-4)
          : '****'
        accountHolder = decrypt(accountHolder)
      } catch (_) {
        // 복호화 실패 시 기존 값 마스킹
        accountNumber = '****'
        accountHolder = '****'
      }
      return { ...row, account_number: accountNumber, account_holder: accountHolder }
    })

    res.json({ ok: true, data: masked })
  } catch (err) {
    console.error('[출금 내역 조회 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 내역 조회 중 오류가 발생했습니다.' })
  }
})

module.exports = router
