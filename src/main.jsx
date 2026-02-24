import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'

// 카카오 SDK 초기화
if (window.Kakao && !window.Kakao.isInitialized()) {
  window.Kakao.init('752e80edaa7baf7ef076ec8b6e4785dc')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
