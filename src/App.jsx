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
import { shareFlyer, getUserPoints, getUserShareHistory, getUserBookmarks, addBookmark, removeBookmark, getQuizHistory, getVisitHistory } from './api/index'

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
    if (token && userId) {
      const decoded = decodeURIComponent(nickname || '')
      localStorage.setItem('token', token)
      localStorage.setItem('userId', userId)
      localStorage.setItem('nickname', decoded)
      window.history.replaceState({}, '', '/')
      return { token, userId: Number(userId), nickname: decoded, role: 'user' }
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
  const [sharedFlyerIds, setSharedFlyerIds] = useState(new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkedFlyers, setBookmarkedFlyers] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScratchCard, setShowScratchCard] = useState(false)
  const [scratchFlyer, setScratchFlyer] = useState(null)
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

  const handleShare = async () => {
    if (!selectedFlyer || sharedFlyerIds.has(selectedFlyer.id)) return

    const shareUrl = 'https://jundanji-app.vercel.app'

    // 카카오톡 공유 우선 시도
    if (window.Kakao && window.Kakao.Share) {
      try {
        await window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: `${selectedFlyer.storeEmoji} ${selectedFlyer.storeName}`,
            description: `${selectedFlyer.title}\n${selectedFlyer.subtitle}`,
            imageUrl: selectedFlyer.imageUrl
              ? `${shareUrl}${selectedFlyer.imageUrl}`
              : `${shareUrl}/icon-512.png`,
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
          },
          buttons: [
            {
              title: '전단지 보러가기',
              link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
            },
          ],
        })
      } catch (e) {
        console.warn('카카오 공유 실패, 폴백:', e)
        if (navigator.share) {
          try {
            await navigator.share({
              title: `[전단지P] ${selectedFlyer.storeName} - ${selectedFlyer.title}`,
              text: selectedFlyer.subtitle,
              url: shareUrl,
            })
          } catch (e2) {
            if (e2.name === 'AbortError') return
          }
        } else {
          try {
            await navigator.clipboard.writeText(
              `[전단지P] ${selectedFlyer.storeName} ${selectedFlyer.title}\n${shareUrl}`
            )
          } catch {}
        }
      }
    } else {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `[전단지P] ${selectedFlyer.storeName} - ${selectedFlyer.title}`,
            text: selectedFlyer.subtitle,
            url: shareUrl,
          })
        } catch (e) {
          if (e.name === 'AbortError') return
        }
      } else {
        try {
          await navigator.clipboard.writeText(
            `[전단지P] ${selectedFlyer.storeName} ${selectedFlyer.title}\n${shareUrl}`
          )
        } catch {}
      }
    }

    const result = await shareFlyer(userId, selectedFlyer.id)

    if (!result.ok) {
      if (result.status === 409) {
        setSharedFlyerIds(prev => new Set([...prev, selectedFlyer.id]))
      }
      return
    }

    const { earnedPoints: earned, totalPoints } = result.data
    setEarnedPoints(earned)
    setShowPointAnim(true)
    setPoints(totalPoints)
    setSharedFlyerIds(prev => new Set([...prev, selectedFlyer.id]))
    setSelectedFlyer(prev => ({ ...prev, shareCount: prev.shareCount + 1 }))
    setShareHistory(prev => [{
      flyerId: selectedFlyer.id,
      storeName: selectedFlyer.storeName,
      storeEmoji: selectedFlyer.storeEmoji,
      storeColor: selectedFlyer.storeColor,
      title: selectedFlyer.title,
      points: earned,
      sharedAt: new Date().toLocaleString('ko-KR'),
    }, ...prev])
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
          onShare={handleShare}
          alreadyShared={sharedFlyerIds.has(selectedFlyer.id)}
          isBookmarked={bookmarkedIds.has(selectedFlyer.id)}
          onBookmarkToggle={() => handleBookmarkToggle(selectedFlyer)}
          userId={userId}
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
    </>
  )
}
