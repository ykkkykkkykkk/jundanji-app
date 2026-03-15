const path = require('path')
const isTurso = !!process.env.TURSO_DATABASE_URL

let db

if (isTurso) {
  // Turso (Vercel 프로덕션): @libsql/client 사용
  const { createClient } = require('@libsql/client')
  const { TursoDatabase } = require('./db-turso')
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  db = new TursoDatabase(client)
} else {
  // 로컬 개발: better-sqlite3 사용
  const Database = require('better-sqlite3')
  const { LocalDatabase } = require('./db-local')
  const rawDb = new Database(path.join(__dirname, 'data.db'))
  rawDb.pragma('journal_mode = WAL')
  rawDb.pragma('foreign_keys = ON')
  db = new LocalDatabase(rawDb)
}

// ==================== 스키마 SQL ====================

const schemaSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname      TEXT    NOT NULL DEFAULT '홍길동',
    email         TEXT    UNIQUE,
    password_hash TEXT,
    points        INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS flyers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    store_name   TEXT NOT NULL,
    store_emoji  TEXT NOT NULL,
    store_color  TEXT NOT NULL,
    store_bg_color TEXT NOT NULL,
    category     TEXT NOT NULL,
    title        TEXT NOT NULL,
    subtitle     TEXT NOT NULL,
    valid_from   TEXT NOT NULL,
    valid_until  TEXT NOT NULL,
    share_point  INTEGER NOT NULL DEFAULT 10,
    share_count  INTEGER NOT NULL DEFAULT 0,
    tags         TEXT NOT NULL DEFAULT '[]',
    created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS flyer_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    flyer_id       INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    original_price INTEGER NOT NULL,
    sale_price     INTEGER NOT NULL,
    sort_order     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS share_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flyer_id   INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    points     INTEGER NOT NULL,
    shared_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, flyer_id)
  );

  CREATE TABLE IF NOT EXISTS point_transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('earn', 'use')),
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    emoji      TEXT NOT NULL DEFAULT '🔔',
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flyer_id   INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, flyer_id)
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    flyer_id    INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL DEFAULT '',
    point       INTEGER NOT NULL DEFAULT 10,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flyer_id       INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    quiz_id        INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    selected_idx   INTEGER NOT NULL,
    is_correct     INTEGER NOT NULL DEFAULT 0,
    points_earned  INTEGER NOT NULL DEFAULT 0,
    attempted_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, flyer_id)
  );

  CREATE TABLE IF NOT EXISTS visit_verifications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flyer_id       INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    points_earned  INTEGER NOT NULL DEFAULT 0,
    verified_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS budget_charges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      INTEGER NOT NULL,
    method      TEXT NOT NULL DEFAULT 'manual',
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS gift_orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_id         TEXT NOT NULL,
    gift_name       TEXT NOT NULL,
    amount          INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    sent_at         TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL DEFAULT '일반',
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    answer      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    answered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS device_fingerprints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint     TEXT NOT NULL,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(fingerprint, user_id)
  );

  CREATE TABLE IF NOT EXISTS scratch_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    token       TEXT NOT NULL UNIQUE,
    user_id     INTEGER NOT NULL,
    flyer_id    INTEGER NOT NULL,
    started_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    completed_at TEXT,
    duration_ms INTEGER,
    is_valid    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          INTEGER NOT NULL,
    bank_name       TEXT NOT NULL,
    account_number  TEXT NOT NULL,
    account_holder  TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    admin_memo      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    processed_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS exchange_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    user_kakao_id TEXT,
    product_name TEXT NOT NULL,
    product_emoji TEXT,
    points      INTEGER NOT NULL,
    phone       TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at     DATETIME
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    description TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS gift_products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    gift_key    TEXT NOT NULL UNIQUE,
    emoji       TEXT NOT NULL,
    brand       TEXT NOT NULL,
    name        TEXT NOT NULL,
    points      INTEGER NOT NULL,
    category    TEXT NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )
`

// ==================== 마이그레이션 ====================

// 각 마이그레이션은 { version, sql } 형태. version은 순차 정수.
const migrations = [
  { version: 1,  sql: `ALTER TABLE flyers ADD COLUMN image_url TEXT` },
  { version: 2,  sql: `ALTER TABLE users ADD COLUMN provider TEXT` },
  { version: 3,  sql: `ALTER TABLE users ADD COLUMN provider_id TEXT` },
  { version: 4,  sql: `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'` },
  { version: 5,  sql: `ALTER TABLE flyers ADD COLUMN qr_point INTEGER NOT NULL DEFAULT 0` },
  { version: 6,  sql: `ALTER TABLE flyers ADD COLUMN owner_id INTEGER REFERENCES users(id)` },
  { version: 7,  sql: `ALTER TABLE flyers ADD COLUMN qr_code TEXT` },
  { version: 8,  sql: `ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'` },
  { version: 9,  sql: `ALTER TABLE users ADD COLUMN business_approved INTEGER NOT NULL DEFAULT 0` },
  { version: 10, sql: `ALTER TABLE flyers ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'` },
  { version: 11, sql: `ALTER TABLE users ADD COLUMN point_budget INTEGER NOT NULL DEFAULT 0` },
  { version: 12, sql: `ALTER TABLE flyers ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0` },
  { version: 13, sql: `ALTER TABLE users ADD COLUMN phone TEXT` },
  { version: 14, sql: `ALTER TABLE users ADD COLUMN device_fingerprint TEXT` },
  { version: 15, sql: `ALTER TABLE gift_orders ADD COLUMN phone TEXT` },
  // v16: scratch_sessions UNIQUE(user_id, flyer_id) 제거 — 멀티탭 독립 세션 허용
  { version: 16, sql: `
    CREATE TABLE IF NOT EXISTS scratch_sessions_new (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      token       TEXT NOT NULL UNIQUE,
      user_id     INTEGER NOT NULL,
      flyer_id    INTEGER NOT NULL,
      started_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      completed_at TEXT,
      duration_ms INTEGER,
      is_valid    INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO scratch_sessions_new SELECT * FROM scratch_sessions;
    DROP TABLE scratch_sessions;
    ALTER TABLE scratch_sessions_new RENAME TO scratch_sessions;
  ` },
]

// ==================== 시드 데이터 ====================

const flyerSeed = [
  // ── 마트 ──
  {
    storeName: '프레시마트', storeEmoji: '🛒', storeColor: '#FFB800', storeBgColor: '#FFFBEA',
    category: '마트', title: '주말 특가 전단지', subtitle: '신선식품·가공식품 최대 50% 할인',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 50, shareCount: 12341,
    tags: ['신선식품', '음료', '라면'],
    items: [
      { name: '한우 1등급 불고기 200g', originalPrice: 35000, salePrice: 22000 },
      { name: '제주 감귤 3kg', originalPrice: 12000, salePrice: 6900 },
      { name: '탄산음료 1.5L 6개입', originalPrice: 9800, salePrice: 5900 },
      { name: '라면 멀티팩 5개입', originalPrice: 4500, salePrice: 2990 },
      { name: '아이스크림 패밀리팩', originalPrice: 8900, salePrice: 4450 },
    ],
  },
  {
    storeName: '해피마트', storeEmoji: '🏪', storeColor: '#E60012', storeBgColor: '#FFF0F0',
    category: '마트', title: '봄맞이 생활용품 대전', subtitle: '주방·가전 특별 할인 행사',
    validFrom: '2026.02.20', validUntil: '2026.06.30', sharePoint: 80, shareCount: 8876,
    tags: ['가전', '주방', '생필품'],
    items: [
      { name: '에어프라이어 5.3L', originalPrice: 89000, salePrice: 59000 },
      { name: '프리미엄 프라이팬 28cm', originalPrice: 45000, salePrice: 29900 },
      { name: '화장지 30롤', originalPrice: 18900, salePrice: 11900 },
      { name: '바디워시 500ml', originalPrice: 7900, salePrice: 4900 },
    ],
  },
  {
    storeName: '바다마트', storeEmoji: '🐟', storeColor: '#1565C0', storeBgColor: '#EEF5FF',
    category: '마트', title: '신선 해산물 특가', subtitle: '산지직송 해산물 파격 할인',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 70, shareCount: 11109,
    tags: ['해산물', '신선식품', '산지직송'],
    items: [
      { name: '노르웨이 생연어 300g', originalPrice: 22000, salePrice: 13200 },
      { name: '킹크랩 1kg', originalPrice: 89000, salePrice: 59000 },
      { name: '꽃게 1마리 (600g 내외)', originalPrice: 15000, salePrice: 8900 },
      { name: '생새우 500g', originalPrice: 18000, salePrice: 11000 },
    ],
  },
  {
    storeName: '메가마트', storeEmoji: '🏭', storeColor: '#E31937', storeBgColor: '#FFF0F2',
    category: '마트', title: '회원 전용 초특가', subtitle: '대용량 식품·생활용품 최저가 도전',
    validFrom: '2026.02.23', validUntil: '2026.06.30', sharePoint: 100, shareCount: 18234,
    tags: ['대용량', '수입식품', '회원전용'],
    items: [
      { name: '견과류 믹스 1.13kg', originalPrice: 25900, salePrice: 17900 },
      { name: '미국산 프라임 등급 립아이 1kg', originalPrice: 52000, salePrice: 35900 },
      { name: '대용량 세탁세제 4.55L', originalPrice: 28900, salePrice: 18900 },
      { name: '베이글 12개입', originalPrice: 8990, salePrice: 6490 },
    ],
  },
  {
    storeName: '알뜰마트', storeEmoji: '🛍️', storeColor: '#FFD700', storeBgColor: '#FFFDE7',
    category: '마트', title: '알뜰 장보기 특집', subtitle: '가성비 최고 생필품 모음전',
    validFrom: '2026.02.22', validUntil: '2026.06.30', sharePoint: 30, shareCount: 11234,
    tags: ['가성비', '생필품', '알뜰'],
    items: [
      { name: 'PB 우유 1L 2팩', originalPrice: 4500, salePrice: 2990 },
      { name: 'PB 감자칩 200g', originalPrice: 2500, salePrice: 1590 },
      { name: 'PB 물티슈 100매 3팩', originalPrice: 3900, salePrice: 2490 },
      { name: 'PB 냉동 만두 1kg', originalPrice: 5900, salePrice: 3990 },
    ],
  },
  // ── 편의점 ──
  {
    storeName: '편의마트', storeEmoji: '🏬', storeColor: '#0078D4', storeBgColor: '#EFF6FF',
    category: '편의점', title: '2+1 행사 특집', subtitle: '인기 간식·음료 2+1 이벤트',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 30, shareCount: 15102,
    tags: ['2+1', '도시락', '간식'],
    items: [
      { name: '삼각김밥 참치마요', originalPrice: 1500, salePrice: 1000 },
      { name: '레몬에이드 500ml', originalPrice: 2200, salePrice: 1467 },
      { name: '초코파이 12개', originalPrice: 4500, salePrice: 3000 },
      { name: '도시락 불고기볶음밥', originalPrice: 4900, salePrice: 3267 },
    ],
  },
  {
    storeName: '매일편의점', storeEmoji: '🏪', storeColor: '#7B3FA1', storeBgColor: '#F8F0FF',
    category: '편의점', title: '2월 신상품 기획전', subtitle: '이달의 신제품 20% 할인',
    validFrom: '2026.02.01', validUntil: '2026.06.30', sharePoint: 30, shareCount: 9654,
    tags: ['신상품', '도시락', '할인'],
    items: [
      { name: '불닭볶음면 도시락 신상', originalPrice: 5400, salePrice: 4320 },
      { name: '크림 라떼 300ml', originalPrice: 2800, salePrice: 2240 },
      { name: '허니버터칩 55g', originalPrice: 1800, salePrice: 1440 },
      { name: '아이스 아메리카노 Large', originalPrice: 2000, salePrice: 1600 },
    ],
  },
  {
    storeName: '나라편의점', storeEmoji: '🏪', storeColor: '#008348', storeBgColor: '#F0FFF5',
    category: '편의점', title: '도시락 페스티벌', subtitle: '인기 도시락 1+1 및 할인 행사',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 35, shareCount: 7654,
    tags: ['도시락', '1+1', '편의점'],
    items: [
      { name: '한우 불고기 도시락', originalPrice: 5900, salePrice: 4200 },
      { name: '치킨 마요 덮밥', originalPrice: 4500, salePrice: 3150 },
      { name: '매콤 제육 도시락', originalPrice: 5200, salePrice: 3640 },
      { name: '삼각김밥 3개 묶음', originalPrice: 3900, salePrice: 2600 },
    ],
  },
  // ── 카페 ──
  {
    storeName: '카페모아', storeEmoji: '☕', storeColor: '#00704A', storeBgColor: '#F0FFF8',
    category: '카페', title: '봄 신메뉴 출시', subtitle: '벚꽃 시즌 한정 음료 특별가',
    validFrom: '2026.02.21', validUntil: '2026.04.30', sharePoint: 40, shareCount: 25678,
    tags: ['봄한정', '신메뉴', '음료'],
    items: [
      { name: '벚꽃 블로섬 라떼 (Tall)', originalPrice: 6800, salePrice: 5440 },
      { name: '딸기 크림 프라푸치노 (Tall)', originalPrice: 7200, salePrice: 5760 },
      { name: '봄 에디션 케이크 팝', originalPrice: 3500, salePrice: 2800 },
      { name: '리저브 체리 블로섬 티 (Tall)', originalPrice: 7800, salePrice: 6240 },
    ],
  },
  {
    storeName: '아이스베리', storeEmoji: '🍦', storeColor: '#FF1493', storeBgColor: '#FFF0F8',
    category: '카페', title: '이달의 맛 출시 기념', subtitle: '파인트 사이즈 30% 할인',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 25, shareCount: 19876,
    tags: ['아이스크림', '이달의맛', '할인'],
    items: [
      { name: '파인트 (레귤러)', originalPrice: 8900, salePrice: 6230 },
      { name: '쿼터 사이즈', originalPrice: 15800, salePrice: 12640 },
      { name: '아이스크림 케이크 미니', originalPrice: 22000, salePrice: 17600 },
      { name: '블라스트 세트 2개', originalPrice: 11800, salePrice: 8260 },
    ],
  },
  {
    storeName: '빈하우스', storeEmoji: '☕', storeColor: '#003478', storeBgColor: '#F0F4FF',
    category: '카페', title: '아메리카노 페스티벌', subtitle: '아메리카노 전 사이즈 1,000원 할인',
    validFrom: '2026.02.23', validUntil: '2026.06.30', sharePoint: 20, shareCount: 8765,
    tags: ['커피', '할인', '아메리카노'],
    items: [
      { name: '아메리카노 (Regular)', originalPrice: 3400, salePrice: 2400 },
      { name: '카페라떼 (Regular)', originalPrice: 4100, salePrice: 3100 },
      { name: '딸기 라떼 (Large)', originalPrice: 5300, salePrice: 4300 },
      { name: '샌드위치 + 음료 세트', originalPrice: 7900, salePrice: 5900 },
    ],
  },
  // ── 뷰티 ──
  {
    storeName: '뷰티하우스', storeEmoji: '💄', storeColor: '#00A651', storeBgColor: '#F0FFF6',
    category: '뷰티', title: '봄 뷰티 페스타', subtitle: '스킨케어·메이크업 최대 40% 할인',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 60, shareCount: 21521,
    tags: ['스킨케어', '메이크업', '특가'],
    items: [
      { name: '자작나무 토너 200ml', originalPrice: 18000, salePrice: 10800 },
      { name: '로즈 틴트 4종', originalPrice: 12000, salePrice: 7200 },
      { name: '부스팅 패드 80매', originalPrice: 28000, salePrice: 16800 },
      { name: '세라마이딘 크림 50ml', originalPrice: 43000, salePrice: 30100 },
    ],
  },
  // ── 생활용품 ──
  {
    storeName: '모두상점', storeEmoji: '🛍️', storeColor: '#FF4500', storeBgColor: '#FFF5F0',
    category: '생활용품', title: '봄 인테리어 특집', subtitle: '수납·인테리어 소품 균일가 행사',
    validFrom: '2026.02.21', validUntil: '2026.03.15', sharePoint: 20, shareCount: 6987,
    tags: ['수납', '인테리어', '균일가'],
    items: [
      { name: '투명 수납박스 대형', originalPrice: 5000, salePrice: 3000 },
      { name: '주방 정리 트레이 세트', originalPrice: 3000, salePrice: 2000 },
      { name: '봄꽃 인테리어 스티커 시트', originalPrice: 2000, salePrice: 1000 },
      { name: '청소 솔 세트 3종', originalPrice: 4000, salePrice: 2000 },
    ],
  },
  // ── 음식점 ──
  {
    storeName: '황금치킨', storeEmoji: '🍗', storeColor: '#C8102E', storeBgColor: '#FFF5F3',
    category: '음식점', title: '봄맞이 치킨 할인', subtitle: '전 메뉴 최대 3,000원 할인 쿠폰',
    validFrom: '2026.02.20', validUntil: '2026.03.15', sharePoint: 40, shareCount: 32156,
    tags: ['치킨', '쿠폰', '배달'],
    items: [
      { name: '허니오리지날 한마리', originalPrice: 20000, salePrice: 17000 },
      { name: '레드오리지날 한마리', originalPrice: 20000, salePrice: 17000 },
      { name: '콤보 세트', originalPrice: 29000, salePrice: 25000 },
      { name: '사이드 3종 세트', originalPrice: 12000, salePrice: 8900 },
    ],
  },
  {
    storeName: '킹버거', storeEmoji: '🍔', storeColor: '#FF8C00', storeBgColor: '#FFF8F0',
    category: '음식점', title: '시그니처 세트 특가', subtitle: '인기 세트 메뉴 최대 2,000원 할인',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 35, shareCount: 22345,
    tags: ['버거', '세트', '할인'],
    items: [
      { name: '시그니처 버거 세트', originalPrice: 9900, salePrice: 7900 },
      { name: '치즈 스페셜 세트', originalPrice: 11200, salePrice: 9200 },
      { name: '새우 버거 세트', originalPrice: 10500, salePrice: 8500 },
      { name: '너겟 8조각', originalPrice: 5900, salePrice: 3900 },
    ],
  },
  // ── 패션 ──
  {
    storeName: '스타일샵', storeEmoji: '👕', storeColor: '#000000', storeBgColor: '#F5F5F5',
    category: '패션', title: '봄 신상 세일', subtitle: '인기 브랜드 최대 70% OFF',
    validFrom: '2026.02.21', validUntil: '2026.06.30', sharePoint: 50, shareCount: 28901,
    tags: ['패션', '봄신상', '할인'],
    items: [
      { name: '베이직 반팔 티셔츠', originalPrice: 39000, salePrice: 23400 },
      { name: '클래식 맨투맨', originalPrice: 49000, salePrice: 29400 },
      { name: '에어쿠션 러닝화', originalPrice: 139000, salePrice: 97300 },
      { name: '와이드 치노팬츠', originalPrice: 69000, salePrice: 41400 },
    ],
  },
  {
    storeName: '슈즈파크', storeEmoji: '👟', storeColor: '#FF6B00', storeBgColor: '#FFF5EB',
    category: '패션', title: '봄 운동화 할인전', subtitle: '인기 브랜드 운동화 최대 40%',
    validFrom: '2026.02.23', validUntil: '2026.03.15', sharePoint: 45, shareCount: 16789,
    tags: ['운동화', '스포츠', '브랜드'],
    items: [
      { name: '클래식 코트 로우', originalPrice: 139000, salePrice: 99000 },
      { name: '레트로 스니커즈', originalPrice: 139000, salePrice: 97300 },
      { name: '라이프스타일 530', originalPrice: 119000, salePrice: 83300 },
      { name: '캔버스 하이탑', originalPrice: 95000, salePrice: 66500 },
    ],
  },
  // ── 가전 ──
  {
    storeName: '테크존', storeEmoji: '📺', storeColor: '#EE1C25', storeBgColor: '#FFF2F2',
    category: '가전', title: '봄 가전 대전', subtitle: 'TV·냉장고·세탁기 특별 할인',
    validFrom: '2026.02.20', validUntil: '2026.03.20', sharePoint: 90, shareCount: 5432,
    tags: ['가전', 'TV', '세탁기'],
    items: [
      { name: 'OLED TV 55인치', originalPrice: 1890000, salePrice: 1490000 },
      { name: '프리미엄 냉장고', originalPrice: 2190000, salePrice: 1790000 },
      { name: '드럼 세탁건조기', originalPrice: 1690000, salePrice: 1290000 },
      { name: '무선 청소기 프로', originalPrice: 999000, salePrice: 749000 },
    ],
  },
  // ── 온라인 ──
  {
    storeName: '빠른배송', storeEmoji: '🚀', storeColor: '#F57508', storeBgColor: '#FFF8F0',
    category: '온라인', title: '당일배송 초특가', subtitle: '당일배송 인기상품 한정 특가',
    validFrom: '2026.02.22', validUntil: '2026.06.30', sharePoint: 60, shareCount: 45123,
    tags: ['당일배송', '한정특가', '생필품'],
    items: [
      { name: '무항생제 달걀 30구', originalPrice: 8900, salePrice: 5900 },
      { name: '치약 세트 10개', originalPrice: 15900, salePrice: 8900 },
      { name: '경량 패딩 조끼', originalPrice: 89000, salePrice: 39900 },
      { name: '무선 이어버드', originalPrice: 179000, salePrice: 134000 },
    ],
  },
  // ── 엔터 ──
  {
    storeName: '시네마타운', storeEmoji: '🎬', storeColor: '#E60012', storeBgColor: '#FFF0F0',
    category: '엔터', title: '얼리버드 영화 할인', subtitle: '평일 조조·심야 최대 50% 할인',
    validFrom: '2026.02.23', validUntil: '2026.03.31', sharePoint: 30, shareCount: 14567,
    tags: ['영화', '조조할인', '팝콘'],
    items: [
      { name: '평일 조조 일반 관람권', originalPrice: 14000, salePrice: 7000 },
      { name: 'IMAX 관람권 (평일)', originalPrice: 18000, salePrice: 12000 },
      { name: '콤보 세트 (팝콘L+콜라2)', originalPrice: 13000, salePrice: 8900 },
      { name: '영화 상품권 5만원권', originalPrice: 50000, salePrice: 45000 },
    ],
  },
]

const notificationSeed = [
  { title: '새 전단지: 빠른배송', body: '당일배송 초특가 - 지금 확인하고 포인트 받으세요!', emoji: '🚀' },
  { title: '새 전단지: 뷰티하우스', body: '봄 뷰티 페스타 - 스킨케어 최대 40% 할인', emoji: '💄' },
  { title: '포인트 적립 완료', body: '프레시마트 전단지 공유로 50P 적립되었습니다!', emoji: '💰' },
  { title: '새 전단지: 황금치킨', body: '봄맞이 치킨 할인 - 전 메뉴 3,000원 할인!', emoji: '🍗' },
  { title: '이번 주 인기 전단지', body: '카페모아 봄 신메뉴가 인기 1위입니다', emoji: '🏆' },
]

const quizSeed = [
  { flyerId: 1, question: '프레시마트 주말 특가에서 한우 1등급 불고기 200g의 할인 가격은?', answer: '22000', point: 30 },
  { flyerId: 1, question: '프레시마트 전단지에서 탄산음료 1.5L 6개입의 세일가는?', answer: '5900', point: 20 },
  { flyerId: 1, question: '프레시마트 주말 특가 전단지의 최대 할인율은 몇 퍼센트?', answer: '50', point: 30 },
  { flyerId: 9, question: '카페모아 봄 신메뉴 중 벚꽃 블로섬 라떼 Tall의 할인가는?', answer: '5440', point: 20 },
  { flyerId: 9, question: '카페모아 봄 한정 메뉴의 유효기간은 몇 월까지?', answer: '4', point: 20 },
  { flyerId: 9, question: '카페모아 리저브 체리 블로섬 티 Tall의 원래 가격은?', answer: '7800', point: 30 },
  { flyerId: 15, question: '황금치킨 봄맞이 할인에서 허니오리지날 한마리의 할인가는?', answer: '17000', point: 30 },
  { flyerId: 15, question: '황금치킨 콤보 세트의 할인 금액은 얼마?', answer: '4000', point: 20 },
  { flyerId: 15, question: '황금치킨 전단지의 최대 할인 쿠폰 금액은?', answer: '3000', point: 30 },
]

// ==================== 비동기 초기화 ====================

async function initialize() {
  // 1. 스키마 생성
  await db.exec(schemaSQL)

  // 1.5. 마이그레이션 추적 테이블 생성
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  // 2. 마이그레이션 (이미 적용된 건 스킵, 예상 에러만 무시)
  for (const m of migrations) {
    const applied = await db.prepare(
      'SELECT version FROM schema_migrations WHERE version = ?'
    ).get(m.version)
    if (applied) continue

    try {
      await db.exec(m.sql)
    } catch (err) {
      // "duplicate column" 등 이미 반영된 스키마 에러만 무시
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        // 이미 반영된 상태 — 기록만 남기고 계속
      } else {
        console.error(`[DB 마이그레이션 v${m.version} 오류]`, err.message)
        throw err
      }
    }

    // 적용 기록
    try {
      await db.prepare(
        'INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)'
      ).run(m.version)
    } catch (_) {}
  }

  // 3. 더미 시드 데이터 (로컬 개발 전용 — ENABLE_SEED_DATA=true 일 때만)
  const SEED_ENABLED = process.env.ENABLE_SEED_DATA === 'true'
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM flyers').get()
  if (SEED_ENABLED && (!count || count.cnt === 0)) {
    const seedTx = db.transaction(async (txDb) => {
      for (const f of flyerSeed) {
        const { lastInsertRowid: flyerId } = await txDb.prepare(`
          INSERT INTO flyers (store_name, store_emoji, store_color, store_bg_color, category, title, subtitle, valid_from, valid_until, share_point, share_count, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(f.storeName, f.storeEmoji, f.storeColor, f.storeBgColor,
               f.category, f.title, f.subtitle, f.validFrom, f.validUntil,
               f.sharePoint, f.shareCount, JSON.stringify(f.tags))

        for (let idx = 0; idx < f.items.length; idx++) {
          const item = f.items[idx]
          await txDb.prepare(`
            INSERT INTO flyer_items (flyer_id, name, original_price, sale_price, sort_order)
            VALUES (?, ?, ?, ?, ?)
          `).run(flyerId, item.name, item.originalPrice, item.salePrice, idx)
        }
      }

      await txDb.prepare(`
        INSERT OR IGNORE INTO users (id, nickname, points) VALUES (1, '게스트', 0)
      `).run()
    })
    await seedTx()

    for (const n of notificationSeed) {
      await db.prepare('INSERT INTO notifications (title, body, emoji) VALUES (?, ?, ?)').run(n.title, n.body, n.emoji)
    }

    for (let idx = 0; idx < quizSeed.length; idx++) {
      const q = quizSeed[idx]
      await db.prepare(`
        INSERT INTO quizzes (flyer_id, question, answer, point, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `).run(q.flyerId, q.question, q.answer, q.point, idx % 3)
    }

    console.log('[DB] 개발용 더미 시드 삽입 완료 (전단지/알림/퀴즈)')
  }

  // 3.5 카테고리 테이블이 비어있으면 시드 (기존 DB 마이그레이션)
  const catCount = await db.prepare('SELECT COUNT(*) as cnt FROM categories').get()
  if (!catCount || catCount.cnt === 0) {
    const categorySeed = ['마트', '편의점', '카페', '음식점', '패션', '뷰티', '가전', '온라인', '엔터', '생활용품', '운동']
    for (let i = 0; i < categorySeed.length; i++) {
      await db.prepare('INSERT OR IGNORE INTO categories (name, sort_order) VALUES (?, ?)').run(categorySeed[i], i)
    }
    console.log('[DB] 카테고리 시드 데이터 삽입 완료')
  }

  // 3.6 system_settings 시드 (기존 DB 마이그레이션)
  const settingsCount = await db.prepare('SELECT COUNT(*) as cnt FROM system_settings').get()
  if (!settingsCount || settingsCount.cnt === 0) {
    const settingsSeed = [
      ['guest_scratch_limit', '1', '비로그인 게스트 긁기 허용 횟수'],
      ['withdrawal_min_amount', '1000', '출금 최소 포인트'],
      ['withdrawal_max_amount', '500000', '출금 최대 포인트'],
      ['withdrawal_waiting_days', '7', '가입 후 출금 가능 대기일수'],
      ['scratch_threshold_login', '0.80', '로그인 유저 긁기 공개 임계값'],
      ['scratch_threshold_guest', '0.80', '게스트 유저 긁기 공개 임계값'],
    ]
    for (const [key, value, description] of settingsSeed) {
      await db.prepare('INSERT OR IGNORE INTO system_settings (key, value, description) VALUES (?, ?, ?)').run(key, value, description)
    }
    console.log('[DB] system_settings 시드 데이터 삽입 완료')
  }

  // 3.7 gift_products 시드 (기존 DB 마이그레이션)
  const giftCount = await db.prepare('SELECT COUNT(*) as cnt FROM gift_products').get()
  if (!giftCount || giftCount.cnt === 0) {
    const giftProductsSeed = [
      { giftKey: 'starbucks_ame', emoji: '☕', brand: '스타벅스', name: '아메리카노 Tall', points: 5000, category: '☕ 카페' },
      { giftKey: 'ediya_ame', emoji: '☕', brand: '이디야', name: '아메리카노', points: 3000, category: '☕ 카페' },
      { giftKey: 'cu_5000', emoji: '🏪', brand: 'CU', name: '5,000원 금액권', points: 5000, category: '🏪 편의점' },
      { giftKey: 'gs25_5000', emoji: '🏬', brand: 'GS25', name: '5,000원 금액권', points: 5000, category: '🏪 편의점' },
      { giftKey: 'shinsegae_10000', emoji: '🏬', brand: '신세계', name: '상품권 1만원', points: 10000, category: '🏬 백화점' },
      { giftKey: 'lotte_10000', emoji: '🏬', brand: '롯데', name: '상품권 1만원', points: 10000, category: '🏬 백화점' },
      { giftKey: 'bbq_gold', emoji: '🍗', brand: 'BBQ', name: '황금올리브', points: 15000, category: '🍗 치킨' },
      { giftKey: 'kyochon_honey', emoji: '🍗', brand: '교촌', name: '허니콤보', points: 15000, category: '🍗 치킨' },
      { giftKey: 'domino_pizza', emoji: '🍕', brand: '도미노', name: '피자 1판', points: 20000, category: '🍕 피자' },
      { giftKey: 'lotteria_set', emoji: '🍔', brand: '롯데리아', name: '세트 메뉴', points: 7000, category: '🍔 버거' },
      { giftKey: 'br_pint', emoji: '🍦', brand: '배스킨라빈스', name: '파인트', points: 8000, category: '🍦 디저트' },
      { giftKey: 'gongcha_large', emoji: '🥤', brand: '공차', name: '라지 음료', points: 4000, category: '🥤 음료' },
    ]
    for (let i = 0; i < giftProductsSeed.length; i++) {
      const g = giftProductsSeed[i]
      await db.prepare(
        'INSERT OR IGNORE INTO gift_products (gift_key, emoji, brand, name, points, category, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(g.giftKey, g.emoji, g.brand, g.name, g.points, g.category, i)
    }
    console.log('[DB] gift_products 시드 데이터 삽입 완료')
  }

  // 4. ensureUser 헬퍼 등록
  db.ensureUser = async function (userId) {
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(Number(userId))
    if (!user) {
      try {
        await db.prepare('INSERT INTO users (id, nickname, points) VALUES (?, ?, 0)').run(Number(userId), `유저${userId}`)
      } catch (_) {}
    }
  }

  // 5. 필수 테이블 존재 확인
  const requiredTables = [
    'users', 'flyers', 'flyer_items', 'share_history', 'point_transactions',
    'notifications', 'bookmarks', 'push_subscriptions', 'quizzes', 'quiz_attempts',
    'visit_verifications', 'categories', 'device_fingerprints', 'scratch_sessions',
    'gift_orders', 'gift_products', 'system_settings', 'schema_migrations',
  ]
  const existingRows = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all()
  const existingTables = new Set(existingRows.map(r => r.name))
  const missingTables = requiredTables.filter(t => !existingTables.has(t))
  if (missingTables.length > 0) {
    console.error(`[DB] 필수 테이블 누락: ${missingTables.join(', ')}`)
  } else {
    console.log(`[DB] 필수 테이블 ${requiredTables.length}개 확인 완료`)
  }

  console.log(`[DB] 초기화 완료 (${isTurso ? 'Turso' : 'Local SQLite'})`)
}

// 초기화 Promise 저장 (외부에서 await 가능)
db._initPromise = initialize().catch(err => {
  console.error('[DB 초기화 오류]', err.message, err.stack)
  throw err
})

module.exports = db
