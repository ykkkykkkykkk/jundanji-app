import { useState, useEffect, useRef, useMemo } from 'react'
import { createExchangeRequest, getGiftOrders, getGiftProducts } from '../api/index'

const STATUS_LABELS = {
  pending: '발송 대기',
  completed: '발송 완료',
  sent: '발송 완료',
  failed: '발송 실패',
}

function formatPhone(value) {
  const nums = value.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 3) return nums
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, '')
  return /^01[0-9]\d{7,8}$/.test(digits)
}

export default function GiftShopPage({ points, userId, isLoggedIn, onLoginClick, onPointsChange, token }) {
  const [cat, setCat] = useState('전체')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [phone, setPhone] = useState('')
  const [remainPoints, setRemainPoints] = useState(null)

  // 상품 목록 서버 fetch
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setProductsLoading(true)
    setProductsError(false)
    getGiftProducts()
      .then(data => {
        if (!cancelled) {
          setProducts(data)
          setProductsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProductsError(true)
          setProductsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const handleRetryProducts = () => {
    setProductsLoading(true)
    setProductsError(false)
    getGiftProducts()
      .then(data => { setProducts(data); setProductsLoading(false) })
      .catch(() => { setProductsError(true); setProductsLoading(false) })
  }

  // 카테고리 목록: 서버 상품의 category 필드에서 동적 추출
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
    return ['전체', ...cats]
  }, [products])

  // 드래그 스크롤 (홈 카테고리와 동일)
  const tabsRef = useRef(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)

  const handleDragStart = (e) => {
    isDragging.current = true
    dragStartX.current = e.pageX || e.touches?.[0]?.pageX
    dragScrollLeft.current = tabsRef.current.scrollLeft
    tabsRef.current.style.cursor = 'grabbing'
  }
  const handleDragMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.pageX || e.touches?.[0]?.pageX
    const walk = (dragStartX.current - x) * 1.5
    tabsRef.current.scrollLeft = dragScrollLeft.current + walk
  }
  const handleDragEnd = () => {
    isDragging.current = false
    if (tabsRef.current) tabsRef.current.style.cursor = 'grab'
  }

  const filtered = cat === '전체' ? products : products.filter(g => g.category === cat)

  useEffect(() => {
    if (showHistory && isLoggedIn && userId) {
      getGiftOrders(token, userId).then(setOrders).catch(() => {})
    }
  }, [showHistory, userId, isLoggedIn])

  const openModal = () => {
    setError('')
    setPhone('')
    setShowModal(true)
  }

  const handleExchange = async () => {
    if (!selected) return
    if (!isLoggedIn) { setError('로그인 후 이용 가능합니다.'); setShowModal(false); return }
    if (!isValidPhone(phone)) { setError('올바른 전화번호를 입력해주세요.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await createExchangeRequest(token, {
        product_name: `${selected.brand} ${selected.name}`,
        product_emoji: selected.emoji,
        points: selected.points,
        phone,
      })
      onPointsChange(res.data.remainPoints)
      setRemainPoints(res.data.remainPoints)
      setShowModal(false)
      setShowComplete(true)
      setSelected(null)
      setPhone('')
      if (showHistory) getGiftOrders(token, userId).then(setOrders).catch(() => {})
    } catch (e) {
      setError(e.message || '교환 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page gshop-page">
      {/* 헤더 */}
      <div className="page-header">
        <div className="gshop-page-header">
          <span className="gshop-page-title">🎁 기프티콘 교환소</span>
        </div>
      </div>

      {/* 포인트 배너 */}
      <div className="gshop-point-banner">
        <div className="gshop-point-banner-label">보유 포인트</div>
        <div className="gshop-point-banner-amount">{isLoggedIn ? points.toLocaleString() : '---'}<span className="gshop-point-banner-unit">P</span></div>
        <div className="gshop-point-banner-sub">{isLoggedIn ? '포인트로 기프티콘을 교환하세요!' : '로그인 후 포인트를 확인하세요'}</div>
      </div>

      {/* 카테고리 탭 */}
      <div className="category-tabs-wrapper" style={{ margin: '0', padding: '0 0 14px' }}>
        <div
          className="category-tabs"
          ref={tabsRef}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {categories.map(c => (
            <button
              key={c}
              className={`category-tab ${cat === c ? 'active' : ''}`}
              onClick={() => setCat(c)}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* 기프티콘 리스트 */}
      <div className="gshop-page-list">
        {productsLoading ? (
          <div className="gshop-page-loading">
            <div className="spinner" />
            <div style={{ marginTop: 12, fontSize: 14, color: '#999' }}>상품 불러오는 중...</div>
          </div>
        ) : productsError ? (
          <div className="gshop-page-loading">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 16 }}>상품을 불러오지 못했습니다.</div>
            <button className="gshop-page-retry-btn" onClick={handleRetryProducts}>다시 시도</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="gshop-page-loading">
            <div style={{ fontSize: 14, color: '#999' }}>해당 카테고리에 상품이 없습니다.</div>
          </div>
        ) : (
          filtered.map(g => {
            const isSelected = selected?.id === g.id
            const insufficient = points < g.points
            return (
              <div
                key={g.id}
                className={`gshop-page-item${isSelected ? ' gshop-page-item-selected' : ''}${insufficient ? ' gshop-page-item-disabled' : ''}`}
                onClick={() => !insufficient && setSelected(isSelected ? null : g)}
              >
                <div className="gshop-page-item-emoji">{g.emoji}</div>
                <div className="gshop-page-item-info">
                  <div className="gshop-page-item-brand">{g.brand}</div>
                  <div className="gshop-page-item-name">{g.name}</div>
                </div>
                <div className="gshop-page-item-right">
                  <div className="gshop-page-item-points">{g.points.toLocaleString()}P</div>
                  {insufficient && <div className="gshop-page-item-lack">포인트 부족</div>}
                </div>
                {isSelected && <div className="gshop-page-item-check">✓</div>}
              </div>
            )
          })
        )}
      </div>

      {/* 에러 메시지 */}
      {error && !showModal && <div className="gshop-page-error">{error}</div>}

      {/* 교환 내역 토글 */}
      {isLoggedIn && (
        <div className="gshop-page-history-section">
          <div className="gshop-page-history-toggle" onClick={() => setShowHistory(v => !v)}>
            {showHistory ? '▲ 교환 내역 닫기' : '▼ 교환 내역 보기'}
          </div>
          {showHistory && (
            <div className="gshop-page-history-list">
              {orders.length === 0 ? (
                <div className="gshop-page-history-empty">교환 내역이 없습니다.</div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="gshop-page-history-item">
                    <div className="gshop-page-history-info">
                      <div className="gshop-page-history-name">{o.gift_name}</div>
                      <div className="gshop-page-history-date">{o.created_at}</div>
                    </div>
                    <div className="gshop-page-history-right">
                      <div className="gshop-page-history-amount">{o.amount.toLocaleString()}P</div>
                      <div className={`gshop-page-history-status gshop-page-history-status-${o.status}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 하단 고정 버튼 */}
      <div className="gshop-page-bottom-bar">
        {!isLoggedIn ? (
          <button className="gshop-page-bottom-btn gshop-page-bottom-btn-login" onClick={onLoginClick}>
            로그인하고 교환하기
          </button>
        ) : selected ? (
          <button className="gshop-page-bottom-btn gshop-page-bottom-btn-active" onClick={openModal}>
            {selected.emoji} {selected.brand} {selected.name} · {selected.points.toLocaleString()}P 교환하기
          </button>
        ) : (
          <button className="gshop-page-bottom-btn gshop-page-bottom-btn-disabled" disabled>
            상품을 선택해주세요
          </button>
        )}
      </div>

      {/* 바텀시트 모달 */}
      {showModal && selected && (
        <div className="gshop-bs-overlay" onClick={() => !loading && setShowModal(false)}>
          <div className="gshop-bs" onClick={e => e.stopPropagation()}>
            <div className="gshop-bs-handle" />

            {/* 상품 정보 */}
            <div className="gshop-bs-product">
              <div className="gshop-bs-product-emoji">{selected.emoji}</div>
              <div className="gshop-bs-product-detail">
                <div className="gshop-bs-product-brand">{selected.brand}</div>
                <div className="gshop-bs-product-name">{selected.name}</div>
              </div>
              <div className="gshop-bs-product-points">{selected.points.toLocaleString()}P</div>
            </div>

            {/* 전화번호 입력 */}
            <div className="gshop-bs-field">
              <label className="gshop-bs-label">수신 번호</label>
              <input
                className="gshop-bs-input"
                type="tel"
                inputMode="numeric"
                placeholder="010-0000-0000"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
              />
            </div>

            {/* 안내문 */}
            <div className="gshop-bs-notice">
              입력한 번호로 카카오톡 기프티콘이 발송됩니다.<br />
              발송까지 최대 1영업일 소요됩니다.
            </div>

            {/* 잔여 포인트 */}
            <div className="gshop-bs-balance">
              교환 후 잔여 포인트: <strong>{(points - selected.points).toLocaleString()}P</strong>
            </div>

            {/* 에러 */}
            {error && <div className="gshop-bs-error">{error}</div>}

            {/* 버튼 */}
            <button
              className="gshop-bs-submit"
              onClick={handleExchange}
              disabled={loading || !isValidPhone(phone)}
            >
              {loading ? '처리 중...' : '교환 신청하기'}
            </button>
          </div>
        </div>
      )}

      {/* 완료 화면 */}
      {showComplete && (
        <div className="gshop-bs-overlay" onClick={() => setShowComplete(false)}>
          <div className="gshop-bs gshop-bs-complete" onClick={e => e.stopPropagation()}>
            <div className="gshop-bs-handle" />
            <div className="gshop-complete-emoji">🎉</div>
            <div className="gshop-complete-title">교환 신청 완료!</div>
            <div className="gshop-complete-desc">
              입력하신 번호로 카카오톡 기프티콘이 발송됩니다.<br />
              최대 1영업일 내 발송됩니다.
            </div>
            <div className="gshop-bs-balance">
              잔여 포인트: <strong>{remainPoints !== null ? remainPoints.toLocaleString() : points.toLocaleString()}P</strong>
            </div>
            <button className="gshop-bs-submit" onClick={() => setShowComplete(false)}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
