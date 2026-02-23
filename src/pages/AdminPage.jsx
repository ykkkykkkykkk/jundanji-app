import { useState, useEffect, useRef } from 'react'
import { getFlyers, createFlyer, updateFlyer, deleteFlyer } from '../api/index'

const CATEGORIES = ['마트', '편의점', '뷰티', '카페', '생활용품']

const EMPTY_FORM = {
  storeName: '', storeEmoji: '🏪', storeColor: '#FF4757', storeBgColor: '#FFF5F5',
  category: '마트', title: '', subtitle: '', validFrom: '', validUntil: '',
  sharePoint: 10, tags: '',
  items: [{ name: '', originalPrice: '', salePrice: '' }],
}

export default function AdminPage({ onBack }) {
  const [flyers, setFlyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list')   // 'list' | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

  const loadFlyers = () => {
    setLoading(true)
    getFlyers().then(data => { setFlyers(data.data ?? data); setLoading(false) })
  }

  useEffect(() => { loadFlyers() }, [])

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

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setImageFile(null)
    setImagePreview(null)
    setMode('create')
    setMsg('')
  }

  const openEdit = (flyer) => {
    setForm({
      storeName: flyer.storeName, storeEmoji: flyer.storeEmoji,
      storeColor: flyer.storeColor, storeBgColor: flyer.storeBgColor,
      category: flyer.category, title: flyer.title, subtitle: flyer.subtitle,
      validFrom: flyer.validFrom, validUntil: flyer.validUntil,
      sharePoint: flyer.sharePoint, tags: flyer.tags.join(', '),
      items: flyer.items.map(i => ({ name: i.name, originalPrice: String(i.originalPrice), salePrice: String(i.salePrice) })),
    })
    setEditId(flyer.id)
    setImageFile(null)
    setImagePreview(flyer.imageUrl || null)
    setMode('edit')
    setMsg('')
  }

  const handleSave = async () => {
    if (!form.storeName || !form.title || !form.validFrom || !form.validUntil) {
      setMsg('매장명, 제목, 기간은 필수입니다.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        sharePoint: Number(form.sharePoint),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        items: form.items.map(i => ({
          name: i.name,
          originalPrice: Number(i.originalPrice),
          salePrice: Number(i.salePrice),
        })),
      }
      if (mode === 'create') await createFlyer(payload, imageFile)
      else await updateFlyer(editId, payload, imageFile)
      setMsg(mode === 'create' ? '등록 완료!' : '수정 완료!')
      loadFlyers()
      setTimeout(() => setMode('list'), 800)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (flyer) => {
    if (!window.confirm(`"${flyer.storeName} - ${flyer.title}" 을 삭제할까요?`)) return
    await deleteFlyer(flyer.id)
    loadFlyers()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="detail-header">
          <button className="back-btn" onClick={mode === 'list' ? onBack : () => setMode('list')}>←</button>
          <div className="detail-header-title">
            {mode === 'list' ? '관리자 - 전단지 관리' : mode === 'create' ? '전단지 등록' : '전단지 수정'}
          </div>
          {mode === 'list' && (
            <button className="admin-add-btn" onClick={openCreate}>+ 등록</button>
          )}
        </div>
      </div>

      {/* 목록 */}
      {mode === 'list' && (
        <div className="admin-list">
          {loading && <div className="list-status">불러오는 중...</div>}
          {!loading && flyers.map(flyer => (
            <div key={flyer.id} className="admin-item">
              {flyer.imageUrl ? (
                <img
                  src={flyer.imageUrl}
                  alt={flyer.storeName}
                  className="admin-item-thumb"
                />
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

      {/* 등록/수정 폼 */}
      {(mode === 'create' || mode === 'edit') && (
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
            <label>태그</label>
            <input className="admin-input" value={form.tags} onChange={e => handleField('tags', e.target.value)} placeholder="신선식품, 음료, 할인 (쉼표 구분)" />
          </div>

          {/* 이미지 업로드 */}
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageChange}
          />

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
    </div>
  )
}
