# QA 테스터 메모리 인덱스

## 우선순위별 조치사항

- [follow-up-actions-2026-03-15.md](follow-up-actions-2026-03-15.md) — 즉시 수정 필요 항목
  - Critical 4개 (1주 내): SQLite DATE, 게스트 긁기 이중 모달, API 중복, 시간 동기화
  - Major 5개 (이번 주): 퀴즈/QR 예산, 7일 제한, 정답 정규화, 음수 처리
  - 테스트 자동화 도입 (1개월)

## 테스트 자동화 현황

- [testing-status-audit-2026-03-15.md](testing-status-audit-2026-03-15.md) — 프레임워크 미설치 상태
  - Vitest + React Testing Library + Playwright 도입 필요
  - Phase 1: 포인트 적립, JWT, 중복 방지 (1주)

## v4.3.0 보안 3차 수정 검증 완료

- [v43-validation-2026-03-15.md](v43-validation-2026-03-15.md) — 빌드/API/authMiddleware 검증
  - 빌드 성공 (dist/ 정상 생성)
  - API 계약 완전 일치 (7개 엔드포인트)
  - authMiddleware 모든 보호 라우트에 적용됨
  - 회원 탈퇴 플로우 완전 구현
  - 토큰 전달 체인 정상 (ScratchCard까지)

## 완료된 QA 분석 (상세 버그 리스트)

- [qa-report-2026-03-15.md](qa-report-2026-03-15.md) — 전체 버그 분석 (20개)
  - Critical 4개, Major 8개, Minor 8개

- [api-contract-validation-2026-03-15.md](api-contract-validation-2026-03-15.md) — API 계약 검증
  - 4개 API 완전 일치

- [admin-audit-2026-03-15.md](admin-audit-2026-03-15.md) — 어드민 도구 감시
  - 미구현 기능 20개, 버그 10개
