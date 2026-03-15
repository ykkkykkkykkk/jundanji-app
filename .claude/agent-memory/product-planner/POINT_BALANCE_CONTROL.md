---
name: 포인트 밸런스 시스템 제어 현황 (2026-03-15)
description: 포인트 적립/사용 값들의 DB 컨트롤 가능성 상세 분석
type: project
---

# 포인트 밸런스 시스템 제어 분석

## 1. 긁기 포인트 (share_point)

| 항목 | 현황 | 상세 |
|------|------|------|
| **DB 스토어** | flyers.share_point (INTEGER, DEFAULT 10) | ✓ 테이블에 컬럼 존재 |
| **자영업자 설정** | 가능 | 전단지 등록 시 share_point 파라미터로 설정 |
| **서버 동적 읽음** | ✓ 동적 | share.js L48: `SELECT share_point FROM flyers WHERE id = ?` |
| **최소/최대 제한** | 없음 | 제약 조건 미구현 (어드민 또는 비즈니스 로직으로 관리 필요) |
| **프론트 수정** | ScratchCard.jsx에 표시만 함 | `flyer.sharePoint > 0 && <div>+{flyer.sharePoint}P</div>` |
| **즉시 적용** | ✓ 가능 | DB 업데이트 후 재배포 불필요 (읽기만) |
| **어드민 수정 UI** | ❌ 없음 | AdminPage에서 전단지 수정 기능이 있으면 가능 |

**평가**: 🟢 DB 제어 완전 가능, 자영업자가 설정 시 즉시 반영

---

## 2. 퀴즈 포인트

| 항목 | 현황 | 상세 |
|------|------|------|
| **DB 스토어** | quizzes.point (INTEGER, DEFAULT 10) | ✓ 테이블에 컬럼 존재 |
| **문제별 설정** | ✓ 가능 | quiz.js L31-34: 문제 등록 시 `q.point` 파라미터 |
| **포인트 범위** | 10~50P | 유효성 검증: `if (point < 10 || point > 50) return error` |
| **서버 동적 읽음** | ✓ 동적 | quiz.js L137: `SELECT point FROM quizzes WHERE id = ? AND flyer_id = ?` |
| **정답 시 적립** | 자동 | quiz.js L156-157: `earnedPoints = isCorrect ? quiz.point : 0` |
| **즉시 적용** | ✓ 가능 | 새 문제 등록/수정 후 즉시 반영 |
| **어드민 수정 UI** | ✓ 있음 | AdminPage에서 퀴즈 관리 (비즈니스만) |

**평가**: 🟢 완전 제어 가능, 10~50P 범위 내 문제별 설정 가능

---

## 3. QR 방문인증 포인트

| 항목 | 현황 | 상세 |
|------|------|------|
| **DB 스토어** | flyers.qr_point (INTEGER, DEFAULT 0) | ✓ 테이블에 컬럼 존재 |
| **전단지별 설정** | ✓ 가능 | 전단지 생성/수정 시 qr_point 파라미터 |
| **서버 동적 읽음** | ✓ 동적 | qr.js L84: `earnedPoints = flyer.qr_point \|\| 100` |
| **기본값** | 100P (명시적) | qr.js L84: qr_point 없으면 100P 대체 |
| **범위 제약** | 없음 | 범위 검증 미구현 (권장: 50~500P) |
| **1일 1회 제한** | ✓ 있음 | qr.js L75-82: DATE 기반 중복 방지 |
| **즉시 적용** | ✓ 가능 | DB 업데이트 후 다음 스캔부터 반영 |
| **어드민 수정 UI** | ❌ 없음 | AdminPage에 추가 필요 |

**평가**: 🟡 DB 제어 가능하나 하드코딩된 기본값(100P) 존재, 범위 검증 필요

---

## 4. 기프티콘 가격 (교환 포인트)

| 항목 | 현황 | 상세 |
|------|------|------|
| **DB 스토어** | **❌ DB 없음** | 프론트 GiftShopPage.jsx에만 하드코딩 |
| **GIFT_LIST 위치** | src/pages/GiftShopPage.jsx L6-19 | 12개 고정 상품 |
| **상품 구성** | 스타벅스(5000P), 편의점(3~5000P), 치킨(15000P) 등 | 재배포 필요한 상태 |
| **동적 수정** | ❌ 불가능 | 변경 시 **코드 수정 + 재배포** 필수 |
| **어드민 UI** | ❌ 없음 | 마드관리 기능 완전 부재 |
| **서버 API** | ❌ 없음 | gift_products 테이블 또는 동적 API 미구현 |
| **즉시 적용** | ❌ 불가능 | 재배포 필요 |

**평가**: 🔴 **Critical** - 완전히 하드코딩됨, 운영 시 유연성 0

---

## 5. 게스트 긁기 제한 횟수

| 항목 | 현황 | 상세 |
|------|------|------|
| **제한 정책** | 1회 맛보기 + 2회차 차단 | App.jsx L292: localStorage.getItem('guest_scratched') === 'true' |
| **저장 위치** | localStorage ('guest_scratched' boolean) | 클라이언트 자체 판정 |
| **1회 맛보기** | ScratchCard.jsx L129: localStorage.setItem('guest_scratched', 'true') | 게스트 긁기 완료 시 기록 |
| **2회차 차단** | App.jsx L291-295: showGuestBlock 모달 표시 | 로그인 강제 유도 |
| **설정값** | **하드코딩** | 횟수 변경 불가능 (코드 수정 필요) |
| **서버 검증** | ❌ 없음 | 클라이언트 자체 관리 (부정 가능) |
| **어드민 제어** | ❌ 없음 | DB/어드민 UI 완전 부재 |

**평가**: 🔴 **Critical** - 하드코딩 + 클라이언트만 관리 = 부정 위험 + 수정 불가

---

## 6. 출금 최소 금액 & 대기 일수

| 항목 | 현황 | 상세 |
|------|------|------|
| **최소 출금** | 1,000P | withdrawal.js L35: `if (amt < 1000) return error` |
| **최대 출금** | 500,000P | withdrawal.js L38: `if (amt > 500000) return error` |
| **설정 위치** | server/routes/withdrawal.js 하드코딩 | 코드 내 상수 |
| **대기 일수** | 7일 | withdrawal.js L58: `if (diffDays < 7) return error` |
| **적용 범위** | 출금(withdrawal) + 기프티콘 교환(share.js) | 두 곳 모두 동일 |
| **즉시 적용** | ❌ 불가능 | 서버 재배포 필요 |
| **어드민 제어** | ❌ 없음 | DB/설정값 미구현 |

**평가**: 🔴 **Critical** - 완전 하드코딩, 운영 중 변경 불가, 시간 낭비

---

## 7. 긁기 Threshold (몇 % 긁어야 공개)

| 항목 | 현황 | 상세 |
|------|------|------|
| **Threshold 값** | 80% | ScratchCard.jsx L7: `REVEAL_THRESHOLD_LOGIN = 0.80` |
| **비로그인** | 동일 80% | ScratchCard.jsx L8: `REVEAL_THRESHOLD_GUEST = 0.80` |
| **설정 위치** | src/components/ScratchCard.jsx 하드코딩 | 컴포넌트 상수 |
| **적용 시기** | 실시간 | 클라이언트 계산 (useCallback checkReveal) |
| **서버 검증** | ✓ bot detection | scratch_sessions.duration_ms로 속도 검증 |
| **즉시 적용** | ❌ 불가능 | **클라이언트 재배포** 필수 |
| **어드민 제어** | ❌ 없음 | DB/API 미구현 |

**평가**: 🔴 **Critical** - 클라이언트 상수로 고정, A/B 테스트 불가

---

## 8. Bot Detection 임계값

| 항목 | 현황 | 상세 |
|------|------|------|
| **검증 방식** | 긁기 완료 시간 | ScratchCard.jsx L138: `durationMs = Date.now() - scratchStartTime` |
| **서버 검증** | share.js에서 필수 | completeScratchSession(token, durationMs) 호출 |
| **임계값** | **구현 안됨 ❌** | share.js에서 session.is_valid 체크만 함 |
| **경고 표시** | ScratchCard.jsx L250-256: botWarning 모달 | "비정상적으로 빠른 긁기" 메시지 |
| **현재 상태** | incomplete implementation | 검증 로직 부분적 |

**평가**: 🟡 **Important** - 부분 구현, 명확한 임계값 정의 필요

---

## 종합 평가 테이블

| 항목 | 현황 | 제어 난이도 | 즉시 적용 | 어드민 UI | 우선도 |
|------|------|-----------|---------|---------|-------|
| 긁기 포인트 (share_point) | DB ✓ | 쉬움 | ✓ | ❌ | 🟢 |
| 퀴즈 포인트 (point) | DB ✓ | 쉬움 | ✓ | ✓ | 🟢 |
| QR 포인트 (qr_point) | DB ✓ | 쉬움 | ✓ | ❌ | 🟡 |
| 기프티콘 가격 | 하드코딩 | 어려움 | ❌ | ❌ | 🔴 |
| 게스트 제한 횟수 | 하드코딩 | 어려움 | ❌ | ❌ | 🔴 |
| 출금 최소/최대 | 하드코딩 | 어려움 | ❌ | ❌ | 🔴 |
| 출금 대기일수 | 하드코딩 | 어려움 | ❌ | ❌ | 🔴 |
| 긁기 Threshold | 하드코딩 | 어려움 | ❌ | ❌ | 🔴 |
| Bot Detection | 부분 구현 | 중간 | ✓(수정필요) | ❌ | 🟡 |

---

## 권장 개선안

### 🔴 Critical (즉시 개선 필요)

1. **기프티콘 상품 DB화**
   - `gift_products` 테이블 추가
   - 어드민 UI에서 동적 관리
   - 영향: 재배포 불필요, 운영 유연성 극대화

2. **게스트 제한 설정 DB화**
   - `system_settings` 테이블 추가
   - field: guest_limit_count, guest_block_threshold
   - 서버 검증 추가 (부정 방지)

3. **출금/사용 규정 DB화**
   - `system_settings`에 min_withdrawal, max_withdrawal, required_signup_days 추가
   - 어드민 UI에서 수정 가능하게

### 🟡 Important (1-2주 내 개선)

4. **QR 포인트 범위 검증**
   - 서버에서 범위 체크 (50~500P 권장)
   - 어드민 UI 추가

5. **Bot Detection 임계값 명확화**
   - server/routes/share.js에 임계값 정의
   - 예: durationMs < 2000ms면 bot 판정
   - 어드민에서 조정 가능하게

6. **긁기 Threshold A/B 테스트**
   - 서버에서 사용자별 variation 결정
   - 70%, 75%, 80%, 85% 다중 버전
   - 분석 후 최적값 결정

### 🟢 Nice-to-have

7. **비즈니스 자체 설정**
   - 자영업자 대시보드에서 qr_point 수정 UI
   - share_point 수정 UI

---

## 코드 레퍼런스

**파일 위치 정리**:
- DB 스키마: `server/db.js` L27-217
- 마이그레이션: `server/db.js` L222-238
- 긁기 포인트: `server/routes/share.js` L48, L70
- 퀴즈 포인트: `server/routes/quiz.js` L31-44, L156-157
- QR 포인트: `server/routes/qr.js` L84
- 기프티콘: `src/pages/GiftShopPage.jsx` L6-19 (하드코딩!)
- 게스트 제한: `src/App.jsx` L292, `src/components/ScratchCard.jsx` L129
- 출금 규정: `server/routes/withdrawal.js` L35-40, L58
- Threshold: `src/components/ScratchCard.jsx` L7-8
- Bot Detection: `server/routes/share.js` (미구현)

