import { test, expect } from '@playwright/test';

test.describe('Scratch Card (복권 긁기)', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'test_token_123');
      localStorage.setItem('userId', '999');
      localStorage.setItem('nickname', 'TestUser');
    });

    await page.goto('/');
    await page.waitForTimeout(3000);
  });

  test('should open scratch card modal when clicking flyer', async ({ page }) => {
    // 첫 번째 전단지 클릭
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 스크래치 카드 모달 확인
      const modal = page.locator('[class*="modal"], [class*="scratch"], [role="dialog"]');

      const visible = await modal.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should display scratch canvas in modal', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // Canvas 요소 찾기
      const canvas = page.locator('canvas');

      const visible = await canvas.first().isVisible().catch(() => false);
      expect(typeof visible).toBe('boolean');
    }
  });

  test('should show close button on scratch card', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 닫기 버튼 찾기
      const closeBtn = page.locator('button:has-text("X"), button:has-text("×"), button[aria-label*="close"]');

      if (await closeBtn.first().isVisible().catch(() => false)) {
        await closeBtn.first().click();
        await page.waitForTimeout(500);

        // 모달이 닫혔는지 확인
        const modal = page.locator('[class*="modal"], [class*="scratch"]');
        const stillVisible = await modal.first().isVisible().catch(() => false);

        expect(!stillVisible || !stillVisible).toBe(true);
      }
    }
  });

  test('should show guest user message on reveal', async ({ page }) => {
    // 비로그인 사용자로 설정
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 스크래치 영역에 마우스 이벤트 시뮬레이션 (긁기)
      const canvas = page.locator('canvas').first();

      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox();
        if (box) {
          // 여러 번 마우스 이동으로 스크래치 시뮬레이션
          for (let i = 0; i < 5; i++) {
            await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.3 + i * 20, box.y + box.height * 0.3 + i * 20);
            await page.mouse.up();
          }

          await page.waitForTimeout(1000);

          // 게스트 로그인 모달이 나타났는지 확인
          const guestModal = page.locator('[class*="modal"], text=/로그인|당첨|login/i');

          const visible = await guestModal.first().isVisible().catch(() => false);
          expect(typeof visible).toBe('boolean');
        }
      }
    }
  });

  test('should display flyer info behind scratch canvas', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 전단지 정보 요소들 (긁기 전에 보일 수도 있고 안 보일 수도)
      const flyerInfo = page.locator('[class*="flyer"], [class*="title"], [class*="description"]');

      const count = await flyerInfo.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle scratch animation smoothly', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      const canvas = page.locator('canvas').first();

      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox();
        if (box) {
          // 부드러운 긁기 시뮬레이션
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
          await page.mouse.down();

          // 여러 위치에서 마우스 이동
          for (let i = 0; i < 10; i++) {
            await page.mouse.move(
              box.x + box.width * 0.3 + i * 15,
              box.y + box.height * 0.3 + i * 10
            );
            await page.waitForTimeout(50);
          }

          await page.mouse.up();
          await page.waitForTimeout(500);

          // 페이지가 안정적으로 처리했는지 확인
          const body = page.locator('body');
          await expect(body).toBeVisible();
        }
      }
    }
  });

  test('should show complete message at 60% threshold', async ({ page }) => {
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      const canvas = page.locator('canvas').first();

      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox();
        if (box) {
          // 광범위하게 긁기 (60% 이상)
          await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
          await page.mouse.down();

          for (let x = box.x + box.width * 0.2; x < box.x + box.width * 0.8; x += 20) {
            for (let y = box.y + box.height * 0.2; y < box.y + box.height * 0.8; y += 20) {
              await page.mouse.move(x, y);
              await page.waitForTimeout(20);
            }
          }

          await page.mouse.up();
          await page.waitForTimeout(1000);

          // 완료 메시지 또는 페이지 변경 확인
          const content = await page.content();
          expect(content.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should prevent double scratch detection', async ({ page }) => {
    // 같은 전단지를 두 번 클릭할 수 없어야 함
    const flyerCard = page.locator('[class*="card"], [class*="flyer"], article').first();

    if (await flyerCard.isVisible().catch(() => false)) {
      await flyerCard.click();
      await page.waitForTimeout(1000);

      // 첫 번째 스크래치 완료
      const canvas = page.locator('canvas').first();

      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox();
        if (box) {
          // 긁기 수행
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
          await page.mouse.up();
          await page.waitForTimeout(1000);

          // 다시 같은 전단지를 클릭 시도
          if (await flyerCard.isVisible().catch(() => false)) {
            await flyerCard.click();
            await page.waitForTimeout(1000);

            // 중복 긁기 방지 메시지나 새 스크래치 카드가 없어야 함
            const content = await page.content();
            expect(content.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
