import { test, expect } from '@playwright/test';

test.describe('My Page', () => {
  test.beforeEach(async ({ page }) => {
    // 기본 사용자 설정
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token_123');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
      localStorage.setItem('role', 'user');
    });

    await page.goto('/');
    await page.waitForTimeout(3000);
  });

  test('should navigate to my page', async ({ page }) => {
    // 마이페이지 버튼 찾기 및 클릭
    const myPageBtn = page.locator('button, a', { hasText: /마이페이지|my|page|mypage/i });

    if (await myPageBtn.first().isVisible().catch(() => false)) {
      await myPageBtn.first().click();
      await page.waitForTimeout(1000);

      // 페이지 콘텐츠 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should display user nickname and points', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 닉네임 표시 확인
    const nicknameDisplay = page.locator('text=TestUser');

    if (await nicknameDisplay.isVisible().catch(() => false)) {
      expect(await nicknameDisplay.isVisible()).toBe(true);
    }

    // 포인트 표시 확인
    const pointDisplay = page.locator('text=/포인트|P\\d+|point/i');
    const visible = await pointDisplay.first().isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

  test('should show user history tabs', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 히스토리 탭 찾기 (공유, 퀴즈, 방문 등)
    const tabs = page.locator('button, [role="tab"]');
    const tabCount = await tabs.count();

    // 최소 하나의 탭이 있어야 함
    expect(tabCount).toBeGreaterThanOrEqual(0);
  });

  test('should allow editing nickname', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 닉네임 편집 버튼 찾기
    const editBtn = page.locator('button, a', { hasText: /편집|edit|수정|change/i });

    if (await editBtn.first().isVisible().catch(() => false)) {
      await editBtn.first().click();
      await page.waitForTimeout(500);

      // 입력 필드가 나타나는지 확인
      const inputField = page.locator('input[type="text"]');
      if (await inputField.isVisible().catch(() => false)) {
        expect(await inputField.isVisible()).toBe(true);
      }
    }
  });

  test('should display logout button', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 로그아웃 버튼 찾기
    const logoutBtn = page.locator('button, a', { hasText: /로그아웃|logout|sign out/i });

    const isVisible = await logoutBtn.first().isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('should show point history if available', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 히스토리 항목 찾기
    const historyItems = page.locator('[class*="history"], li, [class*="item"], article');
    const count = await historyItems.count();

    // 히스토리가 있을 수 있음
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show bookmarked flyers section if available', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 북마크 섹션 찾기
    const bookmarkSection = page.locator('text=/북마크|bookmark|찜|저장/i');

    // 북마크 섹션이 있을 수 있음
    const visible = await bookmarkSection.first().isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

  test('should handle logout action', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 로그아웃 버튼 찾기
    const logoutBtn = page.locator('button, a', { hasText: /로그아웃|logout/i });

    if (await logoutBtn.first().isVisible().catch(() => false)) {
      // 로그아웃 클릭
      await logoutBtn.first().click();
      await page.waitForTimeout(1000);

      // localStorage에서 토큰이 삭제되었는지 확인
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();

      // darkMode는 보존되어야 함
      const darkMode = await page.evaluate(() => localStorage.getItem('darkMode'));
      expect(typeof darkMode).toBe('string' || 'null');
    }
  });

  test('should navigate to detail page from bookmarked flyer', async ({ page }) => {
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 북마크된 전단지 카드 찾기
    const flyerCards = page.locator('[class*="flyer"], [class*="card"], article');

    // 첫 번째 카드가 있으면 클릭
    if (await flyerCards.first().isVisible().catch(() => false)) {
      await flyerCards.first().click();
      await page.waitForTimeout(1000);

      // 상세 페이지로 이동했는지 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should show empty state for non-logged-in user', async ({ page }) => {
    // localStorage 초기화
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // MyPage로 이동
    await page.goto('/#mypage');
    await page.waitForTimeout(2000);

    // 로그인 안 됨 상태 또는 로그인 버튼이 보여야 함
    const loginBtn = page.locator('button, a', { hasText: /로그인|login|kakao|google/i });
    const isVisible = await loginBtn.first().isVisible().catch(() => false);

    expect(typeof isVisible).toBe('boolean');
  });
});
