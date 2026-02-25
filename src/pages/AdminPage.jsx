import { useState, useEffect, useRef } from 'react'
import { getFlyers, createFlyer, updateFlyer, deleteFlyer, registerQuizzes, getQuizzesByFlyer, generateQrCode, getQrCode, getBusinessStats, getBusinessFlyers } from '../api/index'
import QrDisplay from '../components/QrDisplay'

const CATEGORIES = ['마트', '편의점', '뷰티', '카페', '생활용품', '음식점', '패션', '가전', '온라인', '엔터']

const EMPTY_FORM = {
  storeName: '', storeEmoji: '🏪', storeColor: '#FF4757', storeBgColor: '#FFF5F5',
  category: '마트', title: '', subtitle: '', validFrom: '', validUntil: '',
  sharePoint: 10, qrPoint: 100, tags: '',
  items: [{ name: '', originalPrice: '', salePrice: '' }],
}

const EMPTY_QUIZ = { question: '', options: ['', '', '', ''], answerIdx: 0, point: 20 }

export default function AdminPage({ onBack, token, userId }) {
  const [tab, setTab] = useState('flyers')  // 'flyers' | 'quiz' | 'qr' | 'stats'
  const [flyers, setFlyers] = useState([])
  const [bizFlyers, setBizFlyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list')   // 'list' | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

  // 퀴즈 관련
  const [quizFlyerId, setQuizFlyerId] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [quizMsg, setQuizMsg] = useState('')
  const [quizSaving, setQuizSaving] = useState(false)

  // QR 관련
  const [qrFlyerId, setQrFlyerId] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [qrMsg, setQrMsg] = useState('')

  // 통계
  const [stats, setStats] = useState(null)

  const loadFlyers = () => {
    setLoading(true)
    getFlyers().then(data => { setFlyers(data.data ?? data); setLoading(false) })
  }

  const loadBizFlyers = () => {
    if (!token) return
    getBusinessFlyers(token).then(data => setBizFlyers(data)).catch(() => {})
  }

  useEffect(() => { loadFlyers(); loadBizFlyers() }, [])

  // 전단지 폼 핸들러
  const handleField = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const handleItem = (idx, key, val) => {
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [key]: val }
      return { ...f, items }
    })
  }
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: '', originalPrice: '', salePrice: '' }] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }
  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setImageFile(null); setImagePreview(null); setMode('create'); setMsg('') }
  const openEdit = (flyer) => {
    setForm({
      storeName: flyer.storeName, storeEmoji: flyer.storeEmoji,
      storeColor: flyer.storeColor, storeBgColor: flyer.storeBgColor,
      category: flyer.category, title: flyer.title, subtitle: flyer.subtitle,
      validFrom: flyer.validFrom, validUntil: flyer.validUntil,
      sharePoint: flyer.sharePoint, qrPoint: flyer.qrPoint || 100,
      tags: flyer.tags.join(', '),
      items: flyer.items.map(i => ({ name: i.name, originalPrice: String(i.originalPrice), salePrice: String(i.salePrice) })),
    })
    setEditId(flyer.id)
    setImageFile(null)
    setImagePreview(flyer.imageUrl || null)
    setMode('edit')
    setMsg('')
  }

  const handleSave = async () => {
    if (!form.storeName || !form.title || !form.validFrom || !form.validUntil) { setMsg('매장명, 제목, 기간은 필수입니다.'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        sharePoint: Number(form.sharePoint),
        qrPoint: Number(form.qrPoint) || 0,
        ownerId: userId,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        items: form.items.map(i => ({ name: i.name, originalPrice: Number(i.originalPrice), salePrice: Number(i.salePrice) })),
      }
      if (mode === 'create') await createFlyer(payload, imageFile)
      else await updateFlyer(editId, payload, imageFile)
      setMsg(mode === 'create' ? '등록 완료!' : '수정 완료!')
      loadFlyers()
      loadBizFlyers()
      setTimeout(() => setMode('list'), 800)
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (flyer) => {
    if (!window.confirm(`"${flyer.storeName} - ${flyer.title}" 을 삭제할까요?`)) return
    await deleteFlyer(flyer.id)
    loadFlyers()
    loadBizFlyers()
  }

  // 퀴즈 핸들러
  const openQuizEditor = async (flyerId) => {
    setQuizFlyerId(flyerId)
    setQuizMsg('')
    try {
      const existing = await getQuizzesByFlyer(flyerId)
      if (existing.length > 0) {
        setQuizzes(existing.map(q => ({ question: q.question, options: q.options, answerIdx: q.answerIdx, point: q.point })))
      } else {
        setQuizzes([{ ...EMPTY_QUIZ }, { ...EMPTY_QUIZ }, { ...EMPTY_QUIZ }])
      }
    } catch {
      setQuizzes([{ ...EMPTY_QUIZ }, { ...EMPTY_QUIZ }, { ...EMPTY_QUIZ }])
    }
  }

  const handleQuizField = (qIdx, key, val) => {
    setQuizzes(prev => prev.map((q, i) => i === qIdx ? { ...q, [key]: val } : q))
  }
  const handleQuizOption = (qIdx, oIdx, val) => {
    setQuizzes(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...q.options]
      opts[oIdx] = val
      return { ...q, options: opts }
    }))
  }
  const addQuiz = () => {
    if (quizzes.length >= 5) return
    setQuizzes(prev => [...prev, { ...EMPTY_QUIZ }])
  }
  const removeQuiz = (idx) => {
    if (quizzes.length <= 3) return
    setQuizzes(prev => prev.filter((_, i) => i !== idx))
  }

  const handleQuizSave = async () => {
    for (const q of quizzes) {
      if (!q.question.trim()) { setQuizMsg('모든 질문을 입력해주세요.'); return }
      if (q.options.some(o => !o.trim())) { setQuizMsg('모든 선택지를 입력해주세요.'); return }
    }
    setQuizSaving(true)
    try {
      await registerQuizzes(quizFlyerId, quizzes, token)
      setQuizMsg('퀴즈가 저장되었습니다!')
      loadBizFlyers()
    } catch (e) { setQuizMsg(e.message) } finally { setQuizSaving(false) }
  }

  // QR 핸들러
  const openQrView = async (flyerId) => {
    setQrFlyerId(flyerId)
    setQrMsg('')
    try {
      const data = await getQrCode(flyerId)
      setQrData(data)
    } catch { setQrData(null) }
  }

  const handleQrGenerate = async () => {
    if (!qrFlyerId) return
    try {
      const data = await generateQrCode(qrFlyerId, token)
      setQrData({ ...qrData, qrCode: data.qrCode })
      setQrMsg('QR 코드가 생성되었습니다!')
      loadBizFlyers()
    } catch (e) { setQrMsg(e.message) }
  }

  // 통계 로드
  const loadStats = async () => {
    if (!token) return
    try {
      const data = await getBusinessStats(token)
      setStats(data)
    } catch {}
  }

  useEffect(() => { if (tab === 'stats') loadStats() }, [tab])

  const tabItems = [
    { id: 'flyers', label: '📋 전단지' },
    { id: 'quiz', label: '❓ 퀴즈' },
    { id: 'qr', label: '📱 QR' },
    { id: 'stats', label: '📊 통계' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="detail-header">
          <button className="back-btn" onClick={mode === 'list' && !quizFlyerId && !qrFlyerId ? onBack : () => { setMode('list'); setQuizFlyerId(null); setQrFlyerId(null) }}>←</button>
          <div className="detail-header-title">사업자 관리</div>
          {tab === 'flyers' && mode === 'list' && (
            <button className="admin-add-btn" onClick={openCreate}>+ 등록</button>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="biz-tabs">
        {tabItems.map(t => (
          <button
            key={t.id}
            className={`biz-tab ${tab === t.id ? 'biz-tab-active' : ''}`}
            onClick={() => { setTab(t.id); setMode('list'); setQuizFlyerId(null); setQrFlyerId(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 전단지 관리 탭 ===== */}
      {tab === 'flyers' && mode === 'list' && (
        <div className="admin-list">
          {loading && <div className="list-status">불러오는 중...</div>}
          {!loading && flyers.map(flyer => (
            <div key={flyer.id} className="admin-item">
              {flyer.imageUrl ? (
                <img src={flyer.imageUrl} alt={flyer.storeName} className="admin-item-thumb" />
              ) : (
                <span className="admin-item-emoji">{flyer.storeEmoji}</span>
              )}
              <div className="admin-item-info">
                <div className="admin-item-store">{flyer.storeName}</div>
                <div className="admin-item-title">{flyer.title}</div>
                <div className="admin-item-date">{flyer.validFrom} ~ {flyer.validUntil}</div>
              </div>
              <div className="admin-item-actions">
                <button className="admin-edit-btn" onClick={() => openEdit(flyer)}>수정</button>
                <button className="admin-del-btn" onClick={() => handleDelete(flyer)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'flyers' && (mode === 'create' || mode === 'edit') && (
        <div className="admin-form">
          <div className="admin-section-title">매장 정보</div>
          <div className="admin-row">
            <label>매장명 *</label>
            <input className="admin-input" value={form.storeName} onChange={e => handleField('storeName', e.target.value)} placeholder="이마트" />
          </div>
          <div className="admin-row">
            <label>이모지</label>
            <input className="admin-input admin-input-sm" value={form.storeEmoji} onChange={e => handleField('storeEmoji', e.target.value)} />
          </div>
          <div className="admin-row">
            <label>카테고리 *</label>
            <select className="admin-input" value={form.category} onChange={e => handleField('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="admin-row">
            <label>대표색상</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.storeColor} onChange={e => handleField('storeColor', e.target.value)} style={{ width: 40, height: 34, border: 'none', cursor: 'pointer' }} />
              <input type="color" value={form.storeBgColor} onChange={e => handleField('storeBgColor', e.target.value)} style={{ width: 40, height: 34, border: 'none', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: '#999' }}>대표색 / 배경색</span>
            </div>
          </div>

          <div className="admin-section-title" style={{ marginTop: 16 }}>전단지 정보</div>
          <div className="admin-row">
            <label>제목 *</label>
            <input className="admin-input" value={form.title} onChange={e => handleField('title', e.target.value)} placeholder="주말 특가 전단지" />
          </div>
          <div className="admin-row">
            <label>부제목</label>
            <input className="admin-input" value={form.subtitle} onChange={e => handleField('subtitle', e.target.value)} placeholder="최대 50% 할인" />
          </div>
          <div className="admin-row">
            <label>시작일 *</label>
            <input className="admin-input" value={form.validFrom} onChange={e => handleField('validFrom', e.target.value)} placeholder="2026.02.21" />
          </div>
          <div className="admin-row">
            <label>종료일 *</label>
            <input className="admin-input" value={form.validUntil} onChange={e => handleField('validUntil', e.target.value)} placeholder="2026.02.28" />
          </div>
          <div className="admin-row">
            <label>공유 포인트</label>
            <input className="admin-input admin-input-sm" type="number" value={form.sharePoint} onChange={e => handleField('sharePoint', e.target.value)} />
          </div>
          <div className="admin-row">
            <label>QR 방문 포인트</label>
            <input className="admin-input admin-input-sm" type="number" value={form.qrPoint} onChange={e => handleField('qrPoint', e.target.value)} min="100" max="500" />
          </div>
          <div className="admin-row">
            <label>태그</label>
            <input className="admin-input" value={form.tags} onChange={e => handleField('tags', e.target.value)} placeholder="신선식품, 음료, 할인 (쉼표 구분)" />
          </div>

          <div className="admin-section-title" style={{ marginTop: 16 }}>대표 이미지 <span style={{ fontWeight: 400, fontSize: 12, color: '#999' }}>(선택, 최대 5MB)</span></div>
          {imagePreview ? (
            <div className="admin-image-preview">
              <img src={imagePreview} alt="미리보기" className="admin-preview-img" />
              <button className="admin-image-remove-btn" onClick={removeImage}>이미지 제거</button>
            </div>
          ) : (
            <div className="admin-image-upload-area" onClick={() => fileInputRef.current?.click()}>
              <span className="admin-image-upload-icon">🖼️</span>
              <span className="admin-image-upload-label">클릭하여 이미지 선택</span>
              <span className="admin-image-upload-hint">JPG, PNG, WEBP 지원</span>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

          <div className="admin-section-title" style={{ marginTop: 16 }}>상품 목록</div>
          {form.items.map((item, idx) => (
            <div key={idx} className="admin-item-row">
              <input className="admin-input" style={{ flex: 2 }} value={item.name} onChange={e => handleItem(idx, 'name', e.target.value)} placeholder="상품명" />
              <input className="admin-input admin-input-sm" type="number" value={item.originalPrice} onChange={e => handleItem(idx, 'originalPrice', e.target.value)} placeholder="정가" />
              <input className="admin-input admin-input-sm" type="number" value={item.salePrice} onChange={e => handleItem(idx, 'salePrice', e.target.value)} placeholder="할인가" />
              <button className="admin-del-btn" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>✕</button>
            </div>
          ))}
          <button className="admin-add-item-btn" onClick={addItem}>+ 상품 추가</button>

          {msg && <p className="admin-msg">{msg}</p>}
          <button className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : mode === 'create' ? '등록하기' : '수정하기'}
          </button>
        </div>
      )}

      {/* ===== 퀴즈 등록 탭 ===== */}
      {tab === 'quiz' && !quizFlyerId && (
        <div className="admin-list">
          <p className="biz-hint">퀴즈를 등록할 전단지를 선택하세요</p>
          {bizFlyers.map(f => (
            <div key={f.id} className="admin-item" onClick={() => openQuizEditor(f.id)}>
              <span className="admin-item-emoji">{f.storeEmoji}</span>
              <div className="admin-item-info">
                <div className="admin-item-store">{f.storeName}</div>
                <div className="admin-item-title">{f.title}</div>
              </div>
              <div className="biz-badge-wrap">
                {f.quizCount > 0 && <span className="biz-badge biz-badge-quiz">퀴즈 {f.quizCount}개</span>}
                {f.quizCount === 0 && <span className="biz-badge biz-badge-empty">미등록</span>}
              </div>
            </div>
          ))}
          {bizFlyers.length === 0 && <div className="list-status">등록한 전단지가 없습니다.</div>}
        </div>
      )}

      {tab === 'quiz' && quizFlyerId && (
        <div className="admin-form quiz-editor">
          <div className="admin-section-title">퀴즈 등록 (3~5문제)</div>
          {quizzes.map((q, qIdx) => (
            <div key={qIdx} className="quiz-edit-card">
              <div className="quiz-edit-header">
                <span className="quiz-edit-num">Q{qIdx + 1}</span>
                {quizzes.length > 3 && (
                  <button className="admin-del-btn" onClick={() => removeQuiz(qIdx)}>삭제</button>
                )}
              </div>
              <input
                className="admin-input"
                value={q.question}
                onChange={e => handleQuizField(qIdx, 'question', e.target.value)}
                placeholder="질문을 입력하세요"
              />
              <div className="quiz-edit-options">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="quiz-edit-option">
                    <input
                      type="radio"
                      name={`quiz-answer-${qIdx}`}
                      checked={q.answerIdx === oIdx}
                      onChange={() => handleQuizField(qIdx, 'answerIdx', oIdx)}
                    />
                    <input
                      className="admin-input"
                      value={opt}
                      onChange={e => handleQuizOption(qIdx, oIdx, e.target.value)}
                      placeholder={`선택지 ${oIdx + 1}`}
                    />
                  </div>
                ))}
              </div>
              <div className="quiz-edit-point">
                <label>포인트 (10~50)</label>
                <input
                  className="admin-input admin-input-sm"
                  type="number"
                  value={q.point}
                  onChange={e => handleQuizField(qIdx, 'point', Number(e.target.value))}
                  min="10" max="50"
                />
              </div>
            </div>
          ))}

          {quizzes.length < 5 && (
            <button className="admin-add-item-btn" onClick={addQuiz}>+ 퀴즈 추가</button>
          )}

          {quizMsg && <p className="admin-msg">{quizMsg}</p>}
          <button className="admin-save-btn" onClick={handleQuizSave} disabled={quizSaving}>
            {quizSaving ? '저장 중...' : '퀴즈 저장'}
          </button>
        </div>
      )}

      {/* ===== QR 코드 탭 ===== */}
      {tab === 'qr' && !qrFlyerId && (
        <div className="admin-list">
          <p className="biz-hint">QR 코드를 관리할 전단지를 선택하세요</p>
          {bizFlyers.map(f => (
            <div key={f.id} className="admin-item" onClick={() => openQrView(f.id)}>
              <span className="admin-item-emoji">{f.storeEmoji}</span>
              <div className="admin-item-info">
                <div className="admin-item-store">{f.storeName}</div>
                <div className="admin-item-title">{f.title}</div>
              </div>
              <div className="biz-badge-wrap">
                {f.hasQr ? <span className="biz-badge biz-badge-qr">QR 생성됨</span> : <span className="biz-badge biz-badge-empty">미생성</span>}
              </div>
            </div>
          ))}
          {bizFlyers.length === 0 && <div className="list-status">등록한 전단지가 없습니다.</div>}
        </div>
      )}

      {tab === 'qr' && qrFlyerId && (
        <div className="admin-form qr-manage">
          {qrData && qrData.qrCode ? (
            <QrDisplay qrCode={qrData.qrCode} storeName={qrData.storeName} qrPoint={qrData.qrPoint} />
          ) : (
            <div className="qr-empty">
              <div className="qr-empty-icon">📱</div>
              <p>아직 QR 코드가 생성되지 않았습니다.</p>
              <button className="admin-save-btn" onClick={handleQrGenerate}>QR 코드 생성</button>
            </div>
          )}
          {qrMsg && <p className="admin-msg">{qrMsg}</p>}
          {qrData && qrData.qrCode && (
            <button className="admin-save-btn" style={{ marginTop: 12, background: '#666' }} onClick={handleQrGenerate}>QR 코드 재생성</button>
          )}
        </div>
      )}

      {/* ===== 통계 탭 ===== */}
      {tab === 'stats' && (
        <div className="biz-stats">
          {stats ? (
            <div className="stats-grid">
              <div className="stats-card">
                <div className="stats-card-icon">📋</div>
                <div className="stats-card-value">{stats.totalFlyers}</div>
                <div className="stats-card-label">등록 전단지</div>
              </div>
              <div className="stats-card">
                <div className="stats-card-icon">📤</div>
                <div className="stats-card-value">{stats.totalShares.toLocaleString()}</div>
                <div className="stats-card-label">총 공유수</div>
              </div>
              <div className="stats-card">
                <div className="stats-card-icon">❓</div>
                <div className="stats-card-value">{stats.totalQuizAttempts}</div>
                <div className="stats-card-label">퀴즈 응시</div>
              </div>
              <div className="stats-card">
                <div className="stats-card-icon">📍</div>
                <div className="stats-card-value">{stats.totalVisits}</div>
                <div className="stats-card-label">방문 인증</div>
              </div>
              <div className="stats-card stats-card-wide">
                <div className="stats-card-icon">💰</div>
                <div className="stats-card-value">{stats.totalPointsDistributed.toLocaleString()}P</div>
                <div className="stats-card-label">총 배포 포인트</div>
              </div>
            </div>
          ) : (
            <div className="list-status">통계를 불러오는 중...</div>
          )}
        </div>
      )}
    </div>
  )
}
