---
name: security_audit_2026_03
description: 2026-03-15 수행한 전단지P 종합 보안/법적/운영 점검 결과 — 배포 차단 수준 이슈 목록 및 운영 감사 결과 포함 (총 34개 이슈)
type: project
---

## 보안 감사 결과 요약 (2026-03-15)

**Why:** 실제 유저 배포 전 전수 점검 요청
**How to apply:** 아래 이슈들이 해결되었는지 먼저 확인하고 배포 판단

### 배포 차단 수준 (Critical)

1. **gift.js: POST /api/gift-orders — 인증 없음, userId body로 받음**
   - 누구나 타인 userId를 body에 넣어 포인트 차감 가능
   - authMiddleware 미적용

2. **/api/debug/env — 프로덕션 노출 (app.js:50)**
   - KAKAO_CLIENT_ID 일부, REDIRECT_URI 평문 노출
   - isVercel 환경 분기 없이 항상 활성

3. **exchange.js: GET /api/exchange/requests, POST /api/exchange/complete/:id — 인증 없음**
   - 교환 요청 전체 목록 (userId, phone 포함) 누구나 조회 가능
   - 교환 완료 처리도 인증 없이 가능

4. **share.js: POST /api/share — 인증 없음, scratchToken 선택사항**
   - userId를 body로 받아 타인 명의 포인트 적립 가능
   - scratchToken 없이도 호출 가능 → 봇 방지 우회 가능

5. **qr.js: POST /api/qr/verify — 인증 없음**
   - userId body 직접 전달 → 타인 명의 QR 포인트 적립 가능

6. **quiz.js: POST /api/quiz/attempt — 인증 없음**
   - userId body 직접 전달 → 타인 명의 포인트 적립 가능

7. **share.js: GET /api/users/:userId/share-history 등 다수 — 소유자 검증 없음**
   - 임의 userId로 타인 내역 조회 가능 (share-history, point-history, quiz-history, visit-history, gift-orders, inquiries, bookmarks)

8. **admin.js:7: ADMIN_PASSWORD = 'admin1234' 하드코딩**
   - 소스코드에 노출, env로 이전 필요

9. **admin 토큰 메모리 저장 (activeTokens Set)**
   - 서버 재시작 시 세션 무효화, Vercel 서버리스에서 매 요청마다 새 인스턴스 → 인증 항상 실패 위험

10. **social.js: OAuth state 파라미터 미검증 (CSRF)**
    - 카카오/구글 callback에 state 없음 → CSRF 공격 가능

11. **app.js:32: CORS origin: 모든 도메인 허용**
    - `cb(null, true)` → 프로덕션에서 실제 도메인으로 제한 필요

12. **inquiry.js, bookmarks.js, share.js 다수 API: 인증 없음, userId body/params 받음**
    - POST /api/inquiries: userId body
    - POST /api/bookmarks: userId body
    - DELETE /api/bookmarks/:flyerId: userId body
    - POST /api/share: userId body

13. **계좌번호 평문 저장 (withdrawals 테이블)**
    - account_number TEXT — 암호화 없음
    - point_transactions description에도 "출금 신청 (은행명 계좌번호)" 평문 기록

14. **전화번호 평문 저장 (exchange_requests, gift_orders)**
    - phone TEXT — 암호화 없음 (발송 후 NULL 처리는 있으나 처리 전 기간 노출)

### 배포 전 권장 수준

15. **Rate limiting 부재**
    - 로그인 brute-force, 포인트 적립 API 과호출 방어 없음
    - express-rate-limit 미설치

16. **helmet 미적용**
    - HTTP 보안 헤더 없음 (X-Frame-Options, CSP 등)

17. **flyers.js: POST/PUT/DELETE /api/flyers — 인증 없음**
    - 전단지 등록/수정/삭제에 authMiddleware 미적용
    - 누구나 전단지 삭제 가능

18. **시드 데이터가 프로덕션 DB에 삽입됨**
    - flyerSeed 20개 (이마트, 롯데마트 등 실제 브랜드 무단 사용)
    - Turso에도 동일 시드 삽입 → 저작권/상표 문제

19. **개인정보 처리방침 페이지 없음**
    - 이메일, 계좌번호, 전화번호 수집하나 처리방침 페이지 미존재
    - 회원가입 시 동의 절차 없음

20. **이용약관 페이지 없음**

21. **morgan 로깅: Vercel 프로덕션에서 비활성**
    - 에러 모니터링 시스템(Sentry 등) 미설치
    - 서버리스에서 구조화된 로그 없음

22. **push.js: POST /api/push/subscribe — 인증 없음**
    - 임의 endpoint 등록 가능

23. **security.js: POST /api/security/device, /api/scratch/start — 인증 없음**
    - userId body로 타인 기기 등록 가능
    - 긁기 세션 start도 userId body

### 법적/금융 이슈

24. **포인트 현금 출금 기능 → 전자금융업 등록 필요 가능성**
    - 최대 500,000P 출금, 1P=1원 환산 시 전자금융거래법 적용 검토 필요

25. **기프티콘 판매/교환 → 통신판매업 신고 필요 가능성**
    - 실제 상품권/기프티콘 제공 시 전자상거래법 대상

26. **개인정보보호법: 이메일, 계좌번호, 전화번호 수집 근거 미확보**
    - 수집 동의 절차 없음

### 운영 미완성 이슈

27. **출금 승인/거절 관리자 API 없음**
    - withdrawal 테이블의 status는 'pending'으로만 생성, 관리자에서 처리 UI/API 없음

28. **기프티콘 실제 발송 로직 없음**
    - "관리자 확인 후 카카오톡으로 발송" 문구만 있음
    - 카카오 기프티콘 API 연동 코드 없음, 수동 발송 필요

29. **데이터 백업 체계 없음**
    - Turso 자체 백업 정책 확인 필요

30. **JWT 토큰 블랙리스트/로그아웃 처리 없음**
    - 토큰 발급 후 서버 측 무효화 방법 없음

31. **비밀번호 분실/재설정 기능 없음**

### 디버그 코드 잔존

- app.js:50: /api/debug/env 항상 활성 (배포 차단)
- src/App.jsx:124: alert('로그인 실패: ' + reason) — OAuth 에러 시 reason 노출
- server/test.js, server/test-auth.js: 테스트 파일 서버에 포함 (배포에는 영향 없으나 정리 권장)
- admin 페이지 다수 alert() 사용 — 허용 가능 (내부 관리자 도구)

---

## 운영 감사 추가 결과 (2026-03-15 2차)

### 버전 관리
- sw.js 캐시명 'jundanji-v1' 하드코딩 — 업데이트 시 구 캐시 문제
- manifest.json에 version 필드 없음
- 앱 버전 표시 UI 없음, 강제 업데이트 메커니즘 없음
- GET /api/version 엔드포인트 없음

### DB/배포 운영
- migration catch(_) {} — 모든 오류 무시, 마이그레이션 이력 테이블 없음
- Serverless 콜드 스타트 시 db._initPromise 미대기 (라우터가 초기화 완료 전 쿼리 실행 가능)
- 이미지 업로드가 server/uploads/에 저장 → Vercel 읽기 전용 파일시스템에서 불가

### 모니터링 부재
- 글로벌 에러 핸들러: console.error만 호출, Sentry/Slack 연동 없음
- 출금/기프티콘 신청 접수 시 관리자 알림 없음
- Rate limiting 없음 (express-rate-limit 미설치)
- API 응답 시간, DB 용량 모니터링 없음

### Race Condition
- share.js, qr.js: SELECT 후 INSERT 패턴 — 동시 요청 시 중복 적립 가능
  (UNIQUE 제약으로 INSERT는 막히나 트랜잭션 앞 UPDATE 선행 시 부분 실패 가능)
- points 컬럼 vs point_transactions 합계 정합성 검증 Cron 없음

### 법적 이슈 (추가)
- 회원 탈퇴 API 없음 (DELETE /api/users/me 미구현)
- 개인정보 보관 기간 파기 정책 없음 (withdrawals.account_number 영구 보관)
- 미성년자(만 14세 미만) 이용 제한 없음
- 출금 시 원천징수 처리/안내 없음

### 운영 자동화 부재
- Cron: 만료 전단지 삭제 1개뿐
- scratch_sessions 오래된 레코드 정리 없음
- 장기 미처리 withdrawals/gift_orders 알림 없음
- 운영 지표 자동 리포트 없음

### 장애 대응
- 점검 페이지/모드 없음
- 롤백 시 DB 스키마 하위 호환성 전략 없음
- 런북 없음
