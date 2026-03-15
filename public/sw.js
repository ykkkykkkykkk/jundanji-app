const CACHE_VERSION = '__BUILD_TIMESTAMP__'
const CACHE_NAME = 'jundanji-' + CACHE_VERSION
const OFFLINE_URL = '/'

// 캐싱할 정적 리소스
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// 설치: 정적 리소스 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// 요청 가로채기: Network First → Cache Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event

  // API 요청은 캐싱하지 않음
  if (request.url.includes('/api/')) return

  // POST 등 non-GET 요청은 캐싱하지 않음
  if (request.method !== 'GET') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공 응답을 캐시에 저장
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // 오프라인: 캐시에서 가져오기
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // HTML 요청이면 오프라인 페이지 반환
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL)
          }
        })
      })
  )
})

// 푸시 알림
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || '전단지P', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url || '/',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  )
})
