import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import MainPage from './pages/MainPage'
import BottomNav from './components/BottomNav'
import SplashScreen from './components/SplashScreen'
import { getUserPoints, getUserShareHistory, getUserBookmarks, addBookmark, removeBookmark, getQuizHistory, getVisitHistory, updateUserRole, getFlyerDetail } from './api/index'

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

const GUEST_USER_ID = 1  // 게스트 사용자

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
      window.history.replaceState({}, '', '/')
      return { token, userId: Number(userId), nickname: decoded, role }
    }
    // 에러 파라미터 처리
    if (params.get('error')) {
      const reason = params.get('reason') || params.get('error')
      setTimeout(() => alert('로그인 실패: ' + decodeURIComponent(reason)), 500)
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
  const scrollPosRef = useRef(0)
  const pendingFlyerChecked = useRef(false)

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

  // 다크모드 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // 유저 데이터 로드
  useEffect(() => {
    Promise.all([
      getUserPoints(userId).catch(() => ({ points: 0, nickname: '홍길동', role: 'user' })),
      getUserShareHistory(userId).catch(() => []),
      getUserBookmarks(userId).catch(() => []),
      getQuizHistory(userId).catch(() => []),
      getVisitHistory(userId).catch(() => []),
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
    // localStorage 완전 초기화 (darkMode만 보존)
    const savedDarkMode = localStorage.getItem('darkMode')
    localStorage.clear()
    if (savedDarkMode) localStorage.setItem('darkMode', savedDarkMode)
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
      await removeBookmark(userId, flyer.id).catch(() => {})
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(flyer.id); return s })
      setBookmarkedFlyers(prev => prev.filter(f => f.id !== flyer.id))
    } else {
      await addBookmark(userId, flyer.id).catch(() => {})
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

  const handleFlyerClick = (flyer) => {
    // 비로그인 + 이미 맛보기 사용한 경우 → 바로 로그인 유도
    if (!auth && localStorage.getItem('guest_scratched') === 'true') {
      localStorage.setItem('pendingFlyerId', String(flyer.id))
      setShowLogin(true)
      return
    }
    scrollPosRef.current = window.scrollY
    setScratchFlyer(flyer)
    setShowScratchCard(true)
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

  const handleQuizPoints = (earned, total) => {
    setEarnedPoints(earned)
    setShowPointAnim(true)
    setPoints(total)
    // 퀴즈 히스토리 갱신
    getQuizHistory(userId).then(setQuizHistory).catch(() => {})
  }

  const handleQrPointsEarned = (earned, total) => {
    setEarnedPoints(earned)
    setShowPointAnim(true)
    setPoints(total)
    // 방문 히스토리 갱신
    getVisitHistory(userId).then(setVisitHistory).catch(() => {})
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
          />
        )}

        {page === 'giftshop' && (
          <GiftShopPage
            points={points}
            userId={userId}
            isLoggedIn={!!auth}
            onLoginClick={() => setShowLogin(true)}
            onPointsChange={setPoints}
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
          />
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
            isLoggedIn={!!auth}
            onComplete={handleScratchComplete}
            onClose={handleScratchClose}
            onLoginClick={() => setShowLogin(true)}
          />
        )}

        {showPointAnim && (
          <PointAnimation points={earnedPoints} onClose={() => setShowPointAnim(false)} />
        )}
      </Suspense>

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
    </>
  )
}
