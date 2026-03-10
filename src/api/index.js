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

// 카테고리 목록 조회
export async function getCategories() {
  return fetchJSON(`${BASE}/flyers/categories`)
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

// 공유 처리 (포인트 적립) — scratchToken으로 서버 검증
// 중복 공유 시 { ok: false, status: 409 } 반환 (throw 하지 않음)
export async function shareFlyer(userId, flyerId, scratchToken) {
  const res = await fetch(`${BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, flyerId, scratchToken }),
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
export async function register(email, password, nickname, role, phone, deviceFingerprint) {
  return fetchJSON(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nickname, role, phone, deviceFingerprint }),
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
export async function submitQuizAnswer(userId, flyerId, quizId, answer) {
  return fetchJSON(`${BASE}/quiz/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, flyerId, quizId, answer }),
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

// 역할 변경 (소셜 로그인 사용자)
export async function updateUserRole(token, role) {
  return fetchJSON(`${BASE}/users/me/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  })
}

// 포인트 예산 충전
export async function chargePointBudget(token, amount) {
  return fetchJSON(`${BASE}/business/charge-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount }),
  })
}

// 충전 내역 조회
export async function getChargeHistory(token) {
  return fetchJSON(`${BASE}/business/charge-history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ======== 출금 API ========

// 은행 목록 조회
export async function getBanks() {
  return fetchJSON(`${BASE}/banks`)
}

// 출금 신청
export async function requestWithdrawal(userId, amount, bankName, accountNumber, accountHolder) {
  return fetchJSON(`${BASE}/withdrawals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, bankName, accountNumber, accountHolder }),
  })
}

// 출금 내역 조회
export async function getWithdrawalHistory(userId) {
  return fetchJSON(`${BASE}/users/${userId}/withdrawals`)
}

// ======== 보안 API ========

// 기기 fingerprint 생성
export function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('fingerprint', 2, 2)
  const canvasData = canvas.toDataURL()

  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    navigator.maxTouchPoints || 0,
    canvasData.slice(-50),
  ].join('|')

  // simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return 'df_' + Math.abs(hash).toString(36) + '_' + raw.length.toString(36)
}

// 기기 체크 (회원가입 전)
export async function checkDevice(fingerprint) {
  const res = await fetch(`${BASE}/security/device-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint }),
  })
  return res.json()
}

// 기기 등록 (로그인 후)
export async function registerDevice(userId, fingerprint) {
  return fetchJSON(`${BASE}/security/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, fingerprint }),
  })
}

// 긁기 세션 시작
export async function startScratchSession(userId, flyerId) {
  return fetchJSON(`${BASE}/scratch/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, flyerId }),
  })
}

// 긁기 세션 완료
export async function completeScratchSession(sessionToken, durationMs) {
  const res = await fetch(`${BASE}/scratch/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken, durationMs }),
  })
  const data = await res.json()
  return { ok: data.ok, message: data.message, botDetected: data.botDetected, data: data.data }
}

// ======== 1:1 문의 API ========

// 문의 등록
export async function createInquiry(userId, category, title, content) {
  return fetchJSON(`${BASE}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, category, title, content }),
  })
}

// 내 문의 내역 조회
export async function getInquiryHistory(userId) {
  return fetchJSON(`${BASE}/users/${userId}/inquiries`)
}
