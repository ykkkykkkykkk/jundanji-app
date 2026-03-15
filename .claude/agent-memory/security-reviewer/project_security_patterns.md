---
name: project_security_patterns
description: 전단지P 프로젝트의 핵심 보안 패턴 및 발견된 취약점 현황 (5차 감사 2026-03-15 — 배포 전 최종 검토)
type: project
---

# 전단지P 보안 패턴 요약 (5차 감사 — 배포 전 최종)

## 수정 완료된 항목 (5차 감사 확인)

### flyers.js PUT/DELETE authMiddleware 추가 (완료)
- flyers.js:273 — PUT /api/flyers/:id: authMiddleware 적용, 소유자 검증 (owner_id or admin) 정상 작동
- flyers.js:330 — DELETE /api/flyers/:id: authMiddleware 적용, 소유자 검증 정상 작동

### quiz-history IDOR 수정 (완료)
- quiz.js:225 — GET /api/users/:userId/quiz-history: authMiddleware 적용 + IDOR 방지 검증

### visit-history IDOR 수정 (완료)
- qr.js:144 — GET /api/users/:userId/visit-history: authMiddleware 적용 + IDOR 방지 검증

### gift-orders IDOR 수정 (완료)
- gift.js:32 — GET /api/users/:userId/gift-orders: authMiddleware 적용 + IDOR 방지 검증

### 회원 탈퇴 트랜잭션 원자성 (완료)
- auth.js:130 — db.transaction() 래핑 완료, UPDATE users + DELETE device_fingerprints + DELETE bookmarks 원자적 처리

### app.js CRON_SECRET 미설정 처리 (완료)
- app.js:160 — CRON_SECRET 미설정 시 403 반환으로 비활성화

## 잔존 취약점 (5차 감사 기준)

### 🔴 심각

**[settings.js:11] GET /api/settings/public — system_settings 전체 공개**
- 모든 system_settings 키/값이 인증 없이 공개됨
- withdrawal_min_amount, withdrawal_max_amount, withdrawal_waiting_days 등 운영 설정 노출
- 공격자가 출금 한도 등 정책 정보를 미리 파악 가능
- → 공개 허용 키만 화이트리스트로 필터링 필요

**[exchange.js:50] POST /api/exchange/request — points 값 미검증**
- body의 points 값이 양수인지, 정수인지, 최소금액 이상인지 검증 없음
- `if (user.points < points)` 체크만 있어 points=0.001 등 소수 또는 음수 입력 가능
- 음수(-100) 입력 시 points_count 업데이트: `points = points - (-100)` = 포인트 증가 버그
- → `if (!Number.isInteger(Number(points)) || points <= 0)` 검증 추가 필요

**[bookmarks.js:51] POST /api/bookmarks — authMiddleware 없음 (IDOR)**
- body의 userId를 신뢰: 다른 사용자 ID로 북마크 추가 가능
- DELETE /api/bookmarks/:flyerId 도 동일 (body의 userId 신뢰)
- → authMiddleware 추가, req.user.userId 사용 필요

**[inquiry.js:11] POST /api/inquiries — authMiddleware 없음**
- body의 userId를 신뢰: 타인 명의로 문의 등록 가능
- → authMiddleware 추가, req.user.userId 사용 필요

**[admin.js:8] ADMIN_PASSWORD 폴백값 'admin1234' (환경변수 미설정 시)**
- 환경변수 미설정 시 기본 비밀번호 'admin1234' 사용
- → 환경변수 미설정 시 서버 시작 거부 또는 에러 처리 필요

**[admin.js:10] ADMIN_JWT_SECRET 폴백값 'fallback-admin-secret'**
- ADMIN_JWT_SECRET 미설정 시 약한 시크릿 사용
- → 환경변수 미설정 시 JWT_SECRET fallback도 위험

### 🟡 주의

**[social.js:148,243] OAuth 콜백 URL에 JWT 토큰 노출 (기존 잔존)**
- 리다이렉트 URL에 token=<jwt> 쿼리 파라미터 포함
- App.jsx:124에서 window.history.replaceState로 즉시 제거하나 서버 로그에 노출

**[app.js:42-50] CORS: 로컬 환경에서 all origins 허용**
- isVercel 아닌 경우 모든 origin 허용: `cb(null, true)`
- 로컬 != 프로덕션이므로 실제 위협 낮으나 스테이징 환경 주의

**[app.js] HTTP 보안 헤더 미적용**
- helmet 미사용: X-Frame-Options, X-Content-Type-Options, CSP 등 미설정
- → helmet 패키지 추가 권장

**[security.js:82] POST /api/scratch/complete 인증 없음**
- sessionToken 보유자면 누구든 완료 처리 가능
- sessionToken은 48자리 hex — 추측 불가하여 실제 위험 낮음

**[push.js:28] POST /api/push/subscribe 인증 없음**
- 아무나 push 구독 등록 가능 (endpoint 스팸)
- 실제 악용 범위 제한적 (수신만 가능)

**[quiz.js:59] GET /api/flyers/:flyerId/quizzes — 정답 포함 공개**
- answer 필드가 공개 응답에 포함됨
- 사업자용 관리 API이므로 일반 유저도 정답 조회 가능

**[auth.js] 회원 탈퇴 후 JWT 즉시 무효화 없음**
- 탈퇴 완료 후 기존 JWT가 만료 전까지 유효

**[notifications.js] PATCH 읽음 처리 인증 없음**
- /api/notifications/:id/read, /api/notifications/read-all 인증 없음
- 단, 개인식별정보 없는 시스템 알림이므로 위험 낮음

**[share.js:19] 게스트(userId=1) scratchToken 예외 로직**
- userId === 1이면 scratchToken 없이 포인트 적립 가능 (의도적 설계 추정)

### 🟢 참고

**[settings.js] GET /api/settings/public 화이트리스트 필터링**
- 공개 허용 키 목록을 코드에 명시하면 운영 설정 노출 방지 가능

**[business.js:112] 포인트 예산 충전 결제 검증 없음**
- amount 값만 체크하고 실제 결제 확인 없이 예산 증가
- 결제 시스템 연동 전 어드민 승인 프로세스 필요

## SQL 인젝션 방어

전체 parameterized query 사용 확인 (5차 감사) — 위험 없음.
admin.js LIKE 검색도 `%${search}%` 형태로 파라미터 바인딩 정상.

## Rate Limiting 현황

- 전역: 100 req / 15min per IP (app.js:55)
- 인증: 5 req / 15min per IP (login, register, admin/login)
- 포인트 적립/교환 전용 rate limit 없음 (전역 100req에 포함)

## fingerprint 현황

- SHA-256 hex 64자리 (Web Crypto API, 클라이언트 생성)
- POST /api/security/device: authMiddleware 적용
- 클라이언트사이드 생성은 여전히 우회 가능

## authMiddleware 동작 방식

server/middleware/auth.js:
- Authorization: Bearer <token> 헤더 검증
- jwt.verify(token, process.env.JWT_SECRET) — req.user에 { userId } 주입

## 암호화 현황

- crypto-utils.js: AES-256-GCM, ENCRYPTION_KEY(64자리 hex) 환경변수 필수
- 계좌번호, 예금주, 전화번호 암호화 저장 확인
- ENCRYPTION_KEY 미설정 시 encrypt() 호출 즉시 Error throw — 서버 크래시 가능

**Why:** 5차 보안 감사 2026-03-15 — 배포 전 최종 검토
**How to apply:** 후속 작업 시 이 목록을 기준으로 배포 가능 여부 판단
