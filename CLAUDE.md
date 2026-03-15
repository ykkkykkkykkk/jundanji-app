# 전단지P - 프로젝트 가이드

> 전단지 공유 포인트 앱 (모바일 퍼스트, max-width 430px)

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트 | React 18 + Vite 5 (ESM), 순수 CSS + Tailwind 4 (admin만), PWA |
| 백엔드 | Express 5, Node.js (CommonJS) |
| DB | SQLite (better-sqlite3 로컬) / Turso (@libsql 프로덕션) |
| 인증 | JWT + 카카오/구글 소셜 로그인 |
| 배포 | Vercel (Serverless Functions) |

## 실행

```bash
# 백엔드 (터미널1)
cd server && npm run dev     # localhost:3001

# 프론트 (터미널2)
npm run dev                  # localhost:5173

# 어드민: localhost:5173/admin (pw: admin1234)
```

## 핵심 구조

```
src/
  App.jsx          ← SPA 라우팅 (hash 기반, react-router 미사용)
  api/index.js     ← 모든 API 호출 함수
  pages/           ← MainPage, DetailPage, LoginPage, MyPage,
                     AdminPage, GiftShopPage, QrScanPage, NotificationPage
  components/      ← BottomNav, ScratchCard, QuizModal, QrScanner 등
  admin/           ← 슈퍼 관리자 별도 앱 (admin.html 엔트리)

server/
  app.js           ← Express 앱 + 라우터 등록
  db.js            ← DB 초기화 + 스키마 (Turso/SQLite 분기)
  db-turso.js      ← Turso 어댑터
  db-local.js      ← SQLite 어댑터
  routes/          ← flyers, auth, social, share, quiz, qr,
                     business, admin, gift, security, exchange,
                     withdrawal, inquiry, push, bookmarks, notifications
```

## DB 듀얼 구조

- `process.env.TURSO_DATABASE_URL` 있으면 Turso, 없으면 로컬 SQLite
- 스키마 변경 시: `server/data.db` 삭제 후 서버 재시작으로 재생성
- 주요 테이블: users, flyers, shares, point_transactions, quizzes, quiz_attempts, visit_verifications, withdrawals, gift_orders, categories, device_fingerprints, scratch_sessions

## 주요 기능

- **전단지 피드**: 카테고리 필터, 검색, 무한 스크롤
- **복권 긁기**: Canvas 기반, 60%+ 긁으면 공개 → 포인트 적립
- **퀴즈**: 전단지별 랜덤 1문제, 정답 시 포인트
- **QR 방문인증**: BarcodeDetector API, 매장 방문 포인트
- **기프티콘 교환소**: 포인트로 기프티콘 교환 (카카오톡 발송)
- **출금**: 최소 1,000P, 가입 7일 이후, 은행 계좌
- **보안**: 기기 fingerprint (다중계정 방지), 긁기 속도 검증 (봇 방지)

## 사용자 역할

| 역할 | 기능 |
|------|------|
| user | 전단지 보기, 긁기, 퀴즈, QR스캔, 포인트 적립/교환/출금 |
| business | + 전단지 등록, 퀴즈 관리, QR 생성, 통계 대시보드 |
| admin | 슈퍼 관리자 (admin.html) — 유저/전단지/포인트/자영업자 관리 |

## 포인트 체계

| 활동 | 포인트 | 비고 |
|------|--------|------|
| 전단지 공유 | share_point | 자영업자 설정 |
| 퀴즈 정답 | 10~50 | 문제별 설정 |
| QR 방문 | 100~500 | 전단지별 설정 |

## 환경변수 (server/.env)

```
JWT_SECRET, KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
FRONTEND_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
TURSO_DATABASE_URL (prod), TURSO_AUTH_TOKEN (prod)
```

## 코드 컨벤션

- 프론트: ESM (`import/export`), JSX, lazy/Suspense 코드 스플리팅
- 백엔드: CommonJS (`require/module.exports`)
- 라우팅: hash 기반 SPA (App.jsx의 currentPage 상태로 관리)
- API: `/api/*` 패턴, Vite proxy → localhost:3001
- 빌드: `vite build` → `dist/`, Vercel rewrites로 SPA + API 라우팅

## 버전 히스토리

현재 v4.2 — 상세 변경 이력은 `TASK.md` 참조
