import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { getCurrentRequestId } from './requestId.js';

/**
 * Twilio Webhook署名検証ミドルウェア
 * リバースプロキシ対応とデバッグログ強化
 */
export function twilioWebhookMiddleware(options = {}) {
  const {
    authToken = process.env.TWILIO_AUTH_TOKEN,
    webhookSecret = process.env.TWILIO_WEBHOOK_SECRET,
    strictMode = process.env.NODE_ENV === 'production',
    bypassInDev = process.env.NODE_ENV === 'development'
  } = options;

  return (req, res, next) => {
    const requestId = getCurrentRequestId() || req.requestId;
    const startTime = Date.now();

    // 開発環境でバイパスする場合
    if (bypassInDev && process.env.NODE_ENV === 'development') {
      logger.info('Twilio signature verification bypassed in development', {
        requestId,
        provider: 'twilio_webhook'
      });
      return next();
    }

    // 必要な認証情報がない場合
    if (!authToken && !webhookSecret) {
      const message = 'Twilio auth token or webhook secret not configured';
      logger.error(message, { requestId });
      
      if (strictMode) {
        return res.status(500).json({ error: message });
      }
      return next();
    }

    try {
      // リクエストからURL を構築（リバースプロキシ対応）
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      const originalUrl = req.originalUrl || req.url;
      
      // Twilioが期待するURL形式を構築
      const webhookUrl = `${protocol}://${host}${originalUrl}`;
      
      // Twilioシグネチャヘッダー
      const twilioSignature = req.headers['x-twilio-signature'];
      
      if (!twilioSignature) {
        const error = 'Missing X-Twilio-Signature header';
        logger.warn('Twilio signature verification failed', {
          error,
          requestId,
          url: webhookUrl,
          headers: Object.keys(req.headers),
          provider: 'twilio_webhook'
        });
        
        if (strictMode) {
          return res.status(401).json({ error });
        }
        return next();
      }

      // リクエストボディを取得
      const params = req.body || {};
      
      // 署名検証に必要な情報をログ（セキュアな範囲で）
      logger.debug('Twilio signature verification attempt', {
        requestId,
        url: webhookUrl,
        signaturePresent: !!twilioSignature,
        bodyKeys: Object.keys(params),
        bodyLength: JSON.stringify(params).length,
        protocol,
        host,
        originalUrl,
        provider: 'twilio_webhook'
      });

      // 署名を検証
      let isValid = false;
      
      if (webhookSecret) {
        // Webhook Secretを使用した検証（推奨）
        isValid = twilio.validateRequestWithBody(
          webhookSecret,
          twilioSignature,
          webhookUrl,
          JSON.stringify(params)
        );
      } else {
        // Auth Tokenを使用した検証（従来の方法）
        isValid = twilio.validateRequest(
          authToken,
          twilioSignature,
          webhookUrl,
          params
        );
      }

      const duration_ms = Date.now() - startTime;

      if (!isValid) {
        // 検証失敗時の詳細ログ（デバッグ用）
        logger.error('Twilio signature verification failed', {
          requestId,
          duration_ms,
          url: webhookUrl,
          signatureProvided: twilioSignature ? twilioSignature.substring(0, 10) + '...' : null,
          bodyChecksum: require('crypto').createHash('md5').update(JSON.stringify(params)).digest('hex'),
          headerCount: Object.keys(req.headers).length,
          contentType: req.headers['content-type'],
          userAgent: req.headers['user-agent'],
          provider: 'twilio_webhook',
          status: 'invalid_signature'
        });

        if (strictMode) {
          return res.status(401).json({ 
            error: 'Invalid Twilio signature',
            requestId 
          });
        }
        
        logger.warn('Invalid signature but continuing (non-strict mode)', { requestId });
        return next();
      }

      // 検証成功
      logger.info('Twilio signature verification successful', {
        requestId,
        duration_ms,
        provider: 'twilio_webhook',
        status: 'valid_signature'
      });

      // 検証済みフラグを設定
      req.twilioVerified = true;
      next();

    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Twilio signature verification error', {
        error: error.message,
        stack: error.stack,
        requestId,
        duration_ms,
        provider: 'twilio_webhook',
        status: 'error'
      });

      if (strictMode) {
        return res.status(500).json({ 
          error: 'Signature verification error',
          requestId 
        });
      }
      
      next();
    }
  };
}

/**
 * Twilio署名検証設定
 */
export const twilioWebhookConfig = {
  // 本番環境の設定
  production: {
    strictMode: true,
    bypassInDev: false,
    useWebhookSecret: true
  },
  
  // 開発環境の設定
  development: {
    strictMode: false,
    bypassInDev: true,
    useWebhookSecret: false
  },
  
  // テスト環境の設定
  test: {
    strictMode: false,
    bypassInDev: true,
    useWebhookSecret: false
  }
};

/**
 * 環境に応じた設定を取得
 */
export function getTwilioWebhookConfig() {
  const env = process.env.NODE_ENV || 'development';
  return twilioWebhookConfig[env] || twilioWebhookConfig.development;
}

/**
 * Express用の簡易ラッパー
 */
export function validateTwilioWebhook(req, res, next) {
  const config = getTwilioWebhookConfig();
  const middleware = twilioWebhookMiddleware(config);
  return middleware(req, res, next);
}