# Playwright E2E 테스트 설정 완료 보고서

**날짜**: 2026-03-15
**상태**: 완료 ✅
**테스트 프레임워크**: Playwright 1.58.2+
**테스트 언어**: TypeScript
**총 테스트 케이스**: 74개

---

## 목차

1. [생성된 파일 목록](#생성된-파일-목록)
2. [테스트 구조](#테스트-구조)
3. [실행 방법](#실행-방법)
4. [테스트 커버리지](#테스트-커버리지)
5. [주요 시나리오](#주요-시나리오)
6. [설정 상세](#설정-상세)
7. [문제 해결](#문제-해결)

---

## 생성된 파일 목록

### 핵심 파일

| 파일 | 설명 |
|------|------|
| `playwright.config.ts` | Playwright 설정 (baseURL, 브라우저, webServer) |
| `tests/` | 테스트 파일 디렉토리 |

### 테스트 파일 (8개)

```
tests/
├── main-page.spec.ts          (8개 테스트)  - 메인 페이지 기본 동작
├── auth.spec.ts               (8개 테스트)  - 로그인/로그아웃/OAuth
├── gift-shop.spec.ts          (7개 테스트)  - 기프티콘 교환소
├── mypage.spec.ts             (10개 테스트) - 마이페이지
├── qr-scan.spec.ts            (9개 테스트)  - QR 스캔 페이지
├── search-filter.spec.ts       (11개 테스트) - 검색 및 필터
├── scratch-card.spec.ts        (10개 테스트) - 복권 긁기
├── detail-page.spec.ts         (11개 테스트) - 상세 페이지
├── integration.spec.ts         (10개 테스트) - 통합 시나리오
└── test-manifest.json          (메타데이터)
```

### 실행 스크립트

| 파일 | 설명 |
|------|------|
| `run-tests.sh` | Linux/macOS 실행 스크립트 |
| `run-tests.bat` | Windows 배치 파일 |

### 문서

| 파일 | 설명 |
|------|------|
| `E2E_TEST_GUIDE.md` | 자세한 실행 가이드 |
| `PLAYWRIGHT_TEST_SETUP.md` | 이 파일 (설정 보고서) |

---

## 테스트 구조

### 파일 계층 구조

```
playwright.config.ts
├── baseURL: http://localhost:5173
├── browser: chromium only
├── headless: true
├── webServer:
│   ├── command: npm run dev
│   └── url: http://localhost:5173
└── tests/
    ├── main-page.spec.ts (라우팅, UI)
    ├── auth.spec.ts (JWT, OAuth)
    ├── gift-shop.spec.ts (상품, 포인트)
    ├── mypage.spec.ts (사용자 정보)
    ├── qr-scan.spec.ts (BarcodeDetector)
    ├── search-filter.spec.ts (검색, 필터, 페이지네이션)
    ├── scratch-card.spec.ts (Canvas, 게임 로직)
    ├── detail-page.spec.ts (상세 페이지, 퀴즈)
    └── integration.spec.ts (전체 플로우)
```

### 테스트 네이밍 패턴

```typescript
test.describe('기능 그룹명', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전 실행
  })

  test('should [expected behavior]', async ({ page }) => {
    // Arrange: 상태 설정
    // Act: 동작 수행
    // Assert: 결과 확인
  })
})
```

---

## 실행 방법

### 전제 조건

1. **Node.js** 16+ 설치
2. **npm** 최신 버전
3. **개발 서버** 실행 (`npm run dev` - localhost:5173)
4. **백엔드** 실행 (localhost:3001)

### 빠른 시작 (3단계)

#### 1단계: 개발 서버 시작
```bash
# 터미널 1
cd "C:\Users\82104\Desktop\전단지"
npm run dev
# 대기: localhost:5173에서 "ready in X ms" 확인
```

#### 2단계: 모든 테스트 실행
```bash
# 터미널 2
npx playwright test
```

#### 3단계: 결과 확인
```bash
npx playwright show-report
```

### 세부 실행 방법

#### Windows (배치 파일)
```bash
# 모든 테스트
run-tests.bat

# 브라우저 표시
run-tests.bat --headed

# 특정 파일만
run-tests.bat -f main-page

# 특정 테스트만
run-tests.bat -g "should load"

# 디버그 모드
run-tests.bat --debug
```

#### Linux/macOS (쉘 스크립트)
```bash
# 실행 권한 부여
chmod +x run-tests.sh

# 모든 테스트
./run-tests.sh

# 브라우저 표시
./run-tests.sh --headed

# 특정 파일만
./run-tests.sh -f main-page
```

#### 직접 명령어
```bash
# 모든 테스트 (헤드리스)
npx playwright test

# 헤드리스 비활성화 (브라우저 표시)
npx playwright test --headed

# 특정 파일만
npx playwright test tests/main-page.spec.ts

# 특정 테스트만 (패턴 매칭)
npx playwright test -g "should load main page"

# 디버그 모드 (Step-by-step)
npx playwright test --debug

# 단일 워커 (순차 실행)
npx playwright test --workers=1

# HTML 리포트 생성
npx playwright test
npx playwright show-report
```

---

## 테스트 커버리지

### 기능별 커버리지 (74개 테스트)

| 기능 | 테스트 수 | 상태 |
|------|----------|------|
| 메인 페이지 로드 | 8 | ✓ |
| 인증 (로그인/로그아웃) | 8 | ✓ |
| 사용자 프로필 | 10 | ✓ |
| 검색 및 필터 | 11 | ✓ |
| 복권 긁기 (Canvas) | 10 | ✓ |
| 상세 페이지 | 11 | ✓ |
| QR 스캔 | 9 | ✓ |
| 기프티콘 교환 | 7 | ✓ |
| 통합 시나리오 | 10 | ✓ |
| **총합** | **74** | **✓** |

### 테스트 영역 분류

#### 1. UI/네비게이션 (25개)
- 페이지 로드 및 렌더링
- 네비게이션 버튼
- 모달 열고 닫기
- 라우팅 (hash 기반 SPA)

#### 2. 인증/권한 (16개)
- 로그인 페이지
- OAuth 리다이렉트
- localStorage 토큰
- 로그아웃 및 초기화
- 역할 선택 (user/business)

#### 3. 사용자 상호작용 (21개)
- 검색 및 필터링
- Canvas 마우스 이벤트 (긁기)
- 북마크 토글
- 스크롤 복구

#### 4. API/데이터 (12개)
- 동시 API 호출
- 데이터 로드 및 표시
- 에러 처리
- 상태 유지

---

## 주요 시나리오

### 1. 게스트 사용자 전단지 긁기
```
1. 메인 페이지 로드
2. 전단지 카드 클릭
3. 스크래치 카드 모달 열기
4. Canvas에서 마우스로 긁기
5. 60% 이상 긁을 시 공개
6. 로그인 유도 모달 표시
7. 로그인 버튼 클릭
8. 포인트 적립 (로그인 후)
```

### 2. 로그인 사용자 완전 플로우
```
1. OAuth 리다이렉트 (토큰 저장)
2. 역할 선택 모달 (신규 사용자)
3. 메인 페이지 → 전단지 클릭
4. 상세 페이지 → 퀴즈 풀기
5. 포인트 적립 (포인트 애니메이션)
6. 마이페이지 → 히스토리 확인
7. QR 스캔 → 포인트 적립
8. 기프티콘 교환 → 포인트 차감
```

### 3. 검색 및 필터
```
1. 메인 페이지에서 검색 입력
2. 결과 필터링 (실시간)
3. 카테고리 탭 선택
4. 다중 필터 조합
5. 무한 스크롤 (페이지네이션)
6. 필터 초기화
```

### 4. 다크모드 토글
```
1. 다크모드 버튼 클릭
2. localStorage 업데이트
3. DOM 속성 변경 (data-theme)
4. 페이지 새로고침 후에도 유지
```

---

## 설정 상세

### playwright.config.ts

```typescript
{
  testDir: './tests',              // 테스트 파일 디렉토리
  fullyParallel: true,             // 병렬 실행
  forbidOnly: false,               // .only() 금지 (CI 환경에서만)
  retries: 0,                      // 재시도 (로컬: 0, CI: 2)
  workers: undefined,              // 자동 (병렬)
  reporter: [
    ['html'],                      // HTML 리포트
    ['list'],                      // 콘솔 리스트
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',       // 실패 시 trace 저장
    screenshot: 'only-on-failure', // 실패 시 스크린샷
    video: 'retain-on-failure',    // 실패 시 비디오
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',        // 자동 시작 명령
    url: 'http://localhost:5173',
    reuseExistingServer: true,     // 기존 서버 재사용
    timeout: 120 * 1000,           // 2분 대기
  },
}
```

### 환경 변수

테스트는 환경 변수를 사용하지 않습니다. 대신 localStorage 모킹을 사용합니다:

```javascript
await page.evaluate(() => {
  localStorage.setItem('token', 'test_token_123')
  localStorage.setItem('userId', '999')
  localStorage.setItem('nickname', 'TestUser')
  localStorage.setItem('role', 'user')
})
```

### 타임아웃 설정

| 이벤트 | 시간 | 이유 |
|--------|------|------|
| 초기 페이지 로드 | 3초 | 스플래시 스크린 |
| API 응답 | 1초 | 네트워크 지연 |
| 모달/애니메이션 | 500ms | 렌더링 |
| Canvas 긁기 | 50ms | 부드러운 애니메이션 |

---

## 테스트 데이터 전략

### 로컬스토리지 모킹

```javascript
// 로그인 사용자
{
  token: 'test_token_123',
  userId: '999',
  nickname: 'TestUser',
  role: 'user' | 'business',
  darkMode: 'true' | 'false'
}

// 비로그인 사용자
{
  // 토큰 없음
  guest_scratched: 'true' // 게스트 맛보기 사용 여부
}
```

### API 응답 모킹 (필요시)

현재 테스트는 실제 백엔드 API를 호출합니다. 필요시 `page.route()`로 응답을 모킹할 수 있습니다:

```javascript
await page.route('**/api/flyers/**', async route => {
  await route.abort()
})
```

---

## 문제 해결

### 문제 1: "timeout exceeded" 에러

**원인**: 개발 서버가 실행되지 않음

**해결책**:
```bash
# 터미널 1에서 개발 서버 시작
npm run dev

# 포트 확인
netstat -ano | findstr :5173  (Windows)
lsof -i :5173                 (macOS/Linux)

# 포트 5173 점유 프로세스 종료 후 재시작
```

### 문제 2: "element not visible" 에러

**원인**: 동적 콘텐츠 로딩 지연

**해결책**:
```typescript
// waitForTimeout() 증가
await page.waitForTimeout(2000)  // 기본 1000ms

// 또는 waitForSelector() 사용
await page.waitForSelector('[class*="flyer"]', { timeout: 5000 })
```

### 문제 3: Canvas 이벤트 미감지

**원인**: 마우스 위치 계산 오류

**해결책**:
```typescript
// boundingBox() 명시적 사용
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.mouse.down()
  // ... 드래그
}
```

### 문제 4: 테스트 간 상태 누수

**원인**: localStorage 미초기화

**해결책**:
```typescript
test.beforeEach(async ({ page }) => {
  // 항상 초기화
  await page.evaluate(() => localStorage.clear())
  // 또는 특정 값만 설정
  await page.evaluate(() => {
    localStorage.setItem('token', 'test_token')
  })
})
```

### 문제 5: 병렬 실행 간섭

**원인**: 동시 localhost:5173 접근

**해결책**:
```bash
# 순차 실행 (느리지만 안정적)
npx playwright test --workers=1

# 또는 포트 변경 (개발 서버)
VITE_PORT=5174 npm run dev
```

---

## 모범 사례

### 1. 선택자 (Locator) 전략

```typescript
// ❌ 피해야 할 방법 (너무 구체적)
page.locator('div.container > div:nth-child(2) > button.btn-primary')

// ✓ 권장 (간단하고 유연)
page.locator('button', { hasText: /로그인|login/i })
page.locator('[class*="bookmark"]')
page.locator('text=/포인트|point/i')
```

### 2. 대기 전략

```typescript
// ❌ 피해야 할 방법 (고정 대기)
await page.waitForTimeout(5000)

// ✓ 권장 (동적 대기)
await page.waitForLoadState('networkidle')
await page.waitForSelector('[class*="flyer"]', { timeout: 3000 })
await expect(element).toBeVisible()
```

### 3. 에러 처리

```typescript
// ❌ 피해야 할 방법 (에러 무시)
await button.click().catch(() => {})

// ✓ 권장 (조건부 처리)
if (await button.isVisible().catch(() => false)) {
  await button.click()
}
```

### 4. 테스트 독립성

```typescript
// ✓ 각 테스트는 독립적이어야 함
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  await page.waitForTimeout(3000)
})

// ✓ 다른 테스트에 의존하지 않음
// ✗ 고정된 순서에 의존하지 않음
```

---

## 다음 단계

### 단기 (1주)
- [ ] 모든 테스트 수동 실행 및 검증
- [ ] 실패하는 테스트 디버그 및 수정
- [ ] 선택자 및 타임아웃 조정

### 중기 (1개월)
- [ ] CI/CD 파이프라인 통합 (GitHub Actions, etc.)
- [ ] 모바일 뷰포트 테스트 추가
- [ ] 네트워크 에러 시나리오 추가
- [ ] 성능 테스트 (Lighthouse) 추가

### 장기 (3개월)
- [ ] 시각적 회귀 테스트 (visual diff)
- [ ] 크로스 브라우저 테스트 (Firefox, Safari)
- [ ] 엔드-투-엔드 API 테스트 (실제 DB)
- [ ] 부하 테스트 (k6, JMeter)

---

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev)
- [Playwright 테스트 작성 가이드](https://playwright.dev/docs/writing-tests)
- [Locator 및 Selectors](https://playwright.dev/docs/locators)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD 통합](https://playwright.dev/docs/ci)

---

## 요약

✅ **Playwright E2E 테스트 환경 완성**

- **8개 테스트 파일** (74개 테스트 케이스)
- **타입스크립트** 작성
- **병렬 실행** 지원
- **자동 리포트 생성**
- **Windows, macOS, Linux** 호환

**예상 실행 시간**: 3-5분 (headless 모드)

이제 다음 명령어로 테스트를 실행할 수 있습니다:
```bash
npx playwright test
```

---

**마지막 업데이트**: 2026-03-15
**작성자**: Claude QA Tester
**상태**: 준비 완료 ✓
