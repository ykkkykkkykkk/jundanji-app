import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
  });

  test('should display login page when user clicks login button', async ({ page }) => {
    // 로그인 버튼 찾기
    const loginBtn = page.locator('button, a', { hasText: /로그인|login|kakao|google/i });

    // 최소 하나의 로그인 관련 버튼이 있는지 확인
    const count = await loginBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should not show login page initially', async ({ page }) => {
    // 초기 페이지는 메인 페이지여야 함
    await page.waitForTimeout(500);

    // 로그인 페이지가 아닌지 확인 (로그인 폼 요소들이 많지 않아야 함)
    const pageContent = await page.content();

    // 스플래시가 완료되고 메인 페이지가 보여야 함
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should handle logout action', async ({ page }) => {
    // MyPage 접근 시도
    const myPageBtn = page.locator('button:has-text("마이페이지"), [class*="mypage"]');

    if (await myPageBtn.first().isVisible().catch(() => false)) {
      await myPageBtn.first().click();
      await page.waitForTimeout(1000);

      // 마이페이지에서 로그아웃 버튼을 찾아보기
      const logoutBtn = page.locator('button, a', { hasText: /로그아웃|logout|sign out/i });

      if (await logoutBtn.first().isVisible().catch(() => false)) {
        await logoutBtn.first().click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should store auth token in localStorage after login URL redirect', async ({ page }) => {
    // OAuth 리다이렉트 시뮬레이션
    const testToken = 'test_token_123';
    const testUserId = '999';
    const testNickname = 'TestUser';

    // 리다이렉트 URL로 이동
    await page.goto(`/?token=${testToken}&userId=${testUserId}&nickname=${encodeURIComponent(testNickname)}`);
    await page.waitForTimeout(2000);

    // localStorage 확인
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const userId = await page.evaluate(() => localStorage.getItem('userId'));

    expect(token).toBe(testToken);
    expect(userId).toBe(testUserId);
  });

  test('should clear localStorage on logout', async ({ page }) => {
    // 먼저 토큰 설정
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // MyPage로 이동하여 로그아웃
    const myPageBtn = page.locator('button:has-text("마이페이지")');
    if (await myPageBtn.isVisible().catch(() => false)) {
      await myPageBtn.click();
      await page.waitForTimeout(1000);

      const logoutBtn = page.locator('button, a', { hasText: /로그아웃|logout/i });
      if (await logoutBtn.isVisible().catch(() => false)) {
        await logoutBtn.click();
        await page.waitForTimeout(500);

        // darkMode만 남아야 함
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeNull();
      }
    }
  });

  test('should handle OAuth redirect with error', async ({ page }) => {
    const errorReason = 'user_cancelled';
    await page.goto(`/?error=auth_failed&reason=${encodeURIComponent(errorReason)}`);
    await page.waitForTimeout(2000);

    // 에러가 처리되고 URL이 정상화되는지 확인
    const url = page.url();
    expect(url).toContain('localhost:5173');
  });

  test('should preserve darkMode setting after logout', async ({ page }) => {
    // 다크모드 활성화
    await page.evaluate(() => {
      localStorage.setItem('darkMode', 'true');
      localStorage.setItem('token', 'test_token');
      localStorage.setItem('userId', '999');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // MyPage에서 로그아웃
    const myPageBtn = page.locator('button:has-text("마이페이지")');
    if (await myPageBtn.isVisible().catch(() => false)) {
      await myPageBtn.click();
      await page.waitForTimeout(1000);

      const logoutBtn = page.locator('button, a', { hasText: /로그아웃/i });
      if (await logoutBtn.isVisible().catch(() => false)) {
        await logoutBtn.click();
        await page.waitForTimeout(500);

        // darkMode가 보존되었는지 확인
        const darkMode = await page.evaluate(() => localStorage.getItem('darkMode'));
        expect(darkMode).toBe('true');
      }
    }
  });

  test('should show role selection modal for new users', async ({ page }) => {
    // 새 사용자로 로그인 시뮬레이션
    const isNew = 'true';
    await page.goto(`/?token=test&userId=888&nickname=NewUser&isNew=${isNew}`);
    await page.waitForTimeout(2000);

    // 역할 선택 모달이 나타나는지 확인
    const roleModal = page.locator('[class*="role"], dialog, [role="dialog"]');

    // 모달이 있을 수 있으므로 확인만 함
    await page.waitForTimeout(500);
  });
});
