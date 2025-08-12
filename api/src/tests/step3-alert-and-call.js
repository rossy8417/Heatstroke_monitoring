#!/usr/bin/env node

/**
 * ステップ3: アラート作成と電話発信テスト
 * 注意: 実際に電話がかかってきます！
 */

import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { twilioService } from '../services/twilioService.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testAlertAndCall() {
  console.log('📞 ステップ3: アラート作成と電話発信テスト\n');
  console.log('========================================\n');
  console.log('⚠️  注意: このテストでは実際に電話がかかってきます！\n');
  
  // 確認
  const confirm = await question('電話を受ける準備はできていますか？ (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('テストを中止しました');
    rl.close();
    return false;
  }
  
  await supabaseDataStore.initialize();
  
  try {
    // 1. テスト世帯を検索
    console.log('\n1️⃣ テスト世帯を検索中...');
    const { data: households } = await supabaseDataStore.searchHouseholds('テスト太郎');
    
    if (!households || households.length === 0) {
      console.log('❌ テスト世帯が見つかりません');
      console.log('先にステップ1を実行してください');
      rl.close();
      return false;
    }
    
    const household = households[0];
    console.log(`  ✅ 世帯発見: ${household.name} (${household.phone})`);
    
    // 2. アラート作成
    console.log('\n2️⃣ アラートを作成中...');
    const { data: alert, error: alertError } = await supabaseDataStore.createAlert({
      household_id: household.id,
      level: '警戒',
      wbgt: 28.5,
      status: 'open'
    });
    
    if (alertError) {
      console.log(`❌ アラート作成失敗: ${alertError.message}`);
      rl.close();
      return false;
    }
    
    console.log(`  ✅ アラート作成: ID=${alert.id}`);
    
    // 3. 電話発信
    console.log('\n3️⃣ 電話を発信します...');
    console.log(`  📱 発信先: ${household.phone}`);
    console.log('\n⏰ まもなく電話がかかってきます！');
    console.log('   音声ガイダンスに従って番号を押してください:');
    console.log('   1 = 大丈夫');
    console.log('   2 = 疲れている');
    console.log('   3 = 助けが必要\n');
    
    const result = await twilioService.makeCall({
      to: household.phone,
      alertId: alert.id,
      householdName: household.name,
      attempt: 1
    });
    
    if (result.success) {
      console.log('✅ 発信成功！');
      console.log(`  Call SID: ${result.callSid}`);
      
      // 通話ログ記録
      await supabaseDataStore.createCallLog({
        alert_id: alert.id,
        household_id: household.id,
        call_id: result.callSid,
        attempt: 1,
        result: 'pending',
        provider: 'twilio'
      });
      
      console.log('\n📊 通話状況を確認するには:');
      console.log('https://console.twilio.com/develop/voice/logs/calls');
      
    } else {
      console.log('❌ 発信失敗:', result.error);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    rl.close();
    return false;
  }
  
  console.log('\n✅ ステップ3完了');
  
  const nextStep = await question('\n次のステップに進みますか？ (y/n): ');
  rl.close();
  
  if (nextStep.toLowerCase() === 'y') {
    console.log('\n次のステップ:');
    console.log('npm run test:step4');
  }
  
  return true;
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testAlertAndCall()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('失敗:', error);
      process.exit(1);
    });
}

export { testAlertAndCall };