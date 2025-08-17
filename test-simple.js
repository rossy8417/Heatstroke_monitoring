#!/usr/bin/env node

/**
 * 超シンプルなヘルスチェックテスト
 * 実行: node test-simple.js
 */

const API_BASE = 'http://localhost:3000';
const WEB_BASE = 'http://localhost:3001';

async function checkEndpoint(url, name) {
  try {
    const response = await fetch(url);
    const status = response.status;
    const success = status >= 200 && status < 300;
    console.log(`${success ? '✅' : '❌'} ${name}: ${status} ${url}`);
    return success;
  } catch (error) {
    console.log(`❌ ${name}: ERROR ${url} - ${error.message}`);
    return false;
  }
}

async function runBasicTests() {
  console.log('🚀 熱中症監視システム - 基本ヘルスチェック\n');
  
  const tests = [
    // API サーバーテスト
    { url: `${API_BASE}/health`, name: 'API Health Check' },
    { url: `${API_BASE}/metrics`, name: 'Metrics Endpoint' },
    { url: `${API_BASE}/api/alerts/today`, name: 'Today Alerts API' },
    { url: `${API_BASE}/api/weather`, name: 'Weather API' },
    
    // Web サーバーテスト（Next.js）
    { url: `${WEB_BASE}`, name: 'Web Frontend' },
    { url: `${WEB_BASE}/api/health`, name: 'Next.js API Health' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await checkEndpoint(test.url, test.name);
    results.push(result);
    
    // 短いディレイを入れてサーバー負荷を避ける
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  console.log(`\n📊 結果: ${successCount}/${totalCount} 成功`);
  
  if (successCount === totalCount) {
    console.log('🎉 すべてのテストが成功しました！');
    process.exit(0);
  } else {
    console.log('⚠️  一部のテストが失敗しました');
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error.message);
  process.exit(1);
});

// テスト実行
runBasicTests();