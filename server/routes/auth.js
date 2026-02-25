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
// POST /api/auth/register  { email, password, nickname, role }
router.post('/register', (req, res) => {
  const { email, password, nickname, role } = req.body
  if (!email || !password || !nickname) {
    return res.status(400).json({ ok: false, message: 'email, password, nickname 필수입니다.' })
  }

  const userRole = (role === 'business') ? 'business' : 'user'

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ ok: false, message: '이미 사용 중인 이메일입니다.' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const { lastInsertRowid: userId } = db.prepare(
    'INSERT INTO users (email, nickname, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(email, nickname, hash, userRole)

  const token = signToken(userId)
  res.status(201).json({ ok: true, data: { token, userId, nickname, role: userRole } })
})

// 로그인
// POST /api/auth/login  { email, password }
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: 'email, password 필수입니다.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
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
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, nickname, points, role, created_at FROM users WHERE id = ?').get(req.user.userId)
  if (!user) return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  res.json({ ok: true, data: { ...user, role: user.role || 'user' } })
})

// 닉네임 변경
// PATCH /api/users/me  { nickname }
router.patch('/me', authMiddleware, (req, res) => {
  const { nickname } = req.body
  if (!nickname || !nickname.trim()) {
    return res.status(400).json({ ok: false, message: 'nickname 필수입니다.' })
  }
  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), req.user.userId)
  res.json({ ok: true, data: { nickname: nickname.trim() } })
})

module.exports = router
