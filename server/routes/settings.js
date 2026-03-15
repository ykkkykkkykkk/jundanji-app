const { Router } = require('express')
const db = require('../db')

const router = Router()

// 공개 설정 조회 (인증 불필요, 클라이언트용)
// GET /api/settings/public
router.get('/public', async (req, res) => {
  try {
    const rows = await db.prepare(
      'SELECT key, value FROM system_settings'
    ).all()

    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }

    res.json({ ok: true, data: settings })
  } catch (err) {
    console.error('[공개 설정 조회 오류]', err.message)
    res.status(500).json({ ok: false, message: '설정 조회 중 오류가 발생했습니다.' })
  }
})

module.exports = router
