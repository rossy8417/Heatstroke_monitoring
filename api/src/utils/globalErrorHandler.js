import { logger } from './logger.js';

/**
 * 未処理のPromiseリジェクションをキャッチ
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
  
  // 開発環境では詳細を出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
  
  // 本番環境では適切にシャットダウン
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

/**
 * 未処理の例外をキャッチ
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // 開発環境では詳細を出力
  if (process.env.NODE_ENV === 'development') {
    console.error('Uncaught Exception:', error);
  }
  
  // 本番環境では適切にシャットダウン
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * SIGTERMシグナルの処理
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received');
  gracefulShutdown('SIGTERM');
});

/**
 * SIGINTシグナルの処理（Ctrl+C）
 */
process.on('SIGINT', () => {
  logger.info('SIGINT signal received');
  gracefulShutdown('SIGINT');
});

/**
 * グレースフルシャットダウン
 */
let isShuttingDown = false;

export async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  
  logger.info(`Starting graceful shutdown (${signal})`);
  
  // タイムアウト設定（30秒）
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 30000);
  
  try {
    // 新規リクエストの受付を停止
    if (global.server) {
      await new Promise((resolve) => {
        global.server.close(resolve);
      });
      logger.info('HTTP server closed');
    }
    
    // データベース接続のクローズ
    // await closeDatabase();
    
    // キャッシュのフラッシュ
    // await flushCache();
    
    // 進行中のジョブの完了を待つ
    // await waitForJobs();
    
    clearTimeout(shutdownTimeout);
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error.message,
      stack: error.stack
    });
    
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * エラー監視の初期化
 */
export function initializeErrorMonitoring() {
  logger.info('Error monitoring initialized', {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV
  });
  
  // メモリ使用量の定期ログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const usage = process.memoryUsage();
      logger.debug('Memory usage', {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      });
    }, 60000); // 1分ごと
  }
}

export default {
  gracefulShutdown,
  initializeErrorMonitoring
};