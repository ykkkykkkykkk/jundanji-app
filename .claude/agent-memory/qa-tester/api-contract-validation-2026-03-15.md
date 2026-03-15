---
name: API 계약 검증 결과 (보안 수정 후)
description: 보안 수정으로 인한 API 계약 불일치 분석 (2026-03-15)
type: project
---

# API 계약 검증 결과 (2026-03-15)

**상태**: 4개 API 완전 일치, 1개 API 사용 불명확 (exchange vs gift)

## 검증된 API 4개

### 1. POST /api/share (공유 처리)

**변경 내용**: 백엔드가 authMiddleware 추가, userId를 JWT에서 추출

#### 프론트엔드 (`src/api/index.js:44-52`)
```javascript
export async function shareFlyer(token, flyerId, scratchToken) {
  const res = await fetch(`${BASE}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flyerId, scratchToken }),  // userId 제거됨 ✓
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data: data.data, message: data.message }
}
```

#### 백엔드 (`server/routes/share.js:10-12`)
```javascript
router.post('/share', authMiddleware, async (req, res) => {
  const userId = req.user.userId  // JWT에서 추출 ✓
  const { flyerId, scratchToken } = req.body
```

**호출부 검증** (`src/pages/DetailPage.jsx:39`, `App.jsx:422`)
- `DetailPage`에서 `token={auth?.token}` prop 수신 ✓
- `App.jsx`에서 `<DetailPage ... token={auth?.token} />` 전달 ✓

**결과**: ✅ **일치함**

---

### 2. POST /api/quiz/attempt (퀴즈 정답 제출)

**변경 내용**: 백엔드가 authMiddleware 추가, userId를 JWT에서 추출

#### 프론트엔드 (`src/api/index.js:240-246`)
```javascript
export async function submitQuizAnswer(token, flyerId, quizId, answer) {
  return fetchJSON(`${BASE}/quiz/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flyerId, quizId, answer }),  // userId 제거됨 ✓
  })
}
```

#### 백엔드 (`server/routes/quiz.js:119-121`)
```javascript
router.post('/quiz/attempt', authMiddleware, async (req, res) => {
  const userId = req.user.userId  // JWT에서 추출 ✓
  const { flyerId, quizId, answer } = req.body
```

**호출부 검증** (`src/pages/DetailPage.jsx:39`)
```javascript
const result = await submitQuizAnswer(token, flyer.id, quiz.quizId, answer)
```
- `token` prop으로 `auth?.token` 수신 ✓

**결과**: ✅ **일치함**

---

### 3. POST /api/qr/verify (QR 스캔 인증)

**변경 내용**: 백엔드가 authMiddleware 추가, userId를 JWT에서 추출

#### 프론트엔드 (`src/api/index.js:269-277`)
```javascript
export async function verifyQrCode(token, qrCode) {
  const res = await fetch(`${BASE}/qr/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ qrCode }),  // userId 제거됨 ✓
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data: data.data, message: data.message }
}
```

#### 백엔드 (`server/routes/qr.js:52-54`)
```javascript
router.post('/qr/verify', authMiddleware, async (req, res) => {
  const userId = req.user.userId  // JWT에서 추출 ✓
  const { qrCode } = req.body
```

**호출부 검증** (`src/pages/QrScanPage.jsx:25`)
```javascript
const res = await verifyQrCode(token, qrCode)
```
- `token` prop으로 `auth?.token` 수신 (`App.jsx:449`) ✓

**결과**: ✅ **일치함**

---

### 4. POST /api/gift-orders (기프티콘 교환)

**변경 내용**: 백엔드가 authMiddleware 추가, userId를 JWT에서 추출

#### 프론트엔드 (`src/api/index.js:328-337`)
```javascript
export async function createGiftOrder(token, giftId) {
  const res = await fetch(`${BASE}/gift-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ giftId }),  // userId 제거됨 ✓
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.message || '서버 오류')
  return data
}
```

#### 백엔드 (`server/routes/gift.js:61-63`)
```javascript
router.post('/gift-orders', authMiddleware, async (req, res) => {
  const userId = req.user.userId  // JWT에서 추출 ✓
  const { giftId } = req.body
```

**호출부 검증** (`src/pages/GiftShopPage.jsx:97`)
```javascript
const res = await createExchangeRequest(token, {
  product_name: `${selected.brand} ${selected.name}`,
  product_emoji: selected.emoji,
  points: selected.points,
  phone,
})
```

**⚠️ 주의**: GiftShopPage는 `createGiftOrder`가 아니라 `createExchangeRequest` 호출 중

**결과**: ✅ **일치함** (다만 아래 문제 참고)

---

## 발견된 불명확 점

### 불명확함: Exchange API vs Gift-Orders API 사용 패턴

프론트엔드와 백엔드에 두 가지 교환 API가 존재:

1. **`POST /api/gift-orders`** (백엔드: `server/routes/gift.js:61`)
   - 정해진 GIFT_ITEMS 목록에서 선택
   - 기프티콘 판매 카테고리 전용
   - authMiddleware 사용 ✓

2. **`POST /api/exchange/request`** (백엔드: `server/routes/exchange.js:19`)
   - 자유 형식 상품명 교환
   - 모든 상품 타입 가능
   - authMiddleware 사용 ✓

#### 프론트엔드 현황
- **GiftShopPage.jsx** (`src/pages/GiftShopPage.jsx:97`): **`createExchangeRequest` 호출 중** ✓
- 정해진 기프티콘 목록 사용하지만, exchange/request API로 처리
- `createGiftOrder` 함수는 정의되어 있지만 사용되지 않음

#### 결과
✅ **프론트-백 계약은 일치함**
- GiftShopPage가 `createExchangeRequest` 호출 → 백엔드의 `/api/exchange/request` 정상 처리
- Authorization 헤더 ✓, Body 필드 일치 ✓, 응답 형식 일치 ✓

**비고**: `createGiftOrder`는 미사용 상태 (유산 코드)

---

## 게스트 사용자 플로우 검증

### Issue: shareFlyer token 전달이 선택적

**문제 정의**:
- 게스트 사용자 (userId=1, auth=null)가 전단지 공유 시 token이 **null**
- 백엔드 authMiddleware는 Authorization 헤더 **필수**

**코드 경로**:
1. App.jsx에서 게스트 (auth=null): `token={auth?.token}` → undefined/null
2. ScratchCard → DetailPage → submitQuizAnswer(token, ...) 호출
3. shareFlyer 호출 안 함 (게스트는 긁기만 하고 포인트 미적립)

**현재 플로우**:
- 게스트 긁기 완료 → `completeScratchSession` (token 불필요) → onGuestReveal 콜백 → 로그인 모달

**검증**:
✅ **정상** — 게스트는 share API를 호출하지 않음
- 게스트는 로그인 후에만 포인트 적립 (share API 호출)
- 로그인 후 auth?.token 정상 전달됨

---

## Admin API 검증

### Admin Token 전달 방식

**프론트엔드** (`src/admin/api.js:13`):
```javascript
headers: {
  'Content-Type': 'application/json',
  'x-admin-token': token || '',  // sessionStorage에서 읽음
  ...options.headers,
}
```

**백엔드** (`server/routes/exchange.js:8-10`):
```javascript
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || !adminModule.activeTokens || !adminModule.activeTokens.has(token)) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
  next()
}
```

✅ **일치함** — 헤더 키 일치, 토큰 검증 일치

---

## 요약

| API | 프론트 함수 | 백엔드 경로 | 헤더 | Body | 상태 |
|-----|-----------|-----------|------|------|------|
| 공유 | shareFlyer | POST /api/share | ✓ Bearer | flyerId, scratchToken | ✅ 일치 |
| 퀴즈 | submitQuizAnswer | POST /api/quiz/attempt | ✓ Bearer | flyerId, quizId, answer | ✅ 일치 |
| QR | verifyQrCode | POST /api/qr/verify | ✓ Bearer | qrCode | ✅ 일치 |
| 기프티콘 | createExchangeRequest | POST /api/exchange/request | ✓ Bearer | product_name, points, phone | ✅ 일치 |
| (미사용) | createGiftOrder | POST /api/gift-orders | ✓ Bearer | giftId | ✅ 일치 (미사용) |

**전체**: 모든 API 계약이 **일치함** ✅

---

## Why
보안 수정으로 인증 방식이 변경됨 (body userId → JWT 추출)
프론트엔드에서 이를 올바르게 반영함 (Authorization 헤더 추가, body에서 userId 제거)

## How to apply
향후 인증이 필요한 새로운 API 추가 시:
- 항상 authMiddleware 사용
- 프론트에서는 Authorization 헤더에 Bearer token 전달
- body에는 userId 포함하지 않음
