const express = require('express')
const crypto = require('crypto')
const db = require('../db')

const router = express.Router()

const ADMIN_PASSWORD = 'admin1234'

// 토큰 생성
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// 활성 토큰 저장 (메모리)
const activeTokens = new Set()

// 인증 미들웨어
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
  next()
}

// ======================== 로그인 ========================

router.post('/login', (req, res) => {
  const { password } = req.body
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: '비밀번호가 올바르지 않습니다.' })
  }
  const token = generateToken()
  activeTokens.add(token)
  res.json({ ok: true, token })
})

// ======================== 대시보드 ========================

router.get('/dashboard', requireAdmin, async (req, res) => {
  const totalUsersRow = await db.prepare('SELECT COUNT(*) as count FROM users').get()
  const totalUsers = totalUsersRow.count
  const totalFlyersRow = await db.prepare('SELECT COUNT(*) as count FROM flyers').get()
  const totalFlyers = totalFlyersRow.count
  const totalPointsRow = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM point_transactions WHERE type = ?').get('earn')
  const totalPoints = totalPointsRow.total
  const totalScratchesRow = await db.prepare('SELECT COUNT(*) as count FROM share_history').get()
  const totalScratches = totalScratchesRow.count

  const recentUsers = await db.prepare(`
    SELECT id, nickname, email, role, status, created_at
    FROM users ORDER BY created_at DESC LIMIT 5
  `).all()

  const recentFlyers = await db.prepare(`
    SELECT id, store_name, category, title, status, created_at
    FROM flyers ORDER BY created_at DESC LIMIT 5
  `).all()

  res.json({
    ok: true,
    stats: { totalUsers, totalFlyers, totalPoints, totalScratches },
    recentUsers,
    recentFlyers,
  })
})

// ======================== 전단지 관리 ========================

router.get('/flyers', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, search = '', status = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (search) {
    where += ' AND (f.store_name LIKE ? OR f.title LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  if (status) {
    where += ' AND f.status = ?'
    params.push(status)
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM flyers f ${where}`).get(...params)
  const total = totalRow.count

  const flyers = await db.prepare(`
    SELECT f.*, u.nickname as owner_name
    FROM flyers f
    LEFT JOIN users u ON f.owner_id = u.id
    ${where}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, flyers, total, page: Number(page), limit: Number(limit) })
})

router.patch('/flyers/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['approved', 'blocked', 'pending'].includes(status)) {
    return res.status(400).json({ ok: false, message: '유효하지 않은 상태입니다.' })
  }

  await db.prepare('UPDATE flyers SET status = ? WHERE id = ?').run(status, id)
  res.json({ ok: true, message: `전단지 상태가 '${status}'로 변경되었습니다.` })
})

// ======================== 유저 관리 ========================

router.get('/users', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (search) {
    where += ' AND (nickname LIKE ? OR email LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  if (role) {
    where += ' AND role = ?'
    params.push(role)
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params)
  const total = totalRow.count

  const users = await db.prepare(`
    SELECT id, nickname, email, role, points, status, business_approved, created_at
    FROM users
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, users, total, page: Number(page), limit: Number(limit) })
})

router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ ok: false, message: '유효하지 않은 상태입니다.' })
  }

  await db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id)
  res.json({ ok: true, message: `유저 상태가 '${status}'로 변경되었습니다.` })
})

// ======================== 포인트 정산 ========================

router.get('/withdrawals', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (status) {
    where += ' AND w.status = ?'
    params.push(status)
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM withdrawals w ${where}`).get(...params)
  const total = totalRow.count

  const withdrawals = await db.prepare(`
    SELECT w.*, u.nickname, u.email
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ${where}
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, withdrawals, total, page: Number(page), limit: Number(limit) })
})

router.patch('/withdrawals/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ ok: false, message: '유효하지 않은 상태입니다.' })
  }

  const withdrawal = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id)
  if (!withdrawal) {
    return res.status(404).json({ ok: false, message: '출금 신청을 찾을 수 없습니다.' })
  }

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace('T', ' ')

  if (status === 'approved') {
    const user = await db.prepare('SELECT points FROM users WHERE id = ?').get(withdrawal.user_id)
    if (user.points < withdrawal.amount) {
      return res.status(400).json({ ok: false, message: '유저 포인트가 부족합니다.' })
    }

    const tx = db.transaction(async (txDb) => {
      await txDb.prepare('UPDATE withdrawals SET status = ?, processed_at = ? WHERE id = ?').run(status, now, id)
      await txDb.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(withdrawal.amount, withdrawal.user_id)
      await txDb.prepare(`
        INSERT INTO point_transactions (user_id, amount, type, description)
        VALUES (?, ?, 'use', '포인트 출금')
      `).run(withdrawal.user_id, withdrawal.amount)
    })
    try {
      await tx()
    } catch (err) {
      console.error('[출금 처리 오류]', err.message)
      return res.status(500).json({ ok: false, message: '출금 처리 중 오류가 발생했습니다.' })
    }
  } else {
    await db.prepare('UPDATE withdrawals SET status = ?, processed_at = ? WHERE id = ?').run(status, now, id)
  }

  res.json({ ok: true, message: `출금 신청이 '${status}'로 처리되었습니다.` })
})

// ======================== 자영업자 관리 ========================

router.get('/business', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, approved = '' } = req.query
  const offset = (page - 1) * limit

  let where = "WHERE role = 'business'"
  const params = []

  if (approved !== '') {
    where += ' AND business_approved = ?'
    params.push(Number(approved))
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params)
  const total = totalRow.count

  const businesses = await db.prepare(`
    SELECT id, nickname, email, points, status, business_approved, created_at
    FROM users
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, businesses, total, page: Number(page), limit: Number(limit) })
})

router.patch('/business/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { approved } = req.body

  await db.prepare('UPDATE users SET business_approved = ? WHERE id = ? AND role = ?').run(
    approved ? 1 : 0, id, 'business'
  )
  res.json({ ok: true, message: approved ? '자영업자가 승인되었습니다.' : '자영업자 승인이 거절되었습니다.' })
})

module.exports = router
