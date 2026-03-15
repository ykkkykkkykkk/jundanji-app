const { Router } = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// 회원가입
// POST /api/auth/register  { email, password, nickname, role, deviceFingerprint }
router.post('/register', async (req, res) => {
  const { email, password, nickname, role, deviceFingerprint } = req.body
  if (!email || !password || !nickname) {
    return res.status(400).json({ ok: false, message: 'email, password, nickname 필수입니다.' })
  }

  // 기기 fingerprint 다중 계정 체크
  if (deviceFingerprint) {
    const deviceCount = await db.prepare(
      'SELECT COUNT(DISTINCT user_id) as cnt FROM device_fingerprints WHERE fingerprint = ?'
    ).get(deviceFingerprint)
    if (deviceCount && deviceCount.cnt >= 2) {
      return res.status(403).json({ ok: false, message: '이 기기에서 이미 최대 계정 수에 도달했습니다. 추가 가입이 제한됩니다.' })
    }
  }

  const userRole = (role === 'business') ? 'business' : 'user'

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ ok: false, message: '이미 사용 중인 이메일입니다.' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const result = await db.prepare(
    'INSERT INTO users (email, nickname, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(email, nickname, hash, userRole)
  const userId = result.lastInsertRowid

  // 기기 fingerprint 저장
  if (deviceFingerprint) {
    try {
      await db.prepare(
        'INSERT OR IGNORE INTO device_fingerprints (fingerprint, user_id) VALUES (?, ?)'
      ).run(deviceFingerprint, userId)
    } catch (_) {}
  }

  const token = signToken(userId)
  res.status(201).json({ ok: true, data: { token, userId, nickname, role: userRole } })
})

// 로그인
// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: 'email, password 필수입니다.' })
  }

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !user.password_hash) {
    return res.status(401).json({ ok: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ ok: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  }

  const token = signToken(user.id)
  res.json({ ok: true, data: { token, userId: user.id, nickname: user.nickname, points: user.points, role: user.role || 'user' } })
})

// 내 정보 조회
// GET /api/users/me  (Authorization: Bearer <token>)
router.get('/me', authMiddleware, async (req, res) => {
  const user = await db.prepare('SELECT id, email, nickname, points, role, status, created_at FROM users WHERE id = ?').get(req.user.userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  if (user.status === 'deleted') return res.status(410).json({ ok: false, message: '탈퇴한 계정입니다.' })
  res.json({ ok: true, data: { ...user, role: user.role || 'user' } })
})

// 닉네임 변경
// PATCH /api/users/me  { nickname }
router.patch('/me', authMiddleware, async (req, res) => {
  const { nickname } = req.body
  if (!nickname || !nickname.trim()) {
    return res.status(400).json({ ok: false, message: 'nickname 필수입니다.' })
  }
  await db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), req.user.userId)
  res.json({ ok: true, data: { nickname: nickname.trim() } })
})

// 역할 변경 (최초 소셜 로그인 시 1회)
// PATCH /api/users/me/role  { role }
router.patch('/me/role', authMiddleware, async (req, res) => {
  const { role } = req.body
  if (!role || !['user', 'business'].includes(role)) {
    return res.status(400).json({ ok: false, message: "role은 'user' 또는 'business'여야 합니다." })
  }

  const user = await db.prepare('SELECT id, provider, role FROM users WHERE id = ?').get(req.user.userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })

  await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.user.userId)
  res.json({ ok: true, data: { role } })
})

// 회원 탈퇴
// DELETE /api/users/me
router.delete('/me', authMiddleware, async (req, res) => {
  const userId = req.user.userId

  try {
    const user = await db.prepare('SELECT id, status FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
    }
    if (user.status === 'deleted') {
      return res.status(409).json({ ok: false, message: '이미 탈퇴한 계정입니다.' })
    }

    // 트랜잭션으로 원자적 처리 (부분 삭제 방지)
    const deleteTx = db.transaction(async (txDb) => {
      // 개인식별정보 익명화 (통계용 데이터는 user_id 참조만 유지)
      await txDb.prepare(`
        UPDATE users
        SET nickname = '탈퇴한 사용자',
            email = NULL,
            password_hash = NULL,
            provider_id = NULL,
            phone = NULL,
            status = 'deleted',
            points = 0
        WHERE id = ?
      `).run(userId)

      // 기기 fingerprint 삭제
      await txDb.prepare('DELETE FROM device_fingerprints WHERE user_id = ?').run(userId)

      // 북마크 삭제
      await txDb.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(userId)
    })
    await deleteTx()

    res.json({
      ok: true,
      message: '회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.',
    })
  } catch (err) {
    console.error('[회원 탈퇴 오류]', err.message)
    res.status(500).json({ ok: false, message: '회원 탈퇴 처리 중 오류가 발생했습니다.' })
  }
})

module.exports = router
