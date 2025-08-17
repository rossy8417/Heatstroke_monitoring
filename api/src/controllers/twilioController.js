import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { lineService } from '../services/lineService.js';
import { twilioService } from '../services/twilioService.js';
import { getCurrentRequestId } from '../middleware/requestId.js';
import { createError, tryCatch } from '../middleware/errorHandlerUnified.js';

const { VoiceResponse } = twilio.twiml;

/**
 * IVR音声フローを生成（TwiML）
 */
export async function generateTwiML(req, res) {
  const { alertId, name = '利用者', attempt = '1' } = req.query;
  
  const twiml = new VoiceResponse();
  
  // 初回メッセージ
  const gather = twiml.gather({
    numDigits: 1,
    timeout: 10,
    action: `/webhooks/twilio/gather?alertId=${alertId}&attempt=${attempt}`,
    method: 'POST',
    language: 'ja-JP'
  });
  
  // 日本語音声ガイダンス
  const message = `
    こんにちは、${name}様。
    熱中症予防の確認です。
    本日は暑さが厳しくなっています。
    体調はいかがですか？
    
    大丈夫でしたら、1を押してください。
    少し疲れている場合は、2を押してください。
    助けが必要な場合は、3を押してください。
  `;
  
  gather.say({
    voice: 'Polly.Mizuki', // 日本語女性音声
    language: 'ja-JP'
  }, message);
  
  // タイムアウト時の処理
  twiml.say({
    voice: 'Polly.Mizuki',
    language: 'ja-JP'
  }, '入力が確認できませんでした。後ほど再度お電話いたします。');
  
  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * DTMF入力の処理
 */
export async function handleGather(req, res) {
  const { Digits, CallSid } = req.body;
  const { alertId, attempt } = req.query;
  
  logger.info('DTMF received', {
    digits: Digits,
    callSid: CallSid,
    alertId,
    attempt
  });
  
  const twiml = new VoiceResponse();
  
  // 入力に応じた処理
  switch (Digits) {
    case '1': // 大丈夫
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, 'ありがとうございます。体調に気をつけて、水分補給を忘れずにお過ごしください。');
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, 'それでは失礼いたします。');
      
      // アラートステータスを更新
      await updateAlertStatus(alertId, 'ok', { dtmf: '1' });
      break;
      
    case '2': // 疲れている
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, 'お疲れのようですね。涼しい場所で休憩し、水分と塩分を取ってください。');
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, 'ご家族にも連絡いたします。お大事になさってください。');
      
      // アラートステータスを更新、家族に通知
      await updateAlertStatus(alertId, 'tired', { dtmf: '2' });
      await notifyFamily(alertId, 'tired');
      break;
      
    case '3': // 助けが必要
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, 'すぐにご家族と近隣の方に連絡いたします。');
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, '安静にしてお待ちください。もし緊急の場合は、119番へお電話ください。');
      
      // アラートステータスを更新、緊急連絡
      await updateAlertStatus(alertId, 'help', { dtmf: '3' });
      await notifyEmergency(alertId);
      break;
      
    default:
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, '入力が確認できませんでした。');
      twiml.pause({ length: 1 });
      twiml.say({
        voice: 'Polly.Mizuki',
        language: 'ja-JP'
      }, '後ほど再度お電話させていただきます。');
      
      // 未応答として記録
      await updateAlertStatus(alertId, 'unanswered', { dtmf: Digits || 'none' });
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * 通話ステータスのコールバック処理
 */
export async function handleStatusCallback(req, res) {
  const {
    CallSid,
    CallStatus,
    CallDuration,
    From,
    To,
    Direction
  } = req.body;
  
  logger.info('Call status update', {
    callSid: CallSid,
    status: CallStatus,
    duration: CallDuration,
    from: From,
    to: To,
    direction: Direction
  });
  
  // 通話ログを保存
  if (CallStatus === 'completed') {
    const alertId = req.query.alertId || extractAlertIdFromUrl(req.body.Url);
    
    await supabaseDataStore.createCallLog({
      alert_id: alertId,
      call_id: CallSid,
      duration_sec: parseInt(CallDuration || '0'),
      result: mapCallStatus(CallStatus),
      provider: 'twilio',
      metadata: {
        from: From,
        to: To,
        direction: Direction
      }
    });
  }
  
  res.status(200).send('OK');
}

/**
 * SMS配信ステータスのコールバック処理
 */
export async function handleSmsStatusCallback(req, res) {
  const {
    MessageSid,
    MessageStatus,
    To,
    ErrorCode,
    ErrorMessage
  } = req.body;
  
  logger.info('SMS status update', {
    messageSid: MessageSid,
    status: MessageStatus,
    to: To,
    errorCode: ErrorCode,
    errorMessage: ErrorMessage
  });
  
  // 配信ステータスを更新
  if (MessageStatus === 'delivered' || MessageStatus === 'failed') {
    // 通知記録を更新
    // Note: MessageSidからnotification IDを取得する仕組みが必要
  }
  
  res.status(200).send('OK');
}

// ヘルパー関数

async function updateAlertStatus(alertId, status, metadata = {}) {
  if (!alertId) return;
  
  try {
    await supabaseDataStore.updateAlertStatus(alertId, status, 'twilio_ivr');
    logger.info('Alert status updated', { alertId, status, metadata });
  } catch (error) {
    logger.error('Failed to update alert status', { 
      alertId, 
      status, 
      error: error.message 
    });
  }
}

async function notifyFamily(alertId, reason) {
  const requestId = getCurrentRequestId();
  const startTime = Date.now();
  
  try {
    // アラート情報を取得
    const { data: alert, error } = await supabaseDataStore.getAlert(alertId);
    
    if (error || !alert) {
      logger.error('Failed to get alert for family notification', {
        alertId,
        error,
        requestId
      });
      return;
    }
    
    const household = alert.household;
    if (!household) {
      logger.error('No household found for alert', { alertId, requestId });
      return;
    }
    
    // 家族連絡先を取得（実際の実装では世帯の連絡先情報から取得）
    const familyContacts = household.contacts?.filter(c => c.type === 'family') || [];
    
    const notifications = [];
    
    // LINE通知を送信
    for (const contact of familyContacts) {
      if (contact.line_user_id) {
        const lineResult = await lineService.notifyFamily(
          alertId,
          household.name,
          reason,
          household.phone
        );
        
        notifications.push({
          type: 'line',
          recipient: contact.line_user_id,
          status: lineResult.success ? 'sent' : 'failed',
          error: lineResult.error
        });
        
        // 通知記録を保存
        await supabaseDataStore.createNotification({
          alert_id: alertId,
          type: 'family_notification',
          recipient: contact.line_user_id,
          channel: 'line',
          status: lineResult.success ? 'sent' : 'failed',
          metadata: {
            reason,
            contact_name: contact.name,
            household_name: household.name
          }
        });
      }
      
      // SMS通知も送信（電話番号がある場合）
      if (contact.phone) {
        const smsResult = await twilioService.sendSms({
          to: contact.phone,
          body: `【熱中症見守り】${household.name}さんの状態: ${reason === 'tired' ? '疲れています' : '要確認'}。確認をお願いします。`,
          alertId
        });
        
        notifications.push({
          type: 'sms',
          recipient: contact.phone,
          status: smsResult.success ? 'sent' : 'failed',
          error: smsResult.error
        });
        
        // 通知記録を保存
        await supabaseDataStore.createNotification({
          alert_id: alertId,
          type: 'family_notification',
          recipient: contact.phone,
          channel: 'sms',
          status: smsResult.success ? 'sent' : 'failed',
          metadata: {
            reason,
            contact_name: contact.name,
            household_name: household.name,
            message_sid: smsResult.messageSid
          }
        });
      }
    }
    
    const duration_ms = Date.now() - startTime;
    
    logger.info('Family notifications sent', {
      alertId,
      reason,
      notificationCount: notifications.length,
      duration_ms,
      requestId
    });
    
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    
    logger.error('Failed to send family notifications', {
      alertId,
      reason,
      error: error.message,
      duration_ms,
      requestId
    });
  }
}

async function notifyEmergency(alertId) {
  const requestId = getCurrentRequestId();
  const startTime = Date.now();
  
  try {
    // アラート情報を取得
    const { data: alert, error } = await supabaseDataStore.getAlert(alertId);
    
    if (error || !alert) {
      logger.error('Failed to get alert for emergency notification', {
        alertId,
        error,
        requestId
      });
      return;
    }
    
    const household = alert.household;
    if (!household) {
      logger.error('No household found for alert', { alertId, requestId });
      return;
    }
    
    // 緊急連絡先を取得
    const emergencyContacts = household.contacts?.filter(c => 
      c.type === 'emergency' || c.type === 'family'
    ) || [];
    
    // LINE緊急通知
    const lineResult = await lineService.notifyEmergency(
      alertId,
      household.name,
      emergencyContacts
    );
    
    // 各緊急連絡先に電話
    for (const contact of emergencyContacts) {
      if (contact.phone) {
        // 緊急電話をかける
        const callResult = await twilioService.makeCall({
          to: contact.phone,
          alertId,
          householdName: household.name,
          attempt: 1,
          isEmergency: true
        });
        
        // 通話記録を保存
        await supabaseDataStore.createCallLog({
          alert_id: alertId,
          household_id: household.id,
          call_id: callResult.callSid,
          attempt: 1,
          result: 'initiated',
          provider: 'twilio',
          metadata: {
            contact_name: contact.name,
            contact_type: contact.type,
            is_emergency: true
          }
        });
        
        // 通知記録を保存
        await supabaseDataStore.createNotification({
          alert_id: alertId,
          type: 'emergency_call',
          recipient: contact.phone,
          channel: 'voice',
          status: 'initiated',
          metadata: {
            contact_name: contact.name,
            household_name: household.name,
            call_sid: callResult.callSid
          }
        });
      }
    }
    
    // アラートステータスをエスカレート済みに更新
    await supabaseDataStore.updateAlertStatus(alertId, 'escalated', 'system');
    
    const duration_ms = Date.now() - startTime;
    
    logger.info('Emergency notifications sent', {
      alertId,
      householdName: household.name,
      contactCount: emergencyContacts.length,
      duration_ms,
      requestId
    });
    
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    
    logger.error('Failed to send emergency notifications', {
      alertId,
      error: error.message,
      duration_ms,
      requestId
    });
  }
}

function mapCallStatus(twilioStatus) {
  const statusMap = {
    'completed': 'ok',
    'no-answer': 'noanswer',
    'busy': 'busy',
    'failed': 'failed',
    'canceled': 'failed'
  };
  
  return statusMap[twilioStatus] || 'unknown';
}

function extractAlertIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/alertId=([^&]+)/);
  return match ? match[1] : null;
}