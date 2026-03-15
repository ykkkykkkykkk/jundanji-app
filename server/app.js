const isVercel = !!process.env.VERCEL

// 로컬 환경에서만 dotenv 로드 (Vercel은 대시보드 환경변수 사용)
if (!isVercel) {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') })
}

const express = require('express')
const cors = require('cors')
const path = require('path')
const rateLimit = require('express-rate-limit')

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
const giftRouter = require('./routes/gift')
const inquiryRouter = require('./routes/inquiry')
const securityRouter = require('./routes/security')
const exchangeRouter = require('./routes/exchange')
const withdrawalRouter = require('./routes/withdrawal')

const app = express()

app.use(cors({
  origin: isVercel
    ? (origin, cb) => {
        const allowed = process.env.FRONTEND_URL
        if (!origin || origin === allowed) return cb(null, true)
        cb(new Error('CORS 차단: 허용되지 않은 출처'))
      }
    : (origin, cb) => cb(null, true),
}))
app.use(express.json())

// 전역 Rate Limiting (100 req / 15min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
})
app.use('/api', globalLimiter)

// 인증 엔드포인트 엄격한 Rate Limiting (5 req / 15min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: '인증 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/admin/login', authLimiter)

// 로컬 환경에서만 업로드 정적 서빙 + morgan 로깅 + 디버그 엔드포인트
if (!isVercel) {
  const morgan = require('morgan')
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
  morgan.token('kr-time', () => new Date().toLocaleTimeString('ko-KR'))
  app.use(morgan('[:kr-time] :method :url :status :response-time ms'))

  // 환경변수 디버그 (로컬 전용)
  app.get('/api/debug/env', (req, res) => {
    const mask = (v) => v ? v.slice(0, 6) + '...' + v.slice(-4) : '(not set)'
    res.json({
      ok: true,
      env: {
        VERCEL: !!process.env.VERCEL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        KAKAO_CLIENT_ID: mask(process.env.KAKAO_CLIENT_ID),
        KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI || '(not set)',
        KAKAO_CLIENT_SECRET: mask(process.env.KAKAO_CLIENT_SECRET),
        FRONTEND_URL: process.env.FRONTEND_URL || '(not set)',
      }
    })
  })
}

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: '전단지 서버 정상 동작 중' })
})

// 앱 버전 확인
app.get('/api/version', (req, res) => {
  const pkg = require('./package.json')
  res.json({
    ok: true,
    data: {
      version: pkg.version,
      minClientVersion: '0.1.0',
    },
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
app.use('/api', giftRouter)
app.use('/api', inquiryRouter)
app.use('/api/security', securityRouter)
app.use('/api', securityRouter)
app.use('/api/exchange', exchangeRouter)
app.use('/api/withdrawals', withdrawalRouter)

// 만료 전단지 자동 삭제 (Vercel Cron)
app.get('/api/cron/cleanup', async (req, res) => {
  // Vercel Cron 인증 (CRON_SECRET 설정 시)
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  const db = require('./db')
  const expired = await db.prepare(
    "SELECT id, store_name, valid_until FROM flyers WHERE REPLACE(valid_until, '.', '-') < date('now', 'localtime')"
  ).all()

  if (expired.length === 0) {
    return res.json({ ok: true, deleted: 0, message: '만료된 전단지가 없습니다.' })
  }

  for (const f of expired) {
    await db.prepare('DELETE FROM flyers WHERE id = ?').run(f.id)
  }

  console.log(`[Cron] 만료 전단지 ${expired.length}개 삭제:`, expired.map(f => f.store_name).join(', '))
  res.json({ ok: true, deleted: expired.length, flyers: expired.map(f => ({ id: f.id, storeName: f.store_name, validUntil: f.valid_until })) })
})

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
