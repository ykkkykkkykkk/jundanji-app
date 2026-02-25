const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api'

async function fetchJSON(url, options) {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!data.ok) {
    const err = new Error(data.message || '서버 오류')
    err.status = res.status
    throw err
  }
  return data.data
}

// 전단지 목록 조회 (카테고리 필터 + 검색 + 페이지네이션)
// 반환: { data: [...], pagination: { page, limit, total, hasMore } }
export async function getFlyers(category, q, page = 1, limit = 10) {
  const params = new URLSearchParams()
  if (category && category !== '전체') params.set('category', category)
  if (q && q.trim()) params.set('q', q.trim())
  params.set('page', page)
  params.set('limit', limit)
  const res = await fetch(`${BASE}/flyers?${params.toString()}`)
  const json = await res.json()
  if (!json.ok) {
    const err = new Error(json.message || '서버 오류')
    err.status = res.status
    throw err
  }
  return { data: json.data, pagination: json.pagination }
}

// 전단지 상세 조회
export async function getFlyerDetail(id) {
  return fetchJSON(`${BASE}/flyers/${id}`)
}

// 공유 처리 (포인트 적립)
// 중복 공유 시 { ok: false, status: 409 } 반환 (throw 하지 않음)
export async function shareFlyer(userId, flyerId) {
  const res = await fetch(`${BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, flyerId }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data: data.data, message: data.message }
}

// 유저 포인트 조회
export async function getUserPoints(userId) {
  return fetchJSON(`${BASE}/users/${userId}/points`)
}

// 유저 공유 내역 조회
export async function getUserShareHistory(userId) {
  return fetchJSON(`${BASE}/users/${userId}/share-history`)
}

// 회원가입
export async function register(email, password, nickname, role) {
  return fetchJSON(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nickname, role }),
  })
}

// 로그인
export async function login(email, password) {
  return fetchJSON(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

// 내 정보 조회
export async function getMe(token) {
  return fetchJSON(`${BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// 전단지 등록 (imageFile 옵션)
export async function createFlyer(data, imageFile) {
  const fd = new FormData()
  fd.append('storeName', data.storeName)
  fd.append('storeEmoji', data.storeEmoji || '🏪')
  fd.append('storeColor', data.storeColor || '#FF4757')
  fd.append('storeBgColor', data.storeBgColor || '#FFF5F5')
  fd.append('category', data.category)
  fd.append('title', data.title)
  fd.append('subtitle', data.subtitle || '')
  fd.append('validFrom', data.validFrom)
  fd.append('validUntil', data.validUntil)
  fd.append('sharePoint', String(data.sharePoint || 10))
  fd.append('qrPoint', String(data.qrPoint || 0))
  if (data.ownerId) fd.append('ownerId', String(data.ownerId))
  fd.append('tags', JSON.stringify(data.tags || []))
  fd.append('items', JSON.stringify(data.items || []))
  if (imageFile) fd.append('image', imageFile)
  return fetchJSON(`${BASE}/flyers`, { method: 'POST', body: fd })
}

// 전단지 수정 (imageFile 옵션)
export async function updateFlyer(id, data, imageFile) {
  const fd = new FormData()
  fd.append('storeName', data.storeName)
  fd.append('storeEmoji', data.storeEmoji || '🏪')
  fd.append('storeColor', data.storeColor || '#FF4757')
  fd.append('storeBgColor', data.storeBgColor || '#FFF5F5')
  fd.append('category', data.category)
  fd.append('title', data.title)
  fd.append('subtitle', data.subtitle || '')
  fd.append('validFrom', data.validFrom)
  fd.append('validUntil', data.validUntil)
  fd.append('sharePoint', String(data.sharePoint || 10))
  fd.append('qrPoint', String(data.qrPoint || 0))
  fd.append('tags', JSON.stringify(data.tags || []))
  fd.append('items', JSON.stringify(data.items || []))
  if (imageFile) fd.append('image', imageFile)
  return fetchJSON(`${BASE}/flyers/${id}`, { method: 'PUT', body: fd })
}

// 전단지 삭제
export async function deleteFlyer(id) {
  return fetchJSON(`${BASE}/flyers/${id}`, { method: 'DELETE' })
}

// 포인트 사용
export async function usePoints(userId, amount, description) {
  return fetchJSON(`${BASE}/points/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, description }),
  })
}

// 포인트 거래 내역
export async function getPointHistory(userId) {
  return fetchJSON(`${BASE}/users/${userId}/point-history`)
}

// 알림 목록
export async function getNotifications() {
  return fetchJSON(`${BASE}/notifications`)
}

// 전체 읽음 처리
export async function readAllNotifications() {
  return fetchJSON(`${BASE}/notifications/read-all`, { method: 'PATCH' })
}

// VAPID 공개키 조회
export async function getVapidPublicKey() {
  return fetchJSON(`${BASE}/push/vapid-public-key`)
}

// 푸시 구독 저장
export async function savePushSubscription(subscription) {
  const { endpoint, keys } = subscription.toJSON()
  return fetchJSON(`${BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, keys }),
  })
}

// 푸시 구독 취소
export async function deletePushSubscription(endpoint) {
  return fetchJSON(`${BASE}/push/unsubscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })
}

// 즐겨찾기 목록 조회
export async function getUserBookmarks(userId) {
  return fetchJSON(`${BASE}/users/${userId}/bookmarks`)
}

// 즐겨찾기 추가
export async function addBookmark(userId, flyerId) {
  return fetchJSON(`${BASE}/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, flyerId }),
  })
}

// 즐겨찾기 취소
export async function removeBookmark(userId, flyerId) {
  return fetchJSON(`${BASE}/bookmarks/${flyerId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
}

// 닉네임 변경
export async function updateNickname(token, nickname) {
  return fetchJSON(`${BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nickname }),
  })
}

// ======== 퀴즈 API ========

// 퀴즈 등록 (사업자)
export async function registerQuizzes(flyerId, quizzes, token) {
  return fetchJSON(`${BASE}/flyers/${flyerId}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quizzes }),
  })
}

// 퀴즈 목록 조회 (사업자용)
export async function getQuizzesByFlyer(flyerId) {
  return fetchJSON(`${BASE}/flyers/${flyerId}/quizzes`)
}

// 랜덤 퀴즈 1문제 출제
export async function getRandomQuiz(flyerId, userId) {
  const res = await fetch(`${BASE}/flyers/${flyerId}/quiz?userId=${userId}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.message)
  return { data: json.data, attempted: json.attempted }
}

// 퀴즈 정답 제출
export async function submitQuizAnswer(userId, flyerId, quizId, selectedIdx) {
  return fetchJSON(`${BASE}/quiz/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, flyerId, quizId, selectedIdx }),
  })
}

// 퀴즈 응시 내역
export async function getQuizHistory(userId) {
  return fetchJSON(`${BASE}/users/${userId}/quiz-history`)
}

// ======== QR API ========

// QR 코드 생성 (사업자)
export async function generateQrCode(flyerId, token) {
  return fetchJSON(`${BASE}/flyers/${flyerId}/qr/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// QR 코드 데이터 조회
export async function getQrCode(flyerId) {
  return fetchJSON(`${BASE}/flyers/${flyerId}/qr`)
}

// QR 스캔 인증
export async function verifyQrCode(userId, qrCode) {
  const res = await fetch(`${BASE}/qr/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, qrCode }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data: data.data, message: data.message }
}

// 방문 인증 내역
export async function getVisitHistory(userId) {
  return fetchJSON(`${BASE}/users/${userId}/visit-history`)
}

// ======== 사업자 API ========

// 사업자 대시보드 통계
export async function getBusinessStats(token) {
  return fetchJSON(`${BASE}/business/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// 사업자 전단지 목록
export async function getBusinessFlyers(token) {
  return fetchJSON(`${BASE}/business/flyers`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
