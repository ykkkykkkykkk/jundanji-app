import { useState } from 'react'
import QrScanner from '../components/QrScanner'
import { verifyQrCode } from '../api/index'

export default function QrScanPage({ userId, onPointsEarned, onBack, isLoggedIn, onLoginClick }) {
  const [scanning, setScanning] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleScan = async (qrCode) => {
    setScanning(false)
    setError(null)

    if (!isLoggedIn) {
      setError('로그인 후 QR 인증을 이용할 수 있습니다.')
      return
    }

    try {
      const res = await verifyQrCode(userId, qrCode)
      if (res.ok) {
        setResult(res.data)
        onPointsEarned(res.data.earnedPoints, res.data.totalPoints)
      } else {
        if (res.status === 409) {
          setError('이미 방문 인증을 완료한 매장입니다.')
        } else if (res.status === 404) {
          setError('유효하지 않은 QR 코드입니다.')
        } else {
          setError(res.message || '인증에 실패했습니다.')
        }
      }
    } catch (e) {
      setError(e.message || '인증 중 오류가 발생했습니다.')
    }
  }

  const handleRetry = () => {
    setScanning(true)
    setResult(null)
    setError(null)
  }

  return (
    <div className="page qr-scan-page">
      {scanning ? (
        <QrScanner onScan={handleScan} onClose={onBack} />
      ) : (
        <div className="qr-result-container">
          <button className="back-btn qr-result-back" onClick={onBack}>←</button>

          {result && (
            <div className="qr-result-success">
              <div className="qr-result-icon">🎉</div>
              <div className="qr-result-title">방문 인증 완료!</div>
              <div className="qr-result-store">{result.storeName}</div>
              <div className="qr-result-flyer">{result.flyerTitle}</div>
              <div className="qr-result-points">+{result.earnedPoints}P 적립!</div>
              <div className="qr-result-total">총 보유 포인트: {result.totalPoints.toLocaleString()}P</div>
              <button className="qr-result-btn" onClick={onBack}>돌아가기</button>
            </div>
          )}

          {error && (
            <div className="qr-result-error">
              <div className="qr-result-icon">😥</div>
              <div className="qr-result-title">{error}</div>
              {!isLoggedIn && onLoginClick && (
                <button className="qr-result-btn" onClick={onLoginClick}>로그인하기</button>
              )}
              <button className="qr-result-btn qr-retry-btn" onClick={handleRetry}>다시 스캔하기</button>
              <button className="qr-result-btn qr-back-btn" onClick={onBack}>돌아가기</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
