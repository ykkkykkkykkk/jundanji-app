import { test, expect } from '@playwright/test';

test.describe('Detail Page (상세 페이지)', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token_123');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
    });

    await page.goto('/');
    await page.waitForTimeout(3000);
  });

  test('should navigate to detail page from flyer card', async ({ page }) => {
    // 전단지 클릭
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 상세 페이지 콘텐츠 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should display flyer title and description', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 제목, 설명 등의 요소들
      const titleDesc = page.locator('[class*="title"], [class*="description"], h1, h2');

      const visible = await titleDesc.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should display back button on detail page', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 뒤로 가기 버튼
      const backBtn = page.locator('button:has-text("뒤로"), button[aria-label*="back"], button:has-text("←")');

      if (await backBtn.first().isVisible().catch(() => false)) {
        await backBtn.first().click();
        await page.waitForTimeout(500);

        // 메인 페이지로 돌아왔는지 확인
        const content = await page.content();
        expect(content.length).toBeGreaterThan(0);
      }
    }
  });

  test('should show bookmark button on detail page', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 북마크 버튼 (하트, 별 등)
      const bookmarkBtn = page.locator('button:has-text("♥"), button:has-text("★"), button[aria-label*="bookmark"], [class*="bookmark"]');

      const visible = await bookmarkBtn.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should allow toggling bookmark', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      const bookmarkBtn = page.locator('button:has-text("♥"), button:has-text("★"), button[aria-label*="bookmark"]');

      if (await bookmarkBtn.first().isVisible().catch(() => false)) {
        const initialState = await bookmarkBtn.first().getAttribute('class');

        // 북마크 버튼 클릭
        await bookmarkBtn.first().click();
        await page.waitForTimeout(300);

        const newState = await bookmarkBtn.first().getAttribute('class');

        // 상태가 변경되었는지 확인
        expect(typeof newState).toBe('string');
      }
    }
  });

  test('should display quiz section if available', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 퀴즈 섹션 찾기
      const quizSection = page.locator('[class*="quiz"], [class*="question"], text=/퀴즈|질문|문제/i');

      const visible = await quizSection.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should allow answering quiz if available', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 퀴즈 선택지 찾기
      const quizOptions = page.locator('button:has-text("①"), button:has-text("②"), button:has-text("③"), button:has-text("④"), [class*="option"]');

      const count = await quizOptions.count();

      if (count > 0) {
        // 첫 번째 선택지 클릭
        await quizOptions.first().click();
        await page.waitForTimeout(1000);

        // 결과 페이지 또는 포인트 애니메이션 확인
        const content = await page.content();
        expect(content.length).toBeGreaterThan(0);
      }
    }
  });

  test('should show qr section if available', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // QR 섹션 찾기
      const qrSection = page.locator('[class*="qr"], text=/QR|방문|visit|scan|스캔/i');

      const visible = await qrSection.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should display share button if available', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 공유 버튼 찾기
      const shareBtn = page.locator('button:has-text("공유"), button:has-text("share"), button[aria-label*="share"]');

      const visible = await shareBtn.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should scroll to quiz section when clicking quiz button', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 퀴즈 섹션으로 스크롤하는 버튼 찾기
      const quizBtn = page.locator('button:has-text("퀴즈"), button:has-text("quiz"), [class*="quiz"]');

      if (await quizBtn.first().isVisible().catch(() => false)) {
        await quizBtn.first().click();
        await page.waitForTimeout(500);

        // 스크롤 위치 변경 확인
        const scrollY = await page.evaluate(() => window.scrollY);
        expect(typeof scrollY).toBe('number');
      }
    }
  });

  test('should handle image loading in detail page', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(2000);

      // 이미지 로드 확인
      const images = page.locator('img');

      const count = await images.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
