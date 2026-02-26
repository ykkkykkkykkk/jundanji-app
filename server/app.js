const isVercel = !!process.env.VERCEL

// 로컬 환경에서만 dotenv 로드 (Vercel은 대시보드 환경변수 사용)
if (!isVercel) {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') })
}

const express = require('express')
const cors = require('cors')
const path = require('path')

const flyersRouter = require('./routes/flyers')
const shareRouter = require('./routes/share')
const authRouter = require('./routes/auth')
const notificationsRouter = require('./routes/notifications')
const socialRouter = require('./routes/social')
const { router: pushRouter } = require('./routes/push')
const bookmarksRouter = require('./routes/bookmarks')
const quizRouter = require('./routes/quiz')
const qrRouter = require('./routes/qr')
const businessRouter = require('./routes/business')
const adminRouter = require('./routes/admin')

const app = express()

app.use(cors({
  origin: (origin, cb) => cb(null, true),
}))
app.use(express.json())

// 로컬 환경에서만 업로드 정적 서빙 + morgan 로깅
if (!isVercel) {
  const morgan = require('morgan')
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
  morgan.token('kr-time', () => new Date().toLocaleTimeString('ko-KR'))
  app.use(morgan('[:kr-time] :method :url :status :response-time ms'))
}

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: '전단지 서버 정상 동작 중' })
})

// 환경변수 디버그
app.get('/api/debug/env', (req, res) => {
  const mask = (v) => v ? v.slice(0, 6) + '...' + v.slice(-4) : '(not set)'
  res.json({
    ok: true,
    env: {
      VERCEL: !!process.env.VERCEL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      KAKAO_CLIENT_ID: mask(process.env.KAKAO_CLIENT_ID),
      KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI || '(not set)',
      KAKAO_CLIENT_SECRET: !!process.env.KAKAO_CLIENT_SECRET,
      FRONTEND_URL: process.env.FRONTEND_URL || '(not set)',
    }
  })
})

// 라우터 연결
app.use('/api/flyers', flyersRouter)
app.use('/api', shareRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', authRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/auth', socialRouter)
app.use('/api/push', pushRouter)
app.use('/api', bookmarksRouter)
app.use('/api', quizRouter)
app.use('/api', qrRouter)
app.use('/api/business', businessRouter)
app.use('/api/admin', adminRouter)

// 404
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, message: `${req.method} ${req.path} - 존재하지 않는 경로입니다.` })
})

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[ERROR]', err)
  res.status(500).json({ ok: false, message: '서버 오류가 발생했습니다.' })
})

module.exports = app
