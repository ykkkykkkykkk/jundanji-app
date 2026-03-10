const { Router } = require('express')
const db = require('../db')

const router = Router()

const INQUIRY_CATEGORIES = ['일반', '포인트', '기프티콘', '전단지', '계정', '기타']

// 문의 등록
// POST /api/inquiries
router.post('/inquiries', async (req, res) => {
  const { userId, category, title, content } = req.body

  if (!userId || !title || !content) {
    return res.status(400).json({ ok: false, message: '제목과 내용을 입력해주세요.' })
  }

  if (title.trim().length < 2) {
    return res.status(400).json({ ok: false, message: '제목을 2자 이상 입력해주세요.' })
  }

  if (content.trim().length < 5) {
    return res.status(400).json({ ok: false, message: '내용을 5자 이상 입력해주세요.' })
  }

  await db.ensureUser(userId)

  try {
    const result = await db.prepare(`
      INSERT INTO inquiries (user_id, category, title, content)
      VALUES (?, ?, ?, ?)
    `).run(userId, category || '일반', title.trim(), content.trim())

    res.json({
      ok: true,
      data: {
        inquiryId: result.lastInsertRowid,
        message: '문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.',
      },
    })
  } catch (err) {
    console.error('[문의 등록 오류]', err.message)
    res.status(500).json({ ok: false, message: '문의 등록 중 오류가 발생했습니다.' })
  }
})

// 내 문의 내역 조회
// GET /api/users/:userId/inquiries
router.get('/users/:userId/inquiries', async (req, res) => {
  const { userId } = req.params

  await db.ensureUser(userId)

  const inquiries = await db.prepare(`
    SELECT id, category, title, content, status, answer, created_at, answered_at
    FROM inquiries
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(Number(userId))

  res.json({ ok: true, data: inquiries })
})

// 문의 카테고리 목록
// GET /api/inquiry-categories
router.get('/inquiry-categories', (req, res) => {
  res.json({ ok: true, data: INQUIRY_CATEGORIES })
})

module.exports = router
