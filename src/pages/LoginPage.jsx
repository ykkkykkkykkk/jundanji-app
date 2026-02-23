import { useState } from 'react'
import { login, register } from '../api/index'

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login')  // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let data
      if (mode === 'login') {
        data = await login(email, password)
      } else {
        if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); setLoading(false); return }
        data = await register(email, password, nickname.trim())
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', String(data.userId))
      localStorage.setItem('nickname', data.nickname)
      onLogin({ token: data.token, userId: data.userId, nickname: data.nickname, points: data.points ?? 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">전단지<span>P</span></div>
        <p className="login-subtitle">전단지를 공유하고 포인트를 받으세요!</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >로그인</button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >회원가입</button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              className="login-input"
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
            />
          )}
          <input
            className="login-input"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="login-input"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit-btn" type="submit" disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <div className="social-divider">
          <span>또는 소셜 계정으로 시작</span>
        </div>

        <a className="social-login-btn social-kakao" href="/api/auth/kakao">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5C4.86 1.5 1.5 4.14 1.5 7.38c0 2.07 1.38 3.9 3.48 4.95l-.87 3.24c-.06.21.18.39.36.27L8.43 13.5c.18.03.36.03.57.03 4.14 0 7.5-2.64 7.5-5.88C16.5 4.14 13.14 1.5 9 1.5z" fill="#3A1D1D"/>
          </svg>
          카카오로 시작하기
        </a>

        <a className="social-login-btn social-google" href="/api/auth/google">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18L12.048 13.562c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          구글로 시작하기
        </a>

        <button className="login-guest-btn" onClick={() => onLogin(null)}>
          게스트로 둘러보기
        </button>
      </div>
    </div>
  )
}
