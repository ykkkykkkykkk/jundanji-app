const { Router } = require('express')
const db = require('../db')

const router = Router()

// 즐겨찾기 목록 조회 (전단지 전체 정보 포함)
// GET /api/users/:userId/bookmarks
router.get('/users/:userId/bookmarks', (req, res) => {
  const { userId } = req.params

  const rows = db.prepare(`
    SELECT
      f.id, f.store_name, f.store_emoji, f.store_color, f.store_bg_color,
      f.category, f.title, f.subtitle, f.valid_from, f.valid_until,
      f.share_point, f.share_count, f.tags, f.image_url,
      b.created_at AS bookmarked_at
    FROM bookmarks b
    JOIN flyers f ON f.id = b.flyer_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId)

  const data = rows.map(row => ({
    id: row.id,
    storeName: row.store_name,
    storeEmoji: row.store_emoji,
    storeColor: row.store_color,
    storeBgColor: row.store_bg_color,
    category: row.category,
    title: row.title,
    subtitle: row.subtitle,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    sharePoint: row.share_point,
    shareCount: row.share_count,
    tags: JSON.parse(row.tags),
    imageUrl: row.image_url || null,
    bookmarkedAt: row.bookmarked_at,
  }))

  res.json({ ok: true, data })
})

// 즐겨찾기 추가
// POST /api/bookmarks  { userId, flyerId }
router.post('/bookmarks', (req, res) => {
  const { userId, flyerId } = req.body
  if (!userId || !flyerId) {
    return res.status(400).json({ ok: false, message: 'userId, flyerId 필수입니다.' })
  }

  const flyer = db.prepare('SELECT id FROM flyers WHERE id = ?').get(flyerId)
  if (!flyer) return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })

  db.ensureUser(userId)
  try {
    db.prepare(
      'INSERT OR IGNORE INTO bookmarks (user_id, flyer_id) VALUES (?, ?)'
    ).run(userId, flyerId)
  } catch (err) {
    console.error('[북마크 추가 오류]', err.message)
    return res.status(500).json({ ok: false, message: '북마크 추가 중 오류가 발생했습니다.' })
  }

  res.json({ ok: true })
})

// 즐겨찾기 취소
// DELETE /api/bookmarks/:flyerId  { userId }
router.delete('/bookmarks/:flyerId', (req, res) => {
  const { flyerId } = req.params
  const { userId } = req.body
  if (!userId) return res.status(400).json({ ok: false, message: 'userId 필수입니다.' })

  db.prepare(
    'DELETE FROM bookmarks WHERE user_id = ? AND flyer_id = ?'
  ).run(userId, flyerId)

  res.json({ ok: true })
})

module.exports = router
