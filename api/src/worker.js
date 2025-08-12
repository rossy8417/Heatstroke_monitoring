#!/usr/bin/env node

/**
 * ワーカープロセス
 * ジョブスケジューラーを実行する独立したプロセス
 */

import { scheduler } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';
import { checkConnection } from './db/supabase.js';

async function startWorker() {
  logger.info('Starting worker process...');
  
  // データベース接続確認
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    logger.warn('Database not connected, using in-memory mode');
  }
  
  // スケジューラー開始
  scheduler.start();
  
  logger.info('Worker process started successfully');
  
  // ヘルスチェック用エンドポイント（オプション）
  if (process.env.WORKER_PORT) {
    const express = await import('express');
    const app = express.default();
    
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        scheduler: scheduler.getStatus()
      });
    });
    
    const port = process.env.WORKER_PORT || 3002;
    app.listen(port, () => {
      logger.info(`Worker health endpoint listening on port ${port}`);
    });
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// 起動
startWorker().catch((error) => {
  logger.error('Failed to start worker', { error: error.message });
  process.exit(1);
});