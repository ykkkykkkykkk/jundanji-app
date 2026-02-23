const { Router } = require('express')
const webpush = require('web-push')
const db = require('../db')

const router = Router()

// VAPID 설정 (키가 없으면 무시 — 데모 환경 대응)
try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@jundanji.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  }
} catch (e) {
  console.warn('[Push] VAPID 설정 실패:', e.message)
}

// VAPID 공개키 반환 (프론트에서 구독 시 사용)
// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ ok: true, data: process.env.VAPID_PUBLIC_KEY })
})

// 구독 저장
// POST /api/push/subscribe  { endpoint, keys: { p256dh, auth } }
router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ ok: false, message: '구독 정보가 올바르지 않습니다.' })
  }

  db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (?, ?, ?)
  `).run(endpoint, keys.p256dh, keys.auth)

  res.json({ ok: true })
})

// 구독 취소
// DELETE /api/push/unsubscribe  { endpoint }
router.delete('/unsubscribe', (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ ok: false, message: 'endpoint 필수입니다.' })
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
  res.json({ ok: true })
})

// 전체 구독자에게 푸시 발송 (내부 유틸)
async function sendPushToAll(payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions').all()
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      ).catch(err => {
        // 만료된 구독 자동 제거 (410 Gone)
        if (err.statusCode === 410) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint)
        }
        throw err
      })
    )
  )
  const sent = results.filter(r => r.status === 'fulfilled').length
  console.log(`[Push] ${sent}/${subs.length}명에게 발송`)
}

module.exports = { router, sendPushToAll }
