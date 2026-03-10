import { useState, useEffect } from 'react'
import { updateNickname, usePoints, requestWithdrawal, getWithdrawalHistory, createInquiry, getInquiryHistory } from '../api/index'

function isExpired(validUntil) {
  const [y, m, d] = validUntil.split('.').map(Number)
  return new Date(y, m - 1, d + 1) <= new Date()
}

const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'SC제일은행',
  '기업은행', '농협은행', '카카오뱅크', '토스뱅크', '케이뱅크',
  '우체국', '새마을금고', '수협은행', '대구은행', '부산은행',
  '광주은행', '전북은행', '경남은행', '제주은행',
]

const STATUS_LABELS = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거절됨',
}

const INQUIRY_STATUS = {
  pending: '답변 대기',
  answered: '답변 완료',
}

const INQUIRY_CATEGORIES = ['일반', '포인트', '출금', '전단지', '계정', '기타']

const GIFT_OPTIONS = [
  { label: '아메리카노 교환권', points: 100, emoji: '☕' },
  { label: '편의점 1,000원 쿠폰', points: 200, emoji: '🏪' },
  { label: '치킨 할인 쿠폰', points: 500, emoji: '🍗' },
]

export default function MyPage({ points, nickname, shareHistory, quizHistory = [], visitHistory = [], isLoggedIn, onLoginClick, onLogout, onNicknameChange, token, userId, onPointsChange, bookmarkedFlyers = [], onBookmarkToggle, onFlyerClick }) {
  const totalShare = shareHistory.length
  const [editingNick, setEditingNick] = useState(false)
  const [nickInput, setNickInput] = useState(nickname)
  const [nickLoading, setNickLoading] = useState(false)
  const [showGift, setShowGift] = useState(false)
  const [giftMsg, setGiftMsg] = useState('')
  const [showBookmarks, setShowBookmarks] = useState(true)
  const [historyTab, setHistoryTab] = useState('share')  // 'share' | 'quiz' | 'visit'

  // 출금 관련 상태
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBank, setWithdrawBank] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawHolder, setWithdrawHolder] = useState('')
  const [withdrawMsg, setWithdrawMsg] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawHistory, setWithdrawHistory] = useState([])
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false)

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

  // 출금 내역 로드
  useEffect(() => {
    if (showWithdrawHistory && isLoggedIn) {
      getWithdrawalHistory(userId).then(setWithdrawHistory).catch(() => {})
    }
  }, [showWithdrawHistory, userId, isLoggedIn])

  const handleWithdrawSubmit = async () => {
    const amount = Number(withdrawAmount)
    if (!amount || amount < 5000) { setWithdrawMsg('최소 출금액은 5,000P입니다.'); return }
    if (amount > points) { setWithdrawMsg('보유 포인트보다 많은 금액은 출금할 수 없습니다.'); return }
    if (!withdrawBank) { setWithdrawMsg('은행을 선택해주세요.'); return }
    if (!withdrawAccount.trim()) { setWithdrawMsg('계좌번호를 입력해주세요.'); return }
    if (!withdrawHolder.trim()) { setWithdrawMsg('예금주명을 입력해주세요.'); return }

    setWithdrawLoading(true)
    setWithdrawMsg('')
    try {
      const res = await requestWithdrawal(userId, amount, withdrawBank, withdrawAccount, withdrawHolder)
      setWithdrawMsg(res.message || '출금 신청이 완료되었습니다!')
      setWithdrawAmount('')
      setWithdrawAccount('')
      setWithdrawHolder('')
      setWithdrawBank('')
      // 출금 내역 갱신
      getWithdrawalHistory(userId).then(setWithdrawHistory).catch(() => {})
    } catch (e) {
      setWithdrawMsg(e.message)
    } finally {
      setWithdrawLoading(false)
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

      {/* 포인트 출금 */}
      {isLoggedIn && (
        <div className="gift-section">
          <div className="gift-header" onClick={() => { setShowWithdraw(v => !v); setWithdrawMsg('') }}>
            <span className="gift-title">💰 포인트 출금</span>
            <span className="gift-arrow">{showWithdraw ? '▲' : '▼'}</span>
          </div>
          {showWithdraw && (
            <div className="withdraw-section">
              <div className="withdraw-form">
                <div className="withdraw-field">
                  <label className="withdraw-label">출금 금액</label>
                  <div className="withdraw-amount-row">
                    <input
                      className="withdraw-input"
                      type="number"
                      placeholder="최소 5,000P"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      min={5000}
                      max={points}
                    />
                    <button
                      className="withdraw-all-btn"
                      onClick={() => setWithdrawAmount(String(points))}
                    >
                      전액
                    </button>
                  </div>
                  <div className="withdraw-hint">보유: {points.toLocaleString()}P / 최소 5,000P / 가입 후 7일 경과 필요</div>
                </div>

                <div className="withdraw-field">
                  <label className="withdraw-label">은행</label>
                  <select
                    className="withdraw-input withdraw-select"
                    value={withdrawBank}
                    onChange={e => setWithdrawBank(e.target.value)}
                  >
                    <option value="">은행 선택</option>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="withdraw-field">
                  <label className="withdraw-label">계좌번호</label>
                  <input
                    className="withdraw-input"
                    type="text"
                    placeholder="'-' 포함 입력"
                    value={withdrawAccount}
                    onChange={e => setWithdrawAccount(e.target.value)}
                  />
                </div>

                <div className="withdraw-field">
                  <label className="withdraw-label">예금주</label>
                  <input
                    className="withdraw-input"
                    type="text"
                    placeholder="예금주명 입력"
                    value={withdrawHolder}
                    onChange={e => setWithdrawHolder(e.target.value)}
                  />
                </div>

                {withdrawMsg && (
                  <p className={`withdraw-msg ${withdrawMsg.includes('완료') ? 'withdraw-msg-ok' : ''}`}>
                    {withdrawMsg}
                  </p>
                )}

                <button
                  className="withdraw-submit-btn"
                  onClick={handleWithdrawSubmit}
                  disabled={withdrawLoading}
                >
                  {withdrawLoading ? '신청 중...' : '출금 신청'}
                </button>
              </div>

              {/* 출금 내역 토글 */}
              <div
                className="withdraw-history-toggle"
                onClick={() => setShowWithdrawHistory(v => !v)}
              >
                {showWithdrawHistory ? '▲ 출금 내역 닫기' : '▼ 출금 내역 보기'}
              </div>

              {showWithdrawHistory && (
                <div className="withdraw-history-list">
                  {withdrawHistory.length === 0 ? (
                    <div className="empty-history">
                      <span className="empty-icon">💰</span>
                      <p className="empty-text">출금 내역이 없습니다.</p>
                    </div>
                  ) : (
                    withdrawHistory.map(w => (
                      <div key={w.id} className="withdraw-history-item">
                        <div className="withdraw-history-info">
                          <div className="withdraw-history-amount">{w.amount.toLocaleString()}P</div>
                          <div className="withdraw-history-bank">{w.bank_name} {w.account_number}</div>
                          <div className="withdraw-history-date">{w.created_at}</div>
                        </div>
                        <div className={`withdraw-status withdraw-status-${w.status}`}>
                          {STATUS_LABELS[w.status] || w.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <div className="withdraw-section">
              <div className="withdraw-form">
                <div className="withdraw-field">
                  <label className="withdraw-label">문의 유형</label>
                  <select
                    className="withdraw-input withdraw-select"
                    value={inquiryCategory}
                    onChange={e => setInquiryCategory(e.target.value)}
                  >
                    {INQUIRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="withdraw-field">
                  <label className="withdraw-label">제목</label>
                  <input
                    className="withdraw-input"
                    type="text"
                    placeholder="문의 제목을 입력하세요"
                    value={inquiryTitle}
                    onChange={e => setInquiryTitle(e.target.value)}
                  />
                </div>

                <div className="withdraw-field">
                  <label className="withdraw-label">내용</label>
                  <textarea
                    className="withdraw-input inquiry-textarea"
                    placeholder="문의 내용을 자세히 작성해주세요 (최소 5자)"
                    value={inquiryContent}
                    onChange={e => setInquiryContent(e.target.value)}
                    rows={4}
                  />
                </div>

                {inquiryMsg && (
                  <p className={`withdraw-msg ${inquiryMsg.includes('접수') ? 'withdraw-msg-ok' : ''}`}>
                    {inquiryMsg}
                  </p>
                )}

                <button
                  className="withdraw-submit-btn"
                  onClick={handleInquirySubmit}
                  disabled={inquiryLoading}
                >
                  {inquiryLoading ? '접수 중...' : '문의 접수'}
                </button>
              </div>

              <div
                className="withdraw-history-toggle"
                onClick={() => setShowInquiryHistory(v => !v)}
              >
                {showInquiryHistory ? '▲ 문의 내역 닫기' : '▼ 문의 내역 보기'}
              </div>

              {showInquiryHistory && (
                <div className="withdraw-history-list">
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
                          <div className={`withdraw-status withdraw-status-${inq.status === 'answered' ? 'approved' : 'pending'}`}>
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

      {/* 비로그인 안내 */}
      {!isLoggedIn && (
        <div className="login-nudge">
          <p>로그인하면 포인트가 계정에 저장됩니다!</p>
          <button className="login-nudge-btn" onClick={onLoginClick}>로그인 / 회원가입</button>
        </div>
      )}

      {/* 내역 탭 */}
      <div className="history-section">
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
      </div>
    </div>
  )
}
