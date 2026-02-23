# 전단지 앱 - 프로젝트 진행 현황

> 마지막 업데이트: 2026-02-22 (모든 선택 기능 구현 완료 🎉)

---

## 프로젝트 개요
- **앱명**: 전단지P (전단지 공유 포인트 앱)
- **프론트엔드**: React 18 + Vite + 순수 CSS, 모바일 퍼스트 (max-width: 430px)
- **백엔드**: Node.js + Express (`server/` 폴더)
- **DB**: SQLite (better-sqlite3)

---

## 전체 구현 완료 ✅

### 🖥️ 프론트엔드

#### 핵심 UI
- [x] 메인 페이지 - 전단지 카드 목록 (API 연동)
- [x] 카테고리 탭 필터 (전체 / 마트 / 편의점 / 뷰티 / 카페 / 생활용품)
- [x] 전단지 상세 페이지 - 상품 목록, 할인율 표시
- [x] 포인트 적립 애니메이션 모달
- [x] 마이페이지 - 프로필, 포인트, 공유 내역
- [x] 회원 등급 표시 (브론즈/실버/골드)
- [x] 하단 네비게이션 (홈 / 마이 / 관리)
- [x] **관리자 페이지** - 전단지 등록/수정/삭제
- [x] **알림 페이지** - 알림 목록, 읽음 처리, 🔔 뱃지

#### 기능 구현
- [x] **만료 전단지 처리** - 만료됨 배지, 공유 버튼 비활성화
- [x] **Web Share API** - navigator.share 연동, 클립보드 복사 fallback
- [x] **공유 후 shareCount 즉시 반영**
- [x] **검색 기능** - 🔍 버튼 → 오버레이 검색 (매장명/제목/태그), 실시간 API 호출
- [x] **스크롤 위치 복원** - 상세→뒤로가기 시 이전 스크롤 위치 복원
- [x] **로그인/회원가입 UI** - LoginPage.jsx, 탭 전환, 게스트 모드
- [x] **닉네임 인라인 편집** - ✏️ 버튼 → 수정 → 서버 반영
- [x] **포인트 교환 UI** - 기프티콘 3종, 포인트 차감 API 연동
- [x] **로그인/로그아웃** - JWT 토큰 localStorage 저장, 상태 관리
- [x] **비로그인 유도 배너** - 마이페이지 로그인 안내
- [x] **다크모드** - CSS 변수 기반, 🌙/☀️ 토글, localStorage 저장
- [x] **무한 스크롤** - IntersectionObserver + 페이지네이션 (8개씩)

### 🖥️ 백엔드 (server/)

#### Phase 1 - API ✅
- [x] `GET /api/flyers` - 목록 (카테고리 + 검색어 필터 + **페이지네이션** page/limit/total/hasMore)
- [x] `GET /api/flyers/:id` - 상세
- [x] `POST /api/flyers` - 전단지 등록 (알림 자동 생성)
- [x] `PUT /api/flyers/:id` - 전단지 수정
- [x] `DELETE /api/flyers/:id` - 전단지 삭제
- [x] `POST /api/share` - 공유 처리 + 포인트 적립 (중복 방지 409)
- [x] `GET /api/users/:id/points` - 포인트 조회
- [x] `GET /api/users/:id/share-history` - 공유 내역 (flyerId 포함)
- [x] `POST /api/points/use` - 포인트 사용
- [x] `GET /api/users/:id/point-history` - 포인트 거래 내역

#### Phase 2 - JWT 인증 ✅
- [x] `POST /api/auth/register` - 회원가입 (bcrypt 해시)
- [x] `POST /api/auth/login` - 로그인 (JWT 발급)
- [x] `GET /api/users/me` - 내 정보 조회 (토큰 필요)
- [x] `PATCH /api/users/me` - 닉네임 변경 (토큰 필요)
- [x] auth 미들웨어 (`server/middleware/auth.js`)

#### Phase 3 - 알림 ✅
- [x] `GET /api/notifications` - 알림 목록 + 안읽은 개수
- [x] `PATCH /api/notifications/read-all` - 전체 읽음 처리
- [x] 전단지 등록 시 알림 자동 생성

#### Phase 4 - 프론트 API 연동 ✅
- [x] `src/api/index.js` - 전체 API 클라이언트
- [x] Vite 프록시 `/api` → `localhost:3001`

#### PWA ✅
- [x] vite-plugin-pwa 설정 - manifest, service worker, API 캐시 전략

---

## 앱 실행 방법

```
실행.bat 더블클릭  →  서버 + 프론트 자동 시작 + 브라우저 오픈
```

또는 수동:
```bash
# 터미널 1 - 백엔드
cd server && npm run dev   # http://localhost:3001

# 터미널 2 - 프론트엔드
npm run dev               # http://localhost:5173
```

---

## 파일 구조

```
전단지/
├── src/
│   ├── App.jsx                  # 전역 상태, 라우팅, 인증 흐름, 다크모드
│   ├── App.css                  # 전체 스타일 (CSS 변수 기반 다크모드)
│   ├── main.jsx
│   ├── api/
│   │   └── index.js             # API 클라이언트 (전체 엔드포인트)
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   └── PointAnimation.jsx
│   └── pages/
│       ├── LoginPage.jsx        # 로그인/회원가입
│       ├── MainPage.jsx         # 전단지 목록 + 검색 + 무한스크롤
│       ├── DetailPage.jsx       # 상세 + 공유
│       ├── MyPage.jsx           # 마이페이지 + 포인트 교환
│       ├── AdminPage.jsx        # 관리자 - 전단지 등록/수정/삭제
│       └── NotificationPage.jsx # 알림 목록
├── server/
│   ├── index.js                 # 서버 진입점 (포트 3001)
│   ├── db.js                    # SQLite 연결·스키마·시드
│   ├── .env                     # JWT_SECRET, PORT
│   ├── middleware/
│   │   └── auth.js              # JWT 검증 미들웨어
│   ├── routes/
│   │   ├── flyers.js            # 전단지 API (페이지네이션 포함)
│   │   ├── share.js             # 공유/포인트 API
│   │   ├── auth.js              # 인증 API
│   │   └── notifications.js     # 알림 API
│   └── data.db                  # SQLite DB
├── vite.config.js               # Vite + PWA 설정
├── TASK.md
└── 실행.bat
```

---

## 향후 개선 가능 사항 (선택)

- [x] **이미지 업로드** - 전단지 대표 이미지 업로드 (multer, /uploads 정적 서빙)
- [x] **소셜 로그인** - 카카오/구글 OAuth (server/routes/social.js, DB provider 컬럼)
- [x] **push 알림** - Web Push API (VAPID, push_subscriptions DB, src/sw.js, NotificationPage 구독 UI)
- [x] **즐겨찾기/북마크** - bookmarks DB, 카드 ☆ 버튼, 상세 ★ 헤더 버튼, 마이페이지 즐겨찾기 섹션

---

## Vercel 배포 (투자자 데모) ✅

### 변경 사항
- [x] `server/db-compat.js` — sql.js → better-sqlite3 API 호환 래퍼
- [x] `server/db.js` — Vercel(sql.js) / 로컬(better-sqlite3) 조건 분기, 데모 시드 데이터 20개
- [x] `server/app.js` — Express 앱 분리 (listen 제거)
- [x] `server/index.js` — 로컬 개발 전용 (app.js + listen)
- [x] `api/index.js` — Vercel Serverless Function 진입점 (sql.js 비동기 초기화)
- [x] `api/package.json` — CommonJS 타입 선언
- [x] `vercel.json` — 빌드 설정, 리라이트 규칙
- [x] `server/routes/flyers.js` — Vercel 환경 multer 메모리 스토리지
- [x] `server/routes/push.js` — VAPID 안전 처리
- [x] `src/pages/MainPage.jsx` — 카테고리 11개로 확장
- [x] `src/data/flyers.js` — 로컬 데이터 동기화

### 데모 데이터 (20개 전단지)
이마트, 롯데마트, 홈플러스, 코스트코, 노브랜드, GS25, CU, 세븐일레븐, 스타벅스, 배스킨라빈스, 이디야커피, 올리브영, 다이소, 교촌치킨, 버거킹, 무신사, ABC마트, 하이마트, 쿠팡, CGV

### 배포 방법
```bash
# GitHub 연동 후 Vercel 대시보드에서 Import
# 또는 CLI:
npm i -g vercel
cd 전단지
vercel --prod
```

### Vercel 환경변수 설정 필요
- `JWT_SECRET` — 강력한 랜덤 문자열
- `JWT_EXPIRES_IN` — 7d
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` — Push 알림용
