#!/usr/bin/env node

/**
 * Supabaseに実データを登録するスクリプト
 */

import { supabaseDataStore } from '../services/supabaseDataStore.js';

async function seedData() {
  console.log('🌱 Supabaseにテストデータを登録します...\n');
  
  await supabaseDataStore.initialize();
  
  // テスト世帯データ
  const households = [
    {
      name: '田中太郎',
      phone: '+819012345678',
      address_grid: '5339-24',
      risk_flag: true,
      notes: '心臓病あり、毎日薬を服用',
      contacts: [
        {
          type: 'family',
          priority: 1,
          name: '田中花子',
          phone: '+819012345679',
          relationship: '娘'
        }
      ]
    },
    {
      name: '佐藤次郎',
      phone: '+819023456789',
      address_grid: '5339-25',
      risk_flag: false,
      notes: '一人暮らし、近所に息子',
      contacts: [
        {
          type: 'family',
          priority: 1,
          name: '佐藤一郎',
          phone: '+819023456790',
          relationship: '息子'
        }
      ]
    },
    {
      name: '鈴木三郎',
      phone: '+819034567890',
      address_grid: '5339-26',
      risk_flag: true,
      notes: '糖尿病、足が不自由',
      contacts: [
        {
          type: 'family',
          priority: 1,
          name: '鈴木美子',
          phone: '+819034567891',
          relationship: '妻'
        },
        {
          type: 'neighbor',
          priority: 2,
          name: '山田隣人',
          phone: '+819034567892',
          relationship: '隣人'
        }
      ]
    },
    {
      name: '高橋四郎',
      phone: '+819045678901',
      address_grid: '5339-27',
      risk_flag: false,
      notes: '元気だが高齢',
      contacts: [
        {
          type: 'family',
          priority: 1,
          name: '高橋孝子',
          phone: '+819045678902',
          relationship: '娘'
        }
      ]
    },
    {
      name: '渡辺五郎',
      phone: '+819056789012',
      address_grid: '5339-28',
      risk_flag: true,
      notes: '認知症の疑い、要注意',
      contacts: [
        {
          type: 'family',
          priority: 1,
          name: '渡辺健太',
          phone: '+819056789013',
          relationship: '息子'
        },
        {
          type: 'care_manager',
          priority: 2,
          name: '介護支援センター',
          phone: '+819056789014',
          relationship: 'ケアマネージャー'
        }
      ]
    }
  ];
  
  console.log('📝 世帯データを登録中...');
  
  const createdHouseholds = [];
  for (const household of households) {
    try {
      // 既存チェック
      const { data: existing } = await supabaseDataStore.searchHouseholds(household.name);
      
      if (existing && existing.length > 0) {
        console.log(`  ⏭️  ${household.name} - 既存`);
        createdHouseholds.push(existing[0]);
        continue;
      }
      
      // 新規登録
      const { data, error } = await supabaseDataStore.createHousehold(household);
      
      if (error) {
        console.log(`  ❌ ${household.name} - エラー: ${error.message}`);
      } else {
        console.log(`  ✅ ${household.name} - 登録完了`);
        createdHouseholds.push(data);
      }
    } catch (error) {
      console.log(`  ❌ ${household.name} - エラー: ${error.message}`);
    }
  }
  
  console.log('\n📊 アラートデータを作成中...');
  
  // 今日のアラートを作成
  const alertStatuses = ['ok', 'unanswered', 'tired', 'help', 'open'];
  const alertLevels = ['警戒', '厳重警戒', '危険'];
  
  for (let i = 0; i < createdHouseholds.length && i < 3; i++) {
    const household = createdHouseholds[i];
    const status = alertStatuses[i % alertStatuses.length];
    const level = alertLevels[Math.floor(Math.random() * alertLevels.length)];
    const wbgt = 28 + Math.random() * 5; // 28-33の範囲
    
    try {
      const { data, error } = await supabaseDataStore.createAlert({
        household_id: household.id,
        level,
        wbgt: Math.round(wbgt * 10) / 10,
        status,
        date: new Date().toISOString().split('T')[0],
        first_trigger_at: new Date(Date.now() - Math.random() * 3600000).toISOString() // 過去1時間以内
      });
      
      if (error) {
        console.log(`  ❌ ${household.name}のアラート - エラー: ${error.message}`);
      } else {
        console.log(`  ✅ ${household.name}のアラート - ${status} (${level})`);
        
        // 通話ログも作成
        if (status !== 'open') {
          await supabaseDataStore.createCallLog({
            alert_id: data.id,
            household_id: household.id,
            call_id: `CALL_${Date.now()}_${i}`,
            attempt: 1,
            result: status === 'ok' ? 'answered' : status === 'unanswered' ? 'no_answer' : 'answered',
            provider: 'twilio',
            duration: status === 'ok' ? 45 : status === 'unanswered' ? 0 : 30,
            dtmf_response: status === 'ok' ? '1' : status === 'tired' ? '2' : status === 'help' ? '3' : null
          });
        }
      }
    } catch (error) {
      console.log(`  ❌ ${household.name}のアラート - エラー: ${error.message}`);
    }
  }
  
  console.log('\n✅ データ登録完了！');
  
  // サマリー表示
  const { data: summary } = await supabaseDataStore.getAlertSummary();
  if (summary) {
    console.log('\n📈 本日のアラートサマリー:');
    console.log(`  OK: ${summary.ok || 0}`);
    console.log(`  未応答: ${summary.unanswered || 0}`);
    console.log(`  疲れ: ${summary.tired || 0}`);
    console.log(`  要支援: ${summary.help || 0}`);
    console.log(`  エスカレーション: ${summary.escalated || 0}`);
    console.log(`  確認中: ${summary.open || 0}`);
  }
  
  return true;
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData()
    .then(() => {
      console.log('\n🎉 すべて完了しました！');
      process.exit(0);
    })
    .catch(error => {
      console.error('エラー:', error);
      process.exit(1);
    });
}

export { seedData };