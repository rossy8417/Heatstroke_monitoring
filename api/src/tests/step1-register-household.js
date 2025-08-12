#!/usr/bin/env node

/**
 * ステップ1: テスト用世帯データを登録
 */

import { supabaseDataStore } from '../services/supabaseDataStore.js';

async function registerTestHousehold() {
  console.log('📝 ステップ1: テスト用世帯データを登録\n');
  console.log('========================================\n');
  
  // データストアを初期化
  await supabaseDataStore.initialize();
  
  // テスト用世帯データ（あなたの電話番号を使用）
  const testHousehold = {
    name: 'テスト太郎',
    phone: '+819062363364',  // あなたの番号
    address_grid: '5339-24-TEST',
    risk_flag: true,
    notes: 'テスト用データ（自動テスト）',
    contacts: [
      {
        type: 'family',
        priority: 1,
        name: 'テスト家族',
        phone: '+819062363364',  // 同じ番号でテスト
        relationship: '息子'
      }
    ]
  };
  
  console.log('登録するデータ:');
  console.log(`  名前: ${testHousehold.name}`);
  console.log(`  電話: ${testHousehold.phone}`);
  console.log(`  地域: ${testHousehold.address_grid}`);
  console.log(`  リスクフラグ: ${testHousehold.risk_flag ? '有り' : '無し'}`);
  console.log('');
  
  try {
    // 既存のテストデータを検索
    const { data: existing } = await supabaseDataStore.searchHouseholds('テスト太郎');
    
    if (existing && existing.length > 0) {
      console.log('⚠️  既存のテストデータが見つかりました');
      console.log(`  ID: ${existing[0].id}`);
      console.log('\n✅ ステップ1完了（既存データ使用）');
      return existing[0];
    }
    
    // 新規登録
    console.log('登録中...\n');
    const { data: household, error } = await supabaseDataStore.createHousehold(testHousehold);
    
    if (error) {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    }
    
    console.log('✅ 登録成功！');
    console.log(`  世帯ID: ${household.id}`);
    console.log(`  作成日時: ${household.created_at}`);
    console.log('\n✅ ステップ1完了');
    
    return household;
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  registerTestHousehold()
    .then(household => {
      console.log('\n次のステップ:');
      console.log('npm run test:step2');
      process.exit(0);
    })
    .catch(error => {
      console.error('失敗:', error);
      process.exit(1);
    });
}

export { registerTestHousehold };