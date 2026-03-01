// Vercel Serverless Function 진입점
// Turso (libSQL) 영구 DB 연결 후 Express 앱 위임

let app = null

module.exports = async (req, res) => {
  try {
    if (!app) {
      // DB 초기화 대기 (스키마 + 시드)
      const db = require('../server/db')
      await db._initPromise

      // Express 앱 로드
      app = require('../server/app')
    }

    return app(req, res)
  } catch (err) {
    console.error('[Vercel Init Error]', err)
    res.status(500).json({ ok: false, message: '서버 초기화 오류: ' + err.message })
  }
}
