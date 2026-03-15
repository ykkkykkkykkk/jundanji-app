const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../db')
const { decrypt } = require('../crypto-utils')

const router = express.Router()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'
// 어드민 JWT는 별도 시크릿을 사용하여 일반 유저 JWT와 분리
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'fallback-admin-secret'
const ADMIN_JWT_EXPIRES_IN = '8h'

// JWT 발급
function signAdminToken() {
  return jwt.sign({ role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES_IN })
}

// 인증 미들웨어
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET)
    if (payload.role !== 'admin') throw new Error('권한 없음')
    next()
  } catch (err) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
}

// ======================== 로그인 ========================

router.post('/login', (req, res) => {
  const { password } = req.body
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: '비밀번호가 올바르지 않습니다.' })
  }
  const token = signAdminToken()
  res.json({ ok: true, token })
})

// ======================== 대시보드 ========================

router.get('/dashboard', requireAdmin, async (req, res) => {
  const totalUsersRow = await db.prepare('SELECT COUNT(*) as count FROM users').get()
  const totalUsers = totalUsersRow.count
  const totalFlyersRow = await db.prepare('SELECT COUNT(*) as count FROM flyers').get()
  const totalFlyers = totalFlyersRow.count
  const totalPointsRow = await db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM users').get()
  const totalPoints = totalPointsRow?.total || 0
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

// ======================== 포인트 관리 (관리자) ========================

router.post('/users/:id/points', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { amount, description } = req.body

  if (!amount || typeof amount !== 'number' || amount === 0) {
    return res.status(400).json({ ok: false, message: 'amount(숫자)는 필수입니다.' })
  }

  const user = await db.prepare('SELECT id, nickname, points FROM users WHERE id = ?').get(id)
  if (!user) {
    return res.status(404).json({ ok: false, message: '유저를 찾을 수 없습니다.' })
  }

  const type = amount > 0 ? 'earn' : 'use'
  const absAmount = Math.abs(amount)
  const desc = description || (amount > 0 ? '관리자 포인트 지급' : '관리자 포인트 차감')

  try {
    await db.batch([
      { sql: 'UPDATE users SET points = points + ? WHERE id = ?', args: [amount, id] },
      { sql: 'INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)', args: [id, absAmount, type, desc] },
    ])

    const updated = await db.prepare('SELECT points FROM users WHERE id = ?').get(id)
    res.json({ ok: true, message: `${user.nickname}에게 ${amount}P 처리 완료`, points: updated.points })
  } catch (err) {
    console.error('[포인트 관리 오류]', err.message)
    return res.status(500).json({ ok: false, message: '처리 중 오류가 발생했습니다.' })
  }
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
    SELECT g.*, u.nickname, u.email, u.provider, u.provider_id
    FROM gift_orders g
    JOIN users u ON g.user_id = u.id
    ${where}
    ORDER BY g.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  // 어드민은 전화번호 복호화 후 반환 (기존 평문 데이터 하위 호환 포함)
  const decryptedOrders = orders.map(order => {
    if (!order.phone) return order
    try {
      return { ...order, phone: decrypt(order.phone) }
    } catch (_) {
      return order
    }
  })

  res.json({ ok: true, orders: decryptedOrders, total, page: Number(page), limit: Number(limit) })
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
        { sql: 'UPDATE gift_orders SET status = ?, sent_at = ?, phone = NULL WHERE id = ?', args: [status, now, id] },
        { sql: 'UPDATE users SET points = points + ? WHERE id = ?', args: [order.amount, order.user_id] },
        { sql: "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'earn', '기프티콘 발송 실패 환불')", args: [order.user_id, order.amount] },
        { sql: "UPDATE exchange_requests SET phone = NULL, status = 'failed' WHERE user_id = CAST(? AS TEXT) AND points = ? AND phone IS NOT NULL", args: [order.user_id, order.amount] },
      ])
    } catch (err) {
      console.error('[기프티콘 환불 오류]', err.message)
      return res.status(500).json({ ok: false, message: '처리 중 오류가 발생했습니다.' })
    }
  } else {
    // 발송완료 시 전화번호 삭제 (개인정보 보호)
    await db.prepare('UPDATE gift_orders SET status = ?, sent_at = ?, phone = NULL WHERE id = ?').run(status, now, id)
    // exchange_requests 테이블에서도 전화번호 삭제 + 상태 동기화
    await db.prepare("UPDATE exchange_requests SET phone = NULL, status = 'completed' WHERE user_id = CAST(? AS TEXT) AND points = ? AND phone IS NOT NULL").run(order.user_id, order.amount)
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

// ======================== 출금 관리 ========================

router.get('/withdrawals', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (status) {
    where += ' AND w.status = ?'
    params.push(status)
  }

  try {
    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM withdrawals w ${where}`).get(...params)
    const total = totalRow.count

    const withdrawals = await db.prepare(`
      SELECT w.*, u.nickname
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), Number(offset))

    // 어드민은 계좌번호/예금주 복호화 후 반환 (기존 평문 데이터 하위 호환 포함)
    const decryptedWithdrawals = withdrawals.map(w => {
      try {
        return {
          ...w,
          account_number: decrypt(w.account_number),
          account_holder: decrypt(w.account_holder),
        }
      } catch (_) {
        return w
      }
    })

    res.json({ ok: true, withdrawals: decryptedWithdrawals, total, page: Number(page), limit: Number(limit) })
  } catch (err) {
    console.error('[출금 목록 조회 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/withdrawals/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    const withdrawal = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(Number(id))
    if (!withdrawal) {
      return res.status(404).json({ ok: false, message: '출금 요청을 찾을 수 없습니다.' })
    }
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ ok: false, message: '이미 처리된 출금 요청입니다.' })
    }

    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace('T', ' ')
    await db.prepare(
      "UPDATE withdrawals SET status = 'approved', processed_at = ? WHERE id = ?"
    ).run(now, Number(id))

    res.json({ ok: true, message: '출금이 승인되었습니다.' })
  } catch (err) {
    console.error('[출금 승인 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 승인 중 오류가 발생했습니다.' })
  }
})

router.post('/withdrawals/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { admin_memo } = req.body

  try {
    const withdrawal = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(Number(id))
    if (!withdrawal) {
      return res.status(404).json({ ok: false, message: '출금 요청을 찾을 수 없습니다.' })
    }
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ ok: false, message: '이미 처리된 출금 요청입니다.' })
    }

    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace('T', ' ')

    // 거절 시 포인트 환불
    await db.batch([
      { sql: "UPDATE withdrawals SET status = 'rejected', processed_at = ?, admin_memo = ? WHERE id = ?", args: [now, admin_memo || null, Number(id)] },
      { sql: 'UPDATE users SET points = points + ? WHERE id = ?', args: [withdrawal.amount, withdrawal.user_id] },
      { sql: "INSERT INTO point_transactions (user_id, amount, type, description) VALUES (?, ?, 'earn', '출금 거절 환불')", args: [withdrawal.user_id, withdrawal.amount] },
    ])

    res.json({ ok: true, message: '출금이 거절되었습니다. 포인트가 환불되었습니다.' })
  } catch (err) {
    console.error('[출금 거절 오류]', err.message)
    res.status(500).json({ ok: false, message: '출금 거절 중 오류가 발생했습니다.' })
  }
})

// ======================== 시스템 설정 관리 ========================

router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await db.prepare(
      'SELECT key, value, description, updated_at FROM system_settings ORDER BY key ASC'
    ).all()
    res.json({ ok: true, data: settings })
  } catch (err) {
    console.error('[설정 조회 오류]', err.message)
    res.status(500).json({ ok: false, message: '설정 조회 중 오류가 발생했습니다.' })
  }
})

router.patch('/settings/:key', requireAdmin, async (req, res) => {
  const { key } = req.params
  const { value } = req.body

  if (value === undefined || value === null || String(value).trim() === '') {
    return res.status(400).json({ ok: false, message: 'value는 필수입니다.' })
  }

  try {
    const existing = await db.prepare('SELECT key FROM system_settings WHERE key = ?').get(key)
    if (!existing) {
      return res.status(404).json({ ok: false, message: '존재하지 않는 설정 키입니다.' })
    }

    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace('T', ' ')
    await db.prepare(
      'UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?'
    ).run(String(value), now, key)

    res.json({ ok: true, message: `설정 '${key}'이(가) '${value}'로 변경되었습니다.` })
  } catch (err) {
    console.error('[설정 수정 오류]', err.message)
    res.status(500).json({ ok: false, message: '설정 수정 중 오류가 발생했습니다.' })
  }
})

// ======================== 기프티콘 상품 관리 ========================

router.get('/gift-products', requireAdmin, async (req, res) => {
  try {
    const products = await db.prepare(
      'SELECT * FROM gift_products ORDER BY sort_order ASC, id ASC'
    ).all()
    res.json({ ok: true, data: products })
  } catch (err) {
    console.error('[기프티콘 상품 조회 오류]', err.message)
    res.status(500).json({ ok: false, message: '상품 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/gift-products', requireAdmin, async (req, res) => {
  const { gift_key, emoji, brand, name, points, category, sort_order } = req.body

  if (!gift_key || !emoji || !brand || !name || !points || !category) {
    return res.status(400).json({ ok: false, message: '필수 항목을 모두 입력해주세요. (gift_key, emoji, brand, name, points, category)' })
  }

  if (!Number.isInteger(Number(points)) || Number(points) <= 0) {
    return res.status(400).json({ ok: false, message: 'points는 양의 정수여야 합니다.' })
  }

  try {
    await db.prepare(
      'INSERT INTO gift_products (gift_key, emoji, brand, name, points, category, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(gift_key, emoji, brand, name, Number(points), category, Number(sort_order) || 0)

    res.status(201).json({ ok: true, message: '상품이 추가되었습니다.' })
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, message: '이미 존재하는 gift_key입니다.' })
    }
    console.error('[기프티콘 상품 추가 오류]', err.message)
    res.status(500).json({ ok: false, message: '상품 추가 중 오류가 발생했습니다.' })
  }
})

router.patch('/gift-products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { emoji, brand, name, points, category, sort_order, is_active } = req.body

  try {
    const existing = await db.prepare('SELECT * FROM gift_products WHERE id = ?').get(Number(id))
    if (!existing) {
      return res.status(404).json({ ok: false, message: '상품을 찾을 수 없습니다.' })
    }

    const newEmoji = emoji !== undefined ? emoji : existing.emoji
    const newBrand = brand !== undefined ? brand : existing.brand
    const newName = name !== undefined ? name : existing.name
    const newPoints = points !== undefined ? Number(points) : existing.points
    const newCategory = category !== undefined ? category : existing.category
    const newSortOrder = sort_order !== undefined ? Number(sort_order) : existing.sort_order
    const newIsActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active

    await db.prepare(
      'UPDATE gift_products SET emoji = ?, brand = ?, name = ?, points = ?, category = ?, sort_order = ?, is_active = ? WHERE id = ?'
    ).run(newEmoji, newBrand, newName, newPoints, newCategory, newSortOrder, newIsActive, Number(id))

    res.json({ ok: true, message: '상품이 수정되었습니다.' })
  } catch (err) {
    console.error('[기프티콘 상품 수정 오류]', err.message)
    res.status(500).json({ ok: false, message: '상품 수정 중 오류가 발생했습니다.' })
  }
})

router.delete('/gift-products/:id', requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    const existing = await db.prepare('SELECT * FROM gift_products WHERE id = ?').get(Number(id))
    if (!existing) {
      return res.status(404).json({ ok: false, message: '상품을 찾을 수 없습니다.' })
    }

    // 소프트 삭제 (is_active = 0)
    await db.prepare('UPDATE gift_products SET is_active = 0 WHERE id = ?').run(Number(id))

    res.json({ ok: true, message: '상품이 비활성화되었습니다.' })
  } catch (err) {
    console.error('[기프티콘 상품 삭제 오류]', err.message)
    res.status(500).json({ ok: false, message: '상품 삭제 중 오류가 발생했습니다.' })
  }
})

module.exports = router
