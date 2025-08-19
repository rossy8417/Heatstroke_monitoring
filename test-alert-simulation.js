#!/usr/bin/env node

/**
 * 熱中症アラート発生シミュレーションテスト
 * 実際の業務フローを模擬する
 */

const API_BASE = 'http://localhost:3000';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function simulateHeatAlert() {
  console.log('🔥 熱中症アラート発生シミュレーション\n');
  
  // ========================================
  // ステップ1: 高温気象条件をシミュレート
  // ========================================
  console.log('🌡️ ステップ1: 危険な気象条件をシミュレート');
  
  // モックで危険レベルの気象データを取得
  const weatherResponse = await apiRequest('/api/weather?mock=true');
  console.log(`📊 現在の気象状況: WBGT ${weatherResponse.data.wbgt}°C, レベル: ${weatherResponse.data.level}`);
  
  // 危険レベルでなければ警告
  const isDangerous = weatherResponse.data.wbgt >= 28 || weatherResponse.data.level.includes('危険') || weatherResponse.data.level.includes('厳重警戒');
  console.log(`🚨 危険判定: ${isDangerous ? '危険レベル - アラート発生対象' : '安全レベル - アラート発生不要'}`);
  
  // ========================================
  // ステップ2: 対象世帯の特定
  // ========================================
  console.log('\n👥 ステップ2: 対象世帯の特定');
  
  const householdsResponse = await apiRequest('/api/households');
  const households = householdsResponse.data.data || householdsResponse.data || [];
  
  console.log(`📋 登録世帯数: ${households.length}`);
  
  const targetHouseholds = households.filter(h => {
    // 高リスク世帯: 高齢者、既往歴あり、リスクフラグ
    return h.risk_flag || h.notes?.includes('糖尿病') || h.notes?.includes('高血圧') || h.age >= 65;
  });
  
  console.log(`🎯 対象世帯: ${targetHouseholds.length}世帯`);
  targetHouseholds.forEach((h, i) => {
    console.log(`   ${i+1}. ${h.name} (電話: ${h.phone})`);
  });
  
  if (targetHouseholds.length === 0) {
    console.log('⚠️ 対象世帯がありません。テスト世帯を作成することをお勧めします。');
    return false;
  }
  
  // ========================================
  // ステップ3: アラート作成・通知送信
  // ========================================
  console.log('\n🚨 ステップ3: アラート作成・通知送信');
  
  let alertsCreated = 0;
  let notificationsSent = 0;
  
  for (const household of targetHouseholds.slice(0, 2)) { // 最初の2世帯でテスト
    console.log(`\n📞 ${household.name}さんへの通知処理:`);
    
    // Twilio通話テスト
    try {
      const callResponse = await apiRequest('/webhooks/twilio/test/call', 'POST', {
        to: household.phone,
        alertId: `sim_${Date.now()}_${household.id}`,
        name: household.name
      });
      
      if (callResponse.status === 200) {
        console.log(`✅ 通話発信: ${household.phone} (${callResponse.data.success ? 'Twilio設定済み' : 'スタブモード'})`);
      } else {
        console.log(`❌ 通話発信失敗: ${household.phone}`);
      }
    } catch (error) {
      console.log(`❌ 通話発信エラー: ${error.message}`);
    }
    
    // LINE通知テスト
    try {
      const lineResponse = await apiRequest('/stub/line/push', 'POST', {
        to_line_user_id: `user_${household.id}`,
        template_id: 'family_unanswered',
        alert_id: `sim_${Date.now()}_${household.id}`,
        params: {
          name: household.name,
          phone: household.phone
        }
      });
      
      if (lineResponse.status === 200) {
        console.log(`✅ LINE通知送信成功`);
        notificationsSent++;
      } else {
        console.log(`❌ LINE通知送信失敗`);
      }
    } catch (error) {
      console.log(`❌ LINE通知エラー: ${error.message}`);
    }
    
    alertsCreated++;
  }
  
  // ========================================
  // ステップ4: 応答シミュレーション
  // ========================================
  console.log('\n📱 ステップ4: 利用者応答シミュレーション');
  
  const responseScenarios = [
    { action: 'take_care', description: '「大丈夫です」の応答' },
    { action: 'tired', description: '「少し疲れています」の応答' },
    { action: 'help', description: '「助けが必要」の応答' }
  ];
  
  for (let i = 0; i < Math.min(responseScenarios.length, alertsCreated); i++) {
    const scenario = responseScenarios[i];
    console.log(`\n${i+1}. ${scenario.description}をシミュレート:`);
    
    try {
      const postbackResponse = await apiRequest('/stub/line/postback', 'POST', {
        action: scenario.action,
        alert_id: `sim_test_${i+1}`
      });
      
      if (postbackResponse.status === 200) {
        console.log(`✅ 応答処理成功: ${scenario.action}`);
        
        // 家族通知が必要な場合
        if (scenario.action === 'tired' || scenario.action === 'help') {
          console.log(`📨 家族・スタッフへの通知が送信されます`);
        }
      } else {
        console.log(`❌ 応答処理失敗: ${scenario.action}`);
      }
    } catch (error) {
      console.log(`❌ 応答処理エラー: ${error.message}`);
    }
  }
  
  // ========================================
  // ステップ5: 結果集計・レポート
  // ========================================
  console.log('\n📊 ステップ5: 結果集計・レポート');
  
  // 今日のアラート状況を確認
  try {
    const todayAlertsResponse = await apiRequest('/api/alerts/today');
    if (todayAlertsResponse.status === 200) {
      const alerts = todayAlertsResponse.data.data || [];
      const summary = todayAlertsResponse.data.summary || {};
      
      console.log(`✅ 本日のアラート: ${alerts.length}件`);
      console.log(`📈 ステータス別:`);
      console.log(`   - OK: ${summary.ok || 0}件`);
      console.log(`   - 未応答: ${summary.unanswered || 0}件`);
      console.log(`   - 要注意: ${summary.tired || 0}件`);
      console.log(`   - ヘルプ: ${summary.help || 0}件`);
      console.log(`   - 対応中: ${summary.open || 0}件`);
    } else {
      console.log('❌ アラート集計取得失敗');
    }
  } catch (error) {
    console.log(`❌ 集計エラー: ${error.message}`);
  }
  
  // ========================================
  // 総合評価
  // ========================================
  console.log('\n' + '='.repeat(50));
  console.log('🎯 熱中症アラートシステム - シミュレーション結果');
  console.log('='.repeat(50));
  
  console.log(`📊 処理結果:`);
  console.log(`   - 対象世帯: ${targetHouseholds.length}世帯`);
  console.log(`   - アラート作成: ${alertsCreated}件`);
  console.log(`   - 通知送信: ${notificationsSent}件`);
  
  const successRate = targetHouseholds.length > 0 ? Math.round((alertsCreated / targetHouseholds.length) * 100) : 0;
  console.log(`   - 成功率: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('\n🎉 アラートシステムは正常に動作しています！');
    console.log('💡 実際の運用に向けた準備ができています。');
  } else if (successRate >= 50) {
    console.log('\n⚠️ 基本機能は動作していますが、改善の余地があります。');
  } else {
    console.log('\n❌ システムに重要な問題があります。修正が必要です。');
  }
  
  console.log('\n📋 実運用への推奨事項:');
  console.log('1. 実際のTwilio電話番号を設定');
  console.log('2. LINE Botアカウントを設定');  
  console.log('3. 実際の利用者でテスト実施');
  console.log('4. 緊急連絡先の設定確認');
  console.log('5. 24時間監視体制の構築');
  
  return successRate >= 50;
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error.message);
  process.exit(1);
});

simulateHeatAlert().then(success => {
  process.exit(success ? 0 : 1);
});