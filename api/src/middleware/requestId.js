import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * リクエストIDミドルウェア
 * 各リクエストに一意のIDを付与し、全ログに伝播させる
 */
export function requestIdMiddleware(req, res, next) {
  // リクエストIDを生成または取得
  const requestId = req.headers['x-request-id'] || randomUUID();
  
  // リクエストとレスポンスにIDを設定
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  
  // ログコンテキストに追加
  req.log = {
    info: (message, data = {}) => {
      logger.info(message, { ...data, requestId });
    },
    warn: (message, data = {}) => {
      logger.warn(message, { ...data, requestId });
    },
    error: (message, data = {}) => {
      logger.error(message, { ...data, requestId });
    },
    debug: (message, data = {}) => {
      logger.debug(message, { ...data, requestId });
    }
  };
  
  // リクエスト開始をログ
  const startTime = Date.now();
  req.log.info('Request started', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  });
  
  // レスポンス完了時のログ
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    req.log.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration_ms: duration
    });
    originalSend.call(this, data);
  };
  
  next();
}

/**
 * 外部API呼び出し時にリクエストIDを伝播させるヘルパー
 */
export function getRequestHeaders(req) {
  const headers = {};
  
  if (req && req.requestId) {
    headers['X-Request-Id'] = req.requestId;
  }
  
  return headers;
}

/**
 * AsyncLocalStorageを使用したコンテキスト管理（オプション）
 * Node.js 12.17.0以降で利用可能
 */
import { AsyncLocalStorage } from 'async_hooks';

export const requestContext = new AsyncLocalStorage();

export function requestContextMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  
  const context = {
    requestId,
    startTime: Date.now(),
    method: req.method,
    path: req.path
  };
  
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  
  // コンテキスト内でリクエストを処理
  requestContext.run(context, () => {
    next();
  });
}

/**
 * 現在のリクエストIDを取得
 */
export function getCurrentRequestId() {
  const context = requestContext.getStore();
  return context ? context.requestId : null;
}

/**
 * 現在のコンテキストでログを出力
 */
export function logWithContext(level, message, data = {}) {
  const context = requestContext.getStore();
  const logData = context ? { ...data, requestId: context.requestId } : data;
  
  switch (level) {
    case 'info':
      logger.info(message, logData);
      break;
    case 'warn':
      logger.warn(message, logData);
      break;
    case 'error':
      logger.error(message, logData);
      break;
    case 'debug':
      logger.debug(message, logData);
      break;
    default:
      logger.info(message, logData);
  }
}