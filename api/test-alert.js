// Node.js 18+ has built-in fetch

// テスト用のアラートを作成
async function createTestAlert() {
  try {
    // 1. まずテスト用の世帯を作成
    const householdRes = await fetch('http://localhost:3000/api/households', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'テスト太郎',
        phone: '+81901234567',
        emergency_contact: '+81909876543',
        address: '東京都千代田区1-1-1',
        health_conditions: '高血圧',
        grid_square: '5339-24'
      })
    });
    
    const household = await householdRes.json();
    console.log('Created household:', household);
    
    // 2. アラートを作成（未応答状態）
    const alertRes = await fetch('http://localhost:3000/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        household_id: household.id,
        household_name: household.name,
        status: 'unanswered',
        wbgt: 28.5,
        level: '厳重警戒',
        metadata: {
          attempts: 1,
          lastCallAt: new Date().toISOString(),
          lastResponseCode: 'no_answer'
        }
      })
    });
    
    const alert = await alertRes.json();
    console.log('Created alert:', alert);
    
    // 3. もう一つ要注意状態のアラートを作成
    const alertRes2 = await fetch('http://localhost:3000/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        household_id: household.id,
        household_name: household.name,
        status: 'tired',
        wbgt: 27.0,
        level: '警戒',
        metadata: {
          attempts: 2,
          lastCallAt: new Date().toISOString(),
          lastResponseCode: '2'
        }
      })
    });
    
    const alert2 = await alertRes2.json();
    console.log('Created alert 2:', alert2);
    
    console.log('\n✅ テストデータ作成完了！');
    console.log('http://localhost:3001/alerts でアラートページを確認してください');
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestAlert();