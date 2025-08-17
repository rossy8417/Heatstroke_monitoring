import { logger } from '../utils/logger.js';
import { getCurrentRequestId } from './requestId.js';

/**
 * アプリケーション全体で使用する統一エラークラス
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 一般的なエラータイプの定義
 */
export const ErrorTypes = {
  // 認証・認可系
  UNAUTHORIZED: { statusCode: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { statusCode: 403, code: 'FORBIDDEN' },
  TOKEN_EXPIRED: { statusCode: 401, code: 'TOKEN_EXPIRED' },
  INVALID_TOKEN: { statusCode: 401, code: 'INVALID_TOKEN' },
  
  // リソース系
  NOT_FOUND: { statusCode: 404, code: 'NOT_FOUND' },
  ALREADY_EXISTS: { statusCode: 409, code: 'ALREADY_EXISTS' },
  CONFLICT: { statusCode: 409, code: 'CONFLICT' },
  
  // バリデーション系
  VALIDATION_ERROR: { statusCode: 400, code: 'VALIDATION_ERROR' },
  INVALID_INPUT: { statusCode: 400, code: 'INVALID_INPUT' },
  MISSING_REQUIRED: { statusCode: 400, code: 'MISSING_REQUIRED' },
  INVALID_FORMAT: { statusCode: 400, code: 'INVALID_FORMAT' },
  
  // 外部サービス系
  EXTERNAL_SERVICE_ERROR: { statusCode: 502, code: 'EXTERNAL_SERVICE_ERROR' },
  SERVICE_UNAVAILABLE: { statusCode: 503, code: 'SERVICE_UNAVAILABLE' },
  TIMEOUT: { statusCode: 504, code: 'TIMEOUT' },
  
  // レート制限
  RATE_LIMIT_EXCEEDED: { statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' },
  
  // サーバーエラー
  INTERNAL_ERROR: { statusCode: 500, code: 'INTERNAL_ERROR' },
  DATABASE_ERROR: { statusCode: 500, code: 'DATABASE_ERROR' },
  
  // ビジネスロジック系
  ALERT_ALREADY_PROCESSED: { statusCode: 400, code: 'ALERT_ALREADY_PROCESSED' },
  HOUSEHOLD_NOT_ACTIVE: { statusCode: 400, code: 'HOUSEHOLD_NOT_ACTIVE' },
  INSUFFICIENT_CREDITS: { statusCode: 402, code: 'INSUFFICIENT_CREDITS' },
  SUBSCRIPTION_REQUIRED: { statusCode: 402, code: 'SUBSCRIPTION_REQUIRED' }
};

/**
 * エラー作成ヘルパー
 */
export function createError(type, message, details = null) {
  const errorType = ErrorTypes[type] || ErrorTypes.INTERNAL_ERROR;
  return new AppError(
    message,
    errorType.statusCode,
    errorType.code,
    details
  );
}

/**
 * 非同期エラーハンドラーラッパー
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * try-catchラッパー（サービス層用）
 */
export async function tryCatch(fn, errorMessage = 'Operation failed') {
  try {
    return await fn();
  } catch (error) {
    const requestId = getCurrentRequestId();
    
    logger.error(errorMessage, {
      error: error.message,
      stack: error.stack,
      requestId
    });
    
    // エラーの再スロー（AppErrorに変換）
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(errorMessage, 500, 'INTERNAL_ERROR', {
      originalError: error.message
    });
  }
}

/**
 * 統一エラーハンドリングミドルウェア
 */
export function errorHandler(err, req, res, next) {
  const requestId = getCurrentRequestId() || req.requestId;
  let error = err;
  
  // AppErrorでない場合は変換
  if (!(error instanceof AppError)) {
    // Supabaseエラー
    if (err.code === 'PGRST') {
      error = handleSupabaseError(err);
    }
    // Twilioエラー
    else if (err.status && err.code && err.moreInfo) {
      error = handleTwilioError(err);
    }
    // Stripeエラー
    else if (err.type && err.raw) {
      error = handleStripeError(err);
    }
    // LINEエラー
    else if (err.statusCode && err.statusMessage) {
      error = handleLineError(err);
    }
    // バリデーションエラー
    else if (err.name === 'ValidationError') {
      error = createError('VALIDATION_ERROR', 'Invalid input data', err.errors);
    }
    // その他のエラー
    else {
      error = new AppError(
        err.message || 'An unexpected error occurred',
        err.statusCode || 500,
        err.code || 'INTERNAL_ERROR'
      );
    }
  }
  
  // エラーログ記録
  logger.error('Request failed', {
    requestId,
    error: error.code,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    path: req.path,
    method: req.method,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
  
  // レスポンス送信
  const response = {
    error: error.code,
    message: error.message,
    requestId,
    timestamp: error.timestamp || new Date().toISOString()
  };
  
  // 開発環境では詳細情報を含める
  if (process.env.NODE_ENV === 'development') {
    response.details = error.details;
    response.stack = err.stack;
  }
  
  res.status(error.statusCode).json(response);
}

/**
 * Supabaseエラーのハンドリング
 */
function handleSupabaseError(err) {
  const message = err.message || 'Database operation failed';
  
  // 一般的なSupabaseエラーコード
  switch (err.code) {
    case '23505': // unique_violation
      return createError('ALREADY_EXISTS', 'Resource already exists', { field: err.details });
    case '23503': // foreign_key_violation
      return createError('INVALID_INPUT', 'Invalid reference', { field: err.details });
    case '22P02': // invalid_text_representation
      return createError('INVALID_FORMAT', 'Invalid data format');
    case '42501': // insufficient_privilege
      return createError('FORBIDDEN', 'Insufficient privileges');
    case 'PGRST301': // JWT expired
      return createError('TOKEN_EXPIRED', 'Authentication token expired');
    default:
      return createError('DATABASE_ERROR', message, { code: err.code });
  }
}

/**
 * Twilioエラーのハンドリング
 */
function handleTwilioError(err) {
  const message = err.message || 'Twilio operation failed';
  
  // Twilioエラーコードの範囲で判定
  if (err.code >= 20000 && err.code < 21000) {
    return createError('EXTERNAL_SERVICE_ERROR', message, { 
      provider: 'twilio',
      code: err.code 
    });
  }
  
  switch (err.status) {
    case 401:
      return createError('UNAUTHORIZED', 'Invalid Twilio credentials');
    case 429:
      return createError('RATE_LIMIT_EXCEEDED', 'Twilio rate limit exceeded');
    case 503:
      return createError('SERVICE_UNAVAILABLE', 'Twilio service unavailable');
    default:
      return createError('EXTERNAL_SERVICE_ERROR', message, { 
        provider: 'twilio',
        status: err.status 
      });
  }
}

/**
 * Stripeエラーのハンドリング
 */
function handleStripeError(err) {
  const message = err.message || 'Payment operation failed';
  
  switch (err.type) {
    case 'StripeCardError':
      return createError('INVALID_INPUT', message, { type: 'card_error' });
    case 'StripeRateLimitError':
      return createError('RATE_LIMIT_EXCEEDED', 'Payment service rate limit exceeded');
    case 'StripeInvalidRequestError':
      return createError('INVALID_INPUT', message);
    case 'StripeAPIError':
      return createError('EXTERNAL_SERVICE_ERROR', 'Payment service error', { 
        provider: 'stripe' 
      });
    case 'StripeConnectionError':
      return createError('SERVICE_UNAVAILABLE', 'Payment service unavailable');
    case 'StripeAuthenticationError':
      return createError('UNAUTHORIZED', 'Invalid payment credentials');
    default:
      return createError('EXTERNAL_SERVICE_ERROR', message, { 
        provider: 'stripe',
        type: err.type 
      });
  }
}

/**
 * LINEエラーのハンドリング
 */
function handleLineError(err) {
  const message = err.statusMessage || 'LINE operation failed';
  
  switch (err.statusCode) {
    case 401:
      return createError('UNAUTHORIZED', 'Invalid LINE credentials');
    case 429:
      return createError('RATE_LIMIT_EXCEEDED', 'LINE rate limit exceeded');
    case 500:
    case 502:
    case 503:
      return createError('SERVICE_UNAVAILABLE', 'LINE service unavailable');
    default:
      return createError('EXTERNAL_SERVICE_ERROR', message, { 
        provider: 'line',
        statusCode: err.statusCode 
      });
  }
}

/**
 * 404エラーハンドラー
 */
export function notFoundHandler(req, res, next) {
  const error = createError('NOT_FOUND', `Route ${req.originalUrl} not found`);
  next(error);
}

/**
 * エラーレスポンスビルダー（API用）
 */
export function buildErrorResponse(error, requestId = null) {
  return {
    success: false,
    error: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An error occurred',
    requestId,
    timestamp: new Date().toISOString()
  };
}

/**
 * バリデーションエラービルダー
 */
export function validationError(field, message) {
  return createError('VALIDATION_ERROR', message, { field });
}

/**
 * 必須フィールドエラー
 */
export function requiredFieldError(field) {
  return createError('MISSING_REQUIRED', `${field} is required`, { field });
}

export default {
  AppError,
  ErrorTypes,
  createError,
  asyncHandler,
  tryCatch,
  errorHandler,
  notFoundHandler,
  buildErrorResponse,
  validationError,
  requiredFieldError
};