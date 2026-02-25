const { Router } = require('express')
const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = Router()

// 사업자 대시보드 통계
// GET /api/business/stats
router.get('/stats', authMiddleware, (req, res) => {
  const userId = req.user.userId

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)
  if (!user || user.role !== 'business') {
    return res.status(403).json({ ok: false, message: '사업자만 접근할 수 있습니다.' })
  }

  const totalFlyers = db.prepare('SELECT COUNT(*) as cnt FROM flyers WHERE owner_id = ?').get(userId).cnt
  const totalShares = db.prepare(`
    SELECT COALESCE(SUM(f.share_count), 0) as cnt
    FROM flyers f WHERE f.owner_id = ?
  `).get(userId).cnt
  const totalQuizAttempts = db.prepare(`
    SELECT COUNT(*) as cnt FROM quiz_attempts qa
    JOIN flyers f ON f.id = qa.flyer_id WHERE f.owner_id = ?
  `).get(userId).cnt
  const totalVisits = db.prepare(`
    SELECT COUNT(*) as cnt FROM visit_verifications vv
    JOIN flyers f ON f.id = vv.flyer_id WHERE f.owner_id = ?
  `).get(userId).cnt
  const totalPointsDistributed = db.prepare(`
    SELECT COALESCE(SUM(qa.points_earned), 0) + COALESCE(
      (SELECT SUM(vv.points_earned) FROM visit_verifications vv
       JOIN flyers f2 ON f2.id = vv.flyer_id WHERE f2.owner_id = ?), 0
    ) as total
    FROM quiz_attempts qa
    JOIN flyers f ON f.id = qa.flyer_id WHERE f.owner_id = ?
  `).get(userId, userId).total

  res.json({
    ok: true,
    data: { totalFlyers, totalShares, totalQuizAttempts, totalVisits, totalPointsDistributed },
  })
})

// 사업자 전단지 목록 (퀴즈/QR 정보 포함)
// GET /api/business/flyers
router.get('/flyers', authMiddleware, (req, res) => {
  const userId = req.user.userId

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId)
  if (!user || user.role !== 'business') {
    return res.status(403).json({ ok: false, message: '사업자만 접근할 수 있습니다.' })
  }

  const flyers = db.prepare(`
    SELECT f.id, f.store_name, f.store_emoji, f.category, f.title,
           f.valid_from, f.valid_until, f.share_point, f.share_count,
           f.qr_point, f.qr_code, f.image_url
    FROM flyers f WHERE f.owner_id = ?
    ORDER BY f.id DESC
  `).all(userId)

  const result = flyers.map(f => {
    const quizCount = db.prepare('SELECT COUNT(*) as cnt FROM quizzes WHERE flyer_id = ?').get(f.id).cnt
    const attemptCount = db.prepare('SELECT COUNT(*) as cnt FROM quiz_attempts WHERE flyer_id = ?').get(f.id).cnt
    const visitCount = db.prepare('SELECT COUNT(*) as cnt FROM visit_verifications WHERE flyer_id = ?').get(f.id).cnt

    return {
      id: f.id,
      storeName: f.store_name,
      storeEmoji: f.store_emoji,
      category: f.category,
      title: f.title,
      validFrom: f.valid_from,
      validUntil: f.valid_until,
      sharePoint: f.share_point,
      shareCount: f.share_count,
      qrPoint: f.qr_point,
      hasQr: !!f.qr_code,
      imageUrl: f.image_url,
      quizCount,
      attemptCount,
      visitCount,
    }
  })

  res.json({ ok: true, data: result })
})

module.exports = router
