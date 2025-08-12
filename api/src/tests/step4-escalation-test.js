#!/usr/bin/env node

/**
 * ステップ4: エスカレーションテスト
 * 家族への通知をシミュレート
 */

import { supabaseDataStore } from '../services/supabaseDataStore.js';

async function testEscalation() {
  console.log('🚨 ステップ4: エスカレーションテスト\n');
  console.log('========================================\n');
  
  await supabaseDataStore.initialize();
  
  try {
    // 1. テスト世帯を検索
    console.log('1️⃣ テスト世帯を検索中...');
    const { data: households } = await supabaseDataStore.searchHouseholds('テスト太郎');
    
    if (!households || households.length === 0) {
      console.log('❌ テスト世帯が見つかりません');
      console.log('先にステップ1を実行してください');
      return false;
    }
    
    const household = households[0];
    console.log(`  ✅ 世帯発見: ${household.name} (${household.phone})`);
    
    // 2. アラート作成（助けが必要）
    console.log('\n2️⃣ 緊急アラートを作成中...');
    const { data: alert, error: alertError } = await supabaseDataStore.createAlert({
      household_id: household.id,
      level: '厳重警戒',
      wbgt: 31.0,
      status: 'help'  // 助けが必要
    });
    
    if (alertError) {
      console.log(`❌ アラート作成失敗: ${alertError.message}`);
      return false;
    }
    
    console.log(`  ✅ アラート作成: ID=${alert.id}`);
    console.log(`  ⚠️  状態: 助けが必要`);
    
    // 3. 家族へのLINE通知（シミュレート）
    console.log('\n3️⃣ 家族への通知をシミュレート...');
    
    // LINE通知（実際には送信しない）
    console.log('  📱 LINE通知:');
    console.log(`     宛先: テスト家族`);
    console.log(`     内容: 【緊急】テスト太郎様が助けを求めています`);
    console.log(`           住所: ${household.address_grid || '登録なし'}`);
    console.log(`           電話: ${household.phone}`);
    
    // SMS通知（実際には送信しない）
    console.log('  📩 SMS通知:');
    console.log(`     宛先: ${household.phone}`);
    console.log(`     内容: 【緊急】高齢者見守りシステム`);
    console.log(`           テスト太郎様が助けを求めています`);
    
    // 4. 通知ログ記録
    await supabaseDataStore.createNotification({
      alert_id: alert.id,
      type: 'line',
      recipient: 'テスト家族',
      message: '【緊急】テスト太郎様が助けを求めています',
      status: 'sent'
    });
    
    await supabaseDataStore.createNotification({
      alert_id: alert.id,
      type: 'sms',
      recipient: household.phone,
      message: '【緊急】高齢者見守りシステム - テスト太郎様が助けを求めています',
      status: 'sent'
    });
    
    console.log('\n4️⃣ エスカレーション完了');
    console.log('  ✅ 家族への通知（シミュレート）: 成功');
    console.log('  ✅ 通知ログ: 記録済み');
    
    // 5. アラートステータス更新
    await supabaseDataStore.updateAlertStatus(alert.id, 'escalated', 'system');
    console.log('  ✅ アラートステータス: escalated');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    return false;
  }
  
  console.log('\n✅ ステップ4完了');
  
  return true;
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testEscalation()
    .then(success => {
      if (success) {
        console.log('\n次のステップ:');
        console.log('npm run test:step5');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('失敗:', error);
      process.exit(1);
    });
}

export { testEscalation };