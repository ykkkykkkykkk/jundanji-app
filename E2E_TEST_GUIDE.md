# E2E 테스트 실행 가이드

Playwright를 사용한 전단지P 앱의 E2E 테스트 가이드입니다.

## 설정 완료 사항

✅ `playwright.config.ts` - Playwright 설정 파일 생성
✅ `tests/` 디렉토리 - 테스트 파일 8개 작성:
  - `main-page.spec.ts` - 메인 페이지 기본 동작
  - `auth.spec.ts` - 로그인, 로그아웃, OAuth 리다이렉트
  - `gift-shop.spec.ts` - 기프티콘 교환소 페이지
  - `mypage.spec.ts` - 마이페이지, 사용자 정보
  - `qr-scan.spec.ts` - QR 스캔 페이지
  - `search-filter.spec.ts` - 검색 및 카테고리 필터
  - `scratch-card.spec.ts` - 복권 긁기 (스크래치 카드)
  - `detail-page.spec.ts` - 전단지 상세 페이지
  - `integration.spec.ts` - 통합 시나리오 (페이지 간 네비게이션 등)

## 실행 방법

### 1. 개발 서버 시작 (터미널 1)
```bash
cd "C:\Users\82104\Desktop\전단지"
npm run dev
```
- Vite dev server가 `localhost:5173`에서 실행됨
- 서버 시작 대기 시간: 약 3-5초

### 2. 테스트 실행 (터미널 2)

#### 모든 테스트 실행
```bash
npx playwright test
```

#### 특정 테스트 파일만 실행
```bash
npx playwright test tests/main-page.spec.ts
npx playwright test tests/auth.spec.ts
npx playwright test tests/gift-shop.spec.ts
```

#### 특정 테스트 케이스만 실행
```bash
npx playwright test -g "should load main page"
npx playwright test -g "should navigate to gift shop"
```

#### 헤드리스 모드 비활성화 (브라우저 화면 표시)
```bash
npx playwright test --headed
```

#### 단일 브라우저로 순차 실행
```bash
npx playwright test --workers=1
```

#### 디버그 모드
```bash
npx playwright test --debug
```

#### HTML 리포트 생성
```bash
npx playwright test
npx playwright show-report
```

## 테스트 시나리오 개요

### Main Page (`main-page.spec.ts`)
- 페이지 로드 확인
- 전단지 카드 렌더링
- 하단 네비게이션 표시
- 다크모드 토글

### Authentication (`auth.spec.ts`)
- 로그인 페이지 진입
- OAuth 리다이렉트 처리
- localStorage 토큰 저장
- 로그아웃 및 상태 초기화
- 역할 선택 모달 (신규 사용자)

### Gift Shop (`gift-shop.spec.ts`)
- 기프티콘 교환소 페이지 이동
- 상품 목록 표시
- 포인트 표시
- 상품 구매 버튼

### My Page (`mypage.spec.ts`)
- 마이페이지 네비게이션
- 사용자 닉네임, 포인트 표시
- 히스토리 탭 (공유, 퀴즈, 방문)
- 닉네임 편집
- 로그아웃 버튼

### QR Scan (`qr-scan.spec.ts`)
- QR 스캔 페이지 네비게이션
- 카메라 권한 요청
- 비로그인 사용자 로그인 유도

### Search & Filter (`search-filter.spec.ts`)
- 검색 입력 필드
- 검색 수행
- 카테고리 필터
- 필터 클리어
- 결과 없음 상태
- 무한 스크롤 페이지네이션

### Scratch Card (`scratch-card.spec.ts`)
- 스크래치 카드 모달 열기
- Canvas 렌더링
- 마우스 이벤트로 긁기 시뮬레이션
- 60% threshold 감지
- 비로그인 사용자 로그인 유도
- 중복 긁기 방지

### Detail Page (`detail-page.spec.ts`)
- 상세 페이지 네비게이션
- 전단지 정보 표시
- 북마크 토글
- 퀴즈 섹션
- QR 섹션
- 공유 기능

### Integration (`integration.spec.ts`)
- 전체 플로우: 보기 → 북마크 → 상세
- 모든 페이지 간 네비게이션
- 상태 유지 (로그인, 다크모드)
- 빠른 연속 네비게이션
- 스크롤 위치 복구
- 로그인/로그아웃 전환

## 주요 설정

### playwright.config.ts
- **baseURL**: http://localhost:5173
- **browser**: Chromium only
- **headless**: true (기본값)
- **webServer**: 자동 dev server 시작 및 재사용
- **screenshot**: 실패 시에만 캡처
- **video**: 실패 시에만 녹화

## 테스트 데이터

테스트는 **localStorage 모킹**을 사용합니다:
- `token`: 'test_token_123'
- `userId`: '999'
- `nickname`: 'TestUser'
- `role`: 'user' / 'business'

## 예상 결과

모든 테스트가 통과하면:
- ✅ 8개 테스트 파일
- ✅ 약 80개 개별 테스트 케이스
- ✅ 평균 실행 시간: 3-5분 (headless 모드)

## 테스트 실패 시 확인 사항

1. **개발 서버 확인**
   ```bash
   curl http://localhost:5173/
   ```

2. **포트 충돌 확인**
   ```bash
   # Windows에서 포트 5173 사용 여부
   netstat -ano | findstr :5173
   ```

3. **브라우저 설치 확인**
   ```bash
   npx playwright install
   ```

4. **의존성 확인**
   ```bash
   npm install
   ```

## 추가 리소스

- [Playwright 공식 문서](https://playwright.dev)
- [Playwright 디버깅 가이드](https://playwright.dev/docs/debug)
- [React 컴포넌트 테스트](https://playwright.dev/docs/locators)

## 주의사항

1. **해시 기반 라우팅**: 앱이 `#` 기반 SPA 라우팅을 사용하므로, 네비게이션 시 `/#page` 형식 사용
2. **동적 콘텐츠**: API 호출로 인한 로딩 지연을 고려하여 `waitForTimeout()` 사용
3. **모바일 뷰포트**: 기본 설정은 데스크톱 (1280x720) - 모바일 테스트는 별도 프로젝트 추가 필요
4. **스플래시 스크린**: 초기 로딩 시 3초 대기하여 스플래시 스크린 완료 확인

---

**마지막 업데이트**: 2026-03-15
**Playwright 버전**: 1.58.2+
