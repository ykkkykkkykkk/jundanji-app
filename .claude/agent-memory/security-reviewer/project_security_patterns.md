---
name: project_security_patterns
description: 전단지P 프로젝트의 핵심 보안 패턴 및 발견된 취약점 현황 (2차 감사 2026-03-15)
type: project
---

# 전단지P 보안 패턴 요약 (2차 감사)

## 수정 완료된 항목 (2차 감사 확인)

### authMiddleware 적용 완료
- POST /api/gift-orders (gift.js:61) — authMiddleware 추가, userId = req.user.userId
- POST /api/share (share.js:10) — authMiddleware 추가, userId = req.user.userId
- POST /api/quiz/attempt (quiz.js:119) — authMiddleware 추가, userId = req.user.userId
- POST /api/qr/verify (qr.js:52) — authMiddleware 추가, userId = req.user.userId
- GET /api/exchange/requests (exchange.js:61) — requireAdmin 추가
- POST /api/exchange/complete/:id (exchange.js:73) — requireAdmin 추가

### app.js CORS 및 디버그 수정
- 프로덕션(Vercel): FRONTEND_URL 환경변수 기반 origin 검증 적용
- /api/debug/env 엔드포인트: isVercel 분기로 로컬 전용 제한 완료

### admin.js 비밀번호 환경변수화
- ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'
- activeTokens export 추가 (exchange.js의 requireAdmin이 참조)

## 잔존 취약점

### 🔴 심각

**[flyers.js:276] 전단지 수정(PUT) 인증 없음**
- PUT /api/flyers/:id — authMiddleware 미적용
- 누구든지 임의 전단지 내용 수정 가능
- 위치: flyers.js:276 `router.put('/:id', upload.single('image'), async (req, res) => {`

**[flyers.js:326] 전단지 삭제(DELETE) 인증 없음**
- DELETE /api/flyers/:id — authMiddleware 미적용
- 누구든지 임의 전단지 삭제 가능
- 위치: flyers.js:326 `router.delete('/:id', async (req, res) => {`

**[flyers.js:202] 전단지 등록 소유자 검증 없음**
- POST /api/flyers — authMiddleware는 있으나 role 검증 없음
- 일반 user도 전단지 등록 가능 (business/admin만 해야 하는데)
- req.body에서 ownerId 참조하나 body에 ownerId 필드가 없고 req.user.userId로 설정 안 됨 → owner_id = NULL로 저장

**[share.js:159] POST /api/points/use 인증 없음**
- authMiddleware 미적용, userId를 body에서 직접 수신
- 누구든지 타인 포인트를 차감 가능
- (gift.js의 POST /api/gift-orders와 기능 중복 — 레거시 엔드포인트로 보임)

**[security.js:55] POST /api/scratch/start 인증 없음**
- userId를 body에서 직접 수신
- 공격자가 타인의 userId로 긁기 세션 생성 후 기존 세션 삭제(line 65) 가능
- 위치: security.js:55 `router.post('/scratch/start', async (req, res) => {`

**[social.js:39,133] OAuth state 파라미터 미검증**
- 카카오/구글 모두 state 파라미터 생성 및 검증 없음
- CSRF로 공격자가 피해자 계정에 공격자의 소셜 계정을 연결 가능
- 위치: social.js:39, social.js:133

### 🟡 주의

**[admin.js:7] ADMIN_PASSWORD 기본값 잔존**
- process.env.ADMIN_PASSWORD 미설정 시 'admin1234' 사용
- 환경변수 설정이 필수이나 강제되지 않음

**[admin.js:15] 어드민 토큰 메모리 저장**
- activeTokens: Set — 서버 재시작 시 모든 어드민 세션 만료
- Vercel 서버리스 환경에서 인스턴스 간 토큰 공유 안 됨 (항상 로그아웃 상태)
- brute-force 방지(rate limiting) 없음

**[security.js:12] POST /api/security/device userId body 수신**
- fingerprint 등록 시 userId를 body에서 받아 검증 없이 저장
- 공격자가 타인의 userId + 자신의 fingerprint 등록 가능

**[gift.js:32] GET /api/users/:userId/gift-orders 인증 없음**
- URL의 userId로 타인 기프티콘 주문 내역 열람 가능
- IDOR 취약점

**[share.js:130] GET /api/users/:userId/share-history 인증 없음**
- 타인 공유 내역 열람 가능 (IDOR)

**[share.js:209] GET /api/users/:userId/point-history 인증 없음**
- 타인 포인트 거래 내역 열람 가능 (IDOR)

**[quiz.js:202] GET /api/users/:userId/quiz-history 인증 없음**
- 타인 퀴즈 응시 내역 열람 가능 (IDOR)

**[qr.js:136] GET /api/users/:userId/visit-history 인증 없음**
- 타인 방문 인증 내역 열람 가능 (IDOR)

**[share.js:62-68] 공유 중복체크 race condition**
- SELECT → INSERT 사이에 동시 요청 가능
- DB UNIQUE 제약이 없으면 중복 포인트 적립 가능

**[quiz.js:141] 퀴즈 중복체크 race condition**
- SELECT → INSERT 사이에 동시 요청 가능

**[flyers.js:202] 전단지 등록 시 ownerId 버그**
- body에서 ownerId를 꺼내지 않음 (`const { ... } = req.body`에 ownerId 없음)
- 코드 내 `if (ownerId)` 참조는 undefined → owner_id가 항상 NULL로 저장
- 사업자 전단지가 본인 소유로 등록되지 않아 예산 차감 로직 동작 안 함

**[app.js:92] /api/cron/cleanup CRON_SECRET 미설정 시 인증 없음**
- CRON_SECRET 환경변수 미설정 시 누구든지 호출 가능
- 전단지 대량 삭제 가능

**[push.js:28] POST /api/push/subscribe 인증 없음**
- 누구든지 push_subscriptions 테이블에 임의 endpoint 등록 가능
- 대용량 스팸 구독으로 push 발송 부하 유발 가능

### 🟢 참고

**[exchange.js:8-15] requireAdmin circular require**
- exchange.js 내에서 require('./admin')을 함수 호출 시점에 동적 로드
- Node.js CommonJS의 순환 참조 회피 패턴으로 동작은 하나, admin.js의 requireAdmin을 별도 모듈로 분리하는 것이 더 명확함

**[quiz.js:76] GET /api/flyers/:flyerId/quiz userId를 쿼리 파라미터로 수신**
- 인증 없이 쿼리파라미터 userId로 퀴즈 조회
- 퀴즈 내용 조회(정답 포함)는 이미 quiz.js:60에서 인증 없이 answer 포함 전체 반환됨

**[quiz.js:59] GET /api/flyers/:flyerId/quizzes — 정답 포함 공개**
- SELECT * 로 answer 필드 포함하여 반환
- 프론트에서 정답을 미리 알 수 있음

## SQL 인젝션 방어

전체적으로 parameterized query (prepared statements) 사용 — SQL 인젝션 위험 낮음.
모든 쿼리는 better-sqlite3 / @libsql의 ? 바인딩 방식 사용.

## fingerprint 우회 가능성

- 클라이언트사이드 fingerprint 생성 (userAgent, screen, language 등)
- 서버측 추가 검증 없음 (IP 기반 보조 검증 없음)
- POST /api/security/device에서 userId 조작 가능 (인증 없음)

## authMiddleware 동작 방식

server/middleware/auth.js:
- Authorization: Bearer <token> 헤더 검증
- jwt.verify(token, process.env.JWT_SECRET) — req.user에 { userId } 주입
- JWT_SECRET 미설정 시 취약

**Why:** 2차 보안 감사 2026-03-15 실행 — 1차 수정 사항 검증 및 잔존 취약점 목록 업데이트
**How to apply:** 후속 수정 작업 시 이 목록을 기준으로 우선순위 결정
