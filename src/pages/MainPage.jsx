import { useState, useEffect, useRef, useCallback } from 'react'
import { getFlyers, getCategories } from '../api/index'
const PAGE_LIMIT = 8

function getCategoryColor(category) {
  const colors = {
    '마트': '#2196F3',
    '편의점': '#9C27B0',
    '뷰티': '#E91E63',
    '카페': '#795548',
    '생활용품': '#FF5722',
    '음식점': '#F44336',
    '패션': '#212121',
    '가전': '#00BCD4',
    '온라인': '#FF9800',
    '엔터': '#673AB7',
  }
  return colors[category] || '#888'
}

function isExpired(validUntil) {
  const [y, m, d] = validUntil.split('.').map(Number)
  return new Date(y, m - 1, d + 1) <= new Date()
}

export default function MainPage({ onFlyerClick, onNotificationClick, unreadCount, darkMode, onDarkModeToggle, bookmarkedIds = new Set(), onBookmarkToggle }) {
  const [categories, setCategories] = useState(['전체'])
  const [activeCategory, setActiveCategory] = useState('전체')
  const [flyers, setFlyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)
  const sentinelRef = useRef(null)

  // 카테고리 목록 로드
  useEffect(() => {
    getCategories().then(cats => {
      setCategories(['전체', ...cats])
    }).catch(() => {})
  }, [])

  // 카테고리/검색 변경 시 초기화
  useEffect(() => {
    setFlyers([])
    setPage(1)
    setHasMore(false)
    setError(null)
    setLoading(true)

    getFlyers(activeCategory, searchQuery, 1, PAGE_LIMIT)
      .then(({ data, pagination }) => {
        setFlyers(data)
        setHasMore(pagination.hasMore)
        setTotalCount(pagination.total)
        setPage(2)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeCategory, searchQuery])

  // 추가 페이지 로드
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    getFlyers(activeCategory, searchQuery, page, PAGE_LIMIT)
      .then(({ data, pagination }) => {
        setFlyers(prev => [...prev, ...data])
        setHasMore(pagination.hasMore)
        setPage(prev => prev + 1)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, activeCategory, searchQuery, page])

  // IntersectionObserver 무한 스크롤
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  const handleSearchOpen = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  const handleSearchClose = () => {
    setSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="main-header">
          <div className="main-header-top">
            <div className="app-logo">전단지<span>P</span></div>
            <div className="header-actions">
              <button className="dark-toggle-btn" onClick={onDarkModeToggle}>
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button className="icon-btn notif-btn" onClick={onNotificationClick}>
                🔔
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>
              <button className="icon-btn" onClick={handleSearchOpen}>🔍</button>
            </div>
          </div>
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 검색 오버레이 */}
      {searchOpen && (
        <div className="search-overlay">
          <div className="search-bar">
            <span className="search-icon-left">🔍</span>
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              placeholder="매장명, 전단지명, 태그 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="search-close-btn" onClick={handleSearchClose}>✕</button>
          </div>
          {searchQuery && (
            <div className="search-result-label">
              "{searchQuery}" 검색 결과 {totalCount}개
            </div>
          )}
        </div>
      )}

      <div className="flyer-list" style={searchOpen ? { marginTop: '108px' } : {}}>
        {loading && (
          <div className="list-status">전단지를 불러오는 중...</div>
        )}

        {error && (
          <div className="list-status list-error">
            불러오기 실패: {error}
          </div>
        )}

        {!loading && !error && flyers.length === 0 && (
          <div className="list-status">
            {searchQuery ? `"${searchQuery}"에 해당하는 전단지가 없습니다.` : '해당 카테고리에 전단지가 없습니다.'}
          </div>
        )}

        {!loading && !error && flyers.map(flyer => {
          const expired = isExpired(flyer.validUntil)
          const maxDiscount = Math.max(
            ...flyer.items.map(item =>
              Math.round((1 - item.salePrice / item.originalPrice) * 100)
            )
          )
          return (
            <div
              key={flyer.id}
              className={`flyer-card${expired ? ' flyer-card-expired' : ''}`}
              onClick={() => onFlyerClick(flyer)}
            >
              <div
                className="flyer-card-header"
                style={{ background: flyer.storeBgColor }}
              >
                {flyer.imageUrl ? (
                  <img src={flyer.imageUrl} alt={flyer.storeName} className="flyer-card-thumb" />
                ) : (
                  <div
                    className="store-emoji-wrap"
                    style={{ background: flyer.storeColor + '22' }}
                  >
                    {flyer.storeEmoji}
                  </div>
                )}
                <div className="store-info">
                  <div className="store-name">{flyer.storeName}</div>
                  <div className="store-valid">📅 {flyer.validFrom} ~ {flyer.validUntil}</div>
                </div>
                {expired ? (
                  <div className="expired-badge">만료됨</div>
                ) : (
                  <div
                    className="category-badge"
                    style={{ background: getCategoryColor(flyer.category) }}
                  >
                    {flyer.category}
                  </div>
                )}
              </div>

              <div className="flyer-card-body">
                <div className="flyer-title">{flyer.title}</div>
                <div className="flyer-subtitle">{flyer.subtitle}</div>
                <div className="flyer-tags">
                  {flyer.tags.map(tag => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                  {!expired && (
                    <span className="tag" style={{ background: '#FFF0F0', color: '#FF4757' }}>
                      최대 {maxDiscount}% 할인
                    </span>
                  )}
                </div>

                <div className="flyer-card-footer">
                  <button
                    className={`card-bookmark-btn${bookmarkedIds.has(flyer.id) ? ' bookmarked' : ''}`}
                    onClick={e => { e.stopPropagation(); onBookmarkToggle?.(flyer) }}
                    title={bookmarkedIds.has(flyer.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    {bookmarkedIds.has(flyer.id) ? '★' : '☆'}
                  </button>
                  {!expired && (
                    <div className="point-badge">
                      🎰 긁어서 확인하기
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* 무한 스크롤 센티넬 */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {loadingMore && (
          <div className="list-status" style={{ padding: '16px' }}>
            더 불러오는 중...
          </div>
        )}

        {!loading && !loadingMore && !hasMore && flyers.length > 0 && (
          <div className="list-status" style={{ padding: '12px', fontSize: '12px' }}>
            총 {totalCount}개의 전단지를 모두 봤습니다 ✓
          </div>
        )}
      </div>
    </div>
  )
}
