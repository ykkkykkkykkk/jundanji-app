const { Router } = require('express')
const db = require('../db')

const router = Router()

// 알림 목록
// GET /api/notifications
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all()
  res.json({ ok: true, data: rows, unread: rows.filter(r => !r.is_read).length })
})

// 알림 읽음 처리
// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// 전체 읽음
// PATCH /api/notifications/read-all
router.patch('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1').run()
  res.json({ ok: true })
})

module.exports = router
