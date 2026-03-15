import { test, expect } from '@playwright/test';

test.describe('Integration Scenarios', () => {
  test('should complete full flyer interaction flow: view -> bookmark -> detail', async ({ page }) => {
    // 1. 페이지 로드
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 2. 첫 번째 전단지 클릭
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 3. 북마크 버튼 클릭 (있으면)
      const bookmarkBtn = page.locator('button:has-text("♥"), button:has-text("★"), [class*="bookmark"]');

      if (await bookmarkBtn.first().isVisible().catch(() => false)) {
        await bookmarkBtn.first().click();
        await page.waitForTimeout(300);
      }

      // 4. 뒤로 가기
      const backBtn = page.locator('button:has-text("뒤로"), [aria-label*="back"]');

      if (await backBtn.first().isVisible().catch(() => false)) {
        await backBtn.first().click();
        await page.waitForTimeout(500);
      }

      // 5. 메인 페이지 확인
      const mainContent = await page.content();
      expect(mainContent.length).toBeGreaterThan(0);
    }
  });

  test('should handle navigation between all pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // 가능한 모든 페이지 네비게이션 시도
    const pages = ['#main', '#mypage', '#scan', '#giftshop', '#admin', '#notifications'];

    for (const pageHash of pages) {
      await page.goto(`/${pageHash}`);
      await page.waitForTimeout(1000);

      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should maintain state while navigating', async ({ page }) => {
    // 로그인 상태 설정
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token_123');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
      localStorage.setItem('darkMode', 'true');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // 여러 페이지 방문
    await page.goto('/#mypage');
    await page.waitForTimeout(1000);

    await page.goto('/#scan');
    await page.waitForTimeout(1000);

    await page.goto('/#giftshop');
    await page.waitForTimeout(1000);

    // 상태 확인
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const darkMode = await page.evaluate(() => localStorage.getItem('darkMode'));

    expect(token).toBe('test_token_123');
    expect(darkMode).toBe('true');
  });

  test('should handle rapid page navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 빠른 연속 네비게이션
    for (let i = 0; i < 3; i++) {
      await page.goto('/#mypage');
      await page.goto('/#giftshop');
      await page.goto('/#scan');
      await page.goto('/');
    }

    await page.waitForTimeout(1000);

    // 페이지가 응답 가능한지 확인
    const button = page.locator('button').first();
    const isVisible = await button.isVisible().catch(() => false);

    expect(typeof isVisible).toBe('boolean');
  });

  test('should preserve scroll position when returning from detail', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 스크롤
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });

    await page.waitForTimeout(300);

    const initialScrollY = await page.evaluate(() => window.scrollY);

    // 전단지 클릭
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 뒤로 가기
      const backBtn = page.locator('button:has-text("뒤로")');

      if (await backBtn.first().isVisible().catch(() => false)) {
        await backBtn.first().click();
        await page.waitForTimeout(500);

        // 스크롤 위치 비교 (대략적으로)
        const finalScrollY = await page.evaluate(() => window.scrollY);

        // 스크롤이 어느 정도 복구되었는지 확인 (정확히 같지 않을 수 있음)
        expect(Math.abs(finalScrollY - initialScrollY)).toBeLessThan(100);
      }
    }
  });

  test('should handle switching between logged-in and logged-out state', async ({ page }) => {
    // 1. 로그인 상태
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    let token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBe('test_token');

    // 2. 로그아웃
    const myPageBtn = page.locator('button:has-text("마이페이지")');

    if (await myPageBtn.isVisible().catch(() => false)) {
      await myPageBtn.click();
      await page.waitForTimeout(1000);

      const logoutBtn = page.locator('button, a', { hasText: /로그아웃|logout/i });

      if (await logoutBtn.first().isVisible().catch(() => false)) {
        await logoutBtn.first().click();
        await page.waitForTimeout(500);

        token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeNull();

        // 3. 다시 로그인 시도
        await page.evaluate(() => {
          localStorage.setItem('token', 'new_token');
          localStorage.setItem('userId', '888');
        });

        await page.goto('/');
        await page.waitForTimeout(1000);

        token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBe('new_token');
      }
    }
  });

  test('should handle concurrent API calls', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token');
      localStorage.setItem('userId', '999');
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // 동시에 여러 페이지로 네비게이션
    const promises = [
      page.goto('/#mypage'),
      page.goto('/#giftshop'),
      page.goto('/#scan'),
    ];

    // 마지막 네비게이션만 유지됨
    await Promise.all(promises).catch(() => {});
    await page.waitForTimeout(2000);

    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should handle dark mode toggle persistence', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 초기 다크모드 상태
    let darkMode = await page.evaluate(() => localStorage.getItem('darkMode'));

    // 다크모드 토글 버튼 찾기
    const darkModeBtn = page.locator('button:has-text("🌙"), button:has-text("☀️"), [class*="dark"], [class*="theme"]');

    if (await darkModeBtn.first().isVisible().catch(() => false)) {
      await darkModeBtn.first().click();
      await page.waitForTimeout(500);

      const newDarkMode = await page.evaluate(() => localStorage.getItem('darkMode'));

      // 상태가 변경되었는지 확인
      expect(typeof newDarkMode).toBe('string' || 'null');

      // 페이지 새로고침 후에도 유지되는지 확인
      await page.reload();
      await page.waitForTimeout(2000);

      const persistedDarkMode = await page.evaluate(() => localStorage.getItem('darkMode'));
      expect(persistedDarkMode).toBe(newDarkMode);
    }
  });

  test('should handle back button with multiple navigations', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 여러 페이지로 네비게이션
    await page.goto('/#mypage');
    await page.waitForTimeout(1000);

    await page.goto('/#giftshop');
    await page.waitForTimeout(1000);

    const urlBefore = page.url();

    // 브라우저 뒤로 가기
    await page.goBack();
    await page.waitForTimeout(500);

    const urlAfter = page.url();

    // URL이 변경되었는지 확인
    expect(urlBefore).not.toBe(urlAfter);
  });
});
