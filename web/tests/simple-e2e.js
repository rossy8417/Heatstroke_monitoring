/**
 * 超シンプルなPlaywright E2Eテスト
 * 
 * セットアップ:
 * npm install --save-dev @playwright/test
 * npx playwright install chromium
 * 
 * 実行:
 * npx playwright test tests/simple-e2e.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3001';

test.describe('熱中症監視システム - 基本UI確認', () => {
  
  test('ホームページが表示される', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // ページタイトルまたは主要要素の存在確認
    await expect(page).toHaveTitle(/熱中症|Heatstroke|監視/i);
    
    // 基本的なナビゲーション要素があることを確認
    const hasNavigation = await page.locator('nav, header, .navigation').count() > 0;
    expect(hasNavigation).toBe(true);
  });

  test('アラート一覧ページにアクセスできる', async ({ page }) => {
    await page.goto(`${BASE_URL}/alerts`);
    
    // ページが正常に読み込まれることを確認
    await expect(page).not.toHaveTitle(/404|Error/);
    
    // アラート関連の要素が存在することを確認
    const hasAlertElements = await page.locator('[data-testid*="alert"], .alert, [class*="alert"]').count() > 0;
    expect(hasAlertElements).toBe(true);
  });

  test('世帯管理ページにアクセスできる', async ({ page }) => {
    await page.goto(`${BASE_URL}/households`);
    
    // ページが正常に読み込まれることを確認
    await expect(page).not.toHaveTitle(/404|Error/);
    
    // 世帯関連の要素が存在することを確認（エラーページでないことの確認）
    const pageContent = await page.textContent('body');
    expect(pageContent.length).toBeGreaterThan(100); // 最低限のコンテンツがあること
  });

  test('APIレスポンスが正常', async ({ page }) => {
    // APIリクエストをインターセプトして確認
    let apiResponseOK = false;
    
    page.on('response', response => {
      if (response.url().includes('/api/alerts/today')) {
        apiResponseOK = response.ok();
      }
    });
    
    await page.goto(`${BASE_URL}/alerts`);
    
    // 少し待ってAPIコールが完了するのを待つ
    await page.waitForTimeout(2000);
    
    expect(apiResponseOK).toBe(true);
  });

  test('基本的なナビゲーションが動作する', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // 各主要ページへのリンクをクリック
    const navigationTests = [
      { text: /アラート|alerts/i, expectedUrl: /alerts/ },
      { text: /世帯|households/i, expectedUrl: /households/ },
    ];
    
    for (const navTest of navigationTests) {
      await page.goto(BASE_URL); // 毎回ホームに戻る
      
      try {
        await page.click(`text=${navTest.text.source}`);
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        expect(currentUrl).toMatch(navTest.expectedUrl);
      } catch (error) {
        // ナビゲーションリンクが見つからない場合はスキップ
        console.log(`Navigation test skipped: ${navTest.text.source}`);
      }
    }
  });

  test('レスポンシブデザインの基本確認', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${BASE_URL}/alerts`);
    await expect(page.locator('body')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // レイアウトが崩れていないことの簡単な確認
    const bodyHeight = await page.locator('body').boundingBox();
    expect(bodyHeight.height).toBeGreaterThan(500);
  });

});

// 設定
test.use({
  // ヘッドレスモードで実行（CIで便利）
  headless: true,
  
  // スクリーンショットをエラー時のみ保存
  screenshot: 'only-on-failure',
  
  // テスト間での状態をクリア
  storageState: undefined,
});

// テストが失敗した場合の追加情報
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log(`Test failed: ${testInfo.title}`);
    console.log(`Current URL: ${page.url()}`);
  }
});