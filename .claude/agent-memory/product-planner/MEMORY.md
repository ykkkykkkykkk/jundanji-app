# 전단지P 제품 기획 분석 메모리

## 현재 상태 (2026-03-15)

### 핵심 특징
- 모바일 퍼스트 (max-width 430px) PWA 앱
- 포인트 적립 → 교환/출금 모델
- 3가지 포인트 적립: 전단지 긁기(share_point), 퀴즈(10~50P), QR 방문(100~500P)
- 포인트 사용: 기프티콘 교환(3,000~15,000P), 현금 출금(1,000P~ 최소 7일 경과)
- 사용자 역할: user(일반), business(자영업자), admin(슈퍼어드민)

### 핵심 루프
1. MainPage: 카테고리별 전단지 피드 (무한스크롤)
2. DetailPage: 전단지 상세 + 퀴즈 모달
3. ScratchCard: Canvas 기반 복권 긁기 (60% 이상 선택)
4. Share: 긁기 완료 후 포인트 적립
5. GiftShopPage: 기프티콘 교환 또는 MyPage에서 출금

### 보안/검증 메커니즘
- Device fingerprinting: 다중계정 방지 (가입 시)
- Scratch session token: 긁기 유효성 검증
- Bot detection: 긁기 속도 검증 (완료 후 세션 검증)
- Share history UNIQUE 제약: 중복 공유 방지
- 출금 지연(7일): 즉각적 현금화 방지

### DB 테이블 구조
- users, flyers, share_history, point_transactions
- quiz_attempts, quiz (비즈니스 전용)
- visit_verifications (QR 스캔)
- gift_orders, withdrawals, exchange_requests
- device_fingerprints, scratch_sessions
- categories, notifications, bookmarks, inquiries
- budget_charges (사업자 예산 충전)
