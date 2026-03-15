---
name: MCP 서버 설정 및 웹 자동화 테스트 컨텍스트
description: 전단지P 프로젝트의 웹 자동화 테스트를 위한 MCP(Model Context Protocol) 서버 설정, 권장 조합, 테스트 시나리오 정리
type: project
---

## MCP 서버 선택 결과

**최종 권장 조합**: Playwright + Fetch + SQLite (우선순위순)

### Phase 1: Playwright MCP (필수 - E2E 테스트)
- **용도**: 프론트엔드 사용자 플로우 전체 자동화
- **npm**: `@modelcontextprotocol/server-playwright`
- **핵심 Tools**: browser_launch, navigate, click, type, screenshot, wait_for_selector
- **전단지P 테스트**: 전단지 피드, 복권 긁기(Canvas), 퀴즈, QR 스캔, 포인트 출금
- **특징**: 모바일 뷰포트(430px) 에뮬레이션 완벽 지원

### Phase 2: Fetch MCP (핵심 - API 테스트)
- **용도**: 백엔드 API 엔드포인트 직접 테스트
- **npm**: `@modelcontextprotocol/server-fetch`
- **핵심 Tools**: fetch (GET, POST, PUT, DELETE, PATCH)
- **전단지P 테스트**: JWT 인증, 포인트 적립/차감, 출금, 에러 응답(400/401/403/500)
- **특징**: HTTP 요청/응답 직접 검증, CORS 무관

### Phase 3: SQLite MCP (심화 - DB 검증)
- **용도**: 데이터베이스 레벨 검증 및 테스트 데이터 정리
- **설정**: `sqlite3` 명령어로 `C:\Users\82104\Desktop\전단지\server\data.db` 접근
- **핵심 Tools**: query, inspect (SQL 직접 실행)
- **전단지P 테스트**: 포인트 일관성(SUM 검증), 중복 방지(긁기/QR/퀴즈), 쿨다운(QR 24시간), 다중계정 방지(device_fingerprint)

## 설정 방법

### 1. 패키지 설치
```bash
npm install --save-dev @modelcontextprotocol/server-playwright
npm install --save-dev @modelcontextprotocol/server-fetch
npm install --save-dev @modelcontextprotocol/server-sqlite
```

### 2. `.claude/settings.json` 업데이트
- mcpServers 섹션에 3개 서버 추가
- Windows 경로는 역슬래시 이스케이프: `C:\\Users\\82104\\Desktop\\전단지\\server\\data.db`
- ENV 변수 설정 (Playwright의 PLAYWRIGHT_LAUNCH_ARGS)

### 3. Claude Code 재시작
- 설정 변경 후 애플리케이션 완전 종료 후 재시작
- Tools 탭에서 MCP 서버 3개 로드 확인

## 주요 테스트 시나리오

### 복권 긁기 (Canvas)
- **Playwright**: Canvas 드래그로 60% 이상 긁기 시뮬레이션
- **Fetch**: POST /api/scratch/{id}/scratch - 긁기 비율, 완료 시간 전송
- **SQLite**: scratch_sessions 테이블에서 중복 방지, 완료 기록 확인

### 포인트 출금
- **Playwright**: 금액 입력, 계좌 입력, 제출 버튼 클릭
- **Fetch**: 최소 1,000P 검증 (400 응답), 가입 7일 제한 (403 응답)
- **SQLite**: point_transactions SUM 검증, withdrawals 기록 확인

### QR 방문인증
- **Playwright**: QR 스캔 페이지, 카메라 권한, 인증 완료 메시지
- **Fetch**: POST /api/visit/verify - QR 코드 데이터 전송
- **SQLite**: visit_verifications 테이블에서 24시간 쿨다운 검증 (중복 방지)

### 다중계정 방지
- **Fetch**: 같은 device_fingerprint로 다른 이메일 로그인 시도 → 403 에러
- **SQLite**: device_fingerprints 테이블에서 한 기기당 단 1개 계정만 있는지 검증

## 성능 특성

| MCP 서버 | 응답시간 | 메모리 |
|---------|---------|--------|
| Playwright | 5-15초 (브라우저 실행 포함) | 200-500MB |
| Fetch | 100-500ms | 10-20MB |
| SQLite | 10-100ms | 5-10MB |

## 주의사항

### Playwright
- Canvas 드래그 입력이 복잡할 수 있음 → JavaScript evaluate로 픽셀 직접 조작 고려
- 장시간 실행 시 메모리 누수 가능성 → 주기적으로 browser.close() 호출

### Fetch
- JWT 토큰 직접 전달 (쿠키 자동 관리 안 됨) → API 호출 시 Authorization 헤더 직접 설정
- WebSocket/SSE 지원 없음 → 실시간 기능은 Playwright로만 테스트 가능

### SQLite
- 로컬 DB만 접근 (프로덕션의 Turso는 직접 쿼리 불가) → 프로덕션 테스트는 다른 방식 필요
- 쓰기 권한 관리 주의 → 테스트 후 자동 롤백 메커니즘 필요

## 통합 테스트 플로우

```
사용자 행동 (Playwright E2E)
  ↓
API 호출 (Express 백엔드)
  ↓
API 응답 검증 (Fetch MCP)
  ↓
데이터베이스 업데이트
  ↓
DB 상태 검증 (SQLite MCP)
  ↓
UI 업데이트 확인 (Playwright)
```

## 구현 로드맵

- **Week 1**: Playwright 설치 및 E2E 테스트 1개 (전단지 피드)
- **Week 2**: Fetch MCP 및 API 테스트 5개 (조회, 적립, 출금 등)
- **Week 3**: SQLite MCP 및 DB 검증 5개 (일관성, 중복, 쿨다운 등)
- **Week 4**: 통합 테스트 5개 + CI/CD 연동

## 참고 리소스

- MCP 공식: https://modelcontextprotocol.io
- Playwright: https://playwright.dev
- 공식 MCP 서버 모음: https://github.com/modelcontextprotocol/servers

**작성일**: 2026-03-15
**상태**: 조사 완료, 구현 대기
