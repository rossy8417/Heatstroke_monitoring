import express from 'express';
import { lineService } from '../services/lineService.js';
import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getCurrentRequestId } from '../middleware/requestId.js';

const router = express.Router();

// LINE webhookミドルウェア
const validateLineWebhook = (req, res, next) => {
  const requestId = getCurrentRequestId() || req.requestId;
  const signature = req.headers['x-line-signature'];
  
  if (!signature) {
    logger.warn('Missing LINE signature', { requestId });
    return res.status(401).json({ error: 'Missing signature' });
  }

  const isValid = lineService.validateWebhookSignature(
    JSON.stringify(req.body),
    signature
  );

  if (!isValid) {
    logger.error('Invalid LINE signature', { requestId });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

// Webhook受信エンドポイント
router.post('/webhook', validateLineWebhook, asyncHandler(async (req, res) => {
  const requestId = getCurrentRequestId() || req.requestId;
  const startTime = Date.now();
  
  logger.info('LINE webhook received', {
    requestId,
    eventCount: req.body.events?.length || 0,
    provider: 'line_webhook'
  });

  // LINEプラットフォームに即座に200を返す
  res.status(200).json({ success: true });

  // イベント処理を非同期で実行
  if (req.body.events && req.body.events.length > 0) {
    for (const event of req.body.events) {
      try {
        await handleLineEvent(event, requestId);
      } catch (error) {
        logger.error('Failed to handle LINE event', {
          error: error.message,
          eventType: event.type,
          requestId
        });
      }
    }
  }

  const duration_ms = Date.now() - startTime;
  logger.info('LINE webhook processing completed', {
    requestId,
    duration_ms,
    provider: 'line_webhook'
  });
}));

// イベントハンドラー
async function handleLineEvent(event, requestId) {
  const { type, replyToken, source, postback, message } = event;
  
  logger.info('Processing LINE event', {
    eventType: type,
    userId: source?.userId,
    requestId
  });

  switch (type) {
    case 'postback':
      await handlePostback(event, requestId);
      break;
      
    case 'message':
      if (message?.type === 'text') {
        await handleTextMessage(event, requestId);
      }
      break;
      
    case 'follow':
      await handleFollow(event, requestId);
      break;
      
    case 'unfollow':
      await handleUnfollow(event, requestId);
      break;
      
    default:
      logger.info('Unhandled LINE event type', {
        eventType: type,
        requestId
      });
  }
}

// Postbackイベント処理（alert_idバインディング）
async function handlePostback(event, requestId) {
  const { postback, replyToken, source } = event;
  const data = new URLSearchParams(postback.data);
  const action = data.get('action');
  const alertId = data.get('alert_id');
  
  logger.info('Processing postback', {
    action,
    alertId,
    userId: source.userId,
    requestId
  });

  try {
    switch (action) {
      case 'view_detail':
        await handleViewDetail(alertId, replyToken, source.userId, requestId);
        break;
        
      case 'call':
        await handleCallRequest(alertId, replyToken, source.userId, requestId);
        break;
        
      case 'mark_resolved':
        await handleMarkResolved(alertId, replyToken, source.userId, requestId);
        break;
        
      default:
        logger.warn('Unknown postback action', {
          action,
          alertId,
          requestId
        });
    }

    // postbackイベントを通知テーブルに記録
    await recordNotificationInteraction(alertId, source.userId, action, requestId);
    
  } catch (error) {
    logger.error('Failed to handle postback', {
      error: error.message,
      action,
      alertId,
      requestId
    });

    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: 'エラーが発生しました。しばらく経ってから再度お試しください。'
    }]);
  }
}

// アラート詳細表示
async function handleViewDetail(alertId, replyToken, userId, requestId) {
  const { data: alert, error } = await supabaseDataStore.getAlert(alertId);
  
  if (error || !alert) {
    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: 'アラート情報が見つかりませんでした。'
    }]);
    return;
  }

  const messages = [{
    type: 'flex',
    altText: 'アラート詳細',
    contents: createAlertDetailFlex(alert)
  }];

  await lineService.replyMessage(replyToken, messages);
  
  logger.info('Alert detail sent', {
    alertId,
    userId,
    requestId
  });
}

// 電話リクエスト処理
async function handleCallRequest(alertId, replyToken, userId, requestId) {
  const { data: alert, error } = await supabaseDataStore.getAlert(alertId);
  
  if (error || !alert) {
    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: 'アラート情報が見つかりませんでした。'
    }]);
    return;
  }

  // 電話番号を表示（実際の発信はユーザーが手動で行う）
  const phoneNumber = alert.household?.phone || 'N/A';
  
  await lineService.replyMessage(replyToken, [{
    type: 'text',
    text: `${alert.household?.name || '対象者'}さんへの連絡先:\n${phoneNumber}\n\nタップして電話をかけてください。`
  }]);

  logger.info('Call request processed', {
    alertId,
    userId,
    phoneNumber: phoneNumber.substring(0, 7) + '****',
    requestId
  });
}

// 解決済みマーク処理
async function handleMarkResolved(alertId, replyToken, userId, requestId) {
  const { data: alert, error: getError } = await supabaseDataStore.getAlert(alertId);
  
  if (getError || !alert) {
    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: 'アラート情報が見つかりませんでした。'
    }]);
    return;
  }

  // ステータスを更新
  const { error: updateError } = await supabaseDataStore.updateAlertStatus(
    alertId,
    'ok',
    `line_user_${userId}`
  );

  if (updateError) {
    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: 'ステータスの更新に失敗しました。'
    }]);
    return;
  }

  await lineService.replyMessage(replyToken, [{
    type: 'text',
    text: `✅ ${alert.household?.name || '対象者'}さんのアラートを解決済みにしました。`
  }]);

  logger.info('Alert marked as resolved via LINE', {
    alertId,
    userId,
    requestId
  });
}

// テキストメッセージ処理
async function handleTextMessage(event, requestId) {
  const { message, replyToken, source } = event;
  const text = message.text.toLowerCase();

  if (text.includes('help') || text.includes('ヘルプ')) {
    await lineService.replyMessage(replyToken, [{
      type: 'text',
      text: '熱中症見守りシステムのヘルプ:\n\n' +
            '• アラート通知が届いたら、詳細を確認してください\n' +
            '• 必要に応じて電話で直接確認してください\n' +
            '• 問題が解決したら「解決済み」をタップしてください\n\n' +
            'お困りの場合は管理者にお問い合わせください。'
    }]);
  }
}

// フォローイベント処理
async function handleFollow(event, requestId) {
  const { replyToken, source } = event;
  
  await lineService.replyMessage(replyToken, [{
    type: 'text',
    text: '熱中症見守りシステムにご登録いただきありがとうございます。\n\n' +
          'アラートが発生した際に通知をお送りします。'
  }]);

  logger.info('New LINE follower', {
    userId: source.userId,
    requestId
  });
}

// アンフォローイベント処理
async function handleUnfollow(event, requestId) {
  const { source } = event;
  
  logger.info('LINE unfollower', {
    userId: source.userId,
    requestId
  });

  // TODO: データベースからユーザー情報を削除
}

// 通知インタラクションを記録
async function recordNotificationInteraction(alertId, userId, action, requestId) {
  try {
    const notificationData = {
      alert_id: alertId,
      type: 'line_interaction',
      recipient: userId,
      channel: 'line',
      status: 'interacted',
      metadata: {
        action,
        timestamp: new Date().toISOString()
      }
    };

    const { error } = await supabaseDataStore.createNotification(notificationData);
    
    if (error) {
      logger.error('Failed to record notification interaction', {
        error,
        alertId,
        action,
        requestId
      });
    } else {
      logger.info('Notification interaction recorded', {
        alertId,
        action,
        requestId
      });
    }
  } catch (error) {
    logger.error('Error recording notification interaction', {
      error: error.message,
      alertId,
      requestId
    });
  }
}

// アラート詳細のFlexメッセージ作成
function createAlertDetailFlex(alert) {
  const statusColors = {
    ok: '#10b981',
    tired: '#f59e0b',
    help: '#ef4444',
    unanswered: '#6b7280',
    escalated: '#dc2626'
  };

  const statusTexts = {
    ok: '元気です',
    tired: '疲れています',
    help: '助けが必要',
    unanswered: '応答なし',
    escalated: '緊急対応中'
  };

  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [{
        type: 'text',
        text: 'アラート詳細',
        color: '#ffffff',
        weight: 'bold'
      }],
      backgroundColor: statusColors[alert.status] || '#6b7280'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: alert.household?.name || '対象者',
          weight: 'bold',
          size: 'xl'
        },
        {
          type: 'separator',
          margin: 'md'
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            createDetailRow('状態', statusTexts[alert.status] || alert.status),
            createDetailRow('WBGT', `${alert.wbgt}°C`),
            createDetailRow('レベル', alert.level),
            createDetailRow('住所', alert.household?.address_grid || 'N/A'),
            createDetailRow('発生時刻', new Date(alert.first_trigger_at).toLocaleString('ja-JP'))
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
          action: {
            type: 'postback',
            label: '解決済みにする',
            data: `action=mark_resolved&alert_id=${alert.id}`
          }
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'postback',
            label: '電話をかける',
            data: `action=call&alert_id=${alert.id}`
          }
        }
      ]
    }
  };
}

// 詳細行の作成ヘルパー
function createDetailRow(label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: label,
        color: '#6b7280',
        size: 'sm',
        flex: 2
      },
      {
        type: 'text',
        text: String(value),
        size: 'sm',
        flex: 3
      }
    ]
  };
}

// テスト用エンドポイント
router.post('/test/push', asyncHandler(async (req, res) => {
  const { userId, message, alertId } = req.body;
  
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message required' });
  }

  const messages = [{
    type: 'text',
    text: message
  }];

  if (alertId) {
    // アラート関連のテストメッセージ
    const result = await lineService.notifyFamily(
      alertId,
      'テスト世帯',
      'ok',
      '080-0000-0000'
    );
    res.json(result);
  } else {
    // 通常のプッシュメッセージ
    const result = await lineService.pushMessage(userId, messages);
    res.json(result);
  }
}));

export default router;