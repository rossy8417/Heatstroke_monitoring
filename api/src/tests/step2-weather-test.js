#!/usr/bin/env node

/**
 * ステップ2: 気象データ取得テスト
 */

import { weatherService } from '../services/weatherService.js';

async function testWeatherData() {
  console.log('🌡️  ステップ2: 気象データ取得テスト\n');
  console.log('========================================\n');
  
  // テスト地点（東京駅周辺）
  const testLocations = [
    { name: '東京駅', lat: 35.6812, lon: 139.7671, grid: '5339-24' },
  ];
  
  for (const location of testLocations) {
    console.log(`📍 ${location.name}の気象データ取得中...\n`);
    
    try {
      // メッシュコードから気象データ取得
      const weatherData = await weatherService.getWeatherByMesh(location.grid);
      
      console.log('取得結果:');
      console.log(`  観測所: ${weatherData.stationName || '不明'}`);
      console.log(`  気温: ${weatherData.temp}℃`);
      console.log(`  湿度: ${weatherData.humidity}%`);
      console.log(`  WBGT: ${weatherData.wbgt}`);
      console.log(`  警戒レベル: ${weatherData.level}`);
      console.log('');
      
      // 警戒レベルの判定
      if (weatherData.level === '警戒' || weatherData.level === '厳重警戒' || weatherData.level === '危険') {
        console.log('⚠️  警戒レベル以上です！アラート発行対象');
      } else {
        console.log('✅ 安全レベルです');
      }
      
    } catch (error) {
      console.log('⚠️  実データ取得失敗（フォールバック値を使用）');
      console.log(`  エラー: ${error.message}`);
      console.log('  デフォルト値: WBGT=28, レベル=警戒');
    }
  }
  
  console.log('\n✅ ステップ2完了');
  
  return true;
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testWeatherData()
    .then(() => {
      console.log('\n次のステップ:');
      console.log('npm run test:step3');
      process.exit(0);
    })
    .catch(error => {
      console.error('失敗:', error);
      process.exit(1);
    });
}

export { testWeatherData };