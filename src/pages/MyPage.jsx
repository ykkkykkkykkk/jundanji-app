import { useState, useEffect } from 'react'
import { updateNickname, createInquiry, getInquiryHistory } from '../api/index'

function isExpired(validUntil) {
  const [y, m, d] = validUntil.split('.').map(Number)
  return new Date(y, m - 1, d + 1) <= new Date()
}

const INQUIRY_STATUS = {
  pending: '답변 대기',
  answered: '답변 완료',
}

const INQUIRY_CATEGORIES = ['일반', '포인트', '기프티콘', '전단지', '계정', '기타']

function LockedOverlay({ onClick }) {
  return (
    <div className="mypage-locked-overlay" onClick={onClick}>
      <div className="mypage-locked-content">
        <span className="mypage-locked-icon">🔒</span>
        <span className="mypage-locked-text">로그인 후 이용 가능</span>
      </div>
    </div>
  )
}

export default function MyPage({ points, nickname, shareHistory, quizHistory = [], visitHistory = [], isLoggedIn, onLoginClick, onLogout, onNicknameChange, token, userId, onPointsChange, bookmarkedFlyers = [], onBookmarkToggle, onFlyerClick }) {
  const totalShare = shareHistory.length
  const [editingNick, setEditingNick] = useState(false)
  const [nickInput, setNickInput] = useState(nickname)
  const [nickLoading, setNickLoading] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(true)
  const [historyTab, setHistoryTab] = useState('share')  // 'share' | 'quiz' | 'visit'

  // 1:1 문의 관련 상태
  const [showInquiry, setShowInquiry] = useState(false)
  const [inquiryCategory, setInquiryCategory] = useState('일반')
  const [inquiryTitle, setInquiryTitle] = useState('')
  const [inquiryContent, setInquiryContent] = useState('')
  const [inquiryMsg, setInquiryMsg] = useState('')
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquiryHistory, setInquiryHistory] = useState([])
  const [showInquiryHistory, setShowInquiryHistory] = useState(false)
  const [expandedInquiry, setExpandedInquiry] = useState(null)

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

  // 문의 내역 로드
  useEffect(() => {
    if (showInquiryHistory && isLoggedIn) {
      getInquiryHistory(userId).then(setInquiryHistory).catch(() => {})
    }
  }, [showInquiryHistory, userId, isLoggedIn])

  const handleInquirySubmit = async () => {
    if (!inquiryTitle.trim()) { setInquiryMsg('제목을 입력해주세요.'); return }
    if (!inquiryContent.trim() || inquiryContent.trim().length < 5) { setInquiryMsg('내용을 5자 이상 입력해주세요.'); return }

    setInquiryLoading(true)
    setInquiryMsg('')
    try {
      const res = await createInquiry(userId, inquiryCategory, inquiryTitle, inquiryContent)
      setInquiryMsg(res.message || '문의가 접수되었습니다!')
      setInquiryTitle('')
      setInquiryContent('')
      setInquiryCategory('일반')
      getInquiryHistory(userId).then(setInquiryHistory).catch(() => {})
    } catch (e) {
      setInquiryMsg(e.message)
    } finally {
      setInquiryLoading(false)
    }
  }

  const quizPoints = quizHistory.reduce((sum, h) => sum + h.pointsEarned, 0)
  const visitPoints = visitHistory.reduce((sum, h) => sum + h.pointsEarned, 0)
  const sharePoints = shareHistory.reduce((sum, h) => sum + (h.points || 0), 0)

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
          {!isLoggedIn ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div className="profile-avatar" style={{ margin: '0 auto 12px', fontSize: 48 }}>🔒</div>
              <div className="profile-name" style={{ marginBottom: 4 }}>로그인이 필요합니다</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 16px' }}>로그인하면 포인트와 활동 내역을 확인할 수 있어요</p>
              <button className="login-nudge-btn" onClick={onLoginClick} style={{ background: '#FEE500', color: '#1A1A1A', border: 'none', borderRadius: 12, padding: '12px 32px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>카카오로 시작하기</button>
            </div>
          ) : (
            <>
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
                        <button className="nick-edit-btn" onClick={() => { setNickInput(nickname); setEditingNick(true) }}>✏️</button>
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
                  <span className="stat-value">{sharePoints.toLocaleString()}</span>
                  <span className="stat-label">공유 포인트</span>
                </div>
                <div className="stat-item" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                  <span className="stat-value">{quizPoints.toLocaleString()}</span>
                  <span className="stat-label">퀴즈 포인트</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{visitPoints.toLocaleString()}</span>
                  <span className="stat-label">방문 포인트</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 즐겨찾기 섹션 */}
      <div className={`gift-section${!isLoggedIn ? ' mypage-locked-section' : ''}`}>
        <div className="gift-header" onClick={() => isLoggedIn && setShowBookmarks(v => !v)}>
          <span className="gift-title">★ 즐겨찾기 <span className="bookmark-count-badge">{isLoggedIn ? bookmarkedFlyers.length : 0}</span></span>
          <span className="gift-arrow">{showBookmarks ? '▲' : '▼'}</span>
        </div>
        {!isLoggedIn && <LockedOverlay onClick={onLoginClick} />}
        {isLoggedIn && showBookmarks && (
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
                      <img src={flyer.imageUrl} alt={flyer.storeName} className="bookmark-item-thumb" loading="lazy" />
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

      {/* 1:1 문의 */}
      {isLoggedIn && (
        <div className="gift-section">
          <div className="gift-header" onClick={() => { setShowInquiry(v => !v); setInquiryMsg('') }}>
            <span className="gift-title">💬 1:1 문의</span>
            <span className="gift-arrow">{showInquiry ? '▲' : '▼'}</span>
          </div>
          {showInquiry && (
            <div className="inquiry-section">
              <div className="inquiry-form">
                <div className="inquiry-field">
                  <label className="inquiry-label">문의 유형</label>
                  <select
                    className="inquiry-input inquiry-select"
                    value={inquiryCategory}
                    onChange={e => setInquiryCategory(e.target.value)}
                  >
                    {INQUIRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="inquiry-field">
                  <label className="inquiry-label">제목</label>
                  <input
                    className="inquiry-input"
                    type="text"
                    placeholder="문의 제목을 입력하세요"
                    value={inquiryTitle}
                    onChange={e => setInquiryTitle(e.target.value)}
                  />
                </div>

                <div className="inquiry-field">
                  <label className="inquiry-label">내용</label>
                  <textarea
                    className="inquiry-input inquiry-textarea"
                    placeholder="문의 내용을 자세히 작성해주세요 (최소 5자)"
                    value={inquiryContent}
                    onChange={e => setInquiryContent(e.target.value)}
                    rows={4}
                  />
                </div>

                {inquiryMsg && (
                  <p className={`inquiry-msg ${inquiryMsg.includes('접수') ? 'inquiry-msg-ok' : ''}`}>
                    {inquiryMsg}
                  </p>
                )}

                <button
                  className="inquiry-submit-btn"
                  onClick={handleInquirySubmit}
                  disabled={inquiryLoading}
                >
                  {inquiryLoading ? '접수 중...' : '문의 접수'}
                </button>
              </div>

              <div
                className="inquiry-history-toggle"
                onClick={() => setShowInquiryHistory(v => !v)}
              >
                {showInquiryHistory ? '▲ 문의 내역 닫기' : '▼ 문의 내역 보기'}
              </div>

              {showInquiryHistory && (
                <div className="inquiry-history-list">
                  {inquiryHistory.length === 0 ? (
                    <div className="empty-history">
                      <span className="empty-icon">💬</span>
                      <p className="empty-text">문의 내역이 없습니다.</p>
                    </div>
                  ) : (
                    inquiryHistory.map(inq => (
                      <div
                        key={inq.id}
                        className="inquiry-item"
                        onClick={() => setExpandedInquiry(expandedInquiry === inq.id ? null : inq.id)}
                      >
                        <div className="inquiry-item-header">
                          <div className="inquiry-item-info">
                            <span className="inquiry-category-badge">{inq.category}</span>
                            <span className="inquiry-item-title">{inq.title}</span>
                          </div>
                          <div className={`inquiry-status inquiry-status-${inq.status === 'answered' ? 'answered' : 'pending'}`}>
                            {INQUIRY_STATUS[inq.status] || inq.status}
                          </div>
                        </div>
                        <div className="inquiry-item-date">{inq.created_at}</div>

                        {expandedInquiry === inq.id && (
                          <div className="inquiry-detail">
                            <div className="inquiry-detail-content">
                              <div className="inquiry-detail-label">문의 내용</div>
                              <div className="inquiry-detail-text">{inq.content}</div>
                            </div>
                            {inq.answer ? (
                              <div className="inquiry-answer">
                                <div className="inquiry-detail-label">관리자 답변</div>
                                <div className="inquiry-detail-text">{inq.answer}</div>
                                <div className="inquiry-item-date">{inq.answered_at}</div>
                              </div>
                            ) : (
                              <div className="inquiry-waiting">답변을 기다리고 있습니다...</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 내역 탭 */}
      <div className={`history-section${!isLoggedIn ? ' mypage-locked-section' : ''}`}>
        <div className="history-tabs">
          <button className={`history-tab ${historyTab === 'share' ? 'active' : ''}`} onClick={() => setHistoryTab('share')}>
            📤 공유 내역
          </button>
          <button className={`history-tab ${historyTab === 'quiz' ? 'active' : ''}`} onClick={() => setHistoryTab('quiz')}>
            ❓ 퀴즈 내역
          </button>
          <button className={`history-tab ${historyTab === 'visit' ? 'active' : ''}`} onClick={() => setHistoryTab('visit')}>
            📍 방문 내역
          </button>
        </div>
        {!isLoggedIn && <LockedOverlay onClick={onLoginClick} />}

        {isLoggedIn && (
          <>
            {/* 공유 내역 */}
            {historyTab === 'share' && (
              <>
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
              </>
            )}

            {/* 퀴즈 내역 */}
            {historyTab === 'quiz' && (
              <>
                {quizHistory.length === 0 ? (
                  <div className="empty-history">
                    <span className="empty-icon">❓</span>
                    <p className="empty-text">아직 퀴즈 참여 내역이 없어요.<br />전단지를 열고 퀴즈에 도전해보세요!</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {quizHistory.map((item, i) => (
                      <div key={i} className="history-card">
                        <div className="history-emoji" style={{ background: item.isCorrect ? '#E8F5E9' : '#FFEBEE' }}>
                          {item.isCorrect ? '⭕' : '❌'}
                        </div>
                        <div className="history-info">
                          <div className="history-store">{item.storeEmoji} {item.storeName}</div>
                          <div className="history-title-text">{item.question.length > 30 ? item.question.slice(0, 30) + '...' : item.question}</div>
                          <div className="history-date">{item.attemptedAt}</div>
                        </div>
                        <div className={`history-point ${item.isCorrect ? '' : 'history-point-zero'}`}>
                          {item.isCorrect ? `+${item.pointsEarned}P` : '0P'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 방문 내역 */}
            {historyTab === 'visit' && (
              <>
                {visitHistory.length === 0 ? (
                  <div className="empty-history">
                    <span className="empty-icon">📍</span>
                    <p className="empty-text">아직 방문 인증 내역이 없어요.<br />매장 QR코드를 스캔해 보너스 포인트를 받으세요!</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {visitHistory.map((item, i) => (
                      <div key={i} className="history-card">
                        <div className="history-emoji" style={{ background: '#E3F2FD' }}>
                          {item.storeEmoji || '📍'}
                        </div>
                        <div className="history-info">
                          <div className="history-store">{item.storeName}</div>
                          <div className="history-title-text">{item.flyerTitle}</div>
                          <div className="history-date">{item.verifiedAt}</div>
                        </div>
                        <div className="history-point">+{item.pointsEarned}P</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
