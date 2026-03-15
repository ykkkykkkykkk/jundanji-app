# 전단지P 어드민 운영 도구 전체 감시 리포트

**작성일**: 2026-03-15
**감시 범위**: Admin UI (src/admin/), 어드민 API (server/routes/admin.js), 로그인
**상태**: 부분 완성 — 핵심 기능 O, 운영 기능 대량 미구현

---

## 요약

| 항목 | 상태 | 설명 |
|------|------|------|
| 총 페이지/기능 | 7개 | 대시보드, 전단지, 유저, 기프티콘, 사업자, 카테고리, 문의 |
| 구현 완료 | 6개 | 기능 UI 구현됨 |
| 미구현 | 1개 | **출금 관리 (Critical)** |
| 발견된 버그 | 10개 | Critical 2, Major 5, Minor 3 |
| 미구현 운영 기능 | 20개 | 자동화, 보안, 권한, 통계 등 |

---

## 1. 어드민 인증/보안

### 1.1 로그인 방식

**파일**: `server/routes/admin.js:7-36`, `src/admin/pages/LoginPage.jsx:1-64`, `src/admin/api.js:27-42`

**현황**:
- 단순 비밀번호 기반 (하드코딩)
- 토큰: 메모리 내 Set에 저장 (재부팅 시 초기화)
- 세션: localStorage에 저장

**코드**:
```javascript
// server/routes/admin.js:7
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'

// server/routes/admin.js:14-15
const activeTokens = new Set()  // 메모리 저장 ← 휘발성!
```

### 1.2 인증 미들웨어

**파일**: `server/routes/admin.js:18-24`

**상태**: ✅ 완성
- 모든 관리자 엔드포인트에 `requireAdmin` 미들웨어 적용됨
- 토큰 검증 로직 정상

**코드**:
```javascript
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ ok: false, message: '관리자 인증이 필요합니다.' })
  }
  next()
}
```

### 1.3 보안 이슈

#### Bug #1: **Critical** — 메모리 기반 토큰 (재부팅 시 초기화)

**파일**: `server/routes/admin.js:14-15, 34`

**문제**:
- 토큰을 `new Set()`에 저장 (Node 프로세스 메모리)
- 서버 재부팅 → 모든 어드민 세션 무효화
- 다중 프로세스 환경에서 동작 불가 (클러스터, PM2 등)

**증상**:
- 배포 후 어드민이 재로그인 강제됨
- 프로덕션에서 심각한 UX 문제

**수정 방안**:
```javascript
// Redis 또는 DB를 사용해야 함
// 예: DB에 admin_sessions 테이블 추가
// CREATE TABLE admin_sessions (
//   id INTEGER PRIMARY KEY,
//   token TEXT UNIQUE,
//   created_at TEXT,
//   expires_at TEXT
// );
```

**권장**: Redis 기반 세션 저장소 사용

---

#### Bug #2: **Major** — 비밀번호 하드코딩 + 기본값

**파일**: `server/routes/admin.js:7`

**문제**:
```javascript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'
```

- 환경변수 미설정 시 기본값 `'admin1234'` 사용
- Vercel 프로덕션에서 의도치 않게 노출될 가능성

**수정 방안**:
```javascript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.')
}
```

---

## 2. 대시보드 (Dashboard)

### 2.1 통계 데이터

**파일**: `server/routes/admin.js:40-66`, `src/admin/pages/DashboardPage.jsx:1-87`

**상태**: ✅ 완성

**수집 통계**:
- 총 유저 수
- 총 전단지 수
- 총 포인트 지급 (적립 대비 사용량 미포함)
- 총 긁기 수 (share_history 기반)
- 최근 유저 5명
- 최근 전단지 5개

### 2.2 데이터 정확성 이슈

#### Bug #3: **Major** — 총 포인트 계산 오류

**파일**: `server/routes/admin.js:45-46`

**코드**:
```javascript
const totalPointsRow = await db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM users').get()
const totalPoints = totalPointsRow?.total || 0
```

**문제**:
- `users.points` = **현재 잔액** (사용 후 차감됨)
- 대시보드는 "총 포인트 지급"이라 표시하지만, 실제로는 **현재 보유 포인트**
- 정확한 통계를 위해서는 `point_transactions`에서 `type='earn'` 합산 필요

**증상**:
- 적립 100P + 사용 50P → 표시: 50P (원래는 100P 표시해야 함)
- 운영진이 오해하기 쉬움

**수정 방안**:
```javascript
const totalEarnedRow = await db.prepare(
  `SELECT COALESCE(SUM(amount), 0) as total
   FROM point_transactions
   WHERE type = 'earn'`
).get()
const totalEarned = totalEarnedRow.total
```

---

#### Bug #4: **Minor** — 총 긁기 수 (share_history vs scratch_sessions)

**파일**: `server/routes/admin.js:47-48`

**코드**:
```javascript
const totalScratchesRow = await db.prepare('SELECT COUNT(*) as count FROM share_history').get()
const totalScratches = totalScratchesRow.count
```

**문제**:
- "긁기"는 여러 의미 가능:
  1. 공유 history (share_history)
  2. Canvas scratch sessions (scratch_sessions)
  3. 복권 긁기 완료율
- 현재는 공유 내역으로만 계산
- 복권 긁기 통계는 별도 필요

**권장**:
```javascript
// 복권 긁기 완료 건수
const scratched = await db.prepare(
  'SELECT COUNT(*) as count FROM scratch_sessions WHERE is_valid = 1'
).get()
```

---

## 3. 전단지 관리 (FlyersPage)

### 3.1 기능 분석

**파일**: `server/routes/admin.js:70-111`, `src/admin/pages/FlyersPage.jsx:1-134`

**기능**:
- ✅ 목록 조회 (페이지네이션, 검색, 상태 필터)
- ✅ 상태 변경 (approved ↔ pending ↔ blocked)
- ❌ 삭제 기능 없음
- ❌ QR 코드 확인
- ❌ 복권 설정 관리 (복권 주제, 보상 등)
- ❌ 퀴즈 문제 관리

### 3.2 버그

#### Bug #5: **Major** — 상태 변경 후 재로드 지연

**파일**: `src/admin/pages/FlyersPage.jsx:45-52`

**코드**:
```javascript
const handleStatusChange = async (id, newStatus) => {
  try {
    await updateFlyerStatus(id, newStatus)
    fetchFlyers()  // 즉시 재로드
  } catch (err) {
    alert(err.message)
  }
}
```

**문제**:
- 사용자 확인 창(confirm) 없음
- 실수로 "차단"을 클릭하면 즉시 반영
- 대량 전단지 관리 시 실수 위험

**수정 방안**:
```javascript
const handleStatusChange = async (id, newStatus) => {
  if (!confirm(`정말 전단지를 '${statusMap[newStatus].label}'로 변경하시겠습니까?`)) return
  // ...
}
```

---

### 3.3 미구현 기능

**출금 관리처럼 중요하지는 않지만 필요한 기능들**:

1. **전단지 상세 보기** (내용, QR, 복권 설정 확인)
2. **전단지 삭제** (status='blocked'인 것들 정리)
3. **복권/퀴즈 관리** (별도 페이지)
4. **벌크 작업** (여러 전단지 한 번에 승인)

---

## 4. 유저 관리 (UsersPage)

### 4.1 기능 분석

**파일**: `server/routes/admin.js:115-155`, `src/admin/pages/UsersPage.jsx:1-133`

**기능**:
- ✅ 목록 조회 (검색, 역할 필터)
- ✅ 상태 변경 (active ↔ suspended)
- ❌ **포인트 수동 조정 UI 없음** (API는 있음)
- ❌ 역할 변경 불가 (user ↔ business)
- ❌ 사용자 상세 정보 보기
- ❌ 강제 로그아웃

### 4.2 Critical 버그

#### Bug #6: **Critical** — 포인트 수동 조정 API 있지만 UI 없음

**파일**:
- API: `server/routes/admin.js:159-188` ✅
- 프론트: `src/admin/api.js` ❌ (함수 없음)
- UI: `src/admin/pages/UsersPage.jsx` ❌

**API 엔드포인트**:
```javascript
// POST /api/admin/users/:id/points
// body: { amount: number, description?: string }
```

**코드**: `server/routes/admin.js:159-188`
```javascript
router.post('/users/:id/points', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { amount, description } = req.body

  // 포인트 트랜잭션 처리
  await db.batch([
    { sql: 'UPDATE users SET points = points + ? WHERE id = ?', args: [amount, id] },
    { sql: 'INSERT INTO point_transactions (...)', args: [...] },
  ])
  // ...
})
```

**문제**:
- API는 완벽하게 구현됨
- 하지만 **프론트엔드에서 호출하는 코드가 없음**
- 관리자가 포인트 지급/차감 불가

**영향**:
- 버그 보상, 이벤트 포인트 지급 불가
- 운영진이 DB를 직접 수정해야 함

**수정 방안**:
```javascript
// src/admin/api.js에 함수 추가
export const adjustUserPoints = (id, amount, description) =>
  request(`/users/${id}/points`, {
    method: 'POST',
    body: JSON.stringify({ amount, description })
  })

// src/admin/pages/UsersPage.jsx에 UI 추가 (모달)
// - 금액 입력
// - 설명 (선택)
// - 확인 & 실행
```

---

## 5. 기프티콘 관리 (PointsPage) — 명칭 오류

### 5.1 기능 분석

**파일**: `src/admin/pages/PointsPage.jsx:1-160` (실제로는 기프티콘 관리)

**기능**:
- ✅ 기프티콘 주문 목록
- ✅ 상태 변경 (pending → sent/failed)
- ✅ 전화번호 마스킹 및 보기 토글
- ✅ 발송 실패 시 포인트 환불
- ❌ 자동 발송 (카카오톡/SMS)
- ❌ 대량 발송 기능

### 5.2 버그

#### Bug #7: **Major** — 기프티콘 발송 상태 동기화 부분 오류

**파일**: `server/routes/admin.js:219-255`

**코드**:
```javascript
router.patch('/gift-orders/:id/status', requireAdmin, async (req, res) => {
  // ...
  if (status === 'failed') {
    // 실패 시 포인트 환불
    await db.batch([
      { sql: 'UPDATE gift_orders SET status = ?, sent_at = ?, phone = NULL WHERE id = ?',
        args: [status, now, id] },
      { sql: 'UPDATE users SET points = points + ? WHERE id = ?',
        args: [order.amount, order.user_id] },
      { sql: "INSERT INTO point_transactions (...) VALUES (?, ?, 'earn', '기프티콘 발송 실패 환불')",
        args: [order.user_id, order.amount] },
      // ❌ 여기서 문제!
      { sql: "UPDATE exchange_requests SET phone = NULL, status = 'failed' WHERE user_id = CAST(? AS TEXT) AND points = ? AND phone IS NOT NULL",
        args: [order.user_id, order.amount] },
    ])
  }
})
```

**문제**:
1. `exchange_requests` 테이블과 `gift_orders` 테이블이 분리됨 (데이터 불일치 위험)
2. `user_id = CAST(? AS TEXT)` — 불필요한 타입 캐스팅 (혼란 야기)
3. `WHERE points = ?` — 금액으로 매칭 (같은 금액 다른 주문 있으면 오류)

**수정 방안**:
- `exchange_requests` 테이블 제거 (중복)
- 또는 FK로 연결하여 자동 동기화

---

## 6. 포인트 관리 페이지 — 없음

**파일**: 없음

**Status**: ❌ **완전 미구현**

### 요구사항
- 포인트 트랜잭션 내역 조회
- 필터 (유저, 기간, type)
- 환불 처리

### 대신 있는 것
- PointsPage = 기프티콘 관리 (명칭 혼동)

### 필요한 구현
```javascript
// server/routes/admin.js에 추가
router.get('/point-transactions', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, userId = '', type = '' } = req.query
  // ...
})

// src/admin/pages/PointTransactionsPage.jsx 추가
```

---

## 7. 출금 관리 (Withdrawals) — 매우 심각

### 7.1 현황

**파일**: 없음

**Status**: ❌ **완전 미구현**

**API**: `server/routes/withdrawal.js:1-108` (사용자 출금 신청 API만 있음)

**어드민 API**: 없음

**UI**: 없음

### 7.2 문제점

#### Bug #8: **Critical** — 출금 관리 페이지 부재

**DB**: withdrawals 테이블에 대기 중인 출금 기록 쌓임
- 사용자가 신청 → points 즉시 차감 ✓
- 관리자 처리 → **불가능** ✗

**현재 상태**:
```
User A 출금 신청 (100,000P) → DB: withdrawals (status='pending')
                            ↓
                      관리자가 처리할 방법 없음!
                            ↓
                      [수동 DB 수정만 가능]
```

**영향**: 사용자가 "출금은 했는데 왜 안 들어왔냐"고 컴플레인

#### 필요한 구현

1. **출금 승인/거절 엔드포인트** (admin.js)
```javascript
router.patch('/withdrawals/:id/process', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { status, memo } = req.body  // status: 'approved' | 'rejected'

  if (status === 'approved') {
    // 실제 계좌 입금 (외부 API 연동)
    // 또는 수동 처리 대기
    await db.prepare('UPDATE withdrawals SET status = ?, processed_at = ?, admin_memo = ? WHERE id = ?')
      .run(status, now, memo, id)
  } else if (status === 'rejected') {
    // 포인트 환불 트랜잭션
    const w = await db.prepare('SELECT user_id, amount FROM withdrawals WHERE id = ?').get(id)
    await db.batch([
      { sql: 'UPDATE withdrawals SET status = ?, processed_at = ?, admin_memo = ? WHERE id = ?',
        args: [status, now, memo, id] },
      { sql: 'UPDATE users SET points = points + ? WHERE id = ?',
        args: [w.amount, w.user_id] },
      { sql: "INSERT INTO point_transactions VALUES (...)",
        args: [w.user_id, w.amount, 'earn', `출금 거절 환불: ${memo}`] },
    ])
  }
})
```

2. **출금 목록 조회 엔드포인트**
```javascript
router.get('/withdrawals', requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query
  const offset = (page - 1) * limit

  let where = 'WHERE 1=1'
  const params = []

  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }

  const rows = await db.prepare(`
    SELECT w.*, u.nickname, u.email
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ${where}
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset))

  res.json({ ok: true, withdrawals: rows, total: totalRow.count })
})
```

3. **어드민 UI 페이지** (src/admin/pages/WithdrawalsPage.jsx)
```jsx
// 기프티콘 관리처럼 구현
// - 목록 (사용자, 금액, 은행, 계좌, 신청일, 상태)
// - 필터 (pending/approved/rejected)
// - 승인/거절 액션 (memo 입력 가능)
```

4. **API 함수** (src/admin/api.js)
```javascript
export const getWithdrawals = (params = {}) =>
  request(`/withdrawals?${new URLSearchParams(params).toString()}`)

export const processWithdrawal = (id, status, memo) =>
  request(`/withdrawals/${id}/process`, {
    method: 'PATCH',
    body: JSON.stringify({ status, memo })
  })
```

---

## 8. 사업자 관리 (BusinessPage)

### 8.1 기능 분석

**파일**: `server/routes/admin.js:306-340`, `src/admin/pages/BusinessPage.jsx:1-114`

**기능**:
- ✅ 목록 조회 (승인 여부 필터)
- ✅ 승인/거절 (business_approved 0/1 토글)
- ❌ 예산 관리 (point_budget 설정)
- ❌ 정산 내역 조회
- ❌ 자영업자 공개 정보 수정

### 8.2 Minor 버그

#### Bug #9: **Minor** — 승인 취소 로직 불명확

**파일**: `src/admin/pages/BusinessPage.jsx:99-102`

**코드**:
```javascript
} else (
  <ActionButton variant="outline" onClick={() => handleApprove(biz.id, false)}>
    승인 취소
  </ActionButton>
)
```

**문제**:
- "승인 취소"와 "거절"의 차이 불명확
- UI가 첫 신청 시와 이미 승인된 후의 상태를 구분하지 않음
- 역할 변경 (business → user)도 불가

---

## 9. 카테고리 관리 (CategoriesPage)

### 9.1 기능 분석

**파일**: `server/routes/admin.js:344-413`, `src/admin/pages/CategoriesPage.jsx:1-153`

**기능**:
- ✅ CRUD 완성 (생성, 읽기, 수정, 삭제)
- ✅ 정렬 순서 관리
- ✅ 중복 체크

**상태**: ✅ 정상 작동

---

## 10. 문의 관리 (InquiriesPage)

### 10.1 기능 분석

**파일**: `server/routes/admin.js:259-302`, `src/admin/pages/InquiriesPage.jsx:1-181`

**기능**:
- ✅ 목록 조회 (상태 필터)
- ✅ 답변 입력 (modal)
- ✅ 상태 변경 (pending → answered)
- ❌ 자동 답변 알림 (사용자에게)

### 10.2 Minor 버그

#### Bug #10: **Minor** — 답변 저장 후 알림 없음

**파일**: `src/admin/pages/InquiriesPage.jsx:40-53`

**코드**:
```javascript
const handleAnswer = async () => {
  if (!answerText.trim()) return alert('답변 내용을 입력해주세요.')
  setAnswerLoading(true)
  try {
    await answerInquiry(answerModal.id, answerText)
    setAnswerModal(null)
    setAnswerText('')
    load()  // 재로드
  } catch (e) {
    alert(e.message)
  } finally {
    setAnswerLoading(false)
  }
}
```

**문제**:
- 답변 저장 후 "저장 완료" 토스트 알림 없음
- 사용자가 답변을 받았는지 알 수 없음 (알림 API 미연동)

**권장**:
- 답변 저장 시 사용자에게 push notification 발송
- 또는 인앱 알림 생성

---

## 11. 보안 기능 미구현

### 11.1 다중 관리자 미지원

**문제**:
- 단일 비밀번호 (하드코딩)
- 관리자별 권한 관리 없음
- 작업 로그 없음

**필요한 구현**:
```sql
CREATE TABLE admin_accounts (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',  -- admin, moderator, viewer
  created_at TEXT
);

CREATE TABLE admin_logs (
  id INTEGER PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_accounts(id),
  action TEXT NOT NULL,
  target_id INTEGER,
  target_type TEXT,  -- flyers, users, withdrawals
  old_value TEXT,
  new_value TEXT,
  created_at TEXT
);
```

---

### 11.2 감시 알림 없음

**필요한 기능**:
- Critical threshold (예: 일일 출금 500만P 이상)
- 비정상 거래 감지
- 어드민 로그인 실패 감지

---

## 12. 자동화/운영 기능 미구현

### 12.1 기프티콘 자동 발송

**현황**: 수동 발송만 가능

**필요한 구현**:
```javascript
// 매일 밤 2시 자동 발송 (pending → sent)
// Vercel Cron Job 또는 외부 scheduler

// 1. 카카오톡 API 연동
// 2. SMS 연동
// 3. 재시도 로직
// 4. 발송 실패 처리
```

---

### 12.2 출금 정산 자동화

**필요한 구현**:
```javascript
// 매주 금요일 자동 승인
// 은행 API 연동 (실제 계좌 입금)
// 정산 내역 보고서
```

---

## 13. 대시보드 통계 미구현

**현재**: 기본 통계만 있음

**필요한 추가 지표**:
- 일별/주별/월별 트렌드 차트
- 카테고리별 인기도
- 사용자 활동 히트맵
- 포인트 수급량 분석
- 기프티콘 환율 추적
- 출금 대기 금액 (현금 유출 관리)

---

## 14. 테이블 설계 오류

### 14.1 exchange_requests vs gift_orders 중복

**파일**: `server/db.js:206-217`

**문제**: 두 테이블이 같은 데이터를 관리하는 것으로 보임

```sql
CREATE TABLE gift_orders (          -- 어드민이 보는 테이블
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  gift_id TEXT,
  gift_name TEXT,
  amount INTEGER,
  status TEXT DEFAULT 'pending',
  phone TEXT,
  created_at TEXT,
  sent_at TEXT
);

CREATE TABLE exchange_requests (    -- 구식? 또는 다른 용도?
  id INTEGER PRIMARY KEY,
  user_id TEXT,                     -- ⚠️ TEXT (형 불일치!)
  user_kakao_id TEXT,
  product_name TEXT,
  product_emoji TEXT,
  points INTEGER,
  phone TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME,
  sent_at DATETIME
);
```

**권장**: 하나의 테이블로 통합 + 마이그레이션

---

## 15. API 계약 검증

### 15.1 전단지 상태 변경

**파일**:
- API: `server/routes/admin.js:101-111`
- 프론트: `src/admin/pages/FlyersPage.jsx:45-52`

**계약**:
```javascript
// 요청
PATCH /api/admin/flyers/:id/status
body: { status: 'approved' | 'pending' | 'blocked' }

// 응답
{ ok: true, message: '전단지 상태가 \'xxx\'로 변경되었습니다.' }
```

**상태**: ✅ 일치

---

### 15.2 기프티콘 발송

**API**: `server/routes/admin.js:219-255`

**계약 불일치 없음**: ✅

---

## 요약 테이블

| # | 심각도 | 파일 | 라인 | 설명 | 수정 방법 |
|----|--------|------|------|------|---------|
| 1 | Critical | admin.js | 14-15 | 메모리 기반 토큰 | Redis 세션 저장소 |
| 2 | Major | admin.js | 7 | 비밀번호 기본값 | 환경변수 필수화 |
| 3 | Major | admin.js | 45-46 | 포인트 계산 오류 | point_transactions 합산 |
| 4 | Minor | admin.js | 47-48 | 긁기 수 계산 | scratch_sessions 추가 |
| 5 | Major | FlyersPage.jsx | 45-52 | confirm 없음 | confirm dialog 추가 |
| 6 | Critical | UsersPage.jsx, api.js | - | 포인트 UI 없음 | PointAdjustmentModal 추가 |
| 7 | Major | admin.js | 240-241 | exchange_requests 동기화 오류 | 테이블 통합 |
| 8 | Critical | - | - | 출금 관리 페이지 없음 | WithdrawalsPage 전체 구현 |
| 9 | Minor | BusinessPage.jsx | 99-102 | 승인 취소 불명확 | UI 명확화 |
| 10 | Minor | InquiriesPage.jsx | 40-53 | 답변 알림 없음 | Push notification 연동 |

---

## 우선순위별 작업 리스트

### 🔴 Immediate (이번 주)
- [ ] Bug #8: 출금 관리 전체 구현 (API + UI)
- [ ] Bug #6: 포인트 수동 조정 UI 추가
- [ ] Bug #1: 세션 저장소 Redis 이전

### 🟡 High (이번 달)
- [ ] Bug #3: 포인트 통계 수정
- [ ] Bug #7: exchange_requests 테이블 정리
- [ ] Bug #5: 상태 변경 confirm 추가
- [ ] 기프티콘 자동 발송 로직

### 🟢 Medium (다음 달)
- [ ] Bug #2: 비밀번호 환경변수 필수화
- [ ] Bug #4: 긁기 수 통계 추가
- [ ] Bug #9, #10: UI 개선
- [ ] 다중 관리자 계정 시스템
- [ ] 상세 대시보드 통계

---

## 파일별 현황

| 파일 | 상태 | 완성도 | 비고 |
|------|------|--------|------|
| admin.js (API) | ⚠️ 부분 | 70% | 출금 API 없음, 보안 이슈 2개 |
| App.jsx | ✅ 정상 | 100% | - |
| LoginPage.jsx | ⚠️ 부분 | 90% | 토큰 메모리 저장 문제 있음 |
| DashboardPage.jsx | ⚠️ 부분 | 80% | 통계 계산 오류 |
| FlyersPage.jsx | ✅ 정상 | 90% | confirm 추가 필요 |
| UsersPage.jsx | ❌ 불완전 | 40% | 포인트 조정 UI 없음 |
| PointsPage.jsx | ✅ 정상 | 95% | 기프티콘 관리 (명칭 오류) |
| WithdrawalsPage.jsx | ❌ 없음 | 0% | 전체 미구현 |
| BusinessPage.jsx | ✅ 정상 | 85% | 예산 관리 없음 |
| CategoriesPage.jsx | ✅ 정상 | 100% | - |
| InquiriesPage.jsx | ✅ 정상 | 90% | 알림 연동 필요 |
| api.js | ⚠️ 부분 | 60% | 출금, 포인트 조정 함수 없음 |
| components/* | ✅ 정상 | 100% | - |

---

## 결론

**어드민 운영 도구는 기본 기능은 구현되어 있으나, 실제 운영에 필수적인 기능들이 대량 미구현된 상태입니다.**

- ✅ **완성 영역**: 전단지, 카테고리, 문의 관리
- ⚠️ **부분 완성**: 유저, 기프티콘 (운영 기능 부족)
- ❌ **미구현**: 출금 관리, 포인트 조정 UI, 자동화

**즉시 대응 필요한 문제**:
1. 출금 관리 페이지 (사용자 민원 증가 위험)
2. 포인트 수동 조정 UI
3. 세션 저장소 안정화

**2주 내 완료 권장**.
