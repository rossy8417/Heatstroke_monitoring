import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { twilioService } from '../services/twilioService.js';
import { logger } from '../utils/logger.js';

/**
 * エスカレーションジョブ
 * 未応答のアラートを検知して、家族・近隣に通知
 */
export class EscalationJob {
  constructor() {
    this.isRunning = false;
    this.escalationDelays = {
      firstRetry: 5 * 60 * 1000,    // 5分後に再発信
      familyNotify: 10 * 60 * 1000,  // 10分後に家族通知
      neighborNotify: 15 * 60 * 1000 // 15分後に近隣通知
    };
  }

  async execute() {
    if (this.isRunning) {
      logger.debug('EscalationJob is already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      // 本日の未応答アラートを取得
      const { data: alerts, error } = await supabaseDataStore.getTodayAlerts();
      
      if (error) {
        throw new Error(`Failed to fetch alerts: ${error.message}`);
      }

      const unansweredAlerts = alerts.filter(a => 
        a.status === 'unanswered' || a.status === 'open'
      );

      logger.info(`Processing ${unansweredAlerts.length} unanswered alerts`);

      for (const alert of unansweredAlerts) {
        await this.processAlert(alert);
      }

    } catch (error) {
      logger.error('EscalationJob failed', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  async processAlert(alert) {
    try {
      const elapsedTime = Date.now() - new Date(alert.first_trigger_at).getTime();
      
      // 世帯情報を取得
      const { data: household } = await supabaseDataStore.getHousehold(alert.household_id);
      
      if (!household) {
        logger.error(`Household not found: ${alert.household_id}`);
        return;
      }

      // エスカレーション段階を判定
      if (elapsedTime >= this.escalationDelays.neighborNotify && !alert.metadata?.neighborNotified) {
        // 15分経過: 近隣に通知
        await this.notifyNeighbors(household, alert);
        
      } else if (elapsedTime >= this.escalationDelays.familyNotify && !alert.metadata?.familyNotified) {
        // 10分経過: 家族に通知
        await this.notifyFamily(household, alert);
        
      } else if (elapsedTime >= this.escalationDelays.firstRetry && !alert.metadata?.secondCallMade) {
        // 5分経過: 2回目の発信
        await this.makeSecondCall(household, alert);
      }

    } catch (error) {
      logger.error(`Failed to process alert ${alert.id}`, { error: error.message });
    }
  }

  async makeSecondCall(household, alert) {
    const startedAt = Date.now();
    logger.info(`Making second call to ${household.name}`);
    
    try {
      const result = await twilioService.makeCall({
        to: household.phone,
        alertId: alert.id,
        householdName: household.name,
        attempt: 2
      });

      const duration_ms = Date.now() - startedAt;
      if (result.success) {
        // メタデータを更新
        await this.updateAlertMetadata(alert.id, { 
          secondCallMade: true,
          secondCallAt: new Date().toISOString()
        });

        // 通話ログを記録
        await supabaseDataStore.createCallLog({
          alert_id: alert.id,
          household_id: household.id,
          call_id: result.callSid,
          attempt: 2,
          result: 'pending',
          provider: 'twilio'
        });
        logger.info('Second call initiated', { alertId: alert.id, callSid: result.callSid, duration_ms, provider: 'twilio' });
      } else {
        logger.error('Second call failed', { alertId: alert.id, duration_ms, provider: 'twilio', error: result.error });
      }

      // SMS送信
      await this.sendReminderSMS(household, alert);

    } catch (error) {
      logger.error('Failed to make second call', { error: error.message });
    }
  }

  async notifyFamily(household, alert) {
    logger.info(`Notifying family for ${household.name}`);
    
    try {
      const familyContacts = household.contacts?.filter(c => c.type === 'family') || [];
      
      for (const contact of familyContacts) {
        // LINE通知
        if (contact.line_user_id) {
          await this.sendLineNotification(contact.line_user_id, {
            type: 'family_unanswered',
            householdName: household.name,
            phone: household.phone,
            alertId: alert.id
          });
        }
        
        // SMS通知
        if (contact.phone) {
          await twilioService.sendSms({
            to: contact.phone,
            body: `【緊急】${household.name}様から応答がありません。確認をお願いします。Tel: ${household.phone}`,
            alertId: alert.id
          });
        }
      }

      // メタデータを更新
      await supabaseDataStore.updateAlertMetadata(alert.id, { 
        familyNotified: true,
        familyNotifiedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to notify family', { error: error.message });
    }
  }

  async notifyNeighbors(household, alert) {
    logger.info(`Notifying neighbors for ${household.name}`);
    
    try {
      const neighborContacts = household.contacts?.filter(c => c.type === 'neighbor') || [];
      
      for (const contact of neighborContacts) {
        // LINE通知
        if (contact.line_user_id) {
          await this.sendLineNotification(contact.line_user_id, {
            type: 'neighbor_check',
            householdName: household.name,
            alertId: alert.id
          });
        }
      }

      // メタデータとステータスを更新
      await supabaseDataStore.updateAlertMetadata(alert.id, { 
        neighborNotified: true,
        neighborNotifiedAt: new Date().toISOString()
      });
      
      await supabaseDataStore.updateAlertStatus(alert.id, 'escalated');

    } catch (error) {
      logger.error('Failed to notify neighbors', { error: error.message });
    }
  }

  async sendReminderSMS(household, alert) {
    const startedAt = Date.now();
    try {
      const message = `【再通知】熱中症予防の確認です。体調はいかがですか？折り返しお電話いたします。緊急の場合は119番へ。`;
      
      const res = await twilioService.sendSms({
        to: household.phone,
        body: message,
        alertId: alert.id
      });

      await supabaseDataStore.createNotification({
        alert_id: alert.id,
        channel: 'sms',
        recipient: household.phone,
        content: { message, type: 'reminder' },
        status: 'sent'
      });
      logger.info('Reminder SMS sent', { alertId: alert.id, duration_ms: Date.now() - startedAt, provider: 'twilio', status: res?.status });

    } catch (error) {
      logger.error('Failed to send reminder SMS', { error: error.message });
    }
  }

  async sendLineNotification(lineUserId, data) {
    // TODO: LINE通知の実装
    logger.info('LINE notification would be sent', { lineUserId, data });
  }

  // updateAlertMetadata: supabaseDataStore側に実装

  getStatus() {
    return {
      isRunning: this.isRunning,
      escalationDelays: this.escalationDelays
    };
  }
}

export const escalationJob = new EscalationJob();