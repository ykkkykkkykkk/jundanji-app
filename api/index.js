// Vercel Serverless Function 진입점
// sql.js (WASM 기반 순수 JS SQLite) 초기화 후 Express 앱 위임

const initSqlJs = require('sql.js')

let app = null

module.exports = async (req, res) => {
  try {
    if (!app) {
      // sql.js WASM 로드 + 인메모리 DB 생성
      const SQL = await initSqlJs()
      global.__sqlJsDb = new SQL.Database()

      // Express 앱 로드 (내부에서 db.js가 global.__sqlJsDb를 사용)
      app = require('../server/app')
    }

    return app(req, res)
  } catch (err) {
    console.error('[Vercel Init Error]', err)
    res.status(500).json({ ok: false, message: '서버 초기화 오류: ' + err.message })
  }
}
