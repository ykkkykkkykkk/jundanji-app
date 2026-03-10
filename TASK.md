# 전단지 앱 - 프로젝트 진행 현황

> 마지막 업데이트: 2026-03-09 (v3.5 포인트 출금 플로우)

---

## 프로젝트 개요
- **앱명**: 전단지P (전단지 공유 포인트 앱)
- **프론트엔드**: React 18 + Vite + 순수 CSS, 모바일 퍼스트 (max-width: 430px)
- **백엔드**: Node.js + Express (`server/` 폴더)
- **DB**: SQLite (better-sqlite3)

---

## v2.0 구조 개편 (2026-02-25) ✅

### 신규 기능

#### 1. 복권 긁기 ✅
- [x] HTML5 Canvas 기반 긁기 오버레이 (`ScratchCard.jsx`)
- [x] 터치/마우스 이벤트 지원 (`destination-out` 컴포지팅)
- [x] 60% 이상 긁으면 자동 공개 → 상세 페이지 이동
- [x] 진행 바 표시, 다크모드 지원

#### 2. 랜덤 퀴즈 ✅
- [x] 사업자가 전단지별 퀴즈 3~5개 등록 (`server/routes/quiz.js`)
- [x] 사용자 진입 시 랜덤 1문제 출제 (전단지당 1회)
- [x] 정답 시 10~50포인트 적립
- [x] 퀴즈 모달 UI (`QuizModal.jsx`) — slide-up, 결과 표시
- [x] 상세 페이지에 퀴즈 참여 완료 배지

#### 3. QR 방문 인증 ✅
- [x] 사업자 QR 코드 생성 (`server/routes/qr.js`)
- [x] QR 스캔 페이지 (`QrScanPage.jsx`) — BarcodeDetector API
- [x] 카메라 미지원 시 수동 입력 폴백
- [x] 스캔 성공 시 100~500포인트 적립 (전단지당 1회)
- [x] QR 디스플레이 (`QrDisplay.jsx`) — 복사/다운로드

#### 4. 자영업자 대시보드 ✅
- [x] AdminPage 4탭 개편 (전단지/퀴즈/QR/통계)
- [x] 퀴즈 등록 에디터 — 3~5문제, 4지선다, 정답/포인트 설정
- [x] QR 코드 생성/조회/재생성
- [x] 통계 대시보드 (전단지수, 공유수, 퀴즈응시, 방문인증, 배포포인트)
- [x] 사업자 전용 API (`server/routes/business.js`)

#### 5. 마이페이지 개선 ✅
- [x] 3탭 히스토리 (공유/퀴즈/방문)
- [x] 포인트 분류 표시 (공유 포인트/퀴즈 포인트/방문 포인트)
- [x] 퀴즈 내역 — 정답/오답, 포인트
- [x] 방문 내역 — 매장명, 날짜, 포인트

### 인프라 변경
- [x] `users` 테이블에 `role` 컬럼 추가 ('user' | 'business')
- [x] `flyers` 테이블에 `qr_point`, `owner_id`, `qr_code` 컬럼 추가
- [x] 신규 테이블: `quizzes`, `quiz_attempts`, `visit_verifications`
- [x] 회원가입 시 역할 선택 (일반/사업자)
- [x] BottomNav 역할 기반 탭 (일반: 홈/마이/QR스캔, 사업자: +사업자)
- [x] 퀴즈 시드 데이터 9개 (이마트/스타벅스/교촌치킨)

### 포인트 구조
| 활동 | 포인트 | 설정자 |
|------|--------|--------|
| 전단지 공유 | share_point | 자영업자 |
| 퀴즈 정답 | 10~50 | 자영업자 (문제별) |
| QR 방문 인증 | 100~500 | 자영업자 (전단지별) |

---

## v1.0 기존 기능 (유지) ✅

### 프론트엔드
- [x] 메인 페이지 — 카테고리 필터, 검색, 무한 스크롤
- [x] 상세 페이지 — 상품 목록, 할인율, 공유 버튼
- [x] 포인트 애니메이션 모달
- [x] 다크모드 (CSS 변수 기반)
- [x] 알림 페이지
- [x] 즐겨찾기/북마크
- [x] 포인트 교환 (기프티콘 3종)
- [x] 스플래시 화면
- [x] PWA

### 백엔드
- [x] 전단지 CRUD + 페이지네이션
- [x] JWT 인증 + 소셜 로그인 (카카오/구글)
- [x] 공유/포인트 시스템
- [x] Web Push 알림
- [x] 즐겨찾기 API
- [x] Vercel 배포 지원

---

## v3.0 관리자 어드민 페이지 (2026-02-26) ✅

### 신규 기능

#### 슈퍼 관리자 어드민 대시보드 ✅
- [x] Vite Multi-Page App 구조 (`admin.html` 별도 엔트리)
- [x] Tailwind CSS v4 + PostCSS (admin 전용, 기존 CSS 영향 없음)
- [x] 비밀번호 인증 로그인 (비밀번호: `admin1234`)
- [x] 클린 라이트 디자인 + 브랜드 오렌지(#FF6B00)
- [x] 좌측 사이드바 네비게이션

#### 5개 관리 페이지 ✅
- [x] **대시보드** — 유저수, 전단지수, 포인트 매출, 긁기수 통계 + 최근 활동
- [x] **전단지 관리** — 전체 전단지 목록, 검색, 상태 필터, 승인/차단
- [x] **유저 관리** — 전체 유저 목록, 검색, 역할 필터, 정지/해제
- [x] **포인트 정산** — 출금 신청 목록, 상태 필터, 승인/거절
- [x] **자영업자 관리** — 자영업자 목록, 가입 승인/거절

### 인프라 변경
- [x] `users` 테이블에 `status`, `business_approved` 컬럼 추가
- [x] `flyers` 테이블에 `status` 컬럼 추가
- [x] 신규 테이블: `withdrawals` (출금 신청)
- [x] 신규 라우트: `server/routes/admin.js` (10개 엔드포인트)
- [x] `/admin` URL 리다이렉트 Vite 플러그인

---

## 파일 구조

```
전단지/
├── admin.html                   # [NEW] 어드민 엔트리 포인트
├── postcss.config.js            # [NEW] Tailwind PostCSS 설정
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── api/
│   │   └── index.js
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   ├── PointAnimation.jsx
│   │   ├── SplashScreen.jsx
│   │   ├── ScratchCard.jsx
│   │   ├── QuizModal.jsx
│   │   ├── QrScanner.jsx
│   │   ├── QrDisplay.jsx
│   │   └── ImageCropper.jsx    # [NEW] 이미지 크롭 편집기
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── MainPage.jsx
│   │   ├── DetailPage.jsx
│   │   ├── MyPage.jsx
│   │   ├── AdminPage.jsx
│   │   ├── QrScanPage.jsx
│   │   └── NotificationPage.jsx
│   └── admin/                   # [NEW] 관리자 앱
│       ├── main.jsx
│       ├── index.css
│       ├── App.jsx
│       ├── api.js
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── StatsCard.jsx
│       │   └── DataTable.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── FlyersPage.jsx
│           ├── UsersPage.jsx
│           ├── PointsPage.jsx
│           └── BusinessPage.jsx
├── server/
│   ├── db.js                    # 스키마 확장 (admin 관련)
│   ├── app.js                   # admin 라우터 추가
│   ├── routes/
│   │   ├── admin.js             # [NEW] 관리자 API
│   │   ├── quiz.js
│   │   ├── qr.js
│   │   ├── business.js
│   │   ├── flyers.js
│   │   ├── auth.js
│   │   ├── share.js
│   │   ├── notifications.js
│   │   ├── bookmarks.js
│   │   ├── push.js
│   │   └── social.js
│   └── data.db
└── TASK.md
```

---

## v3.1 안정화 패치 (2026-02-28) ✅

### 버그 수정

#### Vercel 인메모리 DB 안정화 ✅
- [x] Vercel 환경에서 FK 제약조건 비활성화 (콜드스타트 시 유저 없음 문제 방지)
- [x] 모든 FK 제약조건에 ON DELETE CASCADE 추가 (7개 테이블)
- [x] `db.ensureUser(userId)` 헬퍼 함수 추가 (유저 자동 생성)

#### 트랜잭션 에러 핸들링 ✅
- [x] share.js — 공유/포인트 사용 트랜잭션 try-catch
- [x] quiz.js — 퀴즈 등록/응시 트랜잭션 try-catch
- [x] qr.js — QR 인증 트랜잭션 try-catch
- [x] business.js — 포인트 충전 트랜잭션 try-catch
- [x] admin.js — 출금 처리 트랜잭션 try-catch

#### FK 참조 무결성 보호 ✅
- [x] bookmarks.js — 북마크 추가 전 유저 존재 확인/자동 생성
- [x] share.js — 공유/포인트 조회 시 유저 자동 생성
- [x] quiz.js — 퀴즈 응시 전 유저 자동 생성
- [x] qr.js — QR 인증 전 유저 자동 생성
- [x] social.js — 소셜 로그인 유저 생성 에러 핸들링 강화

#### 이전 패치 (Vercel 배포 관련)
- [x] 카카오 OAuth KOE010 에러 해결 (Client Secret 추가)
- [x] FRONTEND_URL 환경변수 설정 (localhost 리다이렉트 방지)
- [x] 역할 선택 모달 클릭 불가 / 반복 표시 문제 해결
- [x] /admin 라우팅 수정 (admin.html로 연결)
- [x] 전단지 등록 시 owner_id FK 검증 추가

---

## v3.2 카테고리 관리 기능 (2026-03-03) ✅

### 신규 기능

#### 카테고리 CRUD 관리 ✅
- [x] `server/db.js` — categories 테이블 (name UNIQUE, sort_order) + 시드 11개
- [x] `server/routes/admin.js` — GET/POST/PATCH/DELETE 4개 엔드포인트
- [x] `server/routes/flyers.js` — 카테고리 API를 categories 테이블 조회로 변경
- [x] `src/admin/api.js` — getCategories, addCategory, updateCategory, deleteCategory
- [x] `src/admin/components/Sidebar.jsx` — 카테고리 관리 메뉴 추가
- [x] `src/admin/App.jsx` — CategoriesPage 등록
- [x] `src/admin/pages/CategoriesPage.jsx` — 카테고리 관리 페이지 (DataTable 패턴)

### 카테고리 시드 데이터
마트, 편의점, 카페, 음식점, 패션, 뷰티, 가전, 온라인, 엔터, 생활용품, **운동**

---

## v3.3 이미지 크롭 에디터 (2026-03-03) ✅

### 신규 기능

#### 이미지 크롭 편집기 ✅
- [x] `src/components/ImageCropper.jsx` — 크롭 에디터 컴포넌트 (신규)
  - 모달 오버레이 (z-index 600)
  - 340:400 (17:20) 고정 비율 크롭 프레임 (뷰포트 306x360)
  - 마우스/터치 드래그로 이미지 위치 조절
  - 슬라이더 + 핀치줌 확대/축소
  - cover 방식 최소 스케일 → 빈 영역 발생 불가
  - 경계 clamp로 크롭 프레임 밖 노출 방지
  - Canvas로 340x400 JPEG Blob 생성 (품질 0.92)
- [x] `src/pages/AdminPage.jsx` — 크롭 모달 연동
  - showCropper/rawImageSrc 상태 추가
  - 파일 선택 → 크롭 모달 → Blob→File 변환 → 기존 FormData 전송
  - 업로드 힌트에 "권장 사이즈: 340 x 400px" 추가
- [x] `src/App.css` — 크롭 에디터 스타일 추가 (브랜드 컬러 #FF4757)

### 파일 변경
| 파일 | 작업 |
|------|------|
| `src/components/ImageCropper.jsx` | 신규 생성 |
| `src/pages/AdminPage.jsx` | 크롭 모달 연동 |
| `src/App.css` | 크롭 에디터 스타일 |

---

## v3.5 포인트 출금 플로우 (2026-03-09) ✅

### 신규 기능

#### 사용자 출금 신청 ✅
- [x] `server/routes/withdrawal.js` — 출금 라우트 신규 생성
  - `POST /api/withdrawals` — 출금 신청 (검증: 최소 1,000P, 최대 500,000P, 중복 방지)
  - `GET /api/users/:userId/withdrawals` — 출금 내역 조회 (최근 50건)
  - `GET /api/banks` — 은행 목록 조회 (19개 은행)
- [x] `server/app.js` — withdrawal 라우터 등록
- [x] `src/api/index.js` — requestWithdrawal, getWithdrawalHistory, getBanks 함수 추가

#### MyPage 출금 신청 UI ✅
- [x] 출금 신청 폼 (금액, 은행 선택, 계좌번호, 예금주)
- [x] "전액" 버튼 (보유 포인트 전액 입력)
- [x] 실시간 입력 검증 (금액 부족, 필수값 체크)
- [x] 출금 내역 토글 (대기/승인/거절 상태 배지)
- [x] 다크모드 지원

#### 출금 검증 로직 ✅
- [x] 최소 출금액: 1,000P
- [x] 최대 출금액: 500,000P
- [x] 포인트 잔액 확인
- [x] 대기 중인 출금 신청 중복 방지
- [x] 계좌번호 형식 검증 (8~20자리)
- [x] 예금주명 최소 2자

### 파일 변경
| 파일 | 작업 |
|------|------|
| `server/routes/withdrawal.js` | 신규 생성 — 출금 API |
| `server/app.js` | withdrawal 라우터 등록 |
| `src/api/index.js` | 출금 API 클라이언트 함수 3개 |
| `src/pages/MyPage.jsx` | 출금 신청 폼 + 출금 내역 UI |
| `src/App.css` | 출금 관련 스타일 추가 |

### 출금 플로우
```
사용자: MyPage → 출금 신청 폼 작성 → 제출
  ↓
서버: 검증 (금액/잔액/중복) → withdrawals 테이블 INSERT (status: pending)
  ↓
관리자: /admin → 포인트 정산 → 승인/거절
  ↓ (승인 시)
서버: 포인트 차감 + point_transactions 기록
```

---

## v3.4 성능 최적화 (2026-03-09) ✅

### 코드 스플리팅 (React.lazy + Suspense) ✅
- [x] DetailPage, MyPage, LoginPage, AdminPage, NotificationPage, QrScanPage lazy 로드
- [x] ScratchCard, PointAnimation 모달 컴포넌트 lazy 로드
- [x] MainPage, BottomNav, SplashScreen은 초기 렌더링에 필수이므로 정적 import 유지
- [x] Suspense fallback UI (로딩 중...) 추가

### 이미지 lazy loading ✅
- [x] MainPage 전단지 카드 썸네일 `loading="lazy"`
- [x] DetailPage 히어로 이미지 `loading="lazy"`
- [x] MyPage 즐겨찾기 썸네일 `loading="lazy"`
- [x] ScratchCard 배경 이미지 `loading="lazy"`

### Vite 번들 최적화 ✅
- [x] manualChunks로 vendor 청크 분리 (react/react-dom, qrcode)
- [x] lazy 로드된 페이지들이 별도 청크로 자동 분리

### 미사용 의존성 제거 ✅
- [x] `react-router-dom` 제거 (~40KB 번들 절감)

### 외부 리소스 로딩 최적화 ✅
- [x] Google Fonts 비동기 로드 (`preload` → `stylesheet` 전환)
- [x] Kakao SDK `defer` 속성 추가 (렌더링 차단 방지)

### 파일 변경
| 파일 | 작업 |
|------|------|
| `src/App.jsx` | lazy/Suspense 코드 스플리팅 적용 |
| `src/pages/MainPage.jsx` | img lazy loading |
| `src/pages/DetailPage.jsx` | img lazy loading |
| `src/pages/MyPage.jsx` | img lazy loading |
| `src/components/ScratchCard.jsx` | img lazy loading |
| `vite.config.js` | manualChunks 벤더 청크 분리 |
| `index.html` | Fonts 비동기, Kakao SDK defer |
| `src/App.css` | lazy-loading 스타일 추가 |
| `package.json` | react-router-dom 제거 |

---

## 앱 실행 방법

```bash
# DB 재생성이 필요한 경우 (스키마 변경 시):
# server/data.db 삭제 후 서버 재시작

# 터미널 1 - 백엔드
cd server && npm run dev   # http://localhost:3001

# 터미널 2 - 프론트엔드
npm run dev               # http://localhost:5173

# 관리자 페이지 접속
# http://localhost:5173/admin → 비밀번호: admin1234
```
