const { Router } = require('express')
const crypto = require('crypto')
const db = require('../db')

const router = Router()

const MAX_ACCOUNTS_PER_DEVICE = 2
const MIN_SCRATCH_DURATION_MS = 3000 // 최소 3초

// 기기 fingerprint 등록 (로그인/회원가입 시 호출)
// POST /api/security/device
router.post('/device', async (req, res) => {
  const { userId, fingerprint } = req.body
  if (!userId || !fingerprint) {
    return res.status(400).json({ ok: false, message: 'userId, fingerprint 필수입니다.' })
  }

  try {
    await db.prepare(
      'INSERT OR IGNORE INTO device_fingerprints (fingerprint, user_id) VALUES (?, ?)'
    ).run(fingerprint, userId)
    res.json({ ok: true })
  } catch (err) {
    console.error('[기기 등록 오류]', err.message)
    res.status(500).json({ ok: false, message: '기기 등록 중 오류가 발생했습니다.' })
  }
})

// 기기 fingerprint 체크 (회원가입 전 호출)
// POST /api/security/device-check
router.post('/device-check', async (req, res) => {
  const { fingerprint } = req.body
  if (!fingerprint) {
    return res.status(400).json({ ok: false, message: 'fingerprint 필수입니다.' })
  }

  const rows = await db.prepare(
    'SELECT COUNT(DISTINCT user_id) as cnt FROM device_fingerprints WHERE fingerprint = ?'
  ).get(fingerprint)

  const count = rows?.cnt || 0
  if (count >= MAX_ACCOUNTS_PER_DEVICE) {
    return res.status(403).json({
      ok: false,
      message: `이 기기에서 이미 ${MAX_ACCOUNTS_PER_DEVICE}개의 계정이 생성되었습니다. 추가 가입이 제한됩니다.`,
      blocked: true,
    })
  }

  res.json({ ok: true, blocked: false, accountCount: count })
})

// 긁기 세션 시작
// POST /api/scratch/start
router.post('/scratch/start', async (req, res) => {
  const { userId, flyerId } = req.body
  if (!userId || !flyerId) {
    return res.status(400).json({ ok: false, message: 'userId, flyerId 필수입니다.' })
  }

  const sessionToken = crypto.randomBytes(24).toString('hex')

  try {
    // 기존 세션 삭제 후 새로 생성
    await db.prepare('DELETE FROM scratch_sessions WHERE user_id = ? AND flyer_id = ?').run(userId, flyerId)
    await db.prepare(
      'INSERT INTO scratch_sessions (token, user_id, flyer_id) VALUES (?, ?, ?)'
    ).run(sessionToken, userId, flyerId)

    res.json({ ok: true, data: { sessionToken } })
  } catch (err) {
    console.error('[긁기 세션 시작 오류]', err.message)
    res.status(500).json({ ok: false, message: '긁기 세션 시작 중 오류가 발생했습니다.' })
  }
})

// 긁기 세션 완료
// POST /api/scratch/complete
router.post('/scratch/complete', async (req, res) => {
  const { sessionToken, durationMs } = req.body
  if (!sessionToken) {
    return res.status(400).json({ ok: false, message: 'sessionToken 필수입니다.' })
  }

  const session = await db.prepare(
    'SELECT * FROM scratch_sessions WHERE token = ?'
  ).get(sessionToken)

  if (!session) {
    return res.status(404).json({ ok: false, message: '유효하지 않은 세션입니다.' })
  }

  if (session.completed_at) {
    return res.status(409).json({ ok: false, message: '이미 완료된 세션입니다.' })
  }

  // 서버 시간 기반 duration 검증
  const serverStartTime = new Date(session.started_at).getTime()
  const serverDuration = Date.now() - serverStartTime
  const clientDuration = Number(durationMs) || 0

  // 클라이언트 보고 시간과 서버 시간 중 짧은 쪽 기준
  const actualDuration = Math.min(serverDuration, clientDuration || Infinity)

  if (actualDuration < MIN_SCRATCH_DURATION_MS) {
    // 봇 의심 — 세션 무효 처리
    await db.prepare(
      'UPDATE scratch_sessions SET completed_at = datetime("now", "localtime"), duration_ms = ?, is_valid = 0 WHERE token = ?'
    ).run(actualDuration, sessionToken)

    return res.status(403).json({
      ok: false,
      message: '비정상적으로 빠른 긁기가 감지되었습니다. 이 긁기는 무효 처리됩니다.',
      botDetected: true,
    })
  }

  // 정상 완료
  await db.prepare(
    'UPDATE scratch_sessions SET completed_at = datetime("now", "localtime"), duration_ms = ?, is_valid = 1 WHERE token = ?'
  ).run(actualDuration, sessionToken)

  res.json({ ok: true, data: { valid: true, durationMs: actualDuration } })
})

module.exports = router
