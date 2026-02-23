// 로컬 개발 전용 진입점
const app = require('./app')
const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[서버] http://localhost:${PORT} 에서 실행 중`)
})
