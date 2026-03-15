const { Router } = require('express')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

// 알림 목록 (공개 — 전체 알림은 모든 유저가 볼 수 있음)
// GET /api/notifications
router.get('/', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all()
  res.json({ ok: true, data: rows, unread: rows.filter(r => !r.is_read).length })
})

// 알림 읽음 처리 (인증 필수)
// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// 전체 읽음 (인증 필수)
// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1').run()
  res.json({ ok: true })
})

module.exports = router
