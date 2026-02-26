import { useState, useEffect, useRef, useCallback } from 'react'
import MainPage from './pages/MainPage'
import DetailPage from './pages/DetailPage'
import MyPage from './pages/MyPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import NotificationPage from './pages/NotificationPage'
import QrScanPage from './pages/QrScanPage'
import BottomNav from './components/BottomNav'
import PointAnimation from './components/PointAnimation'
import SplashScreen from './components/SplashScreen'
import ScratchCard from './components/ScratchCard'
import { getUserPoints, getUserShareHistory, getUserBookmarks, addBookmark, removeBookmark, getQuizHistory, getVisitHistory, updateUserRole } from './api/index'

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
      if (isNew) localStorage.setItem('needRoleSelection', 'true')
      window.history.replaceState({}, '', '/')
      return { token, userId: Number(userId), nickname: decoded, role }
    }
    // 에러 파라미터 처리
    if (params.get('error')) window.history.replaceState({}, '', '/')
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
  const [sharedFlyerIds] = useState(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkedFlyers, setBookmarkedFlyers] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScratchCard, setShowScratchCard] = useState(false)
  const [scratchFlyer, setScratchFlyer] = useState(null)
  const [showRoleSelection, setShowRoleSelection] = useState(() => {
    return localStorage.getItem('needRoleSelection') === 'true'
  })
  const scrollPosRef = useRef(0)

  const userId = auth ? auth.userId : GUEST_USER_ID
  const userRole = auth?.role || 'user'

  // 다크모드 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // 유저 데이터 로드
  useEffect(() => {
    Promise.all([
      getUserPoints(userId),
      getUserShareHistory(userId),
      getUserBookmarks(userId),
      getQuizHistory(userId).catch(() => []),
      getVisitHistory(userId).catch(() => []),
    ]).then(([pointData, historyData, bookmarkData, quizData, visitData]) => {
      setPoints(pointData.points)
      setNickname(auth?.nickname ?? pointData.nickname ?? '홍길동')
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
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('nickname')
    localStorage.removeItem('role')
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

  const handleRoleSelect = async (selectedRole) => {
    try {
      await updateUserRole(auth.token, selectedRole)
      const newAuth = { ...auth, role: selectedRole }
      setAuth(newAuth)
      localStorage.setItem('role', selectedRole)
      localStorage.removeItem('needRoleSelection')
      setShowRoleSelection(false)
    } catch (err) {
      console.error('역할 설정 실패:', err.message)
    }
  }

  const handleFlyerClick = (flyer) => {
    scrollPosRef.current = window.scrollY
    setScratchFlyer(flyer)
    setShowScratchCard(true)
  }

  const handleScratchComplete = (flyer) => {
    setShowScratchCard(false)
    setSelectedFlyer(flyer)
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

  const showBottomNav = ['main', 'mypage', 'admin', 'scan'].includes(page)

  const handleSplashFinish = useCallback(() => setShowSplash(false), [])

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />
  }

  if (showLogin) {
    return <LoginPage onLogin={handleLogin} />
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

      {page === 'detail' && selectedFlyer && (
        <DetailPage
          flyer={selectedFlyer}
          onBack={() => {
            setPage('main')
            requestAnimationFrame(() => window.scrollTo(0, scrollPosRef.current))
          }}
          isBookmarked={bookmarkedIds.has(selectedFlyer.id)}
          onBookmarkToggle={() => handleBookmarkToggle(selectedFlyer)}
          userId={userId}
          userRole={userRole}
          onQuizPoints={handleQuizPoints}
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

      {showBottomNav && (
        <BottomNav
          currentPage={page}
          onNavigate={handleNavigate}
          isLoggedIn={!!auth}
          userRole={userRole}
        />
      )}

      {showScratchCard && scratchFlyer && (
        <ScratchCard
          flyer={scratchFlyer}
          onComplete={handleScratchComplete}
          onClose={handleScratchClose}
        />
      )}

      {showPointAnim && (
        <PointAnimation points={earnedPoints} onClose={() => setShowPointAnim(false)} />
      )}

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
