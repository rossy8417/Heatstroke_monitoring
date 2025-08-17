import { logger } from './logger.js';
import { getCurrentRequestId } from '../middleware/requestId.js';

/**
 * Exponential Backoffを使用したリトライユーティリティ
 */
class RetryWithBackoff {
  constructor(options = {}) {
    this.defaultOptions = {
      maxRetries: 3,
      initialDelay: 1000, // 1秒
      maxDelay: 30000, // 30秒
      factor: 2, // 指数係数
      jitter: true, // ジッターを追加してthundering herdを防ぐ
      retryCondition: (error) => true, // デフォルトは全エラーでリトライ
      onRetry: null // リトライ時のコールバック
    };
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  isRetryableError(error) {
    // ネットワークエラー
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND') {
      return true;
    }

    // HTTPステータスコードによる判定
    if (error.status) {
      // 5xx エラーはリトライ可能
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      // 429 Too Many Requestsもリトライ可能
      if (error.status === 429) {
        return true;
      }
      // 408 Request Timeoutもリトライ可能
      if (error.status === 408) {
        return true;
      }
    }

    // Twilioの特定のエラーコード
    if (error.code && typeof error.code === 'number') {
      // Twilio rate limit errors (20xxx)
      if (error.code >= 20000 && error.code < 21000) {
        return true;
      }
    }

    // Stripeの特定のエラー
    if (error.type) {
      const retryableStripeErrors = [
        'api_connection_error',
        'api_error',
        'rate_limit_error'
      ];
      if (retryableStripeErrors.includes(error.type)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 遅延時間を計算（ジッター付き）
   */
  calculateDelay(attempt, options) {
    const baseDelay = Math.min(
      options.initialDelay * Math.pow(options.factor, attempt - 1),
      options.maxDelay
    );

    if (!options.jitter) {
      return baseDelay;
    }

    // ジッターを追加（0.5〜1.5倍の範囲）
    const jitterFactor = 0.5 + Math.random();
    return Math.floor(baseDelay * jitterFactor);
  }

  /**
   * 非同期関数を指数バックオフでリトライ
   */
  async execute(fn, options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const requestId = getCurrentRequestId();
    let lastError;

    for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
      try {
        const startTime = Date.now();
        
        logger.info('Executing function', {
          attempt,
          maxRetries: opts.maxRetries + 1,
          requestId
        });

        const result = await fn();

        const duration_ms = Date.now() - startTime;
        
        if (attempt > 1) {
          logger.info('Function succeeded after retry', {
            attempt,
            duration_ms,
            requestId
          });
        }

        return result;

      } catch (error) {
        lastError = error;
        
        const isRetryable = opts.retryCondition(error) && this.isRetryableError(error);
        
        if (attempt > opts.maxRetries || !isRetryable) {
          logger.error('Function failed permanently', {
            error: error.message,
            attempt,
            maxRetries: opts.maxRetries,
            retryable: isRetryable,
            requestId
          });
          throw error;
        }

        const delay = this.calculateDelay(attempt, opts);
        
        logger.warn('Function failed, retrying', {
          error: error.message,
          attempt,
          nextAttemptIn: delay,
          requestId
        });

        // リトライコールバックを実行
        if (opts.onRetry) {
          opts.onRetry(error, attempt, delay);
        }

        // 遅延
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Promise版のsleep関数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 特定のサービス用のプリセット設定を取得
   */
  static getPresets() {
    return {
      // Twilio API用の設定
      twilio: {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        factor: 2,
        retryCondition: (error) => {
          // 認証エラーはリトライしない
          if (error.status === 401 || error.status === 403) {
            return false;
          }
          return true;
        }
      },

      // LINE API用の設定
      line: {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2,
        retryCondition: (error) => {
          // 無効なトークンエラーはリトライしない
          if (error.statusCode === 401) {
            return false;
          }
          return true;
        }
      },

      // Stripe API用の設定
      stripe: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 20000,
        factor: 2.5,
        retryCondition: (error) => {
          // カード拒否などの決済エラーはリトライしない
          if (error.type === 'card_error' || error.type === 'invalid_request_error') {
            return false;
          }
          return true;
        }
      },

      // 天気API用の設定
      weather: {
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 10000,
        factor: 1.5,
        jitter: true
      },

      // データベース用の設定
      database: {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 2000,
        factor: 2,
        retryCondition: (error) => {
          // トランザクションエラーやデッドロックはリトライ
          if (error.code === '40001' || error.code === '40P01') {
            return true;
          }
          // 接続エラーもリトライ
          if (error.code === 'ECONNREFUSED') {
            return true;
          }
          return false;
        }
      }
    };
  }
}

// シングルトンインスタンス
const retryWithBackoff = new RetryWithBackoff();

/**
 * 便利な関数エクスポート
 */
export async function withRetry(fn, options = {}) {
  return retryWithBackoff.execute(fn, options);
}

/**
 * サービス別のリトライ関数
 */
export async function withTwilioRetry(fn) {
  return retryWithBackoff.execute(fn, RetryWithBackoff.getPresets().twilio);
}

export async function withLineRetry(fn) {
  return retryWithBackoff.execute(fn, RetryWithBackoff.getPresets().line);
}

export async function withStripeRetry(fn) {
  return retryWithBackoff.execute(fn, RetryWithBackoff.getPresets().stripe);
}

export async function withWeatherRetry(fn) {
  return retryWithBackoff.execute(fn, RetryWithBackoff.getPresets().weather);
}

export async function withDatabaseRetry(fn) {
  return retryWithBackoff.execute(fn, RetryWithBackoff.getPresets().database);
}

export { RetryWithBackoff, retryWithBackoff };