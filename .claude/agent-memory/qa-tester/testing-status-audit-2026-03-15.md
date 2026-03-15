---
name: 테스트 자동화 현황 점검 (2026-03-15)
description: 전단지P 프로젝트 테스트 프레임워크, 기존 테스트 코드, 커버리지, CI/CD 현황 상세 분석
type: project
---

# 전단지P 테스트 자동화 현황 분석

## 1. 테스트 프레임워크 설치 현황

### 프론트엔드 (package.json)
```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2",
    "vite-plugin-pwa": "^1.2.0"
  }
}
```

**현황**: 테스트 라이브러리 미설치
- ❌ Jest / Vitest 없음
- ❌ React Testing Library 없음
- ❌ Cypress / Playwright 없음
- ❌ 테스트 스크립트 없음

### 백엔드 (server/package.json)
```json
{
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

**현황**: 테스트 라이브러리 미설치
- ❌ Jest / Vitest 없음
- ❌ supertest 없음
- ❌ test 스크립트 없음

---

## 2. 기존 테스트 코드 확인

### 발견된 테스트 파일
1. **server/test.js** (64줄)
   - 스크립트 형식의 수동 통합 테스트
   - `node test.js`로 실행
   - 자동화 테스트가 아님 (콘솔 로그만 출력)
   - 테스트 수: 8개 (health, flyers, filter, detail, share, duplicate check, points, history)

2. **server/test-auth.js** (50줄)
   - JWT 인증 플로우 수동 테스트
   - `node test-auth.js`로 실행
   - 자동화 테스트 아님 (수동 검증 필요)
   - 테스트 수: 7개 (register, login, wrong password, me, update, verify, invalid token)

### 테스트 코드 특징
- **형태**: 수동 테스트 스크립트 (자동화 안됨)
- **Assertion 라이브러리 없음**: 단순 console.log로 결과 출력
- **CI/CD 연동 불가**: npm test 스크립트 없음
- **커버리지 측정 불가**: coverage 도구 미설치
- **기능 범위 제한됨**:
  - 게스트 기능 테스트 없음
  - 비즈니스 계정 테스트 없음
  - 에러 케이스 극히 제한됨
  - 동시성 테스트 없음
  - Canvas 긁기 로직 테스트 없음

### 테스트되지 않는 라우트 (16개 중)
- ❌ admin.js (모든 엔드포인트)
- ❌ bookmarks.js (북마크 CRUD)
- ❌ business.js (사업자 대시보드)
- ❌ exchange.js (포인트 교환 — 테스트 제외)
- ❌ gift.js (기프티콘)
- ❌ inquiry.js (문의)
- ❌ notifications.js (알림)
- ❌ push.js (푸시)
- ❌ qr.js (QR 스캔)
- ❌ quiz.js (퀴즈)
- ❌ security.js (보안/fingerprint)
- ❌ social.js (소셜 로그인)
- ❌ withdrawal.js (출금 — 계획 제외)

---

## 3. 테스트 커버리지 분석

### 프론트엔드 주요 컴포넌트

| 컴포넌트 | 테스트 필요 | 현황 | 우선순위 |
|---------|-----------|------|---------|
| ScratchCard | Canvas 60%/80% threshold | ❌ | Critical |
| MainPage | 페이징, 카테고리 필터 | ❌ | High |
| DetailPage | 전단지 상세 조회 | ❌ | High |
| LoginPage | 로그인/회원가입 | ❌ | Critical |
| MyPage | 포인트 조회, 거래 내역 | ❌ | High |
| GiftShopPage | 기프티콘 교환 | ❌ | High |
| QrScanPage | BarcodeDetector API | ❌ | Medium |
| QuizModal | 랜덤 문제, 정답 분기 | ❌ | Medium |
| BottomNav | 라우팅 | ❌ | Low |
| AdminPage | 어드민 기능 | ❌ | High |

### 백엔드 주요 로직

| 기능 | 테스트 필요 | 현황 | 우선순위 |
|------|-----------|------|---------|
| JWT 미들웨어 | authMiddleware | ❌ | Critical |
| 포인트 트랜잭션 | share/quiz/qr | ❌ | Critical |
| 중복 방지 | share/quiz/qr | ❌ | Critical |
| Device fingerprint | 다중계정 방지 | ❌ | High |
| Rate limiting | 200개 API 요청/min | ❌ | High |
| DB 스키마 | 테이블 생성/마이그레이션 | ❌ | High |
| 에러 처리 | 400/403/404/409/500 | ❌ | Medium |
| 소셜 로그인 | Kakao/Google 콜백 | ❌ | Medium |

---

## 4. CI/CD 파이프라인

### Vercel 설정 (vercel.json)
```json
{
  "installCommand": "npm install && cd server && npm install --production",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**현황**: 테스트 실행 없음
- ❌ preInstall/buildCommand에 테스트 명령 없음
- ❌ GitHub Actions 미설치 (.github/workflows 없음)
- ❌ 빌드 전 검증 없음
- ⚠️ Vercel 배포 후 버그가 발견될 수 있음

---

## 5. 테스트 자동화 도입 전략

### 권장 스택

| 계층 | 도구 | 이유 |
|------|------|------|
| Unit (frontend) | **Vitest** | Vite 네이티브, ESM 지원, 빠름 |
| Component | **React Testing Library** | 사용자 관점 테스트, a11y 검증 |
| Unit (backend) | **Vitest** | CommonJS 지원, Jest 호환 |
| Integration | **supertest** | Express HTTP 테스트 |
| E2E | **Playwright** | 모던, 크로스브라우저, 디버깅 좋음 |
| Coverage | **c8** | ESM/CommonJS 모두 지원 |

### 설치 및 설정 예시

**프론트엔드**:
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom c8
```

**백엔드**:
```bash
npm install -D vitest supertest c8
cd server && npm install -D vitest supertest c8
```

### package.json 스크립트 추가
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

```json
// server/package.json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### vitest.config.js 예시 (프론트)
```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/']
    }
  }
})
```

---

## 6. 테스트 우선순위 및 초기 케이스

### Phase 1: Critical (1주)
- **포인트 적립/차감 정합성** (share, quiz, qr, exchange)
  - `server/routes/share.js`: transaction 로직 (라인 73-80)
  - User.points 일치 검증
  - Budget 소진 검증
  - Test: `test/backend/share.test.js`

- **JWT 인증 미들웨어**
  - `server/middleware/auth.js`: token 검증
  - Test: `test/backend/auth.test.js`

- **중복 방지 로직**
  - share_history UNIQUE(user_id, flyer_id)
  - quiz_attempts UNIQUE(user_id, flyer_id)
  - Test: `test/backend/duplicates.test.js`

### Phase 2: High (2주)
- **ScratchCard Canvas threshold**
  - 게스트 80%, 로그인 80% 모두 동일 (라인 7-8)
  - `src/components/ScratchCard.jsx`: percentage 계산 (라인 136-140)
  - Test: `test/frontend/ScratchCard.test.jsx`

- **게스트 vs 로그인 분기**
  - MainPage, DetailPage 로직
  - API 호출 차이 (share API 호출 조건)
  - Test: `test/frontend/flows.test.jsx`

- **API 계약 검증**
  - 요청/응답 형식 일치
  - `/api/share`, `/api/quiz`, `/api/qr`, `/api/gift-orders` 검증
  - Test: `test/integration/api-contract.test.js`

### Phase 3: Medium (3주)
- **Device fingerprint 다중계정 방지**
  - `server/routes/auth.js` 라인 24-31
  - Test: `test/backend/security.test.js`

- **Rate limiting**
  - `server/app.js` 라인 43-63
  - Test: `test/backend/ratelimit.test.js`

- **DB 스키마 초기화**
  - `server/db.js` 스키마 SQL
  - Test: `test/backend/db.test.js`

- **소셜 로그인 콜백**
  - `server/routes/social.js`
  - Test: `test/backend/social.test.js`

### Phase 4: Low (4주+)
- **UI 렌더링 및 상태**
- **접근성 (a11y) 검증**
- **에러 처리 및 복구**

---

## 7. 첫 테스트 케이스 예시

### 백엔드 포인트 적립 테스트
```javascript
// server/test/share.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import db from '../db'

describe('POST /api/share', () => {
  let user, flyer, token

  beforeEach(async () => {
    // DB 초기화
    await db.prepare('DELETE FROM users').run()
    await db.prepare('DELETE FROM flyers').run()

    // 테스트 데이터 생성
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'pass1234', nickname: 'Tester' })
    token = userRes.body.data.token
    user = userRes.body.data

    const flyerRes = await db.prepare(
      'INSERT INTO flyers (store_name, category, title, valid_from, valid_until, share_point) VALUES (?,?,?,?,?,?)'
    ).run('Store1', 'Mart', 'Title1', '2026.03.01', '2026.04.01', 50)
    flyer = { id: flyerRes.lastInsertRowid }
  })

  it('정상 공유 시 포인트 적립', async () => {
    // 긁기 세션 생성
    const sessionRes = await request(app)
      .post('/api/scratch-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, flyerId: flyer.id })
    const scratchToken = sessionRes.body.data.sessionToken

    // 공유
    const shareRes = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ flyerId: flyer.id, scratchToken })

    expect(shareRes.status).toBe(200)
    expect(shareRes.body.data.earnedPoints).toBe(50)

    // 유저 포인트 확인
    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
    expect(meRes.body.data.points).toBe(50)
  })

  it('중복 공유 시 409 반환', async () => {
    // 첫 번째 공유
    const sessionRes = await request(app)
      .post('/api/scratch-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.id, flyerId: flyer.id })
    const scratchToken = sessionRes.body.data.sessionToken

    await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ flyerId: flyer.id, scratchToken })

    // 두 번째 공유 시도
    const shareRes2 = await request(app)
      .post('/api/share')
      .set('Authorization', `Bearer ${token}`)
      .send({ flyerId: flyer.id, scratchToken })

    expect(shareRes2.status).toBe(409)
    expect(shareRes2.body.message).toMatch('이미 공유한')
  })
})
```

### 프론트엔드 ScratchCard 테스트
```javascript
// src/test/ScratchCard.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ScratchCard from '../components/ScratchCard'

describe('ScratchCard', () => {
  const mockFlyer = {
    id: 1,
    storeName: 'Store1',
    storeEmoji: '🏪',
    items: [{ name: 'Item1', originalPrice: 10000, salePrice: 5000 }]
  }

  it('80% 긁기 시 reveal 발생', async () => {
    const onComplete = vi.fn()
    const { container } = render(
      <ScratchCard
        flyer={mockFlyer}
        userId={1}
        isLoggedIn={true}
        onComplete={onComplete}
      />
    )

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()

    // Canvas 80% 긁기 시뮬레이션
    // (실제 구현: canvas imageData 조작 후 이벤트 발생)

    // reveal 이벤트 확인
    expect(onComplete).toHaveBeenCalled()
  })

  it('게스트 모드에서 긁기 작동', () => {
    const onGuestReveal = vi.fn()
    render(
      <ScratchCard
        flyer={mockFlyer}
        userId={null}
        isLoggedIn={false}
        onGuestReveal={onGuestReveal}
      />
    )

    // 게스트 긁기 시뮬레이션
    // expect(...).toBe(...)
  })
})
```

---

## 8. 지속 검증 권장사항

### 테스트 커버리지 목표
- **Critical 경로**: 90% 이상
- **High 우선순위**: 70% 이상
- **전체**: 50% 이상

### PR 검증 규칙
- ❌ npm test 실패 시 merge 불가
- ❌ 커버리지 10% 이상 감소 시 merge 불가
- ✅ 새 API 엔드포인트는 반드시 테스트 포함

### 테스트 실행 명령
```bash
# 프론트
npm run test                    # 단일 실행
npm run test:watch             # 감시 모드
npm run test:coverage          # 커버리지 리포트

# 백엔드
cd server && npm run test       # 단일 실행
cd server && npm run test:ui    # UI 대시보드
```

---

## 요약

| 항목 | 현황 | 평가 |
|------|------|------|
| 테스트 프레임워크 | 미설치 | ❌ Critical |
| 자동화 테스트 | 없음 (수동 스크립트만) | ❌ Critical |
| CI/CD 연동 | 없음 | ❌ Critical |
| 커버리지 | 0% | ❌ Critical |
| API 계약 검증 | 없음 | ❌ High |
| E2E 테스트 | 없음 | ❌ High |

**권장 조치**: Vitest + React Testing Library + Playwright 도입 (1개월 내)

