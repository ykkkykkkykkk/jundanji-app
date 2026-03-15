---
name: QA 후속 조치 우선순위 (2026-03-15)
description: 기존 QA 보고서 기반 즉시 수정 필요 항목 및 테스트 자동화 도입 계획
type: project
---

# QA 후속 조치 및 우선순위

## 상황

- **분석 완료**: 2026-03-15 기준 전체 QA 분석 완료
- **Critical 버그**: 4개 미수정
- **Major 버그**: 8개 미수정
- **테스트 자동화**: 미설치 (MCP 환경만 구성)
- **마지막 커밋**: cf6e9ad "서브에이전트로 역활 분담"

## 즉시 수정 필요 (Critical - 1주)

### 1. SQLite DATE 함수 Turso 호환성 (qr.js:74-77)
**문제**: 프로덕션 배포 시 QR 방문인증 중복 체크 실패

**현재 코드**:
```javascript
WHERE user_id = ? AND flyer_id = ? AND DATE(verified_at) = DATE('now', 'localtime')
```

**해결책**:
```javascript
// db.js 또는 qr.js에서 오늘 날짜 계산
const today = new Date().toISOString().split('T')[0]
const existing = await db.prepare(
  `SELECT id FROM visit_verifications
   WHERE user_id = ? AND flyer_id = ? AND DATE(verified_at) = ?`
).get(userId, flyer.id, today)
```

**영향**: 프로덕션에서 동일 사용자의 같은 전단지 QR 중복 인증 방지 실패 → 포인트 중복 적립

---

### 2. 게스트 긁기 이중 모달 처리 (ScratchCard.jsx:129 vs App.jsx:332)
**문제**: localStorage 플래그 + App 상태 동시 설정으로 중복 모달

**재현**:
1. 게스트 사용자 1회차 전단지 긁기 → 모달 표시
2. 2회차 다른 전단지 클릭 → 로그인 유도 모달 또는 중복 표시

**권장 해결책**:
- Option A: localStorage 제거, App의 `guestRevealFlyer` 상태만 사용
- Option B: ScratchCard에서 onGuestReveal 콜백 전에 localStorage 플래그 설정하지 않기

---

### 3. 기프티콘 교환 API 중복 (exchange.js vs gift.js)
**문제**: 두 개의 서로 다른 교환 엔드포인트로 인한 혼란

**현재 상태**:
- `POST /api/exchange/request` (authMiddleware)
- `POST /api/gift-orders` (auth 불필요)

**권장 해결책**:
- 하나의 엔드포인트로 통합 (authMiddleware 사용)
- 또는 deprecated 표시 후 점진적 폐기

---

### 4. 서버-클라이언트 시간 동기화 (security.js:98-103)
**문제**: SQLite datetime 파싱 및 타임존 처리 부정확

**현재 코드**:
```javascript
const serverStartTime = new Date(session.started_at.replace(' ', 'T') + '+09:00').getTime()
```

**문제점**:
- replace(' ', 'T')는 첫 번째 공백만 변환
- '+09:00' 하드코딩 (db가 UTC 저장일 경우 오류)
- 클라이언트 시간이 서버보다 빠르면 Duration이 음수

**해결책**:
```javascript
// db.js에서 저장 시 ISO 형식 사용
// 또는 백엔드에서 UNIX timestamp 저장

const isoString = session.started_at
  .replace(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
const serverStartTime = new Date(isoString).getTime()
const serverDuration = Date.now() - serverStartTime
const actualDuration = Math.max(0, Math.min(serverDuration, clientDuration || Infinity))
```

---

## 이번 주 수정 권장 (Major - 5개)

### 1. 퀴즈 사업자 예산 검증 위치 (quiz.js:145-152)
- 예산 검증을 transaction 내부로 이동 또는 순서 조정

### 2. QR 사업자 예산 검증 위치 (qr.js:85-92)
- 동일하게 예산 검증을 transaction 내부로 이동

### 3. 기프티콘 교환 7일 제한 검증 (exchange.js)
- 회원가입 7일 경과 여부 체크 추가

### 4. 정답 텍스트 비교 정규화 (quiz.js:155)
- 이모지/특수문자 처리 강화

### 5. 클라이언트 시간 음수 처리 (security.js:103)
- `Math.max(0, ...)` 추가

---

## 테스트 자동화 도입 (1개월)

### Phase 1: Critical 경로 테스트 (1주)
**설치 필요**:
```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom c8
cd server && npm install -D vitest supertest c8
```

**테스트 케이스**:
1. 포인트 적립/차감 정합성
2. JWT 인증 미들웨어
3. 중복 방지 로직 (share_history, quiz_attempts, visit_verifications UNIQUE)

### Phase 2: API 계약 검증 (2주)
- `/api/share`, `/api/quiz`, `/api/qr`, `/api/gift-orders` 응답 형식 확인
- fetchJSON 통일 또는 공통 에러 처리 로직

### Phase 3: 보안 테스트 (3주)
- Device fingerprint 다중계정 방지
- Rate limiting
- 시간 경계값 (자정 전후 QR 방문인증)

---

## 브라우저 UI 테스트 불가

현재 클라우드 환경에서는 실제 브라우저를 열 수 없으므로:
1. **로컬 개발 환경에서 수동 테스트** 권장
2. **Playwright 기반 E2E 자동화** 도입 시 CI/CD 자동화 가능

**수동 테스트 시나리오** (권장):
```
1. 게스트 → 1회차 긁기 완료 → 2회차 다른 전단지 클릭 → 모달 중복 확인
2. 포인트 부족 → 기프티콘 교환 불가능 확인
3. 새 가입 계정 → 즉시 기프티콘 교환 시도 → 7일 제한 메시지
4. QR 스캔 → 같은 전단지 다시 스캔 → 중복 방지 메시지
5. 빠른 전단지 긁기 (1초 이내) → 봇 감지 경고
6. 다중탭 게스트 긁기 → 동기화 검증
```

---

## 결론

**신뢰도**: 70/100
- 기본 플로우는 작동하나 Critical/Major 버그 12개 존재
- 테스트 자동화 부재로 회귀 버그 위험 높음
- 프로덕션 배포 전 Critical 버그 4개 반드시 수정 필요

**권장 조치**:
1. **이번 주**: Critical 4개 + Major 5개 수정 (9개)
2. **다음 주**: 나머지 Minor 8개 + 테스트 자동화 도입
3. **1개월**: Vitest + Playwright 기본 테스트 커버리지 50% 이상
