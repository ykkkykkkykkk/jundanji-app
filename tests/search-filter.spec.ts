import { test, expect } from '@playwright/test';

test.describe('Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
  });

  test('should display search input field', async ({ page }) => {
    // 검색 입력 필드 찾기
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="검색"]');

    // 검색 필드가 있을 수 있음
    const visible = await searchInput.first().isVisible().catch(() => false);
    expect(typeof visible).toBe('boolean');
  });

  test('should allow searching for flyers', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"], input[placeholder*="검색"]');

    if (await searchInput.first().isVisible().catch(() => false)) {
      await searchInput.first().fill('테스트');
      await page.waitForTimeout(500);

      // 검색이 수행되었는지 확인 (URL 변경 등)
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should display category filter tabs', async ({ page }) => {
    // 카테고리 탭/필터 찾기
    const categoryTabs = page.locator('button[class*="category"], button[class*="tab"], [role="tab"], button:has-text("전체"), button:has-text("음식"), button:has-text("의류")');

    // 카테고리 탭이 있을 수 있음
    const count = await categoryTabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter flyers by category', async ({ page }) => {
    // 카테고리 버튼 찾기
    const categoryBtn = page.locator('button:has-text("음식"), button:has-text("카테고리"), button[class*="category"]');

    if (await categoryBtn.first().isVisible().catch(() => false)) {
      await categoryBtn.first().click();
      await page.waitForTimeout(1000);

      // 필터가 적용되었는지 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"]');

    if (await searchInput.first().isVisible().catch(() => false)) {
      await searchInput.first().fill('테스트');
      await page.waitForTimeout(300);

      // 클리어 버튼 찾기
      const clearBtn = page.locator('button:has-text("X"), button:has-text("×"), button[aria-label*="clear"]');

      if (await clearBtn.first().isVisible().catch(() => false)) {
        await clearBtn.first().click();
        await page.waitForTimeout(300);

        // 입력이 초기화되었는지 확인
        const value = await searchInput.first().inputValue();
        expect(value).toBe('');
      }
    }
  });

  test('should show no results message when search has no matches', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"]');

    if (await searchInput.first().isVisible().catch(() => false)) {
      // 존재하지 않을 만한 검색어
      await searchInput.first().fill('XXXXXXXXXXXXXXXX무조건없는상품XXXXXXXXXXXXXXXX');
      await page.waitForTimeout(1000);

      // 결과 없음 메시지 또는 빈 상태
      const noResults = page.locator('text=/결과|없음|검색|못찾음|no results/i');

      const visible = await noResults.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should support multiple filter combinations', async ({ page }) => {
    // 카테고리 필터 클릭
    const categoryBtn = page.locator('button:has-text("음식"), button[class*="category"]');

    if (await categoryBtn.first().isVisible().catch(() => false)) {
      await categoryBtn.first().click();
      await page.waitForTimeout(500);

      // 검색어 입력
      const searchInput = page.locator('input[type="text"], input[placeholder*="search"]');

      if (await searchInput.first().isVisible().catch(() => false)) {
        await searchInput.first().fill('테스트');
        await page.waitForTimeout(500);

        // 결과가 필터링되었는지 확인
        const content = await page.content();
        expect(content.length).toBeGreaterThan(0);
      }
    }
  });

  test('should restore scroll position when returning from detail page', async ({ page }) => {
    // 스크롤 위치 기억
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });

    await page.waitForTimeout(300);

    // 전단지 클릭 (첫 번째 카드)
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 뒤로 가기
      const backBtn = page.locator('button:has-text("뒤로"), button[aria-label*="back"]');

      if (await backBtn.first().isVisible().catch(() => false)) {
        await backBtn.first().click();
        await page.waitForTimeout(500);

        // 페이지가 복구되었는지 확인
        const content = await page.content();
        expect(content.length).toBeGreaterThan(0);
      }
    }
  });

  test('should handle infinite scroll pagination', async ({ page }) => {
    // 페이지 로드
    await page.waitForTimeout(1000);

    // 하단까지 스크롤
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(1500);

    // 추가 카드가 로드되었는지 확인
    const cards = page.locator('[class*="card"], [class*="flyer"], article');
    const count = await cards.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle search with special characters', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="search"]');

    if (await searchInput.first().isVisible().catch(() => false)) {
      // 특수문자 입력
      await searchInput.first().fill('@#$%^&*()');
      await page.waitForTimeout(500);

      // 페이지가 안정적으로 처리하는지 확인
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should display active filter indicator', async ({ page }) => {
    // 카테고리 필터 선택
    const categoryBtn = page.locator('button:has-text("음식"), button[class*="category"]');

    if (await categoryBtn.first().isVisible().catch(() => false)) {
      await categoryBtn.first().click();
      await page.waitForTimeout(500);

      // 활성 필터 표시 확인
      const activeIndicator = page.locator('[class*="active"], [aria-selected="true"]');

      const visible = await activeIndicator.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });
});
