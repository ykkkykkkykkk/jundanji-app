const { Router } = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../db')
const { sendPushToAll } = require('./push')

const router = Router()
const isVercel = !!process.env.VERCEL

// multer 설정: Vercel에서는 메모리 스토리지 (파일 저장 불가), 로컬에서는 디스크 스토리지
let upload
if (isVercel) {
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true)
      else cb(new Error('이미지 파일만 업로드 가능합니다.'))
    },
  })
} else {
  const uploadsDir = path.join(__dirname, '../uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `flyer-${Date.now()}${ext}`)
    },
  })
  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true)
      else cb(new Error('이미지 파일만 업로드 가능합니다.'))
    },
  })
}
const uploadsDir = isVercel ? null : path.join(__dirname, '../uploads')

// tags / items 안전 파싱 (JSON 문자열 또는 배열 모두 허용)
function parseTags(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  try { return JSON.parse(tags) } catch { return tags.split(',').map(t => t.trim()).filter(Boolean) }
}
function parseItems(items) {
  if (!items) return []
  if (Array.isArray(items)) return items
  try { return JSON.parse(items) } catch { return [] }
}

// 전단지 목록 조회
// GET /api/flyers?category=마트&q=검색어&page=1&limit=10
router.get('/', async (req, res) => {
  const { category, q, page, limit } = req.query
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10))
  const offset = (pageNum - 1) * limitNum

  const baseQuery = `
    FROM flyers f
    LEFT JOIN flyer_items fi ON fi.flyer_id = f.id
  `
  const conditions = ["REPLACE(f.valid_until, '.', '-') >= date('now', 'localtime')"]
  const params = []

  if (category && category !== '전체') {
    conditions.push('f.category = ?')
    params.push(category)
  }

  if (q && q.trim()) {
    conditions.push('(f.store_name LIKE ? OR f.title LIKE ? OR f.tags LIKE ?)')
    const like = `%${q.trim()}%`
    params.push(like, like, like)
  }

  const whereClause = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''

  const totalRow = await db.prepare(`SELECT COUNT(DISTINCT f.id) AS cnt ${baseQuery}${whereClause}`).get(...params)
  const total = totalRow.cnt

  const dataQuery = `
    SELECT
      f.id, f.store_name, f.store_emoji, f.store_color, f.store_bg_color,
      f.category, f.title, f.subtitle, f.valid_from, f.valid_until,
      f.share_point, f.share_count, f.tags, f.image_url,
      f.qr_point, f.owner_id, f.qr_code,
      json_group_array(
        json_object(
          'name', fi.name,
          'originalPrice', fi.original_price,
          'salePrice', fi.sale_price
        )
      ) AS items
    ${baseQuery}${whereClause}
    GROUP BY f.id ORDER BY f.id DESC
    LIMIT ? OFFSET ?
  `
  const rows = await db.prepare(dataQuery).all(...params, limitNum, offset)

  const flyers = rows.map(row => ({
    id: row.id,
    storeName: row.store_name,
    storeEmoji: row.store_emoji,
    storeColor: row.store_color,
    storeBgColor: row.store_bg_color,
    category: row.category,
    title: row.title,
    subtitle: row.subtitle,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    sharePoint: row.share_point,
    shareCount: row.share_count,
    tags: JSON.parse(row.tags),
    imageUrl: row.image_url || null,
    qrPoint: row.qr_point || 0,
    ownerId: row.owner_id || null,
    qrCode: row.qr_code || null,
    items: JSON.parse(row.items),
  }))

  res.json({
    ok: true,
    data: flyers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      hasMore: offset + flyers.length < total,
    },
  })
})

// 전단지 상세 조회
// GET /api/flyers/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params

  const flyer = await db.prepare(`
    SELECT
      f.id, f.store_name, f.store_emoji, f.store_color, f.store_bg_color,
      f.category, f.title, f.subtitle, f.valid_from, f.valid_until,
      f.share_point, f.share_count, f.tags, f.image_url,
      f.qr_point, f.owner_id, f.qr_code
    FROM flyers f
    WHERE f.id = ?
  `).get(id)

  if (!flyer) {
    return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })
  }

  // 조회수 증가
  await db.prepare('UPDATE flyers SET view_count = view_count + 1 WHERE id = ?').run(id)

  const items = await db.prepare(`
    SELECT name, original_price AS originalPrice, sale_price AS salePrice
    FROM flyer_items
    WHERE flyer_id = ?
    ORDER BY sort_order ASC
  `).all(id)

  res.json({
    ok: true,
    data: {
      id: flyer.id,
      storeName: flyer.store_name,
      storeEmoji: flyer.store_emoji,
      storeColor: flyer.store_color,
      storeBgColor: flyer.store_bg_color,
      category: flyer.category,
      title: flyer.title,
      subtitle: flyer.subtitle,
      validFrom: flyer.valid_from,
      validUntil: flyer.valid_until,
      sharePoint: flyer.share_point,
      shareCount: flyer.share_count,
      tags: JSON.parse(flyer.tags),
      imageUrl: flyer.image_url || null,
      qrPoint: flyer.qr_point || 0,
      ownerId: flyer.owner_id || null,
      qrCode: flyer.qr_code || null,
      items,
    },
  })
})

// 전단지 등록
// POST /api/flyers (multipart/form-data)
router.post('/', upload.single('image'), async (req, res) => {
  const { storeName, storeEmoji, storeColor, storeBgColor, category, title, subtitle,
          validFrom, validUntil, sharePoint, qrPoint, ownerId, tags, items } = req.body

  if (!storeName || !title || !category || !validFrom || !validUntil) {
    if (!isVercel && req.file) fs.unlinkSync(req.file.path)
    return res.status(400).json({ ok: false, message: '필수 항목이 누락되었습니다.' })
  }

  const parsedTags = parseTags(tags)
  const parsedItems = parseItems(items)

  if (!parsedItems.length) {
    if (!isVercel && req.file) fs.unlinkSync(req.file.path)
    return res.status(400).json({ ok: false, message: '상품 목록을 1개 이상 입력하세요.' })
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null

  const insertTx = db.transaction(async (txDb) => {
    // owner_id FK 검증: 유저가 존재하는 경우에만 설정
    let validOwnerId = null
    if (ownerId) {
      const ownerExists = await txDb.prepare('SELECT id FROM users WHERE id = ?').get(Number(ownerId))
      if (ownerExists) validOwnerId = Number(ownerId)
    }

    const { lastInsertRowid: flyerId } = await txDb.prepare(`
      INSERT INTO flyers (store_name, store_emoji, store_color, store_bg_color, category, title, subtitle,
                          valid_from, valid_until, share_point, share_count, tags, image_url, qr_point, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(storeName, storeEmoji || '🏪', storeColor || '#FF4757', storeBgColor || '#FFF5F5',
           category, title, subtitle || '', validFrom, validUntil, Number(sharePoint) || 10,
           JSON.stringify(parsedTags), imageUrl, Number(qrPoint) || 0, validOwnerId)

    for (let idx = 0; idx < parsedItems.length; idx++) {
      const item = parsedItems[idx]
      await txDb.prepare(`
        INSERT INTO flyer_items (flyer_id, name, original_price, sale_price, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(flyerId, item.name, Number(item.originalPrice), Number(item.salePrice), idx)
    }
    return flyerId
  })

  let flyerId
  try {
    flyerId = await insertTx()
  } catch (err) {
    console.error('[전단지 등록 오류]', err.message, err.stack)
    return res.status(500).json({ ok: false, message: '전단지 등록 실패: ' + err.message })
  }

  await db.prepare(`
    INSERT INTO notifications (title, body, emoji)
    VALUES (?, ?, ?)
  `).run(
    `새 전단지: ${storeName}`,
    `${title} - 지금 확인하고 포인트 받으세요!`,
    storeEmoji || '🏪'
  )

  // Web Push 발송 (비동기, 실패해도 응답에 영향 없음)
  sendPushToAll({
    title: `${storeEmoji || '🏪'} 새 전단지: ${storeName}`,
    body: `${title} - 지금 확인하고 포인트 받으세요!`,
    icon: '/icon-192.png',
  }).catch(err => console.error('[Push 발송 오류]', err.message))

  res.status(201).json({ ok: true, data: { id: flyerId } })
})

// 전단지 수정
// PUT /api/flyers/:id (multipart/form-data)
router.put('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params
  const { storeName, storeEmoji, storeColor, storeBgColor, category, title, subtitle,
          validFrom, validUntil, sharePoint, qrPoint, tags, items } = req.body

  const existing = await db.prepare('SELECT id, image_url FROM flyers WHERE id = ?').get(id)
  if (!existing) {
    if (!isVercel && req.file) fs.unlinkSync(req.file.path)
    return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })
  }

  // 새 이미지가 올라오면 기존 파일 삭제
  let imageUrl = existing.image_url
  if (req.file) {
    if (!isVercel && existing.image_url && uploadsDir) {
      const oldPath = path.join(uploadsDir, path.basename(existing.image_url))
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }
    imageUrl = isVercel ? null : `/uploads/${req.file.filename}`
  }

  const parsedTags = parseTags(tags)
  const parsedItems = parseItems(items)

  const updateTx = db.transaction(async (txDb) => {
    await txDb.prepare(`
      UPDATE flyers SET store_name=?, store_emoji=?, store_color=?, store_bg_color=?,
      category=?, title=?, subtitle=?, valid_from=?, valid_until=?, share_point=?, tags=?, image_url=?, qr_point=?
      WHERE id=?
    `).run(storeName, storeEmoji, storeColor, storeBgColor, category, title, subtitle,
           validFrom, validUntil, Number(sharePoint), JSON.stringify(parsedTags), imageUrl, Number(qrPoint) || 0, id)

    if (parsedItems.length) {
      await txDb.prepare('DELETE FROM flyer_items WHERE flyer_id = ?').run(id)
      for (let idx = 0; idx < parsedItems.length; idx++) {
        const item = parsedItems[idx]
        await txDb.prepare(`
          INSERT INTO flyer_items (flyer_id, name, original_price, sale_price, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, item.name, Number(item.originalPrice), Number(item.salePrice), idx)
      }
    }
  })

  await updateTx()
  res.json({ ok: true, data: { id: Number(id) } })
})

// 전단지 삭제
// DELETE /api/flyers/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const existing = await db.prepare('SELECT id, image_url FROM flyers WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ ok: false, message: '전단지를 찾을 수 없습니다.' })

  // 이미지 파일 삭제 (로컬 환경에서만)
  if (!isVercel && existing.image_url && uploadsDir) {
    const imgPath = path.join(uploadsDir, path.basename(existing.image_url))
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath)
  }

  await db.prepare('DELETE FROM flyers WHERE id = ?').run(id)
  res.json({ ok: true, message: '삭제 완료' })
})

module.exports = router
