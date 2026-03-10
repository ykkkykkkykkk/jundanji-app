import { useState, useEffect, useRef } from 'react'
import { createGiftOrder, getGiftOrders } from '../api/index'

const CATEGORIES = ['전체', '☕ 카페', '🏪 편의점', '🏬 백화점', '🍗 치킨', '🍕 피자', '🍔 버거', '🍦 디저트', '🥤 음료']

const GIFT_LIST = [
  { id: 'starbucks_ame', emoji: '☕', brand: '스타벅스', name: '아메리카노 Tall', points: 5000, cat: '☕ 카페' },
  { id: 'ediya_ame', emoji: '☕', brand: '이디야', name: '아메리카노', points: 3000, cat: '☕ 카페' },
  { id: 'cu_5000', emoji: '🏪', brand: 'CU', name: '5,000원 금액권', points: 5000, cat: '🏪 편의점' },
  { id: 'gs25_5000', emoji: '🏬', brand: 'GS25', name: '5,000원 금액권', points: 5000, cat: '🏪 편의점' },
  { id: 'shinsegae_10000', emoji: '🏬', brand: '신세계', name: '상품권 1만원', points: 10000, cat: '🏬 백화점' },
  { id: 'lotte_10000', emoji: '🏬', brand: '롯데', name: '상품권 1만원', points: 10000, cat: '🏬 백화점' },
  { id: 'bbq_gold', emoji: '🍗', brand: 'BBQ', name: '황금올리브', points: 15000, cat: '🍗 치킨' },
  { id: 'kyochon_honey', emoji: '🍗', brand: '교촌', name: '허니콤보', points: 15000, cat: '🍗 치킨' },
  { id: 'domino_pizza', emoji: '🍕', brand: '도미노', name: '피자 1판', points: 20000, cat: '🍕 피자' },
  { id: 'lotteria_set', emoji: '🍔', brand: '롯데리아', name: '세트 메뉴', points: 7000, cat: '🍔 버거' },
  { id: 'br_pint', emoji: '🍦', brand: '배스킨라빈스', name: '파인트', points: 8000, cat: '🍦 디저트' },
  { id: 'gongcha_large', emoji: '🥤', brand: '공차', name: '라지 음료', points: 4000, cat: '🥤 음료' },
]

const STATUS_LABELS = {
  pending: '발송 대기',
  sent: '발송 완료',
  failed: '발송 실패',
}

export default function GiftShopPage({ points, userId, isLoggedIn, onLoginClick, onPointsChange }) {
  const [cat, setCat] = useState('전체')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [showHistory, setShowHistory] = useState(false)

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

  const filtered = cat === '전체' ? GIFT_LIST : GIFT_LIST.filter(g => g.cat === cat)

  useEffect(() => {
    if (showHistory && isLoggedIn && userId) {
      getGiftOrders(userId).then(setOrders).catch(() => {})
    }
  }, [showHistory, userId, isLoggedIn])

  const handleExchange = async () => {
    if (!selected) return
    if (!isLoggedIn) { setError('로그인 후 이용 가능합니다.'); setShowModal(false); return }
    setLoading(true)
    setError('')
    try {
      const res = await createGiftOrder(userId, selected.id)
      onPointsChange(res.data.remainPoints)
      setShowModal(false)
      setShowComplete(true)
      setSelected(null)
      if (showHistory) getGiftOrders(userId).then(setOrders).catch(() => {})
    } catch (e) {
      setError(e.message || '교환 처리 중 오류가 발생했습니다.')
      setShowModal(false)
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
        <div className="gshop-point-banner-amount">{points.toLocaleString()}<span className="gshop-point-banner-unit">P</span></div>
        <div className="gshop-point-banner-sub">포인트로 기프티콘을 교환하세요!</div>
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
          {CATEGORIES.map(c => (
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
        {filtered.map(g => {
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
        })}
      </div>

      {/* 에러 메시지 */}
      {error && <div className="gshop-page-error">{error}</div>}

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
          <button className="gshop-page-bottom-btn gshop-page-bottom-btn-active" onClick={() => { setError(''); setShowModal(true) }}>
            {selected.emoji} {selected.brand} {selected.name} · {selected.points.toLocaleString()}P 교환하기
          </button>
        ) : (
          <button className="gshop-page-bottom-btn gshop-page-bottom-btn-disabled" disabled>
            상품을 선택해주세요
          </button>
        )}
      </div>

      {/* 확인 모달 */}
      {showModal && selected && (
        <div className="gshop-modal-overlay" onClick={() => !loading && setShowModal(false)}>
          <div className="gshop-modal" onClick={e => e.stopPropagation()}>
            <div className="gshop-modal-emoji">{selected.emoji}</div>
            <div className="gshop-modal-brand">{selected.brand}</div>
            <div className="gshop-modal-name">{selected.name}</div>
            <div className="gshop-modal-points">{selected.points.toLocaleString()}P</div>

            <div className="gshop-modal-info">
              <div className="gshop-modal-info-row">📱 카카오톡 선물함으로 발송돼요</div>
              <div className="gshop-modal-info-row">⏱ 최대 10분 소요</div>
              <div className="gshop-modal-info-row">⚠️ 교환 후 취소 불가</div>
            </div>

            <div className="gshop-modal-balance">
              교환 후 잔여 포인트: <strong>{(points - selected.points).toLocaleString()}P</strong>
            </div>

            <button
              className="gshop-modal-confirm-btn"
              onClick={handleExchange}
              disabled={loading}
            >
              {loading ? '처리 중...' : '💛 카카오톡으로 받기'}
            </button>
            <button className="gshop-modal-cancel-btn" onClick={() => setShowModal(false)} disabled={loading}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* 완료 팝업 */}
      {showComplete && (
        <div className="gshop-modal-overlay" onClick={() => setShowComplete(false)}>
          <div className="gshop-modal gshop-modal-complete" onClick={e => e.stopPropagation()}>
            <div className="gshop-complete-emoji">🎉</div>
            <div className="gshop-complete-title">교환 신청 완료!</div>
            <div className="gshop-complete-desc">카카오톡 선물함을 확인해주세요.<br />최대 10분 내 발송됩니다.</div>
            <button className="gshop-modal-confirm-btn" onClick={() => setShowComplete(false)}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
