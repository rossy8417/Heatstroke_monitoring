import { logger } from './logger.js';

/**
 * 環境変数のバリデーション
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];
  
  // 環境判定
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // ================================
  // 必須項目のチェック
  // ================================
  
  // Supabase（常に必須）
  if (!process.env.SUPABASE_URL) {
    errors.push('SUPABASE_URL is required');
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    errors.push('SUPABASE_ANON_KEY is required');
  }
  if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY is required');
  }
  
  // 本番環境で必須の項目
  if (isProduction) {
    // Twilio
    if (!process.env.TWILIO_ACCOUNT_SID) {
      errors.push('TWILIO_ACCOUNT_SID is required in production');
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      errors.push('TWILIO_AUTH_TOKEN is required in production');
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
      errors.push('TWILIO_PHONE_NUMBER is required in production');
    }
    if (!process.env.TWILIO_WEBHOOK_URL) {
      errors.push('TWILIO_WEBHOOK_URL is required in production');
    }
    if (!process.env.TWILIO_WEBHOOK_SECRET) {
      warnings.push('TWILIO_WEBHOOK_SECRET is recommended for production');
    }
    
    // Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is required in production');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET is required in production');
    }
    
    // セキュリティ
    if (process.env.ALLOW_ANON_WRITE === 'true') {
      errors.push('ALLOW_ANON_WRITE must be false in production');
    }
  }
  
  // ================================
  // 推奨項目のチェック
  // ================================
  
  // LINE（オプション）
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN && !process.env.LINE_CHANNEL_SECRET) {
    warnings.push('LINE_CHANNEL_SECRET should be set when LINE_CHANNEL_ACCESS_TOKEN is provided');
  }
  
  // ジョブ設定
  if (!process.env.ALERT_WINDOWS) {
    warnings.push('ALERT_WINDOWS not set, using default: 9,13,17');
  }
  if (!process.env.QUIET_HOURS) {
    warnings.push('QUIET_HOURS not set, using default: 22-7');
  }
  
  // ログ設定
  if (!process.env.LOG_LEVEL) {
    warnings.push('LOG_LEVEL not set, using default: info');
  }
  
  // ================================
  // 形式チェック
  // ================================
  
  // URL形式
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    warnings.push('SUPABASE_URL should start with https://');
  }
  
  if (process.env.TWILIO_WEBHOOK_URL) {
    if (!process.env.TWILIO_WEBHOOK_URL.startsWith('http://') && 
        !process.env.TWILIO_WEBHOOK_URL.startsWith('https://')) {
      errors.push('TWILIO_WEBHOOK_URL must be a valid URL');
    }
  }
  
  // 電話番号形式
  if (process.env.TWILIO_PHONE_NUMBER) {
    if (!process.env.TWILIO_PHONE_NUMBER.startsWith('+')) {
      warnings.push('TWILIO_PHONE_NUMBER should start with + (E.164 format)');
    }
  }
  
  // 時間窓形式
  if (process.env.ALERT_WINDOWS) {
    const windows = process.env.ALERT_WINDOWS.split(',');
    for (const window of windows) {
      const hour = parseInt(window.trim());
      if (isNaN(hour) || hour < 0 || hour > 23) {
        errors.push(`Invalid ALERT_WINDOWS hour: ${window}`);
      }
    }
  }
  
  // 静穏時間形式
  if (process.env.QUIET_HOURS) {
    const match = process.env.QUIET_HOURS.match(/^(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      errors.push('QUIET_HOURS must be in format: HH-HH (e.g., 22-7)');
    } else {
      const [_, start, end] = match;
      const startHour = parseInt(start);
      const endHour = parseInt(end);
      if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
        errors.push('QUIET_HOURS hours must be between 0-23');
      }
    }
  }
  
  // ================================
  // 結果の出力
  // ================================
  
  // 警告を出力
  warnings.forEach(warning => {
    logger.warn(`ENV WARNING: ${warning}`);
  });
  
  // エラーがある場合
  if (errors.length > 0) {
    logger.error('Environment validation failed:', { errors });
    
    if (isProduction) {
      // 本番環境ではエラーで停止
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    } else {
      // 開発環境では警告のみ
      logger.warn('Continuing in development mode despite validation errors');
    }
  }
  
  // 環境情報をログ
  logger.info('Environment validated', {
    NODE_ENV: process.env.NODE_ENV || 'development',
    hasSupabase: !!process.env.SUPABASE_URL,
    hasTwilio: !!process.env.TWILIO_ACCOUNT_SID,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasLine: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    alertWindows: process.env.ALERT_WINDOWS || '9,13,17',
    quietHours: process.env.QUIET_HOURS || '22-7',
  });
}

// デフォルト値を設定
export function setDefaults() {
  // 開発環境のデフォルト
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
  
  // ログレベル
  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'info';
  }
  
  // ジョブ設定
  if (!process.env.ALERT_WINDOWS) {
    process.env.ALERT_WINDOWS = '9,13,17';
  }
  if (!process.env.QUIET_HOURS) {
    process.env.QUIET_HOURS = '22-7';
  }
  if (!process.env.JOB_INTERVAL_MINUTES) {
    process.env.JOB_INTERVAL_MINUTES = '5';
  }
  
  // CORS
  if (!process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN = 'http://localhost:3001';
  }
  
  // 開発環境のみのデフォルト
  if (process.env.NODE_ENV === 'development') {
    if (process.env.ALLOW_ANON_WRITE === undefined) {
      process.env.ALLOW_ANON_WRITE = 'false';
    }
  }
}