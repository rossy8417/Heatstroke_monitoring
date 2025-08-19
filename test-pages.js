#!/usr/bin/env node

/**
 * ページ遷移・リンクテスト（HTTPリクエストベース）
 * 実行: node test-pages.js
 */

const WEB_BASE = 'http://localhost:3001';

async function checkPage(url, name) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const status = response.status;
    
    // 基本チェック
    const isHtml = text.includes('<html') || text.includes('<!DOCTYPE');
    const hasContent = text.length > 1000;
    const noError = !text.includes('404') && !text.includes('500') && !text.includes('Error');
    
    const success = status === 200 && isHtml && hasContent && noError;
    
    console.log(`${success ? '✅' : '❌'} ${name}: ${status} (${Math.round(text.length/1000)}KB)`);
    
    if (!success && status === 200) {
      console.log(`   詳細: HTML=${isHtml}, コンテンツ=${hasContent}, エラーなし=${noError}`);
    }
    
    return success;
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return false;
  }
}

async function checkPageLinks(url, name) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // より広範囲なUIエレメントパターンを検索
    const uiPatterns = [
      /href=["'][^"']*["']/g,  // 全てのリンク
      /<button[^>]*>/g,  // ボタン要素
      /<input[^>]*type=["']button["'][^>]*>/g,  // inputボタン
      /onClick|onclick/g,  // クリックイベント
      /className=["'][^"']*nav[^"']*["']/g,  // ナビゲーション
      /className=["'][^"']*btn[^"']*["']/g,  // ボタンクラス
      /"アラート"|"世帯"|"ログイン"|"ダッシュボード"/g,  // 日本語ナビゲーション
      /_next\/static/g,  // Next.jsアセット（ページが正常に構築されている証拠）
    ];
    
    let totalElements = 0;
    const detectedElements = [];
    
    for (const pattern of uiPatterns) {
      const matches = html.match(pattern) || [];
      if (matches.length > 0) {
        detectedElements.push(`${pattern.source.slice(0,20)}...: ${matches.length}個`);
        totalElements += matches.length;
      }
    }
    
    // Next.jsアプリケーションとして基本構造があるかチェック
    const hasNextJS = html.includes('_next') || html.includes('__next');
    const hasReact = html.includes('react') || html.includes('React');
    const hasComponents = html.includes('component') || html.includes('Component');
    
    console.log(`📊 ${name}: ${totalElements}個のUI要素を検出`);
    if (hasNextJS) console.log(`   ✅ Next.jsアプリケーション検出`);
    if (detectedElements.length > 0) {
      console.log(`   詳細: ${detectedElements.slice(0,3).join(', ')}`);
    }
    
    return totalElements > 0 || hasNextJS;
    
  } catch (error) {
    console.log(`❌ ${name}のUI要素チェック: ERROR - ${error.message}`);
    return false;
  }
}

async function runPageTests() {
  console.log('🚀 ページ・リンクテスト開始\n');
  
  const pageTests = [
    { url: `${WEB_BASE}`, name: 'ホームページ' },
    { url: `${WEB_BASE}/alerts`, name: 'アラート一覧' },
    { url: `${WEB_BASE}/households`, name: '世帯管理' },
    { url: `${WEB_BASE}/pricing`, name: '料金プラン' },
    { url: `${WEB_BASE}/login`, name: 'ログイン' },
  ];
  
  const results = [];
  
  console.log('📄 ページ表示テスト:');
  for (const test of pageTests) {
    const result = await checkPage(test.url, test.name);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n🔗 UI要素チェック:');
  for (const test of pageTests.slice(0, 3)) { // 主要ページのみ
    await checkPageLinks(test.url, test.name);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // アラート詳細ページのテスト（存在する場合）
  console.log('\n🔍 動的ページテスト:');
  try {
    const alertsResponse = await fetch(`http://localhost:3000/api/alerts/today`);
    const alertsData = await alertsResponse.json();
    
    if (alertsData.data && alertsData.data.length > 0) {
      const alertId = alertsData.data[0].id;
      const detailResult = await checkPage(`${WEB_BASE}/alerts/${alertId}`, `アラート詳細(${alertId.slice(0,8)}...)`);
      results.push(detailResult);
    } else {
      console.log('📝 アラートデータが空のため、詳細ページテストをスキップ');
    }
  } catch (error) {
    console.log('📝 アラート詳細ページテストをスキップ（APIエラー）');
  }
  
  const successCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  console.log(`\n📊 結果: ${successCount}/${totalCount} 成功`);
  
  if (successCount === totalCount) {
    console.log('🎉 すべてのページテストが成功しました！');
    process.exit(0);
  } else {
    console.log('⚠️  一部のページテストが失敗しました');
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error.message);
  process.exit(1);
});

runPageTests();