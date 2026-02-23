// Base64 URL → Uint8Array (VAPID 공개키 변환)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

// 현재 구독 상태 확인
export async function getPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

// 푸시 구독 시작 (권한 요청 + subscribe)
export async function subscribePush(vapidPublicKey) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('알림 권한이 거부되었습니다.')

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
}

// 구독 취소
export async function unsubscribePush() {
  const sub = await getPushSubscription()
  if (sub) await sub.unsubscribe()
}

// 지원 여부 확인
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
