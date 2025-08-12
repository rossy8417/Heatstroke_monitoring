#!/usr/bin/env node

/**
 * 気象データサービスのテスト
 * 使用方法: node src/tests/weather.test.js
 */

const BASE_URL = 'http://localhost:3000';

async function testWeatherAPI() {
  console.log('🌡️  気象データAPIテスト開始\n');
  
  const tests = [
    {
      name: 'スタブ気象データ取得',
      test: async () => {
        const response = await fetch(`${BASE_URL}/stub/weather?grid=5339-24`);
        const data = await response.json();
        console.log('  スタブデータ:', data);
        return data.level && data.wbgt;
      }
    },
    {
      name: '実際の気象データ取得（東京）',
      test: async () => {
        const response = await fetch(`${BASE_URL}/stub/weather?grid=5339-24&real=true`);
        const data = await response.json();
        console.log('  実データ:', {
          観測所: data.stationName,
          気温: data.temp + '℃',
          湿度: data.humidity + '%',
          WBGT: data.wbgt,
          警戒レベル: data.level
        });
        return data.wbgt !== undefined;
      }
    },
    {
      name: '最寄り観測所検索（東京駅）',
      test: async () => {
        const lat = 35.6812;
        const lon = 139.7671;
        const response = await fetch(`${BASE_URL}/weather/nearest?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        console.log('  最寄り観測所:', {
          名前: data.station?.kjName,
          距離: Math.round(data.station?.distance * 10) / 10 + 'km',
          WBGT: data.wbgt,
          警戒レベル: data.level
        });
        return data.ok && data.station;
      }
    },
    {
      name: '観測所一覧取得',
      test: async () => {
        const response = await fetch(`${BASE_URL}/weather/stations`);
        const data = await response.json();
        console.log('  観測所数:', data.count);
        
        // サンプル表示
        if (data.stations) {
          const samples = Object.entries(data.stations).slice(0, 3);
          samples.forEach(([id, station]) => {
            console.log(`    - ${id}: ${station.kjName} (${station.type})`);
          });
        }
        return data.count > 0;
      }
    }
  ];
  
  console.log('実行中のテスト:\n');
  
  for (const { name, test } of tests) {
    console.log(`\n📍 ${name}`);
    try {
      const result = await test();
      if (result) {
        console.log('  ✅ 成功');
      } else {
        console.log('  ❌ 失敗');
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n\n💡 使用方法のヒント:');
  console.log('1. スタブデータ: /stub/weather?grid=5339-24');
  console.log('2. 実データ: /stub/weather?grid=5339-24&real=true');
  console.log('3. 最寄り観測所: /weather/nearest?lat=35.6812&lon=139.7671');
  console.log('4. 観測所一覧: /weather/stations');
}

// メイン実行
testWeatherAPI().catch(console.error);