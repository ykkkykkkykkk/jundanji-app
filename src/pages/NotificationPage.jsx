import { useState, useEffect } from 'react'
import { getNotifications, readAllNotifications, getVapidPublicKey, savePushSubscription, deletePushSubscription } from '../api/index'
import { isPushSupported, subscribePush, unsubscribePush, getPushSubscription } from '../utils/push'

export default function NotificationPage({ onBack, onUnreadChange, showToast, token }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported] = useState(() => isPushSupported())

  const load = () => {
    setLoading(true)
    getNotifications()
      .then(res => {
        setNotifications(res.data ?? res)
        onUnreadChange?.(res.unread ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  // 현재 구독 상태 확인
  useEffect(() => {
    load()
    if (pushSupported) {
      getPushSubscription().then(sub => setPushSubscribed(!!sub))
    }
  }, [])

  const handleReadAll = async () => {
    await readAllNotifications(token)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    onUnreadChange?.(0)
  }

  const handlePushToggle = async () => {
    if (pushLoading) return
    setPushLoading(true)
    try {
      if (pushSubscribed) {
        // 구독 취소
        const sub = await getPushSubscription()
        if (sub) {
          await deletePushSubscription(sub.endpoint)
          await unsubscribePush()
        }
        setPushSubscribed(false)
      } else {
        // 구독 시작
        const vapidKey = await getVapidPublicKey()
        const sub = await subscribePush(vapidKey)
        await savePushSubscription(sub, token)
        setPushSubscribed(true)
      }
    } catch (e) {
      showToast?.(e.message || '알림 설정 중 오류가 발생했습니다.', 'error')
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="detail-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="detail-header-title">알림</div>
          {notifications.some(n => !n.is_read) && (
            <button className="notif-read-all-btn" onClick={handleReadAll}>모두 읽음</button>
          )}
        </div>
      </div>

      {/* 푸시 알림 구독 배너 */}
      {pushSupported && (
        <div className={`push-banner ${pushSubscribed ? 'push-banner-on' : ''}`}>
          <div className="push-banner-info">
            <span className="push-banner-icon">{pushSubscribed ? '🔔' : '🔕'}</span>
            <div>
              <div className="push-banner-title">
                {pushSubscribed ? '새 전단지 알림 켜짐' : '새 전단지 알림 받기'}
              </div>
              <div className="push-banner-desc">
                {pushSubscribed
                  ? '새 전단지가 올라오면 알려드립니다'
                  : '새 전단지가 등록되면 바로 알려드릴게요'}
              </div>
            </div>
          </div>
          <button
            className={`push-toggle-btn ${pushSubscribed ? 'push-toggle-on' : ''}`}
            onClick={handlePushToggle}
            disabled={pushLoading}
          >
            {pushLoading ? '...' : pushSubscribed ? '끄기' : '켜기'}
          </button>
        </div>
      )}

      <div className="notif-list">
        {loading && <div className="list-status">불러오는 중...</div>}

        {!loading && notifications.length === 0 && (
          <div className="list-status">
            <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🔔</span>
            아직 알림이 없습니다.
          </div>
        )}

        {!loading && notifications.map(n => (
          <div key={n.id} className={`notif-item${n.is_read ? ' notif-read' : ''}`}>
            <span className="notif-emoji">{n.emoji}</span>
            <div className="notif-content">
              <div className="notif-title">{n.title}</div>
              <div className="notif-body">{n.body}</div>
              <div className="notif-date">{n.created_at}</div>
            </div>
            {!n.is_read && <span className="notif-dot" />}
          </div>
        ))}
      </div>
    </div>
  )
}
