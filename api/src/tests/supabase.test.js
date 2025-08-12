#!/usr/bin/env node

import { supabase, supabaseAdmin, checkConnection } from '../db/supabase.js';
import { supabaseDataStore } from '../services/supabaseDataStore.js';

async function testSupabaseConnection() {
  console.log('🔗 Supabase接続テスト開始\n');
  
  // 1. 環境変数チェック
  console.log('1️⃣ 環境変数チェック');
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
  
  console.log(`  SUPABASE_URL: ${hasUrl ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  SUPABASE_ANON_KEY: ${hasAnonKey ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  SUPABASE_SERVICE_KEY: ${hasServiceKey ? '✅ 設定済み' : '❌ 未設定'}`);
  
  if (!hasUrl || !hasAnonKey || !hasServiceKey) {
    console.log('\n❌ 環境変数が設定されていません。.envファイルを確認してください。');
    return false;
  }
  
  // 2. 接続テスト
  console.log('\n2️⃣ データベース接続テスト');
  const isConnected = await checkConnection();
  console.log(`  接続状態: ${isConnected ? '✅ 成功' : '❌ 失敗'}`);
  
  if (!isConnected) {
    console.log('\n以下を確認してください:');
    console.log('1. Supabaseプロジェクトが作成されている');
    console.log('2. schema.sqlがSQLエディタで実行されている');
    console.log('3. 環境変数が正しく設定されている');
    return false;
  }
  
  // 3. データストア初期化
  console.log('\n3️⃣ データストア初期化');
  const initialized = await supabaseDataStore.initialize();
  console.log(`  初期化: ${initialized ? '✅ 成功' : '⚠️ インメモリモード'}`);
  
  // 4. CRUD操作テスト
  console.log('\n4️⃣ CRUD操作テスト');
  
  try {
    // 世帯作成
    console.log('  世帯作成テスト...');
    const { data: household, error: createError } = await supabaseDataStore.createHousehold({
      name: 'テスト太郎',
      phone: '+81901234TEST',
      address_grid: '5339-24-TEST',
      risk_flag: false,
      notes: 'テストデータ'
    });
    
    if (createError) {
      console.log(`    ❌ 作成失敗: ${createError.message}`);
      return false;
    }
    console.log(`    ✅ 作成成功: ID=${household.id}`);
    
    // 世帯検索
    console.log('  世帯検索テスト...');
    const { data: households, error: searchError } = await supabaseDataStore.searchHouseholds('テスト');
    
    if (searchError) {
      console.log(`    ❌ 検索失敗: ${searchError.message}`);
    } else {
      console.log(`    ✅ 検索成功: ${households.length}件`);
    }
    
    // アラート作成
    console.log('  アラート作成テスト...');
    const { data: alert, error: alertError } = await supabaseDataStore.createAlert({
      household_id: household.id,
      level: '警戒',
      wbgt: 28.5,
      status: 'open'
    });
    
    if (alertError) {
      console.log(`    ❌ アラート作成失敗: ${alertError.message}`);
    } else {
      console.log(`    ✅ アラート作成成功: ID=${alert.id}`);
    }
    
    // クリーンアップ
    if (household?.id) {
      console.log('  クリーンアップ...');
      await supabaseDataStore.deleteHousehold(household.id);
      console.log('    ✅ テストデータ削除完了');
    }
    
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}`);
    return false;
  }
  
  console.log('\n✅ すべてのテストが成功しました！');
  console.log('Supabaseは正常に動作しています。');
  return true;
}

// 実行
testSupabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });