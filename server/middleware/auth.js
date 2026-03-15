const jwt = require('jsonwebtoken')
const db = require('../db')

module.exports = async function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' })
  }

  const token = header.slice(7)
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)

    // 탈퇴한 계정 차단
    const user = await db.prepare('SELECT status FROM users WHERE id = ?').get(req.user.userId)
    if (!user || user.status === 'deleted') {
      return res.status(401).json({ ok: false, message: '탈퇴한 계정입니다.' })
    }

    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, message: '토큰이 유효하지 않습니다.' })
    }
    return res.status(401).json({ ok: false, message: '토큰이 유효하지 않습니다.' })
  }
}
