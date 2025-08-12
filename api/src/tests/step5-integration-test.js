#!/usr/bin/env node

/**
 * ステップ5: 統合テスト
 * すべてのステップを順番に実行
 */

import { registerTestHousehold } from './step1-register-household.js';
import { testWeatherData } from './step2-weather-test.js';
import { testAlertAndCall } from './step3-alert-and-call.js';
import { testEscalation } from './step4-escalation-test.js';

async function runIntegrationTest() {
  console.log('🔄 統合テスト開始\n');
  console.log('========================================\n');
  
  const results = {
    step1: false,
    step2: false,
    step3: false,
    step4: false
  };
  
  try {
    // ステップ1: 世帯登録
    console.log('▶️  ステップ1を実行中...\n');
    await registerTestHousehold();
    results.step1 = true;
    console.log('\n');
    
    // ステップ2: 気象データ
    console.log('▶️  ステップ2を実行中...\n');
    await testWeatherData();
    results.step2 = true;
    console.log('\n');
    
    // ステップ3: アラートと電話（スキップ - 電話が必要）
    console.log('▶️  ステップ3をスキップ（電話テストは手動実行が必要）\n');
    results.step3 = 'skipped';
    
    // ステップ4: エスカレーション
    console.log('▶️  ステップ4を実行中...\n');
    await testEscalation();
    results.step4 = true;
    console.log('\n');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
  }
  
  // 結果サマリー
  console.log('\n========================================');
  console.log('📊 テスト結果サマリー\n');
  
  const statusIcon = (status) => {
    if (status === true) return '✅';
    if (status === 'skipped') return '⏭️';
    return '❌';
  };
  
  console.log(`  ${statusIcon(results.step1)} ステップ1: 世帯登録`);
  console.log(`  ${statusIcon(results.step2)} ステップ2: 気象データ取得`);
  console.log(`  ${statusIcon(results.step3)} ステップ3: アラートと電話（スキップ）`);
  console.log(`  ${statusIcon(results.step4)} ステップ4: エスカレーション`);
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length - 1; // スキップ分を除外
  
  console.log(`\n  合計: ${passed}/${total} テスト成功`);
  
  if (passed === total) {
    console.log('\n🎉 すべてのテストが成功しました！');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました');
  }
  
  console.log('\n💡 ステップ3（電話テスト）を実行するには:');
  console.log('   npm run test:step3');
  
  return passed === total;
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('失敗:', error);
      process.exit(1);
    });
}

export { runIntegrationTest };