import { app } from './app-improved.js';
import { validateEnv, setDefaults } from './utils/validateEnv.js';
import { logger } from './utils/logger.js';

// デフォルト値を設定
setDefaults();

// 環境変数をバリデート
try {
  validateEnv();
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 改善版APIサーバー起動: http://localhost:${PORT}`, {
    NODE_ENV: process.env.NODE_ENV,
    port: PORT
  });
  console.log(`🚀 改善版APIサーバー起動: http://localhost:${PORT}`);
  console.log(`📍 気象データエンドポイント:`);
  console.log(`   - スタブ: GET /stub/weather?grid=5339-24`);
  console.log(`   - 実データ: GET /stub/weather?grid=5339-24&real=true`);
  console.log(`   - 最寄り観測所: GET /weather/nearest?lat=35.6812&lon=139.7671`);
  console.log(`   - 観測所一覧: GET /weather/stations`);
});