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

// ======================== 기프티콘 관리 ========================

router.get('/gift-orders', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (status) {
    where += ' AND g.status = ?'
    params.push(status)
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM gift_orders g ${where}`).get(...params)
  const total = totalRow.count

  const orders = await db.prepare(`
    SELECT g.*, u.nickname, u.email, u.provider
    FROM gift_orders g
    JOIN users u ON g.user_id = u.id
    ${where}
    ORDER BY g.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, orders, total, page: Number(page), limit: Number(limit) })
})

router.patch('/gift-orders/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['sent', 'failed'].includes(status)) {
    return res.status(400).json({ ok: false, message: '유효하지 않은 상태입니다.' })
  }

  const order = await db.prepare('SELECT * FROM gift_orders WHERE id = ?').get(id)
  if (!order) {
    return res.status(404).json({ ok: false, message: '기프티콘 주문을 찾을 수 없습니다.' })
  }

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace('T', ' ')

  if (status === 'failed') {
    // 실패 시 포인트 환불
    try {
      await db.batch([
        { sql: 'UPDATE gift_orders SET status = ?, sent_at = ? WHERE id = ?', args: [status, now, id] },
        { sql: 'UPDATE users SET points = points + ? WHERE id = ?', args: [order.amount, order.user_id] },
        { sql: "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'earn', '기프티콘 발송 실패 환불')", args: [order.user_id, order.amount] },
      ])
    } catch (err) {
      console.error('[기프티콘 환불 오류]', err.message)
      return res.status(500).json({ ok: false, message: '처리 중 오류가 발생했습니다.' })
    }
  } else {
    await db.prepare('UPDATE gift_orders SET status = ?, sent_at = ? WHERE id = ?').run(status, now, id)
  }

  res.json({ ok: true, message: `기프티콘 주문이 '${status === 'sent' ? '발송완료' : '실패'}'로 처리되었습니다.` })
})

// ======================== 1:1 문의 관리 ========================

router.get('/inquiries', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []
  if (status) {
    where += ' AND i.status = ?'
    params.push(status)
  }

  const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM inquiries i ${where}`).get(...params)
  const inquiries = await db.prepare(`
    SELECT i.*, u.nickname, u.email
    FROM inquiries i
    JOIN users u ON i.user_id = u.id
    ${where}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, inquiries, total: totalRow.count, page: Number(page), limit: Number(limit) })
})

router.patch('/inquiries/:id/answer', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { answer } = req.body

  if (!answer || !answer.trim()) {
    return res.status(400).json({ ok: false, message: '답변 내용을 입력해주세요.' })
  }

  const inquiry = await db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id)
  if (!inquiry) {
    return res.status(404).json({ ok: false, message: '문의를 찾을 수 없습니다.' })
  }

  const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace('T', ' ')
  await db.prepare(
    'UPDATE inquiries SET answer = ?, status = ?, answered_at = ? WHERE id = ?'
  ).run(answer.trim(), 'answered', now, id)

  res.json({ ok: true, message: '답변이 등록되었습니다.' })
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

// ======================== 카테고리 관리 ========================

router.get('/categories', requireAdmin, async (req, res) => {
  const categories = await db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all()
  res.json({ ok: true, categories })
})

router.post('/categories', requireAdmin, async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, message: '카테고리 이름을 입력하세요.' })
  }

  try {
    const maxOrder = await db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM categories').get()
    await db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name.trim(), maxOrder.max_order + 1)
    res.status(201).json({ ok: true, message: '카테고리가 추가되었습니다.' })
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, message: '이미 존재하는 카테고리입니다.' })
    }
    throw err
  }
})

router.patch('/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { name, sortOrder } = req.body

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!existing) {
    return res.status(404).json({ ok: false, message: '카테고리를 찾을 수 없습니다.' })
  }

  const newName = name !== undefined ? name.trim() : existing.name
  const newOrder = sortOrder !== undefined ? Number(sortOrder) : existing.sort_order

  if (!newName) {
    return res.status(400).json({ ok: false, message: '카테고리 이름을 입력하세요.' })
  }

  try {
    await db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(newName, newOrder, id)
    res.json({ ok: true, message: '카테고리가 수정되었습니다.' })
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, message: '이미 존재하는 카테고리입니다.' })
    }
    throw err
  }
})

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!existing) {
    return res.status(404).json({ ok: false, message: '카테고리를 찾을 수 없습니다.' })
  }

  // 해당 카테고리를 사용하는 전단지가 있는지 확인
  const flyerCount = await db.prepare('SELECT COUNT(*) as cnt FROM flyers WHERE category = ?').get(existing.name)
  if (flyerCount.cnt > 0) {
    return res.status(409).json({
      ok: false,
      message: `이 카테고리를 사용하는 전단지가 ${flyerCount.cnt}개 있습니다. 먼저 전단지의 카테고리를 변경해주세요.`,
    })
  }

  await db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  res.json({ ok: true, message: '카테고리가 삭제되었습니다.' })
})

module.exports = router
