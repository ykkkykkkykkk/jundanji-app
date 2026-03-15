# 전단지P 프로젝트를 위한 MCP(Model Context Protocol) 서버 설정 조사 보고서

**작성일**: 2026년 3월 15일
**대상 프로젝트**: 전단지P (React 18 + Vite 5 + Express 5)
**목적**: 웹 자동화 테스트 자동화를 위한 MCP 서버 통합 방안 조사

---

## 1. MCP(Model Context Protocol)란?

### 1.1 개념
**MCP(Model Context Protocol)**은 Anthropic이 개발한 오픈소스 표준으로, AI 애플리케이션(Claude, ChatGPT 등)을 외부 시스템에 연결하는 표준화된 방법을 제공합니다.

**USB-C 포트 비유**:
- USB-C는 전자기기 연결의 표준화된 방식
- MCP는 AI 애플리케이션과 외부 시스템 연결의 표준화된 방식

### 1.2 MCP 핵심 구조
```
┌─────────────────────────────┐
│   AI Application            │
│   (Claude, Claude Code)     │
└──────────────┬──────────────┘
               │ (MCP Protocol)
      ┌────────┴────────┐
      │                 │
  ┌───▼───┐         ┌───▼───┐
  │ MCP   │         │ MCP   │
  │Server │         │Server │
  │   1   │         │   2   │
  └───┬───┘         └───┬───┘
      │                 │
  ┌───▼──────┐     ┌────▼────┐
  │Tool/Data │     │Tool/Data │
  │Source 1  │     │Source 2  │
  └──────────┘     └──────────┘
```

### 1.3 MCP가 해결하는 문제

| 문제 | MCP 솔루션 |
|------|-----------|
| AI와 외부 시스템의 연결이 일관성 없음 | 표준화된 프로토콜 제공 |
| 각 AI 앱마다 개별 통합 필요 | "한 번 구축하면 모든 AI 클라이언트에서 사용 가능" |
| AI 앱의 확장성 제한 | 다양한 데이터/도구에 접근 가능 |

### 1.4 MCP 지원 클라이언트
- Claude (Claude.com)
- Claude Code (Cursor, VS Code, 내장)
- ChatGPT (OpenAI)
- Cursor IDE
- VS Code with Copilot
- MCPJam
- 기타 개발 도구들

---

## 2. 웹 자동화 테스트용 MCP 서버 종류

### 2.1 주요 MCP 서버 카테고리

#### A. 브라우저 자동화 MCP 서버

##### 1) **Playwright MCP Server** (추천)
- **설명**: Playwright 기반 브라우저 자동화
- **GitHub**: https://github.com/modelcontextprotocol/servers/tree/main/src/playwright
- **npm 패키지**: `@modelcontextprotocol/server-playwright`
- **주요 기능**:
  - ✅ 브라우저 자동 실행 (Chrome, Firefox, Safari)
  - ✅ 페이지 네비게이션, 클릭, 텍스트 입력
  - ✅ 스크린샷 캡처
  - ✅ DOM 조회 및 조작
  - ✅ 폼 제출, 대기 조건 설정
  - ✅ JavaScript 실행
  - ✅ 네트워크 인터셉트 (API 모킹)

**전단지P 활용 시나리오**:
```
- E2E 테스트: 전단지 피드 무한 스크롤, 복권 긁기(Canvas),
  퀴즈 풀기, QR 스캔, 포인트 출금 등
- 회귀 테스트: 주요 플로우가 깨지지 않았는지 검증
- 크로스 브라우저 테스트: 모바일 Chrome, Safari 호환성 검증
```

##### 2) **Puppeteer MCP Server**
- **설명**: Puppeteer(Chrome DevTools Protocol) 기반 자동화
- **특징**: Playwright보다 Chrome 중심이나 약간 가볍고 빠름
- **적합성**: Playwright보다는 낮음 (멀티 브라우저 필요시)

##### 3) **Browser-Use MCP Server**
- **설명**: AI가 사람처럼 브라우저를 조작하는 "에이전트" 방식
- **GitHub**: https://github.com/browser-use/browser-use
- **특징**:
  - 자동화된 브라우저 동작 (클릭, 스크롤, 입력 자동화)
  - AI가 사람의 의도를 이해하고 자동화
  - 테스트 시나리오 작성 최소화
- **장점**: "사용자가 전단지를 공유하고 포인트를 받는 시나리오 자동화" 같은 자연어 명령
- **단점**: 신뢰도가 AI에 의존, 복잡한 상호작용에서 불안정할 수 있음

#### B. API/HTTP 테스트용 MCP 서버

##### 1) **mcp-server-fetch** (API 테스트)
- **설명**: HTTP 요청 수행 및 응답 검증
- **GitHub**: https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
- **npm 패키지**: `@modelcontextprotocol/server-fetch`
- **주요 기능**:
  - ✅ GET, POST, PUT, DELETE, PATCH 요청
  - ✅ 헤더, 바디, 쿼리 파라미터 설정
  - ✅ 응답 상태 코드 검증
  - ✅ JSON 응답 파싱

**전단지P 활용 시나리오**:
```
- API 통합 테스트:
  - 전단지 조회: GET /api/flyers
  - 퀴즈 정답 제출: POST /api/quizzes/:id/answer
  - 포인트 출금: POST /api/withdrawals
  - JWT 토큰 만료 처리 검증
  - 에러 응답 (400, 401, 500) 처리
- 소셜 로그인 콜백 검증
- 포인트 트랜잭션 일관성 검증
```

##### 2) **mcp-server-brave** (웹 검색)
- **설명**: Brave Search API를 통한 웹 검색
- **적합성**: 테스트 자동화와 직접 관련 없음

#### C. 데이터베이스 테스트용 MCP 서버

##### 1) **mcp-server-sqlite** (DB 검증)
- **설명**: SQLite 데이터베이스 직접 쿼리
- **GitHub**: https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite
- **npm 패키지**: `@modelcontextprotocol/server-sqlite`
- **주요 기능**:
  - ✅ SQL 쿼리 실행 (SELECT, INSERT, UPDATE, DELETE)
  - ✅ 테스트 데이터 검증
  - ✅ 트랜잭션 확인
  - ✅ 스키마 조회

**전단지P 활용 시나리오**:
```
- 테스트 데이터 검증:
  - point_transactions 테이블에서 포인트 적립/차감 확인
  - quiz_attempts 테이블에서 정답 여부 검증
  - visit_verifications에서 QR 인증 중복 방지 확인
  - device_fingerprints로 다중계정 방지 검증
  - scratch_sessions로 복권 중복 긁기 방지 확인
- 데이터 일관성 검증 (사용자 포인트 = 트랜잭션 합계)
- 테스트 후 데이터 정리 (클린업)
```

#### D. 그 외 테스트 관련 MCP 서버

##### 1) **mcp-server-bash** (스크립트 실행)
- **설명**: bash 스크립트 실행
- **적합성**: 테스트 스크립트 실행, 빌드, 배포 자동화

##### 2) **mcp-server-git** (Git 작업)
- **설명**: Git 명령 실행
- **적합성**: 테스트 브랜치 생성, 커밋, PR 자동화

##### 3) **mcp-server-filesystem** (파일 시스템)
- **설명**: 파일 읽기/쓰기
- **적합성**: 테스트 결과 저장, 로그 분석

---

## 3. 각 MCP 서버별 상세 분석

### 3.1 Playwright MCP Server (우선순위: 1번)

#### 설치 방법

**방법 1: npm 글로벌 설치**
```bash
npm install -g @modelcontextprotocol/server-playwright
```

**방법 2: 프로젝트 로컬 설치 (권장)**
```bash
# server/ 디렉토리에서
cd server
npm install --save-dev @modelcontextprotocol/server-playwright
```

#### Claude Desktop 설정 (claude_desktop_config.json)

**Windows 위치**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-playwright')"
      ],
      "env": {}
    }
  }
}
```

#### Claude Code 설정 (.claude/settings.json)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-playwright')"
      ]
    }
  },
  "permissions": {
    "allow": [
      "Bash(cd:*)",
      "bash"
    ]
  }
}
```

#### 제공 Tools(도구) 목록

| Tool | 설명 |
|------|------|
| `browser_launch` | 새 브라우저 세션 시작 |
| `navigate` | 특정 URL로 이동 |
| `click` | 요소 클릭 |
| `type` | 텍스트 입력 |
| `screenshot` | 현재 페이지 스크린샷 |
| `find_element` | CSS 셀렉터로 요소 찾기 |
| `get_element_properties` | 요소 속성 조회 |
| `evaluate` | JavaScript 실행 |
| `wait_for_selector` | 요소 나타날 때까지 대기 |
| `fill_form` | 폼 필드 자동 채우기 |

#### 전단지P 테스트 시나리오 예시

```javascript
// 시나리오 1: 전단지 피드 무한 스크롤 테스트
1. browser_launch({ headless: false })
2. navigate("http://localhost:5173")
3. wait_for_selector("[data-test='flyer-feed']", 5000)
4. screenshot() → "feed_initial.png"
5. evaluate(`window.scrollBy(0, 500)`)
6. wait_for_selector("[data-test='flyer-card']:nth-child(10)")
7. screenshot() → "feed_after_scroll.png"

// 시나리오 2: 복권 긁기 테스트
1. navigate("http://localhost:5173#/detail/123")
2. find_element("canvas.scratch-card")
3. 복권 Canvas에서 좌표(100,100) 드래그로 긁기 시뮬레이션
4. wait_for_selector(".scratch-result")
5. get_element_properties(".scratch-result") → 포인트 적립 확인

// 시나리오 3: 로그인 → 퀴즈 풀기 → 포인트 확인
1. navigate("http://localhost:5173#/login")
2. click("[data-test='kakao-login']")
3. 소셜 로그인 팝업 처리 (또는 테스트 계정으로 자동 로그인)
4. wait_for_selector("[data-test='user-profile']")
5. navigate("http://localhost:5173#/detail/456")
6. find_element(".quiz-button")
7. click(".quiz-button")
8. type("input[name='answer']", "정답")
9. click("button[type='submit']")
10. wait_for_selector(".point-alert") → 포인트 적립 확인
11. screenshot() → 최종 결과
```

---

### 3.2 mcp-server-fetch (API 테스트, 우선순위: 2번)

#### 설치 방법

```bash
npm install -g @modelcontextprotocol/server-fetch
```

#### Claude Desktop / Claude Code 설정

```json
{
  "mcpServers": {
    "fetch": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-fetch')"
      ]
    }
  }
}
```

#### 제공 Tools 목록

| Tool | 설명 |
|------|------|
| `fetch` | HTTP 요청 수행 |

**fetch 도구 사용 예시**:
```javascript
fetch({
  url: "http://localhost:3001/api/flyers?category=편의점&limit=10",
  method: "GET",
  headers: {
    "Authorization": "Bearer <JWT_TOKEN>"
  }
})
→ { status: 200, body: { flyers: [...] } }
```

#### 전단지P 테스트 시나리오 예시

```javascript
// 시나리오 1: 전단지 조회 API 테스트
fetch({
  url: "http://localhost:3001/api/flyers",
  method: "GET",
  params: { category: "편의점", limit: 10 }
})
→ 검증: status === 200, body.flyers.length === 10

// 시나리오 2: 포인트 부족으로 출금 거부
fetch({
  url: "http://localhost:3001/api/withdrawals",
  method: "POST",
  headers: { "Authorization": "Bearer TOKEN" },
  body: {
    amount: 500,  // 최소 1,000P 미만
    bank_account: "..."
  }
})
→ 검증: status === 400, body.error === "최소 1,000P 필요"

// 시나리오 3: 퀴즈 정답 제출 및 포인트 적립
fetch({
  url: "http://localhost:3001/api/quizzes/789/answer",
  method: "POST",
  headers: { "Authorization": "Bearer TOKEN" },
  body: { answer: "정답" }
})
→ 검증: status === 200, body.points_earned === 30

// 시나리오 4: JWT 토큰 만료 처리
fetch({
  url: "http://localhost:3001/api/me",
  headers: { "Authorization": "Bearer EXPIRED_TOKEN" }
})
→ 검증: status === 401, body.error === "Token expired"

// 시나리오 5: 다중계정 기기 제한 (device_fingerprint)
fetch({
  url: "http://localhost:3001/api/auth/login",
  method: "POST",
  body: {
    device_fingerprint: "same_device_id",
    email: "user1@test.com"
  }
})
→ 첫 번째 로그인: 성공
fetch({
  url: "http://localhost:3001/api/auth/login",
  method: "POST",
  body: {
    device_fingerprint: "same_device_id",
    email: "user2@test.com"  // 다른 계정
  }
})
→ 검증: status === 403, body.error === "이미 다른 계정으로 로그인된 기기"
```

---

### 3.3 mcp-server-sqlite (DB 검증, 우선순위: 3번)

#### 설치 방법

```bash
npm install -g @modelcontextprotocol/server-sqlite
```

#### Claude Desktop / Claude Code 설정

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "sqlite3",
      "args": ["/path/to/server/data.db"]
    }
  }
}
```

#### 제공 Tools 목록

| Tool | 설명 |
|------|------|
| `query` | SQL 쿼리 실행 |
| `inspect` | 테이블 스키마 조회 |

#### 전단지P 테스트 시나리오 예시

```sql
-- 시나리오 1: 사용자 포인트 일관성 검증
SELECT
  u.id,
  u.points,
  COALESCE(SUM(pt.amount), 0) as calculated_points
FROM users u
LEFT JOIN point_transactions pt ON u.id = pt.user_id
GROUP BY u.id
HAVING u.points != calculated_points
-- 결과가 없어야 함 (포인트 일관성 검증)

-- 시나리오 2: 복권 중복 긁기 방지 확인
SELECT COUNT(*)
FROM scratch_sessions
WHERE user_id = 123 AND flyer_id = 456
-- 결과: 1 (중복 긁기 없음)

-- 시나리오 3: QR 방문 인증 쿨다운 검증
SELECT visited_at
FROM visit_verifications
WHERE user_id = 123 AND flyer_id = 789
ORDER BY visited_at DESC
LIMIT 1
-- 최근 방문 시간이 24시간 이전인지 확인

-- 시나리오 4: 포인트 출금 가입 7일 제한
SELECT
  DATE(created_at) as signup_date,
  DATE('now') as today,
  JULIANDAY('now') - JULIANDAY(created_at) as days_since_signup
FROM users
WHERE id = 123
-- days_since_signup >= 7 이어야 출금 가능

-- 시나리오 5: 퀴즈 정답 시 포인트 적립 확인
SELECT
  u.points,
  qa.is_correct,
  q.points as quiz_points
FROM users u
JOIN quiz_attempts qa ON u.id = qa.user_id
JOIN quizzes q ON qa.quiz_id = q.id
WHERE u.id = 123 AND qa.id = (
  SELECT MAX(id) FROM quiz_attempts WHERE user_id = 123
)
-- is_correct = 1이면 u.points >= quiz_points 확인

-- 시나리오 6: 기기별 다중계정 방지 (device_fingerprints)
SELECT
  d.device_fingerprint,
  COUNT(DISTINCT d.user_id) as account_count
FROM device_fingerprints d
GROUP BY d.device_fingerprint
HAVING account_count > 1
-- 결과: 0 (한 기기에 여러 계정 불가)
```

---

## 4. 전단지P에 최적인 MCP 조합 추천

### 4.1 권장 조합 (우선순위순)

#### Phase 1 (필수): 프론트엔드 E2E 테스트
```
MCP Server: Playwright
용도:
  - 전단지 피드 무한 스크롤 테스트
  - 복권 긁기(Canvas) 테스트
  - 퀴즈 풀기 테스트
  - QR 스캔 및 인증 테스트
  - 포인트 출금 플로우 테스트
  - 모바일 뷰포트(430px) 호환성 검증
기대 효과: 사용자 관점의 전체 플로우 검증
```

#### Phase 2 (핵심): 백엔드 API 테스트
```
MCP Server: mcp-server-fetch
용도:
  - API 엔드포인트 응답 검증
  - JWT 토큰 만료 처리
  - 에러 응답(400, 401, 403, 500) 검증
  - 포인트 트랜잭션 정합성 검증
  - 소셜 로그인 콜백 검증
기대 효과: API 계약(contract) 검증, 에러 처리 확인
```

#### Phase 3 (심화): DB 검증
```
MCP Server: mcp-server-sqlite
용도:
  - 포인트 계산 정합성 (SUM 검증)
  - 중복 방지 규칙 검증 (긁기, QR, 퀴즈)
  - 쿨다운 시간 검증 (QR 24시간)
  - 가입 7일 제한 검증
  - 기기 fingerprint 다중계정 방지
기대 효과: DB 레벨 데이터 무결성 검증, 테스트 데이터 정리
```

### 4.2 설치 순서

```bash
# 1단계: Playwright 설치
npm install --save-dev @modelcontextprotocol/server-playwright

# 2단계: mcp-server-fetch 설치
npm install --save-dev @modelcontextprotocol/server-fetch

# 3단계: mcp-server-sqlite 설치
npm install --save-dev @modelcontextprotocol/server-sqlite
```

### 4.3 전체 테스트 플로우

```
┌─────────────────────────────────────────┐
│  테스트 시작                              │
└────────────┬────────────────────────────┘
             │
    ┌────────▼────────┐
    │  Playwright     │ ← E2E 테스트
    │  (프론트엔드)    │
    └────────┬────────┘
             │ (API 호출)
    ┌────────▼────────┐
    │  mcp-server-    │ ← API 테스트
    │  fetch (백엔드) │
    └────────┬────────┘
             │ (DB 업데이트)
    ┌────────▼────────┐
    │  mcp-server-    │ ← DB 검증
    │  sqlite (검증)   │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │  테스트 결과     │
    │  리포트 생성     │
    └─────────────────┘
```

---

## 5. 설정 가이드

### 5.1 현재 프로젝트 구조 분석

**전단지P 프로젝트의 현재 설정**:

```
C:\Users\82104\Desktop\전단지\
├── .claude/
│   ├── settings.local.json      ← Claude Code 설정 (현재는 Bash만 허용)
│   └── agent-memory/            ← QA 에이전트 메모리
├── src/                         ← React 프론트엔드 (ESM)
├── server/                      ← Express 백엔드 (CommonJS)
│   ├── package.json
│   ├── app.js
│   ├── db.js
│   ├── routes/
│   └── data.db                  ← SQLite DB (로컬)
└── CLAUDE.md                    ← 프로젝트 가이드
```

### 5.2 Claude Code에서 MCP 연결 설정

#### Step 1: `.claude/settings.json` 업데이트

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-playwright')"
      ],
      "env": {
        "PLAYWRIGHT_LAUNCH_ARGS": "--disable-dev-shm-usage"  // Windows/Linux 환경
      }
    },
    "fetch": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-fetch')"
      ]
    },
    "sqlite": {
      "command": "sqlite3",
      "args": [
        "C:\\Users\\82104\\Desktop\\전단지\\server\\data.db"
      ],
      "env": {}
    }
  },
  "permissions": {
    "allow": [
      "Bash(cd:*)",
      "bash"
    ]
  }
}
```

#### Step 2: 패키지 설치

```bash
# 프로젝트 루트에서
npm install --save-dev @modelcontextprotocol/server-playwright
npm install --save-dev @modelcontextprotocol/server-fetch

# server/ 디렉토리에서
cd server
npm install --save-dev @modelcontextprotocol/server-sqlite
```

#### Step 3: Claude Code 재시작

Claude Code 애플리케이션을 완전히 종료했다가 다시 시작하면 새로운 MCP 서버가 로드됩니다.

### 5.3 MCP 서버 연결 확인

#### 방법 1: Claude Code UI 확인
```
Claude Code 창 → "Tools" 탭 → MCP 서버 목록 확인
- playwright ✓
- fetch ✓
- sqlite ✓
```

#### 방법 2: 간단한 테스트 명령어

**Playwright 테스트**:
```
사용자: "playwright로 localhost:5173에 접속해서 스크린샷을 찍어줘"
Claude: browser_launch → navigate → screenshot 도구 실행
```

**Fetch 테스트**:
```
사용자: "GET http://localhost:3001/api/flyers?limit=5 요청해줘"
Claude: fetch 도구 실행 → JSON 응답
```

**SQLite 테스트**:
```
사용자: "데이터베이스에서 users 테이블의 첫 5개 행을 조회해줘"
Claude: query 도구 실행 → SELECT * FROM users LIMIT 5
```

---

## 6. 전단지P 프로젝트별 테스트 시나리오

### 6.1 주요 기능별 테스트 시나리오

#### 1) 전단지 피드 및 검색

**MCP**: Playwright + Fetch + SQLite

```javascript
// E2E 테스트 (Playwright)
1. 앱 시작 → 피드 로드
2. "카테고리: 편의점" 필터 선택
3. 무한 스크롤로 5개 항목 추가 로드
4. "검색: 편의점" 입력 후 결과 확인
5. 각 전단지 상세 페이지 이동

// API 검증 (Fetch)
GET /api/flyers?category=편의점 → status 200
GET /api/flyers/search?q=편의점 → 결과 확인

// DB 검증 (SQLite)
SELECT COUNT(*) FROM flyers WHERE category='편의점'
  → Playwright UI에서 본 개수와 일치 확인
```

#### 2) 복권 긁기 (Canvas)

**MCP**: Playwright + Fetch + SQLite

```javascript
// E2E 테스트 (Playwright)
1. 전단지 상세 페이지에서 "복권 긁기" 버튼 클릭
2. Canvas 영역 마우스 드래그로 60% 이상 긁기
3. "결과 공개" 확인 (포인트 표시)
4. 다시 긁기 시도 → "이미 긁은 복권" 메시지

// API 검증 (Fetch)
POST /api/scratch/789/scratch
  body: { scratch_percentage: 65, completion_time: 2500 }
  → status 200, points: 100

// DB 검증 (SQLite)
SELECT COUNT(*) FROM scratch_sessions
  WHERE user_id=123 AND flyer_id=789
  → 결과: 1 (중복 긁기 방지)
SELECT is_completed FROM scratch_sessions
  WHERE user_id=123 AND flyer_id=789
  → 결과: 1 (완료 기록)
```

#### 3) 퀴즈 풀기

**MCP**: Playwright + Fetch + SQLite

```javascript
// E2E 테스트 (Playwright)
1. 전단지 상세 페이지에서 "퀴즈 풀기" 버튼
2. 랜덤 문제 1개 표시 확인
3. 정답 선택 후 제출
4. "정답! +30P" 또는 "오답" 메시지 확인

// API 검증 (Fetch)
POST /api/quizzes/456/answer
  body: { answer: "정답" }
  → status 200, points: 30

// DB 검증 (SQLite)
SELECT is_correct, points_earned FROM quiz_attempts
  WHERE user_id=123 AND quiz_id=456
  → is_correct=1, points_earned=30
```

#### 4) QR 방문인증

**MCP**: Playwright + Fetch + SQLite

```javascript
// E2E 테스트 (Playwright)
1. "QR 스캔" 페이지 이동
2. 카메라 권한 요청 확인
3. (테스트용) QR 코드 이미지 업로드
4. "방문 인증 완료 +200P" 메시지

// API 검증 (Fetch)
POST /api/visit/verify
  body: { qr_code: "jundanji_123_456" }
  → status 200, points: 200

// DB 검증 (SQLite)
SELECT visited_at FROM visit_verifications
  WHERE user_id=123 AND flyer_id=789
  → visited_at가 현재 시간과 일치
-- 24시간 쿨다운 확인
SELECT COUNT(*) FROM visit_verifications
  WHERE user_id=123 AND flyer_id=789
  AND datetime('now') - datetime(visited_at) < '1 day'
  → 1 (중복 방문 방지)
```

#### 5) 포인트 출금

**MCP**: Playwright + Fetch + SQLite

```javascript
// E2E 테스트 (Playwright)
1. "포인트 출금" 페이지 이동
2. 출금액 1,500P 입력
3. 은행 계좌 입력
4. 출금 신청 클릭
5. "출금 신청 완료" 메시지 (또는 잔액 부족 경고)

// API 검증 (Fetch)
POST /api/withdrawals
  body: { amount: 500 }  // 최소 1,000P 미만
  → status 400, error: "최소 1,000P 이상 필요"

POST /api/withdrawals
  body: { amount: 1500 }  // 가입 7일 미만
  → status 403, error: "가입 7일 이후 출금 가능"

POST /api/withdrawals
  body: { amount: 1500, account: "...", bank: "..." }
  → status 200, withdrawal_id: "..."

// DB 검증 (SQLite)
SELECT COUNT(*) FROM withdrawals
  WHERE user_id=123 AND status='pending'
  → 1 (신청 기록)
SELECT SUM(amount) FROM point_transactions
  WHERE user_id=123 AND type='withdrawal'
  → 포인트 차감 기록
```

#### 6) 다중계정 방지 (Device Fingerprint)

**MCP**: Fetch + SQLite

```javascript
// 1번째 로그인 (계정A, 기기X)
POST /api/auth/login
  body: { email: "userA@test.com", device_fingerprint: "device_X" }
  → status 200, token: "..."

// 2번째 로그인 (계정B, 같은 기기X)
POST /api/auth/login
  body: { email: "userB@test.com", device_fingerprint: "device_X" }
  → status 403, error: "이 기기는 이미 다른 계정으로 로그인됨"

// DB 검증 (SQLite)
SELECT user_id, device_fingerprint FROM device_fingerprints
  GROUP BY device_fingerprint
  HAVING COUNT(DISTINCT user_id) > 1
  → 결과: 없음 (다중계정 방지 성공)
```

---

## 7. MCP 설정 트러블슈팅

### 7.1 일반적인 문제 및 해결방법

| 문제 | 원인 | 해결방법 |
|------|------|---------|
| MCP 서버 로드 실패 | 패키지 미설치 | `npm install @modelcontextprotocol/server-*` |
| "Command not found" | Node.js 경로 오류 | settings.json에서 `command`를 전체 경로로 지정 |
| SQLite DB 파일 찾을 수 없음 | 경로 오류 | 절대 경로 사용, Windows는 역슬래시 이스케이프 |
| Playwright 브라우저 실행 실패 | 의존성 부재 | `npx playwright install` |
| CORS 에러 (API 호출) | 백엔드 CORS 설정 부족 | server/app.js의 CORS 미들웨어 확인 |

### 7.2 디버깅 방법

**MCP 서버 로그 확인** (Claude Code 콘솔):
```
Tools → MCP Servers → (해당 서버) → "Show logs"
```

**Playwright 디버그 모드**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["-e", "require('@modelcontextprotocol/server-playwright')"],
      "env": {
        "DEBUG": "playwright:*"
      }
    }
  }
}
```

---

## 8. 통합 테스트 작성 예시

### 8.1 전체 사용자 플로우 테스트

```javascript
// 테스트: 신규 사용자 가입 → 전단지 확인 → 퀴즈 풀기 → 포인트 출금

// Phase 1: E2E (Playwright)
browser_launch()
navigate("http://localhost:5173#/login")
click("[data-test='kakao-login']")
// 로그인 팝업 처리 (자동 또는 수동)
wait_for_selector("[data-test='user-profile']", 10000)

// Phase 2: 전단지 조회 (Playwright + Fetch)
navigate("http://localhost:5173#/main")
wait_for_selector("[data-test='flyer-card']")
screenshot() // → feed_screenshot.png

// Fetch로 API 검증
fetch({
  url: "http://localhost:3001/api/flyers",
  headers: { "Authorization": "Bearer $TOKEN" }
})
// 응답: { flyers: [...], total: 100 }

// Phase 3: 퀴즈 풀기 (Playwright)
navigate("http://localhost:5173#/detail/123")
click("[data-test='quiz-button']")
wait_for_selector(".quiz-modal")
// 정답 선택 (또는 임의 선택)
click("[data-test='answer-1']")
click("[data-test='submit']")
wait_for_selector(".point-alert")

// Phase 4: DB 검증 (SQLite)
query("SELECT points FROM users WHERE id=123")
// 결과: points = (초기값 + 퀴즈 포인트)

// Phase 5: 포인트 출금 (Playwright + Fetch)
navigate("http://localhost:5173#/withdrawal")
fill_form({
  "input[name='amount']": "1500",
  "input[name='account']": "1234567890",
  "select[name='bank']": "국민은행"
})
click("button[type='submit']")

// Fetch로 API 검증
fetch({
  url: "http://localhost:3001/api/withdrawals",
  method: "POST",
  headers: { "Authorization": "Bearer $TOKEN" },
  body: { amount: 1500, account: "1234567890", bank: "국민은행" }
})
// 응답: { status: "pending", withdrawal_id: "..." }

// Phase 6: 최종 DB 상태 검증 (SQLite)
query(`
  SELECT u.points, COUNT(w.id) as withdrawal_count
  FROM users u
  LEFT JOIN withdrawals w ON u.id = w.user_id
  WHERE u.id = 123
`)
// 결과: points = (초기값 + 포인트 - 출금액), withdrawal_count = 1
```

---

## 9. MCP 서버 성능 및 제한사항

### 9.1 성능 특성

| MCP 서버 | 평균 응답시간 | 메모리 | 특이사항 |
|---------|-------------|--------|---------|
| Playwright | 5-15초 (브라우저 실행) | 200-500MB | 자동화 작업의 느린 부분 |
| Fetch | 100-500ms | 10-20MB | 네트워크 상태에 의존 |
| SQLite | 10-100ms | 5-10MB | 로컬 DB 접근으로 빠름 |

### 9.2 제한사항 및 고려사항

#### Playwright
- ⚠️ 실제 마우스/터치 입력 시뮬레이션은 제한적 (Canvas 드래그는 복잡할 수 있음)
- ⚠️ 장시간 실행 시 메모리 누수 가능성
- ✅ 모바일 뷰포트 에뮬레이션 (430px) 완벽 지원

#### Fetch
- ⚠️ 쿠키 관리 제한 (JWT 토큰 직접 전달)
- ⚠️ WebSocket/SSE 지원 없음
- ✅ 단순 HTTP 요청은 매우 안정적

#### SQLite
- ⚠️ 실시간 데이터 동기화 (Turso와 로컬 DB) 필요
- ⚠️ 쓰기 권한 관리 (테스트 후 롤백 어려움)
- ✅ 읽기 전용 조회는 매우 안전

---

## 10. 다음 단계: 구현 로드맵

### 10.1 우선순위별 구현 계획

**Phase 1 (1주)**:
1. ✅ Playwright MCP 설치 및 기본 E2E 테스트 1개 작성
   - 전단지 피드 로드 및 무한 스크롤 테스트
2. ✅ .claude/settings.json 업데이트

**Phase 2 (1주)**:
1. ✅ Fetch MCP 설치 및 API 테스트 5개 작성
   - 전단지 조회, 포인트 적립, 출금 등
2. ✅ JWT 토큰 관리 및 인증 테스트

**Phase 3 (1주)**:
1. ✅ SQLite MCP 설치 및 DB 검증 테스트 5개 작성
   - 포인트 일관성, 중복 방지, 쿨다운 검증 등
2. ✅ 테스트 데이터 정리 스크립트 작성

**Phase 4 (2주)**:
1. ✅ 통합 테스트 5개 작성 (E2E + API + DB)
2. ✅ 테스트 리포트 자동 생성
3. ✅ CI/CD 파이프라인에 통합

### 10.2 테스트 코드 저장소 구조

```
project-root/
├── tests/
│   ├── e2e/
│   │   ├── flyer-feed.test.js           (Playwright)
│   │   ├── scratch-card.test.js         (Playwright)
│   │   ├── quiz.test.js                 (Playwright)
│   │   ├── qr-scan.test.js              (Playwright)
│   │   └── withdrawal.test.js           (Playwright)
│   ├── api/
│   │   ├── flyers.test.js               (Fetch)
│   │   ├── quiz.test.js                 (Fetch)
│   │   ├── withdrawals.test.js          (Fetch)
│   │   ├── auth.test.js                 (Fetch)
│   │   └── security.test.js             (Fetch)
│   ├── db/
│   │   ├── point-consistency.test.js    (SQLite)
│   │   ├── duplicate-prevention.test.js (SQLite)
│   │   ├── cooldown.test.js             (SQLite)
│   │   ├── user-limit.test.js           (SQLite)
│   │   └── device-fingerprint.test.js   (SQLite)
│   ├── integration/
│   │   ├── user-signup-to-withdrawal.test.js
│   │   └── quiz-point-flow.test.js
│   └── fixtures/
│       ├── test-users.json
│       ├── test-flyers.json
│       └── setup.js
└── .claude/
    └── settings.json (MCP 설정)
```

---

## 11. 결론 및 권장사항

### 11.1 핵심 요약

| 항목 | 결론 |
|------|------|
| **MCP 필요성** | ✅ 필수 — Claude Code가 자동화 테스트를 직접 실행 가능 |
| **추천 조합** | Playwright + Fetch + SQLite (3가지 MCP) |
| **설치 난이도** | ⭐⭐☆☆☆ (낮음 — npm install + JSON 설정) |
| **학습곡선** | ⭐⭐⭐☆☆ (중간 — 각 도구의 기본 사용법만 학습) |
| **프로젝트 영향** | ✅ 긍정적 — 테스트 자동화로 개발 속도 향상 |

### 11.2 최종 권장사항

1. **즉시 구현**: Playwright MCP로 E2E 테스트 시작
   - 사용자 관점 전체 플로우 검증
   - 모바일 호환성 검증

2. **1주일 후**: Fetch MCP로 API 테스트 확대
   - 백엔드 안정성 향상
   - 에러 처리 검증

3. **2주일 후**: SQLite MCP로 DB 검증 추가
   - 데이터 무결성 보증
   - 보안 규칙 준수 확인

4. **정기적 수행**: 매 배포 전 전체 MCP 테스트 자동 실행
   - CI/CD 파이프라인 통합
   - 테스트 리포트 생성

---

## 12. 참고자료

### 공식 문서
- **MCP 공식 사이트**: https://modelcontextprotocol.io
- **Playwright 공식 문서**: https://playwright.dev
- **SQLite 공식 문서**: https://www.sqlite.org

### MCP 서버 저장소
- **공식 MCP 서버 모음**: https://github.com/modelcontextprotocol/servers
- **Playwright MCP**: https://github.com/modelcontextprotocol/servers/tree/main/src/playwright
- **Fetch MCP**: https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
- **SQLite MCP**: https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite

### 관련 기술
- **Vitest (권장 테스트 프레임워크)**: https://vitest.dev
- **Express 테스트 가이드**: https://expressjs.com/en/guide/testing.html
- **React 테스트 라이브러리**: https://testing-library.com

---

## 부록 A: MCP 설정 파일 전체 예시

### A.1 Claude Code 설정 (.claude/settings.json)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-playwright').main()"
      ],
      "env": {
        "PLAYWRIGHT_LAUNCH_ARGS": "--disable-dev-shm-usage"
      }
    },
    "fetch": {
      "command": "node",
      "args": [
        "-e",
        "require('@modelcontextprotocol/server-fetch').main()"
      ],
      "env": {}
    },
    "sqlite": {
      "command": "sqlite3",
      "args": [
        "C:\\Users\\82104\\Desktop\\전단지\\server\\data.db"
      ],
      "env": {}
    }
  },
  "permissions": {
    "allow": [
      "Bash(cd:*)",
      "bash",
      "all_tools"
    ]
  }
}
```

### A.2 Claude Desktop 설정 (claude_desktop_config.json)

**Windows 위치**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "claude_desktop_config": {
    "mcpServers": {
      "playwright": {
        "command": "node",
        "args": [
          "-e",
          "require('@modelcontextprotocol/server-playwright').main()"
        ],
        "env": {}
      },
      "fetch": {
        "command": "node",
        "args": [
          "-e",
          "require('@modelcontextprotocol/server-fetch').main()"
        ],
        "env": {}
      },
      "sqlite": {
        "command": "sqlite3",
        "args": [
          "C:\\Users\\82104\\Desktop\\전단지\\server\\data.db"
        ],
        "env": {}
      }
    }
  }
}
```

---

**문서 종료**

이 문서는 전단지P 프로젝트의 웹 자동화 테스트 MCP 서버 통합에 대한 종합적인 조사 및 분석 결과입니다.
질문이나 추가 정보가 필요하면 요청해주세요.

