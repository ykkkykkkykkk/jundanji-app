const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api'

// 401 응답 시 자동 로그아웃 (탈퇴 계정 JWT 차단 대응)
function handle401() {
  const savedDarkMode = localStorage.getItem('darkMode')
  const savedOnboarding = localStorage.getItem('onboarding_done')
  localStorage.clear()
  if (savedDarkMode) localStorage.setItem('darkMode', savedDarkMode)
  if (savedOnboarding) localStorage.setItem('onboarding_done', savedOnboarding)
  sessionStorage.clear()
  window.location.replace('/')
}

// 안전한 JSON 파싱 (서버가 HTML 등 비-JSON 응답을 반환할 경우 대응)
async function safeParseJSON(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function fetchJSON(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw Object.assign(new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'), { status: 0 })
  }
  if (res.status === 401) { handle401(); return }
  const data = await safeParseJSON(res)
  if (!data) {
    throw Object.assign(new Error('서버 응답을 처리할 수 없습니다.'), { status: res.status })
  }
  if (!data.ok) {
    const err = new Error(data.message || '서버 오류')
    err.status = res.status
    throw err
  }
  return data.data
}

// fetchJSON과 동일하지만 throw 대신 { ok, status, data, message } 형태로 반환
// 호출부에서 HTTP status별 분기가 필요한 경우 사용
async function fetchJSONSafe(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    return { ok: false, status: 0, data: null, message: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.' }
  }
  if (res.status === 401) { handle401(); return { ok: false, status: 401, data: null, message: '로그인이 만료되었습니다.' } }
  const json = await safeParseJSON(res)
  if (!json) return { ok: false, status: res.status, data: null, message: '서버 응답을 처리할 수 없습니다.' }
  return { ok: !!json.ok, status: res.status, data: json.data ?? null, message: json.message ?? null }
}

// fetchJSON과 동일하지만 data 외 추가 필드(pagination, attempted 등)도 함께 반환
async function fetchJSONFull(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw Object.assign(new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.'), { status: 0 })
  }
  if (res.status === 401) { handle401(); return }
  const json = await safeParseJSON(res)
  if (!json) {
    throw Object.assign(new Error('서버 응답을 처리할 수 없습니다.'), { status: res.status })
  }
  if (!json.ok) {
    const err = new Error(json.message || '서버 오류')
    err.status = res.status
    throw err
  }
  return json
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
  const json = await fetchJSONFull(`${BASE}/flyers?${params.toString()}`)
  return { data: json.data, pagination: json.pagination }
}

// 전단지 상세 조회
export async function getFlyerDetail(id) {
  return fetchJSON(`${BASE}/flyers/${id}`)
}

// 공유 처리 (포인트 적립) — scratchToken으로 서버 검증
// 중복 공유 시 { ok: false, status: 409 } 반환 (throw 하지 않음)
export async function shareFlyer(token, flyerId, scratchToken) {
  return fetchJSONSafe(`${BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flyerId, scratchToken }),
  })
}

// 유저 포인트 조회
export async function getUserPoints(userId) {
  return fetchJSON(`${BASE}/users/${userId}/points`)
}

// 유저 공유 내역 조회
export async function getUserShareHistory(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/share-history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
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
export async function createFlyer(token, data, imageFile) {
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
  return fetchJSON(`${BASE}/flyers`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
}

// 전단지 수정 (imageFile 옵션)
export async function updateFlyer(token, id, data, imageFile) {
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
  return fetchJSON(`${BASE}/flyers/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd })
}

// 전단지 삭제
export async function deleteFlyer(token, id) {
  return fetchJSON(`${BASE}/flyers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
}

// 포인트 사용
export async function usePoints(token, amount, description) {
  return fetchJSON(`${BASE}/points/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, description }),
  })
}

// 포인트 거래 내역
export async function getPointHistory(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/point-history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
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
export async function getUserBookmarks(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/bookmarks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
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

// 회원 탈퇴
export async function deleteAccount(token) {
  return fetchJSON(`${BASE}/users/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
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
  const json = await fetchJSONFull(`${BASE}/flyers/${flyerId}/quiz?userId=${userId}`)
  return { data: json.data, attempted: json.attempted }
}

// 퀴즈 정답 제출
export async function submitQuizAnswer(token, flyerId, quizId, answer) {
  return fetchJSON(`${BASE}/quiz/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flyerId, quizId, answer }),
  })
}

// 퀴즈 응시 내역
export async function getQuizHistory(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/quiz-history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
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
export async function verifyQrCode(token, qrCode) {
  return fetchJSONSafe(`${BASE}/qr/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ qrCode }),
  })
}

// 방문 인증 내역
export async function getVisitHistory(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/visit-history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
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

// ======== 기프티콘 교환 API ========

// 기프티콘 주문 내역 조회
export async function getGiftOrders(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/gift-orders`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}


// 기프티콘 교환 신청
// 반환: { data: { remainPoints } }
export async function createExchangeRequest(token, { product_name, product_emoji, points, phone }) {
  const json = await fetchJSONFull(`${BASE}/exchange/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_name, product_emoji, points, phone }),
  })
  return { data: json.data }
}

// ======== 보안 API ========

// 기기 fingerprint 생성 (SHA-256, Web Crypto API)
// 반환: Promise<string> — 64자리 hex 문자열 (하위 호환: 기존 'df_' 접두사 값은 그대로 유지)
export async function generateDeviceFingerprint() {
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

  // Web Crypto API SHA-256 (브라우저 표준, 충돌 확률 2^-256)
  const msgBuffer = new TextEncoder().encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hexHash
}

// 기기 체크 (회원가입 전)
export async function checkDevice(fingerprint) {
  const result = await fetchJSONSafe(`${BASE}/security/device-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint }),
  })
  return { blocked: !result.ok, message: result.message }
}

// 기기 등록 (로그인 후)
export async function registerDevice(token, fingerprint) {
  return fetchJSON(`${BASE}/security/device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fingerprint }),
  })
}

// 긁기 세션 시작
export async function startScratchSession(token, flyerId) {
  return fetchJSON(`${BASE}/scratch/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flyerId }),
  })
}

// 긁기 세션 완료
export async function completeScratchSession(token, sessionToken, durationMs) {
  const result = await fetchJSONSafe(`${BASE}/scratch/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionToken, durationMs }),
  })
  return { ok: result.ok, message: result.message, botDetected: result.status === 403 && !result.ok, data: result.data }
}

// ======== 출금 API ========

// 출금 신청
export async function requestWithdrawal(token, { amount, bankName, accountNumber, accountHolder }) {
  return fetchJSON(`${BASE}/withdrawals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, bankName, accountNumber, accountHolder }),
  })
}

// 출금 내역 조회
export async function getWithdrawalHistory(token) {
  return fetchJSON(`${BASE}/withdrawals/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// 은행 목록 조회
export async function getBanks() {
  return fetchJSON(`${BASE}/withdrawals/banks`)
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
export async function getInquiryHistory(token, userId) {
  return fetchJSON(`${BASE}/users/${userId}/inquiries`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// 앱 버전 확인
export async function getAppVersion() {
  return fetchJSON(`${BASE}/version`)
}

// ======== 공개 설정 API ========

// 공개 설정 조회 (인증 불요)
// 반환: { guest_scratch_limit: '1', scratch_threshold_login: '0.80', scratch_threshold_guest: '0.80', ... }
export async function getPublicSettings() {
  return fetchJSON(`${BASE}/settings/public`)
}

// ======== 기프티콘 상품 API ========

// 기프티콘 상품 목록 조회 (인증 불요)
// 반환: [{ id, gift_key, emoji, brand, name, points, category }]
export async function getGiftProducts() {
  return fetchJSON(`${BASE}/gifts/products`)
}
