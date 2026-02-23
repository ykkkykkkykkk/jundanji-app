function formatPrice(price) {
  return price.toLocaleString() + '원'
}

function getDiscountRate(original, sale) {
  return Math.round((1 - sale / original) * 100)
}

function isExpired(validUntil) {
  const [y, m, d] = validUntil.split('.').map(Number)
  return new Date(y, m - 1, d + 1) <= new Date()
}

export default function DetailPage({ flyer, onBack, onShare, alreadyShared, isBookmarked, onBookmarkToggle }) {
  const expired = isExpired(flyer.validUntil)
  return (
    <div className="page">
      <div className="page-header">
        <div className="detail-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="detail-header-title">{flyer.storeName}</div>
          <button
            className={`detail-bookmark-btn${isBookmarked ? ' bookmarked' : ''}`}
            onClick={onBookmarkToggle}
            title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* 히어로 섹션 */}
      <div
        className="detail-hero"
        style={{ background: `linear-gradient(160deg, ${flyer.storeColor}18, ${flyer.storeBgColor})` }}
      >
        {flyer.imageUrl ? (
          <img src={flyer.imageUrl} alt={flyer.storeName} className="detail-hero-img" />
        ) : (
          <div className="detail-store-emoji">{flyer.storeEmoji}</div>
        )}
        <div className="detail-title">{flyer.title}</div>
        <div className="detail-valid">
          📅 {flyer.validFrom} ~ {flyer.validUntil}
        </div>
        <div className="detail-share-count">
          👥 {flyer.shareCount.toLocaleString()}명이 공유했어요
        </div>
      </div>

      {/* 태그 */}
      <div className="detail-tags-wrap">
        {flyer.tags.map(tag => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>

      {/* 상품 목록 */}
      <div className="items-section">
        <div className="items-section-title">🏷️ 이번 주 특가 상품</div>
        {flyer.items.map((item, i) => {
          const rate = getDiscountRate(item.originalPrice, item.salePrice)
          return (
            <div key={i} className="item-row">
              <div className="item-name">{item.name}</div>
              <div className="item-price-wrap">
                <span className="item-original-price">{formatPrice(item.originalPrice)}</span>
                <span className="item-sale-price">
                  {formatPrice(item.salePrice)}
                  <span className="item-discount-rate">{rate}%</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 공유 버튼 */}
      <div className="share-btn-wrap">
        <button
          className="share-btn"
          onClick={onShare}
          disabled={alreadyShared || expired}
          style={(alreadyShared || expired) ? { background: '#CCC', boxShadow: 'none' } : {}}
        >
          {expired ? (
            <>⛔ 이벤트가 종료된 전단지예요</>
          ) : alreadyShared ? (
            <>✅ 오늘 이미 공유했어요</>
          ) : (
            <>
              📤 공유하기
              <span className="share-btn-point">+{flyer.sharePoint}P 받기</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
