import { useState } from 'react'
import { updateNickname, usePoints } from '../api/index'

function isExpired(validUntil) {
  const [y, m, d] = validUntil.split('.').map(Number)
  return new Date(y, m - 1, d + 1) <= new Date()
}

const GIFT_OPTIONS = [
  { label: '아메리카노 교환권', points: 100, emoji: '☕' },
  { label: '편의점 1,000원 쿠폰', points: 200, emoji: '🏪' },
  { label: '치킨 할인 쿠폰', points: 500, emoji: '🍗' },
]

export default function MyPage({ points, nickname, shareHistory, isLoggedIn, onLoginClick, onLogout, onNicknameChange, token, userId, onPointsChange, bookmarkedFlyers = [], onBookmarkToggle, onFlyerClick }) {
  const totalShare = shareHistory.length
  const [editingNick, setEditingNick] = useState(false)
  const [nickInput, setNickInput] = useState(nickname)
  const [nickLoading, setNickLoading] = useState(false)
  const [showGift, setShowGift] = useState(false)
  const [giftMsg, setGiftMsg] = useState('')
  const [showBookmarks, setShowBookmarks] = useState(true)

  const handleGiftExchange = async (gift) => {
    if (points < gift.points) { setGiftMsg('포인트가 부족합니다.'); return }
    try {
      const res = await usePoints(userId, gift.points, `${gift.label} 교환`)
      onPointsChange(res.remainPoints)
      setGiftMsg(`${gift.emoji} ${gift.label} 교환 완료! (잔여 ${res.remainPoints}P)`)
    } catch (e) {
      setGiftMsg(e.message)
    }
  }

  const handleNickSave = async () => {
    if (!nickInput.trim() || nickInput === nickname) { setEditingNick(false); return }
    setNickLoading(true)
    try {
      await updateNickname(token, nickInput.trim())
      onNicknameChange(nickInput.trim())
      localStorage.setItem('nickname', nickInput.trim())
      setEditingNick(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setNickLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="mypage-header">
          <div className="mypage-title">마이페이지</div>
          {isLoggedIn ? (
            <button className="icon-btn logout-btn" onClick={onLogout}>로그아웃</button>
          ) : (
            <button className="icon-btn login-link-btn" onClick={onLoginClick}>로그인</button>
          )}
        </div>
      </div>

      {/* 프로필 카드 */}
      <div className="profile-section">
        <div className="profile-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="profile-info">
              <div className="profile-avatar">😊</div>
              <div>
                {editingNick ? (
                  <div className="nick-edit-row">
                    <input
                      className="nick-input"
                      value={nickInput}
                      onChange={e => setNickInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleNickSave()}
                      autoFocus
                    />
                    <button className="nick-save-btn" onClick={handleNickSave} disabled={nickLoading}>
                      {nickLoading ? '...' : '저장'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="profile-name">{nickname}님</div>
                    {isLoggedIn && (
                      <button className="nick-edit-btn" onClick={() => { setNickInput(nickname); setEditingNick(true) }}>✏️</button>
                    )}
                  </div>
                )}
                <span className="profile-badge">
                  {points >= 500 ? '🥇 골드 회원' : points >= 100 ? '🥈 실버 회원' : '🥉 브론즈 회원'}
                </span>
              </div>
            </div>
            <div className="point-display">
              <div className="point-display-label">보유 포인트</div>
              <div>
                <span className="point-display-amount">{points.toLocaleString()}</span>
                <span className="point-display-unit"> P</span>
              </div>
            </div>
          </div>

          <div className="point-stats">
            <div className="stat-item">
              <span className="stat-value">{totalShare}</span>
              <span className="stat-label">총 공유 횟수</span>
            </div>
            <div className="stat-item" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <span className="stat-value">{points.toLocaleString()}</span>
              <span className="stat-label">총 적립 포인트</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">0</span>
              <span className="stat-label">사용 포인트</span>
            </div>
          </div>
        </div>
      </div>

      {/* 포인트 교환 */}
      <div className="gift-section">
        <div className="gift-header" onClick={() => { setShowGift(v => !v); setGiftMsg('') }}>
          <span className="gift-title">🎁 포인트 교환</span>
          <span className="gift-arrow">{showGift ? '▲' : '▼'}</span>
        </div>
        {showGift && (
          <div className="gift-list">
            {GIFT_OPTIONS.map(g => (
              <div key={g.label} className="gift-item">
                <span className="gift-emoji">{g.emoji}</span>
                <div className="gift-info">
                  <div className="gift-name">{g.label}</div>
                  <div className="gift-cost">{g.points.toLocaleString()}P</div>
                </div>
                <button
                  className="gift-btn"
                  disabled={points < g.points}
                  onClick={() => handleGiftExchange(g)}
                >
                  교환
                </button>
              </div>
            ))}
            {giftMsg && <p className="gift-msg">{giftMsg}</p>}
          </div>
        )}
      </div>

      {/* 즐겨찾기 섹션 */}
      <div className="gift-section">
        <div className="gift-header" onClick={() => setShowBookmarks(v => !v)}>
          <span className="gift-title">★ 즐겨찾기 <span className="bookmark-count-badge">{bookmarkedFlyers.length}</span></span>
          <span className="gift-arrow">{showBookmarks ? '▲' : '▼'}</span>
        </div>
        {showBookmarks && (
          <div className="bookmark-list">
            {bookmarkedFlyers.length === 0 ? (
              <div className="empty-history">
                <span className="empty-icon">☆</span>
                <p className="empty-text">즐겨찾기한 전단지가 없어요.<br />전단지 카드의 ☆ 버튼으로 저장해보세요!</p>
              </div>
            ) : (
              bookmarkedFlyers.map(flyer => {
                const expired = isExpired(flyer.validUntil)
                return (
                  <div
                    key={flyer.id}
                    className={`bookmark-item${expired ? ' bookmark-item-expired' : ''}`}
                    onClick={() => onFlyerClick?.(flyer)}
                  >
                    {flyer.imageUrl ? (
                      <img src={flyer.imageUrl} alt={flyer.storeName} className="bookmark-item-thumb" />
                    ) : (
                      <div className="bookmark-item-emoji" style={{ background: flyer.storeColor + '22' }}>
                        {flyer.storeEmoji}
                      </div>
                    )}
                    <div className="bookmark-item-info">
                      <div className="bookmark-item-store">{flyer.storeName}</div>
                      <div className="bookmark-item-title">{flyer.title}</div>
                      <div className="bookmark-item-date">
                        {expired ? '⛔ 만료됨' : `📅 ~${flyer.validUntil}`}
                      </div>
                    </div>
                    <button
                      className="bookmark-remove-btn"
                      onClick={e => { e.stopPropagation(); onBookmarkToggle?.(flyer) }}
                    >★</button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* 비로그인 안내 */}
      {!isLoggedIn && (
        <div className="login-nudge">
          <p>로그인하면 포인트가 계정에 저장됩니다!</p>
          <button className="login-nudge-btn" onClick={onLoginClick}>로그인 / 회원가입</button>
        </div>
      )}

      {/* 공유 내역 */}
      <div className="history-section">
        <div className="history-title">공유 내역</div>

        {shareHistory.length === 0 ? (
          <div className="empty-history">
            <span className="empty-icon">📭</span>
            <p className="empty-text">아직 공유 내역이 없어요.<br />전단지를 공유하고 포인트를 받아보세요!</p>
          </div>
        ) : (
          <div className="history-list">
            {shareHistory.map((item, i) => (
              <div key={i} className="history-card">
                <div className="history-emoji" style={{ background: item.storeColor + '22' }}>
                  {item.storeEmoji}
                </div>
                <div className="history-info">
                  <div className="history-store">{item.storeName}</div>
                  <div className="history-title-text">{item.title}</div>
                  <div className="history-date">{item.sharedAt}</div>
                </div>
                <div className="history-point">+{item.points}P</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
