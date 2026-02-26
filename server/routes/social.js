const { Router } = require('express')
const jwt = require('jsonwebtoken')
const db = require('../db')

const router = Router()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

function findOrCreateSocialUser(provider, providerId, nickname) {
  let user = db.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').get(provider, providerId)
  let isNew = false
  if (!user) {
    const { lastInsertRowid: userId } = db.prepare(
      'INSERT INTO users (nickname, provider, provider_id) VALUES (?, ?, ?)'
    ).run(nickname, provider, providerId)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    isNew = true
  }
  return { user, isNew }
}

// ─────────────────────────────── 카카오 ───────────────────────────────

// POST /api/auth/kakao/token  → 프론트에서 받은 카카오 access_token으로 로그인
router.post('/kakao/token', async (req, res) => {
  const { accessToken } = req.body
  if (!accessToken) {
    return res.status(400).json({ ok: false, message: 'accessToken 필수입니다.' })
  }

  try {
    // 카카오 사용자 프로필 조회
    const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profile = await profileRes.json()

    if (!profile.id) throw new Error('카카오 프로필 조회 실패')

    const kakaoId = String(profile.id)
    const nickname = profile.kakao_account?.profile?.nickname || `카카오유저${kakaoId.slice(-4)}`

    // DB 유저 찾기 / 생성
    const { user, isNew } = findOrCreateSocialUser('kakao', kakaoId, nickname)

    const token = signToken(user.id)
    res.json({
      ok: true,
      data: { token, userId: user.id, nickname: user.nickname, role: user.role || 'user', isNew }
    })
  } catch (e) {
    console.error('[카카오 로그인 오류]', e.message)
    res.status(500).json({ ok: false, message: '카카오 로그인 실패: ' + e.message })
  }
})

// ─────────────────────────────── 구글 ────────────────────────────────

// GET /api/auth/google  → 구글 인증 페이지로 리다이렉트
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ ok: false, message: 'GOOGLE_CLIENT_ID 미설정' })
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    scope: 'openid email profile',
    access_type: 'online',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

// GET /api/auth/google/callback  → 구글 인가 코드 수신
router.get('/google/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.redirect(`${FRONTEND_URL}?error=google_denied`)

  try {
    // 1. 액세스 토큰 발급
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('구글 토큰 발급 실패')

    // 2. 사용자 프로필 조회
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    const googleId = profile.sub
    const nickname = profile.name || `구글유저${googleId.slice(-4)}`

    // 3. DB 유저 찾기 / 생성
    const { user, isNew } = findOrCreateSocialUser('google', googleId, nickname)

    const token = signToken(user.id)
    res.redirect(
      `${FRONTEND_URL}?token=${token}&userId=${user.id}&nickname=${encodeURIComponent(user.nickname)}&role=${user.role || 'user'}&isNew=${isNew}`
    )
  } catch (e) {
    console.error('[구글 로그인 오류]', e.message)
    res.redirect(`${FRONTEND_URL}?error=google_failed`)
  }
})

module.exports = router
