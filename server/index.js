// 로컬 개발 전용 진입점
const db = require('./db')

db._initPromise.then(() => {
  const app = require('./app')
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`[서버] http://localhost:${PORT} 에서 실행 중`)
  })
}).catch(err => {
  console.error('[서버 시작 오류]', err)
  process.exit(1)
})
