# QA 테스터 메모리 인덱스

## 테스트 자동화 현황

- [testing-status-audit-2026-03-15.md](testing-status-audit-2026-03-15.md) — 테스트 자동화 현황 전수 점검
  - 테스트 라이브러리 미설치 (프론트/백엔드 모두)
  - 수동 테스트 스크립트만 존재 (server/test.js, server/test-auth.js 64줄, 50줄)
  - Vitest + React Testing Library + Playwright 도입 권장
  - Phase 1 Critical: 포인트 적립, JWT, 중복 방지 (1주)

## 최근 QA 분석 결과

- [api-contract-validation-2026-03-15.md](api-contract-validation-2026-03-15.md) — API 계약 검증
  - 4개 API 완전 일치 (share, quiz, qr, gift-orders)

- [qa-report-2026-03-15.md](qa-report-2026-03-15.md) — 코드 기반 버그 분석
  - Critical 4개, Major 8개, Minor 8개 발견

- [admin-audit-2026-03-15.md](admin-audit-2026-03-15.md) — 어드민 도구 감시
  - 미구현 기능 20개, 버그 10개
