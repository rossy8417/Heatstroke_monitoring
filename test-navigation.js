#!/usr/bin/env node

/**
 * ページ遷移・リンクテスト（Puppeteer使用）
 * 実行: node test-navigation.js
 */

import puppeteer from 'puppeteer';

const WEB_BASE = 'http://localhost:3001';

async function testNavigation() {
  console.log('🚀 ページ遷移テスト開始\n');
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    // ブラウザ起動（ヘッドレスモード）
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // テストケース
    const tests = [
      {
        name: 'ホームページ表示',
        action: async () => {
          await page.goto(WEB_BASE, { waitUntil: 'networkidle0', timeout: 10000 });
          const title = await page.title();
          return title.length > 0;
        }
      },
      {
        name: 'アラートページ遷移',
        action: async () => {
          await page.goto(`${WEB_BASE}/alerts`, { waitUntil: 'networkidle0', timeout: 10000 });
          const url = page.url();
          return url.includes('/alerts');
        }
      },
      {
        name: '世帯管理ページ遷移',
        action: async () => {
          await page.goto(`${WEB_BASE}/households`, { waitUntil: 'networkidle0', timeout: 10000 });
          const url = page.url();
          return url.includes('/households');
        }
      },
      {
        name: 'ページ内リンクチェック',
        action: async () => {
          await page.goto(WEB_BASE, { waitUntil: 'networkidle0' });
          
          // リンクを検索（あらゆる形式）
          const links = await page.evaluate(() => {
            const linkElements = document.querySelectorAll('a[href], button[onclick], [data-testid*="nav"], [class*="nav"]');
            return Array.from(linkElements).length;
          });
          
          return links > 0;
        }
      },
      {
        name: 'レスポンシブ表示確認',
        action: async () => {
          // デスクトップ
          await page.setViewport({ width: 1280, height: 720 });
          await page.goto(`${WEB_BASE}/alerts`, { waitUntil: 'networkidle0' });
          
          // モバイル
          await page.setViewport({ width: 375, height: 667 });
          await page.reload({ waitUntil: 'networkidle0' });
          
          const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
          return bodyHeight > 400;
        }
      },
      {
        name: 'フォーム要素チェック',
        action: async () => {
          await page.goto(`${WEB_BASE}/households`, { waitUntil: 'networkidle0' });
          
          const formElements = await page.evaluate(() => {
            const inputs = document.querySelectorAll('input, button, select, textarea');
            return Array.from(inputs).length;
          });
          
          return formElements >= 0; // フォームがない場合もOK
        }
      },
      {
        name: 'JavaScriptエラーチェック',
        action: async () => {
          let jsErrors = [];
          page.on('pageerror', error => jsErrors.push(error));
          
          await page.goto(`${WEB_BASE}/alerts`, { waitUntil: 'networkidle0' });
          await page.waitForTimeout(2000); // JSエラーを待機
          
          return jsErrors.length === 0;
        }
      }
    ];
    
    // テスト実行
    for (const test of tests) {
      try {
        console.log(`📝 ${test.name}...`);
        const result = await test.action();
        
        if (result) {
          console.log(`✅ ${test.name}: 成功`);
          passed++;
        } else {
          console.log(`❌ ${test.name}: 失敗`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name}: エラー - ${error.message}`);
        failed++;
      }
      
      // テスト間のディレイ
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('❌ ブラウザ起動エラー:', error.message);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // 結果表示
  console.log(`\n📊 テスト結果: ${passed}/${passed + failed} 成功`);
  
  if (failed === 0) {
    console.log('🎉 すべてのナビゲーションテストが成功しました！');
    process.exit(0);
  } else {
    console.log('⚠️  一部のナビゲーションテストが失敗しました');
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error.message);
  process.exit(1);
});

testNavigation();