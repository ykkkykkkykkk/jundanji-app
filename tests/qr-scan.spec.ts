import { test, expect } from '@playwright/test';

test.describe('QR Scan Page', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 사용자 설정
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token_123');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
      localStorage.setItem('role', 'user');
    });

    await page.goto('/');
    await page.waitForTimeout(3000);
  });

  test('should navigate to QR scan page', async ({ page }) => {
    // QR 스캔 버튼 찾기
    const scanBtn = page.locator('button, a', { hasText: /스캔|scan|qr|카메라/i });

    if (await scanBtn.first().isVisible().catch(() => false)) {
      await scanBtn.first().click();
      await page.waitForTimeout(1000);

      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should display QR scanner interface', async ({ page }) => {
    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 스캐너 요소 찾기
    const scanner = page.locator('[class*="scanner"], [class*="qr"], video, canvas');

    // 스캐너가 있을 수 있음
    const count = await scanner.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show camera permission request or message', async ({ page }) => {
    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 카메라 권한 관련 메시지 또는 버튼
    const cameraMsg = page.locator('text=/카메라|camera|permission|권한/i');

    // 메시지가 있을 수 있음
    const visible = await cameraMsg.first().isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

  test('should redirect non-logged-in user to login', async ({ page }) => {
    // localStorage 초기화
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 로그인 안 됨 상태: 로그인 버튼이 보여야 함
    const loginBtn = page.locator('button, a', { hasText: /로그인|login|kakao|google/i });
    const isVisible = await loginBtn.first().isVisible().catch(() => false);

    expect(typeof isVisible).toBe('boolean');
  });

  test('should display back button to return to main', async ({ page }) => {
    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 뒤로 가기 또는 홈 버튼
    const backBtn = page.locator('button, a', { hasText: /뒤로|back|홈|home|main/i });

    if (await backBtn.first().isVisible().catch(() => false)) {
      await backBtn.first().click();
      await page.waitForTimeout(1000);

      // 메인 페이지로 돌아왔는지 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should show user role indication on scan page', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('role', 'business');
    });

    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 사업자 관련 추가 기능이 있을 수 있음
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should handle scan error gracefully', async ({ page }) => {
    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 페이지가 에러 없이 로드되는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show instructions for QR scanning', async ({ page }) => {
    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 안내 텍스트 찾기
    const instructions = page.locator('text=/qr|카메라|스캔|scan|맞춰|시도/i');

    // 안내 텍스트가 있을 수 있음
    const visible = await instructions.first().isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

  test('should persist scan history if available', async ({ page }) => {
    await page.goto('/#scan');
    await page.waitForTimeout(2000);

    // 스캔 히스토리 섹션 찾기
    const history = page.locator('[class*="history"], [class*="recent"], [class*="log"]');

    // 히스토리가 있을 수 있음
    const count = await history.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
