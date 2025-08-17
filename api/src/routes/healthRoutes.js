import express from 'express';
import { logger } from '../utils/logger.js';
import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { twilioService } from '../services/twilioService.js';
import { lineService } from '../services/lineService.js';
import { stripeService } from '../services/stripeService.js';
import { weatherServiceFixed } from '../services/weatherServiceFixed.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

// 基本的なヘルスチェック
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// リブネスプローブ（Kubernetesなど向け）
router.get('/health/live', (req, res) => {
  res.status(200).send('OK');
});

// レディネスプローブ（サービスが準備完了か確認）
router.get('/health/ready', asyncHandler(async (req, res) => {
  const checks = {
    database: false,
    twilio: false,
    line: false,
    stripe: false,
    weather: false
  };

  // データベース接続チェック
  try {
    const { error } = await supabaseDataStore.getAlertSummary();
    checks.database = !error;
  } catch (e) {
    checks.database = false;
  }

  // 外部サービスの設定チェック（実際の接続はしない）
  checks.twilio = twilioService.isConfigured;
  checks.line = lineService.isConfigured;
  checks.stripe = stripeService.isConfigured;
  checks.weather = true; // Weather APIは常に利用可能

  const allReady = Object.values(checks).every(check => check);
  
  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    checks,
    timestamp: new Date().toISOString()
  });
}));

// 詳細なヘルスチェック（デバッグ用）
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version
    },
    services: {
      database: {
        configured: !!supabaseDataStore,
        connected: false,
        latency: null
      },
      twilio: {
        configured: twilioService.isConfigured,
        accountSid: twilioService.accountSid ? twilioService.accountSid.substring(0, 10) + '...' : null
      },
      line: {
        configured: lineService.isConfigured,
        channelPresent: !!lineService.channelAccessToken
      },
      stripe: {
        configured: stripeService.isConfigured,
        priceIds: stripeService.getAvailablePrices ? stripeService.getAvailablePrices() : {}
      },
      weather: {
        configured: true,
        cacheStats: weatherServiceFixed.getCacheStats ? weatherServiceFixed.getCacheStats() : {}
      }
    },
    dependencies: {},
    errors: []
  };

  // データベース接続とレイテンシーチェック
  try {
    const dbStart = Date.now();
    const { error } = await supabaseDataStore.getAlertSummary();
    const dbLatency = Date.now() - dbStart;
    
    health.services.database.connected = !error;
    health.services.database.latency = dbLatency;
    
    if (error) {
      health.errors.push({
        service: 'database',
        error: error.message
      });
    }
  } catch (e) {
    health.services.database.connected = false;
    health.errors.push({
      service: 'database',
      error: e.message
    });
  }

  // パッケージバージョン情報を取得
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageData = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageData);
    
    health.version = packageJson.version || 'unknown';
    health.dependencies = {
      express: packageJson.dependencies?.express || 'unknown',
      twilio: packageJson.dependencies?.twilio || 'unknown',
      '@line/bot-sdk': packageJson.dependencies?.['@line/bot-sdk'] || 'unknown',
      stripe: packageJson.dependencies?.stripe || 'unknown',
      '@supabase/supabase-js': packageJson.dependencies?.['@supabase/supabase-js'] || 'unknown'
    };
  } catch (e) {
    // パッケージ情報が取得できない場合は無視
  }

  // 全体的なステータスを判定
  if (health.errors.length > 0) {
    health.status = 'degraded';
  }
  
  if (!health.services.database.connected) {
    health.status = 'unhealthy';
  }

  const responseTime = Date.now() - startTime;
  health.responseTime = responseTime;

  // ログに記録
  logger.info('Health check performed', {
    status: health.status,
    responseTime,
    errors: health.errors.length
  });

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
}));

// メトリクスエンドポイント（Prometheus形式）
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = [];
  
  // システムメトリクス
  const memUsage = process.memoryUsage();
  metrics.push(`# HELP process_memory_heap_used_bytes Process heap memory used`);
  metrics.push(`# TYPE process_memory_heap_used_bytes gauge`);
  metrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`);
  
  metrics.push(`# HELP process_memory_heap_total_bytes Process heap memory total`);
  metrics.push(`# TYPE process_memory_heap_total_bytes gauge`);
  metrics.push(`process_memory_heap_total_bytes ${memUsage.heapTotal}`);
  
  metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`);
  metrics.push(`# TYPE process_uptime_seconds counter`);
  metrics.push(`process_uptime_seconds ${process.uptime()}`);
  
  // サービスステータス（1=健全, 0=不健全）
  metrics.push(`# HELP service_health_status Service health status (1=healthy, 0=unhealthy)`);
  metrics.push(`# TYPE service_health_status gauge`);
  
  const dbHealthy = await checkDatabaseHealth();
  metrics.push(`service_health_status{service="database"} ${dbHealthy ? 1 : 0}`);
  metrics.push(`service_health_status{service="twilio"} ${twilioService.isConfigured ? 1 : 0}`);
  metrics.push(`service_health_status{service="line"} ${lineService.isConfigured ? 1 : 0}`);
  metrics.push(`service_health_status{service="stripe"} ${stripeService.isConfigured ? 1 : 0}`);
  
  // アラート統計（可能な場合）
  try {
    const { data: summary } = await supabaseDataStore.getAlertSummary();
    if (summary) {
      metrics.push(`# HELP alerts_total Total number of alerts by status`);
      metrics.push(`# TYPE alerts_total gauge`);
      metrics.push(`alerts_total{status="ok"} ${summary.ok || 0}`);
      metrics.push(`alerts_total{status="unanswered"} ${summary.unanswered || 0}`);
      metrics.push(`alerts_total{status="help"} ${summary.help || 0}`);
      metrics.push(`alerts_total{status="escalated"} ${summary.escalated || 0}`);
    }
  } catch (e) {
    // メトリクス取得エラーは無視
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
}));

// ヘルパー関数
async function checkDatabaseHealth() {
  try {
    const { error } = await supabaseDataStore.getAlertSummary();
    return !error;
  } catch (e) {
    return false;
  }
}

export default router;