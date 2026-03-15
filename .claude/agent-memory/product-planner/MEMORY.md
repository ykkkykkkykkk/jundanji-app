# 전단지P 제품 기획 메모리 인덱스

## 분석 자료

- [ANALYSIS_REPORT_20260315.md](ANALYSIS_REPORT_20260315.md) — 사용자/자영업자 플로우 분석, 메리트/디메리트, Critical/Important/Nice-to-have 개선안
- [POINT_BALANCE_CONTROL.md](POINT_BALANCE_CONTROL.md) — 포인트 밸런스 시스템 제어 현황: DB화 여부, 하드코딩 항목, Critical 개선 항목

## 현재 상태 (2026-03-15)

### 핵심 특징
- 모바일 퍼스트 (max-width 430px) PWA 앱
- 포인트 적립 → 교환/출금 모델
- 3가지 포인트 적립: 전단지 긁기(sharePoint 기본 10P), 퀴즈(10~50P), QR 방문(100~500P)
- 포인트 사용: 기프티콘 교환(최소 3,000P, 12개 고정 상품), 현금 출금(최소 1,000P + 7일 경과)
- 사용자 역할: user(일반), business(자영업자), admin(슈퍼어드민)

### 핵심 루프
1. MainPage: 카테고리별 전단지 피드 (무한스크롤)
2. 전단지 클릭 → ScratchCard 모달 (Canvas 기반)
3. 80% 긁으면 DetailPage로 이동
4. DetailPage: 전단지 상세 정보 + 자동 퀴즈 모달
5. GiftShopPage: 기프티콘 교환 또는 MyPage에서 포인트/출금 관리

### 게스트 플로우 (이탈 위험)
- 비로그인 1회: 게스트 맛보기 (80% 긁고 당첨 모달, 실제 포인트 미적립)
- 비로그인 2회: "로그인이 필요해요" 블로킹 모달 → 강제 로그인 유도
  - 이 메커니즘이 초기 진입장벽 높음 (게스트가 1회만 봄)

### 보안/검증
- Device fingerprinting: 다중계정 방지 (가입 시)
- Scratch session token: 긁기 서버 검증
- Bot detection: 긁기 완료 시간(durationMs) 검증
- Share history: 사용자-전단지별 UNIQUE 제약 (중복 공유 방지)
- 출금 7일 경과: 사기/조기 현금화 방지

### 사업자 예산 시스템
- 사업자가 미리 "포인트 예산(point_budget)" 충전
- 사용자 포인트 적립 시 → 사업자 예산에서 즉시 차감
- 예산 부족 시 → 사용자 포인트 적립 차단 (에러 응답)
- 충전 방식: 수동 요청 (자동 결제 미구현)
