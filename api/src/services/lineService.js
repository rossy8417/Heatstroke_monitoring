import { Client } from '@line/bot-sdk';
import { logger } from '../utils/logger.js';
import { getCurrentRequestId } from '../middleware/requestId.js';

class LineService {
  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    this.channelSecret = process.env.LINE_CHANNEL_SECRET;
    this.isConfigured = false;
    
    if (this.channelAccessToken && this.channelSecret) {
      this.client = new Client({
        channelAccessToken: this.channelAccessToken,
        channelSecret: this.channelSecret
      });
      this.isConfigured = true;
      logger.info('LINE service initialized');
    } else {
      logger.warn('LINE not configured - using stub mode');
    }
  }

  /**
   * プッシュメッセージを送信
   */
  async pushMessage(userId, messages) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured) {
      logger.warn('LINE not configured - returning stub', { requestId });
      return {
        success: true,
        messageId: `stub_msg_${Date.now()}`,
        stub: true
      };
    }

    try {
      logger.info('Sending LINE push message', {
        userId,
        messageCount: messages.length,
        requestId,
        provider: 'line'
      });

      const result = await this.client.pushMessage(userId, messages);

      const duration_ms = Date.now() - startTime;
      
      logger.info('LINE message sent successfully', {
        userId,
        duration_ms,
        provider: 'line',
        status: 'success',
        requestId
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to send LINE message', {
        error: error.message,
        userId,
        duration_ms,
        provider: 'line',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 家族通知用のメッセージを作成・送信
   */
  async notifyFamily(alertId, householdName, status, phoneNumber) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    const messages = [
      {
        type: 'flex',
        altText: `【熱中症見守り】${householdName}さんの状態確認`,
        contents: this.createFamilyNotificationFlex(alertId, householdName, status)
      }
    ];

    // TODO: ユーザーIDをデータベースから取得
    const userId = 'dummy_user_id';

    try {
      const result = await this.pushMessage(userId, messages);
      
      const duration_ms = Date.now() - startTime;
      
      logger.info('Family notification sent', {
        alertId,
        householdName,
        status,
        duration_ms,
        provider: 'line',
        requestId
      });

      return result;
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to send family notification', {
        error: error.message,
        alertId,
        duration_ms,
        provider: 'line',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 緊急連絡先への通知
   */
  async notifyEmergency(alertId, householdName, emergencyContacts) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    const messages = [
      {
        type: 'text',
        text: `【緊急】${householdName}さんが熱中症の危険があります。\n\n` +
              `応答がなく、至急確認が必要です。\n` +
              `緊急連絡先への連絡を開始しました。`
      }
    ];

    const results = [];
    
    for (const contact of emergencyContacts) {
      try {
        // TODO: 連絡先のLINE IDをデータベースから取得
        const userId = contact.lineUserId || 'dummy_user_id';
        
        const result = await this.pushMessage(userId, messages);
        results.push({
          contact: contact.name,
          success: result.success
        });
      } catch (error) {
        results.push({
          contact: contact.name,
          success: false,
          error: error.message
        });
      }
    }

    const duration_ms = Date.now() - startTime;
    
    logger.info('Emergency notifications sent', {
      alertId,
      householdName,
      contactCount: emergencyContacts.length,
      results,
      duration_ms,
      provider: 'line',
      requestId
    });

    return {
      success: results.some(r => r.success),
      results
    };
  }

  /**
   * 家族通知用のFlexメッセージを作成
   */
  createFamilyNotificationFlex(alertId, householdName, status) {
    const statusColor = status === 'ok' ? '#10b981' : 
                        status === 'tired' ? '#f59e0b' : '#ef4444';
    const statusText = status === 'ok' ? '元気です' :
                       status === 'tired' ? '少し疲れています' : '応答がありません';

    return {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '熱中症見守りシステム',
            weight: 'bold',
            size: 'sm',
            color: '#6b7280'
          },
          {
            type: 'text',
            text: `${householdName}さんの状態`,
            weight: 'bold',
            size: 'xl',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '状態',
                    color: '#6b7280',
                    size: 'sm',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: statusText,
                    color: statusColor,
                    size: 'sm',
                    flex: 2,
                    weight: 'bold'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '確認時刻',
                    color: '#6b7280',
                    size: 'sm',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: new Date().toLocaleTimeString('ja-JP'),
                    size: 'sm',
                    flex: 2
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '詳細を確認',
              data: `action=view_detail&alert_id=${alertId}`
            }
          },
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'postback',
              label: '電話をかける',
              data: `action=call&alert_id=${alertId}`
            }
          }
        ]
      }
    };
  }

  /**
   * Webhook署名を検証
   */
  validateWebhookSignature(body, signature) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured) {
      logger.warn('LINE webhook verification skipped', { requestId });
      return true;
    }

    try {
      const crypto = require('crypto');
      const channelSecret = this.channelSecret;
      const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(body)
        .digest('base64');

      const isValid = hash === signature;

      const duration_ms = Date.now() - startTime;
      
      logger.info('LINE webhook signature validation', {
        isValid,
        duration_ms,
        provider: 'line',
        requestId
      });

      return isValid;
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to validate LINE webhook signature', {
        error: error.message,
        duration_ms,
        provider: 'line',
        requestId
      });

      return false;
    }
  }

  /**
   * リプライメッセージを送信
   */
  async replyMessage(replyToken, messages) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured) {
      logger.warn('LINE not configured - returning stub', { requestId });
      return {
        success: true,
        stub: true
      };
    }

    try {
      const result = await this.client.replyMessage(replyToken, messages);

      const duration_ms = Date.now() - startTime;
      
      logger.info('LINE reply sent', {
        duration_ms,
        provider: 'line',
        status: 'success',
        requestId
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to send LINE reply', {
        error: error.message,
        duration_ms,
        provider: 'line',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const lineService = new LineService();