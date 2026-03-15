// 로컬 개발 전용 진입점
const db = require('./db')

db._initPromise.then(() => {
  const app = require('./app')
  const PORT = process.env.PORT || 3001
  const server = app.listen(PORT, () => {
    console.log(`[서버] http://localhost:${PORT} 에서 실행 중`)
  })

  // Graceful shutdown
  const SHUTDOWN_TIMEOUT = 10000 // 10초

  function gracefulShutdown(signal) {
    console.log(`\n[서버] ${signal} 수신 — graceful shutdown 시작`)

    server.close(() => {
      console.log('[서버] 모든 연결 종료 완료')
      closeDb()
      process.exit(0)
    })

    // 타임아웃: 진행 중 요청이 10초 내에 완료되지 않으면 강제 종료
    setTimeout(() => {
      console.warn('[서버] shutdown 타임아웃 — 강제 종료')
      closeDb()
      process.exit(1)
    }, SHUTDOWN_TIMEOUT)
  }

  function closeDb() {
    try {
      // better-sqlite3 로컬 DB인 경우 close() 호출
      if (db._db && typeof db._db.close === 'function') {
        db._db.close()
        console.log('[DB] 연결 종료 완료')
      }
    } catch (err) {
      console.error('[DB] 종료 중 오류:', err.message)
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}).catch(err => {
  console.error('[서버 시작 오류]', err)
  process.exit(1)
})
