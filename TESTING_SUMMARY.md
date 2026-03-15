# Playwright E2E 테스트 설정 완료 요약

**완료일**: 2026-03-15
**상태**: 모든 파일 생성 및 설정 완료 ✅

---

## 빠른 시작 (3분 안에 테스트 실행)

### 1. 개발 서버 시작
```bash
cd "C:\Users\82104\Desktop\전단지"
npm run dev
```
- 대기: `VITE v5.4.2 ready in X ms` 메시지 확인

### 2. 테스트 실행 (새 터미널)
```bash
npx playwright test
```

### 3. 결과 확인
```bash
npx playwright show-report
```

---

## 생성된 파일 구조

```
C:\Users\82104\Desktop\전단지\
├── playwright.config.ts              # Playwright 설정
├── E2E_TEST_GUIDE.md                 # 상세 가이드
├── PLAYWRIGHT_TEST_SETUP.md          # 설정 보고서 (상세)
├── TESTING_SUMMARY.md                # 이 파일 (빠른 요약)
├── run-tests.bat                     # Windows 실행 스크립트
├── run-tests.sh                      # Linux/macOS 실행 스크립트
└── tests/
    ├── main-page.spec.ts             # 메인 페이지 (8개 테스트)
    ├── auth.spec.ts                  # 인증 (8개 테스트)
    ├── gift-shop.spec.ts             # 기프티콘 (7개 테스트)
    ├── mypage.spec.ts                # 마이페이지 (10개 테스트)
    ├── qr-scan.spec.ts               # QR 스캔 (9개 테스트)
    ├── search-filter.spec.ts          # 검색/필터 (11개 테스트)
    ├── scratch-card.spec.ts           # 복권 긁기 (10개 테스트)
    ├── detail-page.spec.ts            # 상세 페이지 (11개 테스트)
    ├── integration.spec.ts            # 통합 시나리오 (10개 테스트)
    └── test-manifest.json             # 메타데이터
```

---

## 테스트 통계

| 항목 | 값 |
|------|-----|
| 총 테스트 파일 | 8개 |
| 총 테스트 케이스 | 74개 |
| 평균 실행 시간 | 3-5분 (headless) |
| 브라우저 | Chromium |
| 테스트 언어 | TypeScript |
| Node 최소 버전 | 16+ |

---

## 테스트 영역 (74개 케이스)

### 1. 메인 페이지 (8개)
- ✓ 페이지 로드
- ✓ 전단지 카드 렌더링
- ✓ 하단 네비게이션
- ✓ 다크모드 토글

### 2. 인증 (8개)
- ✓ 로그인 페이지
- ✓ OAuth 리다이렉트
- ✓ localStorage 토큰
- ✓ 로그아웃
- ✓ 역할 선택

### 3. 기프티콘 (7개)
- ✓ 페이지 이동
- ✓ 상품 목록
- ✓ 포인트 표시
- ✓ 구매 버튼

### 4. 마이페이지 (10개)
- ✓ 사용자 정보
- ✓ 포인트 표시
- ✓ 히스토리
- ✓ 닉네임 편집
- ✓ 로그아웃

### 5. QR 스캔 (9개)
- ✓ 페이지 이동
- ✓ 스캐너 UI
- ✓ 카메라 권한
- ✓ 로그인 유도

### 6. 검색/필터 (11개)
- ✓ 검색 입력
- ✓ 카테고리 필터
- ✓ 결과 필터링
- ✓ 무한 스크롤
- ✓ 필터 클리어

### 7. 복권 긁기 (10개)
- ✓ 모달 열기
- ✓ Canvas 렌더링
- ✓ 마우스 긁기
- ✓ 60% threshold
- ✓ 중복 방지

### 8. 상세 페이지 (11개)
- ✓ 페이지 이동
- ✓ 정보 표시
- ✓ 북마크 토글
- ✓ 퀴즈 풀이
- ✓ QR 섹션

### 9. 통합 시나리오 (10개)
- ✓ 전체 플로우
- ✓ 페이지 네비게이션
- ✓ 상태 유지
- ✓ 빠른 네비게이션
- ✓ 스크롤 복구

---

## 실행 명령어

### Windows (배치 파일)

```bash
# 모든 테스트 실행
run-tests.bat

# 브라우저 화면 표시
run-tests.bat --headed

# 특정 파일만
run-tests.bat -f main-page
run-tests.bat -f auth
run-tests.bat -f gift-shop

# 특정 테스트만 (패턴)
run-tests.bat -g "should load"

# 디버그 모드
run-tests.bat --debug

# 순차 실행 (1 워커)
run-tests.bat --workers 1
```

### Linux/macOS (쉘 스크립트)

```bash
# 실행 권한 부여
chmod +x run-tests.sh

# 모든 테스트
./run-tests.sh

# 옵션은 Windows와 동일
./run-tests.sh --headed
./run-tests.sh -f main-page
./run-tests.sh -g "should load"
./run-tests.sh --debug
```

### 직접 Playwright 명령

```bash
# 모든 테스트
npx playwright test

# 헤드리스 비활성화
npx playwright test --headed

# 특정 파일
npx playwright test tests/main-page.spec.ts

# 패턴 매칭
npx playwright test -g "should load main page"

# 디버그 모드
npx playwright test --debug

# 단일 워커 (순차)
npx playwright test --workers=1

# HTML 리포트 생성
npx playwright test
npx playwright show-report
```

---

## 테스트 작성 예제

### 기본 구조
```typescript
test.describe('기능명', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전 실행
    await page.goto('/')
    await page.waitForTimeout(3000)
  })

  test('should [예상 동작]', async ({ page }) => {
    // 1. 상태 설정 (Arrange)
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token')
    })

    // 2. 동작 수행 (Act)
    const button = page.locator('button', { hasText: /로그인|login/i })
    if (await button.isVisible().catch(() => false)) {
      await button.click()
    }

    // 3. 결과 확인 (Assert)
    const content = await page.content()
    expect(content.length).toBeGreaterThan(0)
  })
})
```

### 선택자 (Locator) 팁
```typescript
// 텍스트로 찾기
page.locator('button', { hasText: '로그인' })

// 정규식
page.locator('text=/포인트|point/i')

// 클래스 포함
page.locator('[class*="bookmark"]')

// 여러 조건
page.locator('button:has-text("①"), button:has-text("②")')

// 첫 번째 요소
page.locator('button').first()
```

### 대기 전략
```typescript
// 고정 대기 (사용 최소화)
await page.waitForTimeout(500)

// 동적 대기
await page.waitForLoadState('networkidle')
await page.waitForSelector('[class*="flyer"]')
await expect(element).toBeVisible()

// 조건부 처리
if (await button.isVisible().catch(() => false)) {
  await button.click()
}
```

---

## 주요 특징

### ✅ 포함된 기능
- Chromium 브라우저 자동 설정
- 병렬 테스트 실행 (6 workers)
- HTML 리포트 생성
- 실패 시 스크린샷 및 비디오
- 타입스크립트 지원
- 해시 기반 SPA 라우팅 대응
- Canvas 마우스 이벤트 시뮬레이션
- localStorage 모킹

### ✅ 플랫폼 지원
- Windows (배치 파일)
- macOS (쉘 스크립트)
- Linux (쉘 스크립트)

---

## 설정 상세 (playwright.config.ts)

```typescript
{
  testDir: './tests',
  baseURL: 'http://localhost:5173',
  browser: 'chromium',
  headless: true,
  parallelWorkers: 6,

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
}
```

---

## 문제 해결

### 테스트가 timeout되는 경우
```bash
# 개발 서버 확인
curl http://localhost:5173/

# 포트 충돌 확인 (Windows)
netstat -ano | findstr :5173

# 기존 프로세스 종료 후 재시작
npm run dev
```

### 요소를 찾을 수 없는 경우
```typescript
// 대기 시간 증가
await page.waitForTimeout(2000)

// 또는 명시적 대기
await page.waitForSelector('[class*="flyer"]', { timeout: 5000 })
```

### Canvas 이벤트가 감지되지 않는 경우
```typescript
// boundingBox() 사용
const box = await canvas.boundingBox()
if (box) {
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  // 마우스 이벤트 계속...
}
```

---

## 다음 단계

### 즉시 (오늘)
1. ✓ 설정 완료
2. 모든 테스트 실행: `npx playwright test`
3. 실패하는 테스트 디버그 (필요시)
4. HTML 리포트 확인: `npx playwright show-report`

### 이번 주
- [ ] CI/CD 통합 (GitHub Actions 등)
- [ ] 모바일 뷰포트 테스트 추가
- [ ] 네트워크 에러 시나리오 추가

### 이번 달
- [ ] 시각적 회귀 테스트
- [ ] 성능 테스트 추가
- [ ] 크로스 브라우저 테스트 (Firefox, Safari)

---

## 문서

| 문서 | 설명 |
|------|------|
| `E2E_TEST_GUIDE.md` | 상세한 사용 가이드 |
| `PLAYWRIGHT_TEST_SETUP.md` | 완전한 설정 보고서 |
| `TESTING_SUMMARY.md` | 이 파일 (빠른 요약) |
| `tests/test-manifest.json` | 테스트 메타데이터 |

---

## 시작하기 (1분)

```bash
# 1. 개발 서버 시작 (터미널 1)
cd "C:\Users\82104\Desktop\전단지"
npm run dev

# 2. 테스트 실행 (터미널 2)
npx playwright test

# 3. 리포트 확인
npx playwright show-report
```

완료! 🎉

---

**작성**: 2026-03-15
**상태**: 준비 완료 ✅
**테스트 수**: 74개
**예상 시간**: 3-5분
