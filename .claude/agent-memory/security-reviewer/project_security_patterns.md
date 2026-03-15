---
name: project_security_patterns
description: 전단지P 프로젝트의 핵심 보안 패턴 및 발견된 취약점 현황 (4차 감사 2026-03-15)
type: project
---

# 전단지P 보안 패턴 요약 (4차 감사 — v4.3 보안 3차 수정 검증)

## 수정 완료된 항목 (4차 감사 확인)

### 3차 수정 검증 완료 항목

**share.js: POST /api/points/use authMiddleware 추가 (완료)**
- share.js:163 — authMiddleware 적용, userId = req.user.userId 로 정상 추출

**share.js: GET /api/users/:userId/share-history IDOR 수정 (완료)**
- share.js:130 — authMiddleware 적용 + req.user.userId === Number(userId) 검증

**share.js: GET /api/users/:userId/point-history IDOR 수정 (완료)**
- share.js:214 — authMiddleware 적용 + req.user.userId === Number(userId) 검증

**security.js: POST /api/scratch/start authMiddleware 추가 (완료)**
- security.js:57 — authMiddleware 적용, userId = req.user.userId

**security.js: POST /api/security/device authMiddleware 추가 (완료)**
- security.js:13 — authMiddleware 적용, userId = req.user.userId

**social.js: OAuth CSRF state HMAC-SHA256 서명 쿠키 (완료)**
- social.js:24-57 — signState()/verifyAndClearState() 구현
- httpOnly, sameSite='lax', 10분 maxAge, 프로덕션 secure=true
- timingSafeEqual 비교 적용

**admin.js: JWT 기반 인증 전환 (완료)**
- admin.js:19-31 — requireAdmin(): X-Admin-Token 헤더, ADMIN_JWT_SECRET, role:'admin' 클레임 검증
- ADMIN_JWT_EXPIRES_IN: 8h

**auth.js: DELETE /api/users/me 회원 탈퇴 (완료)**
- auth.js:117 — authMiddleware 적용
- nickname='탈퇴한 사용자', email=NULL, password_hash=NULL, provider_id=NULL, phone=NULL, status='deleted', points=0
- device_fingerprints, bookmarks 삭제

## 수정 완료된 항목 (이전 1~3차 감사)

### authMiddleware 적용 완료
- POST /api/gift-orders (gift.js:61)
- POST /api/share (share.js:10)
- POST /api/quiz/attempt (quiz.js:119)
- POST /api/qr/verify (qr.js:52)
- GET /api/exchange/requests (exchange.js:61) — requireAdmin 추가
- POST /api/exchange/complete/:id (exchange.js:73) — requireAdmin 추가
- POST /api/points/use (share.js:163) — 3차에서 추가
- GET /api/users/:userId/share-history (share.js:130) — 3차에서 추가
- GET /api/users/:userId/point-history (share.js:214) — 3차에서 추가
- POST /api/scratch/start (security.js:57) — 3차에서 추가
- POST /api/security/device (security.js:13) — 3차에서 추가

### P2-2: Device Fingerprint SHA-256 강화 (2026-03-15)
- src/api/index.js:361 — generateDeviceFingerprint() async로 전환
- Web Crypto API crypto.subtle.digest('SHA-256'), 64자리 hex

### P2-7: 계좌번호/전화번호 AES-256-GCM 암호화 (2026-03-15)
- server/crypto-utils.js 신규 생성 — encrypt/decrypt/isEncrypted
- 형식: <iv_hex>:<authTag_hex>:<ciphertext_hex>
- withdrawal.js, exchange.js, admin.js 적용

## 잔존 취약점

### 🔴 심각

**[flyers.js:276] 전단지 수정(PUT) 인증 없음**
- PUT /api/flyers/:id — authMiddleware 미적용

**[flyers.js:326] 전단지 삭제(DELETE) 인증 없음**
- DELETE /api/flyers/:id — authMiddleware 미적용

**[auth.js:117] 회원 탈퇴 후 JWT 즉시 무효화 없음**
- 탈퇴 완료 후 기존 JWT가 만료 전까지 유효 (note에도 명시됨)
- 블랙리스트 테이블 또는 user.version 클레임으로 즉시 차단 불가
- 심각도: 중간 (탈퇴 유저가 7일 이내 포인트 사용 가능)

**[social.js:148,243] OAuth 콜백 URL에 JWT 토큰 노출**
- 리다이렉트 URL에 token=<jwt> 쿼리 파라미터 포함
- referrer 헤더, 서버 로그, 브라우저 히스토리에 JWT 노출 가능
- 현재 구조(hash SPA)에서는 단기적으로 허용 가능이나 개선 권장

### 🟡 주의

**[share.js:19] 게스트(userId=1) scratchToken 예외 로직**
- userId === 1 이면 scratchToken 없이 포인트 적립 가능
- 게스트 ID를 1로 고정하는 설계가 있다면 의도적이지만 특수 계정 처리 주의

**[security.js:82] POST /api/scratch/complete 인증 없음**
- sessionToken을 가진 자라면 누구든 세션 완료 처리 가능
- 단, sessionToken은 서버가 발급하는 무작위 48자리 hex → 추측 불가
- 실질 위험도 낮으나 일관성 차원에서 authMiddleware 추가 권장

**[share.js:117] GET /api/users/:userId/points 인증 없음**
- 공개 엔드포인트로 동작 — 포인트 조회는 민감 정보 아닐 수 있으나 정책 결정 필요

**[gift.js:32] GET /api/users/:userId/gift-orders 인증 없음 (IDOR)**
- 여전히 미수정으로 추정

**[quiz.js:202] GET /api/users/:userId/quiz-history 인증 없음 (IDOR)**
**[qr.js:136] GET /api/users/:userId/visit-history 인증 없음 (IDOR)**

**[share.js:62-68] 공유 중복체크 race condition**
- SELECT 후 INSERT 사이 gap 존재, DB UNIQUE 제약 없음

**[quiz.js:141] 퀴즈 중복체크 race condition**

**[app.js:92] /api/cron/cleanup CRON_SECRET 미설정 시 인증 없음**

**[push.js:28] POST /api/push/subscribe 인증 없음**

**[quiz.js:59] GET /api/flyers/:flyerId/quizzes — 정답 포함 공개**

**[flyers.js:202] 전단지 등록 ownerId 버그** — owner_id 항상 NULL

**[admin.js:8] ADMIN_PASSWORD 폴백값 'admin1234'**
- ADMIN_PASSWORD 환경변수 미설정 시 기본값 사용

## 신규 발견 항목 (4차 감사)

**[auth.js:127-137] 회원 탈퇴 트랜잭션 원자성 없음**
- UPDATE users, DELETE device_fingerprints, DELETE bookmarks가 별도 쿼리로 실행
- 중간 실패 시 부분 삭제 상태 발생 가능

**[auth.js:145] push_subscriptions 테이블 정리 누락**
- 탈퇴 시 push 구독 데이터가 DB에 잔존
- userId 기반 구독이 있다면 개인정보 관련 문제

**[social.js:65-83] findOrCreateSocialUser race condition**
- SELECT 후 INSERT 사이 gap에서 중복 INSERT 가능
- catch 절에서 재조회로 부분 완화되어 있음

**[admin.js:10] ADMIN_JWT_SECRET 폴백값 'fallback-admin-secret'**
- ADMIN_JWT_SECRET 미설정 시 약한 시크릿 사용

## SQL 인젝션 방어

전체적으로 parameterized query (prepared statements) 사용 — SQL 인젝션 위험 낮음.

## fingerprint 현황 (P2-2 수정 후)

- SHA-256 hex 64자리로 충돌 내성 확보
- POST /api/security/device: authMiddleware 적용 완료 (3차 수정)
- 클라이언트사이드 생성은 여전히 우회 가능 (userAgent 조작 등)

## authMiddleware 동작 방식

server/middleware/auth.js:
- Authorization: Bearer <token> 헤더 검증
- jwt.verify(token, process.env.JWT_SECRET) — req.user에 { userId } 주입

**Why:** 4차 보안 감사 2026-03-15 — v4.3 보안 3차 수정사항 검증
**How to apply:** 후속 작업 시 이 목록을 기준으로 우선순위 결정
