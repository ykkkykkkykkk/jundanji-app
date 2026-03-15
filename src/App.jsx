import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import MainPage from './pages/MainPage'
import BottomNav from './components/BottomNav'
import SplashScreen from './components/SplashScreen'
import Toast from './components/Toast'
import { getUserPoints, getUserShareHistory, getUserBookmarks, addBookmark, removeBookmark, getQuizHistory, getVisitHistory, updateUserRole, getFlyerDetail, getPublicSettings } from './api/index'

// 코드 스플리팅: 초기 로딩에 불필요한 페이지/컴포넌트를 lazy 로드
const DetailPage = lazy(() => import('./pages/DetailPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const NotificationPage = lazy(() => import('./pages/NotificationPage'))
const QrScanPage = lazy(() => import('./pages/QrScanPage'))
const GiftShopPage = lazy(() => import('./pages/GiftShopPage'))
const PointAnimation = lazy(() => import('./components/PointAnimation'))
const ScratchCard = lazy(() => import('./components/ScratchCard'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const OnboardingTour = lazy(() => import('./components/OnboardingTour'))

const GUEST_USER_ID = 1  // 게스트 사용자

// PWA 설치 배너 컴포넌트
function InstallBanner() {
  const [show, setShow] = useState(false)
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    // 이미 설치됨 or 이미 닫음
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (sessionStorage.getItem('pwa-banner-dismissed')) return

    const handler = () => {
      setPrompt(window.__pwaInstallPrompt)
      setShow(true)
    }
    // 이미 저장된 프롬프트가 있으면 바로 표시
    if (window.__pwaInstallPrompt) handler()
    window.addEventListener('pwa-install-ready', handler)
    return () => window.removeEventListener('pwa-install-ready', handler)
  }, [])

  if (!show) return null

  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const result = await prompt.userChoice
    if (result.outcome === 'accepted') {
      setShow(false)
    }
    window.__pwaInstallPrompt = null
  }

  const handleDismiss = () => {
    setShow(false)
    sessionStorage.setItem('pwa-banner-dismissed', 'true')
  }

  return (
    <div style={{
      position: 'fixed', bottom: 72, left: 12, right: 12, zIndex: 900,
      background: '#FF6B00', borderRadius: 16, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 20px rgba(255,107,0,0.35)',
      animation: 'fadeInUp 0.4s ease',
    }}>
      <div style={{ fontSize: 28 }}>📲</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>홈 화면에 추가</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>앱처럼 빠르게 열어보세요!</div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '8px 16px', border: 'none', borderRadius: 10,
          background: '#fff', color: '#FF6B00', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >설치</button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          fontSize: 18, cursor: 'pointer', padding: '4px 2px', lineHeight: 1,
        }}
      >✕</button>
    </div>
  )
}

function loadDarkMode() {
  return localStorage.getItem('darkMode') === 'true'
}

function loadAuth() {
  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')
  const nickname = localStorage.getItem('nickname')
  const role = localStorage.getItem('role') || 'user'
  if (token && userId) return { token, userId: Number(userId), nickname, role }
  return null
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    // OAuth 리다이렉트 후 URL 파라미터 처리
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userId = params.get('userId')
    const nickname = params.get('nickname')
    const role = params.get('role') || 'user'
    const isNew = params.get('isNew') === 'true'
    if (token && userId) {
      const decoded = decodeURIComponent(nickname || '')
      localStorage.setItem('token', token)
      localStorage.setItem('userId', userId)
      localStorage.setItem('nickname', decoded)
      localStorage.setItem('role', role)
      if (isNew && !localStorage.getItem('roleSelected')) localStorage.setItem('needRoleSelection', 'true')
      localStorage.removeItem('guest_scratched')
      localStorage.removeItem('guest_scratch_count')
      window.history.replaceState({}, '', '/')
      return { token, userId: Number(userId), nickname: decoded, role }
    }
    // 에러 파라미터 처리
    if (params.get('error')) {
      const reason = params.get('reason') || params.get('error')
      setTimeout(() => setToast({ message: '로그인 실패: ' + decodeURIComponent(reason), type: 'error', visible: true }), 500)
      window.history.replaceState({}, '', '/')
    }
    return loadAuth()
  })
  const [darkMode, setDarkMode] = useState(() => loadDarkMode())
  const [showSplash, setShowSplash] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [page, setPage] = useState('main')
  const [selectedFlyer, setSelectedFlyer] = useState(null)
  const [points, setPoints] = useState(0)
  const [nickname, setNickname] = useState(auth?.nickname ?? '홍길동')
  const [shareHistory, setShareHistory] = useState([])
  const [quizHistory, setQuizHistory] = useState([])
  const [visitHistory, setVisitHistory] = useState([])
  const [showPointAnim, setShowPointAnim] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [sharedFlyerIds, setSharedFlyerIds] = useState(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkedFlyers, setBookmarkedFlyers] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScratchCard, setShowScratchCard] = useState(false)
  const [scratchFlyer, setScratchFlyer] = useState(null)
  const [showRoleSelection, setShowRoleSelection] = useState(() => {
    return localStorage.getItem('needRoleSelection') === 'true'
  })
  const [systemSettings, setSystemSettings] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false })
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('onboarding_done')
  })
  const scrollPosRef = useRef(0)
  const pendingFlyerChecked = useRef(false)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, visible: true })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }))
  }, [])

  const userId = auth ? auth.userId : GUEST_USER_ID
  const userRole = auth?.role || 'user'

  // OAuth 리다이렉트 후 pendingFlyer 처리
  useEffect(() => {
    if (auth && !pendingFlyerChecked.current) {
      pendingFlyerChecked.current = true
      const pendingId = localStorage.getItem('pendingFlyerId')
      if (pendingId) {
        localStorage.removeItem('pendingFlyerId')
        getFlyerDetail(pendingId)
          .then(flyer => {
            if (flyer) {
              setScratchFlyer(flyer)
              setShowScratchCard(true)
            }
          })
          .catch(() => {})
      }
    }
  }, [auth])

  // 서버 공개 설정 로드
  useEffect(() => {
    getPublicSettings()
      .then(data => setSystemSettings(data))
      .catch(() => {})
  }, [])

  // 다크모드 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // 유저 데이터 로드
  useEffect(() => {
    const token = auth?.token
    Promise.all([
      getUserPoints(userId).catch(() => ({ points: 0, nickname: '홍길동', role: 'user' })),
      token ? getUserShareHistory(token, userId).catch(() => []) : Promise.resolve([]),
      token ? getUserBookmarks(token, userId).catch(() => []) : Promise.resolve([]),
      token ? getQuizHistory(token, userId).catch(() => []) : Promise.resolve([]),
      token ? getVisitHistory(token, userId).catch(() => []) : Promise.resolve([]),
    ]).then(([pointData, historyData, bookmarkData, quizData, visitData]) => {
      setPoints(pointData.points)
      setNickname(auth?.nickname ?? pointData.nickname ?? '홍길동')
      if (pointData.role && auth) {
        const serverRole = pointData.role
        if (serverRole !== auth.role) {
          setAuth(prev => prev ? { ...prev, role: serverRole } : prev)
          localStorage.setItem('role', serverRole)
        }
      }
      setShareHistory(historyData)
      setSharedFlyerIds(new Set(historyData.map(h => h.flyerId)))
      setBookmarkedFlyers(bookmarkData)
      setBookmarkedIds(new Set(bookmarkData.map(f => f.id)))
      setQuizHistory(quizData)
      setVisitHistory(visitData)
    }).catch(err => console.error('유저 데이터 로드 실패:', err.message))
  }, [userId])

  const handleLogin = (data) => {
    if (data) {
      setAuth(data)
      setNickname(data.nickname)
      if (data.role) localStorage.setItem('role', data.role)
      localStorage.removeItem('guest_scratched')
      localStorage.removeItem('guest_scratch_count')
    }
    setShowLogin(false)
    // 로그인 후 대기 중이던 전단지로 이동
    const pendingId = localStorage.getItem('pendingFlyerId')
    if (pendingId && data) {
      localStorage.removeItem('pendingFlyerId')
      getFlyerDetail(pendingId)
        .then(flyer => {
          if (flyer) {
            setScratchFlyer(flyer)
            setShowScratchCard(true)
          }
        })
        .catch(() => {})
    }
  }

  const handleLogout = () => {
    // localStorage 완전 초기화 (darkMode, onboarding_done 보존)
    const savedDarkMode = localStorage.getItem('darkMode')
    const savedOnboarding = localStorage.getItem('onboarding_done')
    localStorage.clear()
    if (savedDarkMode) localStorage.setItem('darkMode', savedDarkMode)
    if (savedOnboarding) localStorage.setItem('onboarding_done', savedOnboarding)
    // sessionStorage 초기화
    sessionStorage.clear()
    // 유저 상태 초기화
    setAuth(null)
    setNickname('홍길동')
    setPoints(0)
    setShareHistory([])
    setQuizHistory([])
    setVisitHistory([])
    setSharedFlyerIds(new Set())
    setBookmarkedIds(new Set())
    setBookmarkedFlyers([])
    setPage('main')
  }

  const handleBookmarkToggle = async (flyer) => {
    const isMarked = bookmarkedIds.has(flyer.id)
    if (isMarked) {
      await removeBookmark(auth?.token, flyer.id).catch(() => {})
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(flyer.id); return s })
      setBookmarkedFlyers(prev => prev.filter(f => f.id !== flyer.id))
    } else {
      await addBookmark(auth?.token, flyer.id).catch(() => {})
      setBookmarkedIds(prev => new Set([...prev, flyer.id]))
      setBookmarkedFlyers(prev => [{ ...flyer }, ...prev])
    }
  }

  const handleRoleSelect = (selectedRole) => {
    const newAuth = { ...auth, role: selectedRole }
    setAuth(newAuth)
    localStorage.setItem('role', selectedRole)
    localStorage.setItem('roleSelected', 'true')
    localStorage.removeItem('needRoleSelection')
    setShowRoleSelection(false)
    updateUserRole(auth.token, selectedRole).catch(() => {})
  }

  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (showScratchCard) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showScratchCard])

  // 비로그인 2회차: 긁기 없이 로그인 유도 모달
  const [showGuestBlock, setShowGuestBlock] = useState(false)
  const [guestBlockFlyer, setGuestBlockFlyer] = useState(null)

  const guestScratchLimit = systemSettings
    ? Number(systemSettings.guest_scratch_limit) || 1
    : 1

  const handleFlyerClick = (flyer) => {
    // 비로그인 + 게스트 긁기 횟수 초과 → 로그인 유도 모달
    if (!auth) {
      const count = Number(localStorage.getItem('guest_scratch_count') || '0')
      if (count >= guestScratchLimit) {
        setGuestBlockFlyer(flyer)
        setShowGuestBlock(true)
        return
      }
    }
    scrollPosRef.current = window.scrollY
    setScratchFlyer(flyer)
    setShowScratchCard(true)
  }

  const handleGuestBlockLogin = () => {
    if (guestBlockFlyer) {
      localStorage.setItem('pendingFlyerId', String(guestBlockFlyer.id))
    }
    setShowGuestBlock(false)
    setGuestBlockFlyer(null)
    setShowLogin(true)
  }

  const handleGuestBlockDismiss = () => {
    setShowGuestBlock(false)
    setGuestBlockFlyer(null)
  }

  const [lastScratchToken, setLastScratchToken] = useState(null)

  const handleScratchComplete = (flyer, scratchToken) => {
    setShowScratchCard(false)
    setScratchFlyer(null)
    setSelectedFlyer(flyer)
    setLastScratchToken(scratchToken || null)
    setPage('detail')
  }

  const handleScratchClose = () => {
    setShowScratchCard(false)
    setScratchFlyer(null)
  }

  // 게스트 긁기 완료 → confetti + 로그인 유도 모달
  const [showGuestReveal, setShowGuestReveal] = useState(false)
  const [guestRevealFlyer, setGuestRevealFlyer] = useState(null)

  const handleGuestReveal = useCallback((flyer) => {
    // 게스트 긁기 완료 → count 증가
    const count = Number(localStorage.getItem('guest_scratch_count') || '0')
    localStorage.setItem('guest_scratch_count', String(count + 1))
    // 하위 호환: 기존 guest_scratched flag도 유지
    localStorage.setItem('guest_scratched', 'true')
    setShowScratchCard(false)
    setScratchFlyer(null)
    setGuestRevealFlyer(flyer)
    requestAnimationFrame(() => {
      setShowGuestReveal(true)
    })
  }, [])

  const handleGuestRevealLogin = () => {
    if (guestRevealFlyer) {
      localStorage.setItem('pendingFlyerId', String(guestRevealFlyer.id))
    }
    setShowGuestReveal(false)
    setGuestRevealFlyer(null)
    setShowLogin(true)
  }

  const handleGuestRevealDismiss = () => {
    setShowGuestReveal(false)
    setGuestRevealFlyer(null)
  }

  const handleQuizPoints = (earned, total) => {
    setEarnedPoints(earned)
    setShowPointAnim(true)
    setPoints(total)
    // 퀴즈 히스토리 갱신
    if (auth?.token) getQuizHistory(auth.token, userId).then(setQuizHistory).catch(() => {})
  }

  const handleQrPointsEarned = (earned, total) => {
    setEarnedPoints(earned)
    setShowPointAnim(true)
    setPoints(total)
    // 방문 히스토리 갱신
    if (auth?.token) getVisitHistory(auth.token, userId).then(setVisitHistory).catch(() => {})
  }

  const handleNavigate = (target) => {
    setPage(target)
    setSelectedFlyer(null)
  }

  const showBottomNav = ['main', 'mypage', 'admin', 'scan', 'giftshop'].includes(page)

  const handleSplashFinish = useCallback(() => setShowSplash(false), [])
  const lazyFallback = <div className="lazy-loading">로딩 중...</div>

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  if (showOnboarding) {
    return (
      <Suspense fallback={lazyFallback}>
        <OnboardingTour onComplete={() => setShowOnboarding(false)} />
      </Suspense>
    )
  }

  if (showLogin) {
    return <Suspense fallback={lazyFallback}><LoginPage onLogin={handleLogin} /></Suspense>
  }

  return (
    <>
      {page === 'main' && (
        <MainPage
          onFlyerClick={handleFlyerClick}
          onNotificationClick={() => setPage('notifications')}
          unreadCount={unreadCount}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode(prev => !prev)}
          bookmarkedIds={bookmarkedIds}
          onBookmarkToggle={handleBookmarkToggle}
          userRole={userRole}
          isLoggedIn={!!auth}
        />
      )}

      <Suspense fallback={lazyFallback}>
        {page === 'detail' && selectedFlyer && (
          <DetailPage
            flyer={selectedFlyer}
            onBack={() => {
              setPage('main')
              setLastScratchToken(null)
              requestAnimationFrame(() => window.scrollTo(0, scrollPosRef.current))
            }}
            isBookmarked={bookmarkedIds.has(selectedFlyer.id)}
            onBookmarkToggle={() => handleBookmarkToggle(selectedFlyer)}
            userId={userId}
            userRole={userRole}
            onQuizPoints={handleQuizPoints}
            scratchToken={lastScratchToken}
            token={auth?.token}
            showToast={showToast}
          />
        )}

        {page === 'admin' && (
          <AdminPage
            onBack={() => setPage('main')}
            token={auth?.token}
            userId={userId}
          />
        )}

        {page === 'notifications' && (
          <NotificationPage
            onBack={() => setPage('main')}
            onUnreadChange={setUnreadCount}
            showToast={showToast}
          />
        )}

        {page === 'scan' && (
          <QrScanPage
            userId={userId}
            userRole={userRole}
            isLoggedIn={!!auth}
            onLoginClick={() => setShowLogin(true)}
            onPointsEarned={handleQrPointsEarned}
            onBack={() => setPage('main')}
            token={auth?.token}
            showToast={showToast}
          />
        )}

        {page === 'giftshop' && (
          <GiftShopPage
            points={points}
            userId={userId}
            isLoggedIn={!!auth}
            onLoginClick={() => setShowLogin(true)}
            onPointsChange={setPoints}
            token={auth?.token}
            showToast={showToast}
          />
        )}

        {page === 'mypage' && (
          <MyPage
            points={points}
            nickname={nickname}
            shareHistory={shareHistory}
            quizHistory={quizHistory}
            visitHistory={visitHistory}
            isLoggedIn={!!auth}
            onLoginClick={() => setShowLogin(true)}
            onLogout={handleLogout}
            onNicknameChange={setNickname}
            onPointsChange={setPoints}
            token={auth?.token}
            userId={userId}
            bookmarkedFlyers={bookmarkedFlyers}
            onBookmarkToggle={handleBookmarkToggle}
            onFlyerClick={handleFlyerClick}
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {page === 'privacy' && (
          <PrivacyPage onBack={() => setPage('mypage')} />
        )}

        {page === 'terms' && (
          <TermsPage onBack={() => setPage('mypage')} />
        )}
      </Suspense>

      {showBottomNav && (
        <BottomNav
          currentPage={page}
          onNavigate={handleNavigate}
          isLoggedIn={!!auth}
          userRole={userRole}
        />
      )}

      <Suspense fallback={null}>
        {showScratchCard && scratchFlyer && (
          <ScratchCard
            flyer={scratchFlyer}
            userId={userId}
            token={auth?.token}
            isLoggedIn={!!auth}
            onComplete={handleScratchComplete}
            onClose={handleScratchClose}
            onGuestReveal={handleGuestReveal}
            threshold={
              !!auth
                ? Number(systemSettings?.scratch_threshold_login) || 0.80
                : Number(systemSettings?.scratch_threshold_guest) || 0.80
            }
          />
        )}

        {showPointAnim && (
          <PointAnimation points={earnedPoints} onClose={() => setShowPointAnim(false)} />
        )}
      </Suspense>

      {showGuestReveal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="confetti-container">
            {Array.from({ length: 40 }, (_, i) => {
              const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9FF3', '#F368E0', '#FF9F43']
              return (
                <div
                  key={i}
                  className={`confetti-particle confetti-type-${i % 3}`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.8}s`,
                    animationDuration: `${1.5 + Math.random() * 1.5}s`,
                    width: `${6 + Math.random() * 8}px`,
                    height: `${6 + Math.random() * 8}px`,
                    backgroundColor: colors[i % colors.length],
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              )
            })}
          </div>
          <div style={{
            background: '#fff', borderRadius: '24px', padding: '36px 28px 28px',
            textAlign: 'center', width: '300px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 10000, position: 'relative',
          }}>
            <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>당첨됐어요!</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#666', marginBottom: '28px', lineHeight: 1.5 }}>
              로그인하면 포인트가 실제로 적립돼요!
            </div>
            <button
              onClick={handleGuestRevealLogin}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '15px', border: 'none', borderRadius: '12px',
                background: '#FEE500', color: '#3A1D1D',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5C4.86 1.5 1.5 4.14 1.5 7.38c0 2.07 1.38 3.9 3.48 4.95l-.87 3.24c-.06.21.18.39.36.27L8.43 13.5c.18.03.36.03.57.03 4.14 0 7.5-2.64 7.5-5.88C16.5 4.14 13.14 1.5 9 1.5z" fill="#3A1D1D"/>
              </svg>
              카카오로 시작하기
            </button>
            <div
              onClick={handleGuestRevealDismiss}
              style={{ marginTop: '16px', fontSize: '13px', fontWeight: 500, color: '#999', cursor: 'pointer', padding: '8px' }}
            >
              다음에 하기
            </div>
          </div>
        </div>
      )}

      {showGuestBlock && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={handleGuestBlockDismiss}
        >
          <div
            style={{
              background: '#fff', borderRadius: '24px', padding: '36px 28px 28px',
              textAlign: 'center', width: '300px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px' }}>🔒</div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>로그인이 필요해요</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#666', marginBottom: '28px', lineHeight: 1.5 }}>
              로그인하면 전단지를 보고<br />포인트도 적립할 수 있어요!
            </div>
            <button
              onClick={handleGuestBlockLogin}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '15px', border: 'none', borderRadius: '12px',
                background: '#FEE500', color: '#3A1D1D',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1.5C4.86 1.5 1.5 4.14 1.5 7.38c0 2.07 1.38 3.9 3.48 4.95l-.87 3.24c-.06.21.18.39.36.27L8.43 13.5c.18.03.36.03.57.03 4.14 0 7.5-2.64 7.5-5.88C16.5 4.14 13.14 1.5 9 1.5z" fill="#3A1D1D"/>
              </svg>
              카카오로 시작하기
            </button>
            <div
              onClick={handleGuestBlockDismiss}
              style={{ marginTop: '16px', fontSize: '13px', fontWeight: 500, color: '#999', cursor: 'pointer', padding: '8px' }}
            >
              다음에 하기
            </div>
          </div>
        </div>
      )}

      <InstallBanner />

      {showRoleSelection && (
        <div className="role-selection-overlay">
          <div className="role-selection-modal">
            <h2 className="role-selection-title">회원 유형을 선택하세요</h2>
            <p className="role-selection-desc">처음 가입하셨군요! 회원 유형을 선택해주세요.</p>
            <div className="role-selector" style={{ padding: '0 20px' }}>
              <button className="role-btn" onClick={() => handleRoleSelect('user')}>
                👤 일반 회원
              </button>
              <button className="role-btn" onClick={() => handleRoleSelect('business')}>
                🏢 사업자 회원
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
    </>
  )
}
