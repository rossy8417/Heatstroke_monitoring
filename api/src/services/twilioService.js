import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { withTwilioRetry } from '../utils/retryWithBackoff.js';

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.webhookUrl = process.env.TWILIO_WEBHOOK_URL || 'http://localhost:3000/webhooks/twilio';
    
    // Twilioクライアントの初期化
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
      this.isConfigured = true;
      logger.info('Twilio service initialized');
    } else {
      this.isConfigured = false;
      logger.warn('Twilio not configured - using stub mode');
    }
  }

  /**
   * IVR電話を発信
   * @param {Object} options
   * @param {string} options.to - 発信先電話番号
   * @param {string} options.alertId - アラートID
   * @param {string} options.householdName - 世帯主名
   * @param {number} options.attempt - 試行回数
   */
  async makeCall({ to, alertId, householdName = '利用者', attempt = 1 }) {
    const startTime = Date.now();
    
    if (!this.isConfigured) {
      logger.info('Twilio not configured - returning stub call', {
        to,
        alertId,
        attempt,
        duration_ms: Date.now() - startTime,
        provider: 'twilio',
        status: 'stub'
      });
      return {
        success: true,
        callSid: `stub_${Date.now()}`,
        stub: true
      };
    }

    try {
      // Webhook URLが未設定でも、自ホストの既定URLを用いてDTMFを収集
      if (!process.env.TWILIO_WEBHOOK_URL) {
        logger.warn('TWILIO_WEBHOOK_URL not set - falling back to default http://localhost:3000/webhooks/twilio');
      }
      
      // Webhook URLが設定されている場合は、従来の方法を使用
      const twimlUrl = `${this.webhookUrl}/twiml?alertId=${encodeURIComponent(alertId)}&name=${encodeURIComponent(householdName)}&attempt=${encodeURIComponent(attempt)}`;
      
      logger.info('Initiating Twilio call', {
        to,
        alertId,
        attempt,
        twimlUrl,
        provider: 'twilio'
      });
      
      // Exponential backoffでリトライ
      const call = await withTwilioRetry(async () => {
        return await this.client.calls.create({
          to,
          from: this.phoneNumber,
          url: twimlUrl,
          method: 'POST',
          statusCallback: `${this.webhookUrl}/status`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          timeout: 60, // 60秒でタイムアウト
          record: false // 録音はしない（プライバシー配慮）
        });
      });

      const duration_ms = Date.now() - startTime;
      
      logger.info('Call initiated successfully', {
        callSid: call.sid,
        to,
        alertId,
        attempt,
        duration_ms,
        provider: 'twilio',
        status: 'success'
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to make call', {
        error: error.message,
        to,
        alertId,
        duration_ms,
        provider: 'twilio',
        status: 'failed'
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * SMS送信
   * @param {Object} options
   * @param {string} options.to - 送信先電話番号
   * @param {string} options.body - メッセージ本文
   * @param {string} options.alertId - アラートID
   */
  async sendSms({ to, body, alertId }) {
    const startTime = Date.now();
    
    if (!this.isConfigured) {
      logger.warn('Twilio not configured - returning stub SMS');
      return {
        success: true,
        messageSid: `stub_sms_${Date.now()}`,
        stub: true
      };
    }

    try {
      logger.info('Sending SMS', {
        to,
        alertId,
        provider: 'twilio',
        bodyLength: body.length
      });
      
      // Exponential backoffでリトライ
      const message = await withTwilioRetry(async () => {
        return await this.client.messages.create({
          to,
          from: this.phoneNumber,
          body,
          statusCallback: `${this.webhookUrl}/sms-status`
        });
      });

      const duration_ms = Date.now() - startTime;
      
      logger.info('SMS sent successfully', {
        messageSid: message.sid,
        to,
        alertId,
        duration_ms,
        provider: 'twilio',
        status: 'success'
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to send SMS', {
        error: error.message,
        to,
        alertId,
        duration_ms,
        provider: 'twilio',
        status: 'failed'
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 通話状態を取得
   * @param {string} callSid - 通話SID
   */
  async getCallStatus(callSid) {
    if (!this.isConfigured || callSid.startsWith('stub_')) {
      return {
        status: 'completed',
        duration: 30,
        stub: true
      };
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      
      return {
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        answeredBy: call.answeredBy
      };
    } catch (error) {
      logger.error('Failed to get call status', {
        error: error.message,
        callSid
      });

      return {
        error: error.message
      };
    }
  }

  /**
   * 利用可能な電話番号を検索（日本）
   */
  async searchAvailableNumbers(areaCode = '050') {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twilio not configured'
      };
    }

    try {
      const numbers = await this.client.availablePhoneNumbers('JP')
        .mobile
        .list({
          contains: areaCode,
          limit: 10
        });

      return {
        success: true,
        numbers: numbers.map(num => ({
          phoneNumber: num.phoneNumber,
          friendlyName: num.friendlyName,
          capabilities: num.capabilities,
          price: num.price,
          priceUnit: num.priceUnit
        }))
      };
    } catch (error) {
      logger.error('Failed to search numbers', {
        error: error.message,
        areaCode
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * アカウント残高を確認
   */
  async getAccountBalance() {
    if (!this.isConfigured) {
      return {
        balance: 'N/A',
        currency: 'JPY'
      };
    }

    try {
      const account = await this.client.balance.fetch();
      
      return {
        balance: account.balance,
        currency: account.currency
      };
    } catch (error) {
      logger.error('Failed to get balance', {
        error: error.message
      });

      return {
        balance: 'Error',
        currency: 'JPY'
      };
    }
  }
}

export const twilioService = new TwilioService();