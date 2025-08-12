import { weatherService } from '../services/weatherService.js';
import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { twilioService } from '../services/twilioService.js';
import { logger } from '../utils/logger.js';
import { judgeAlert } from '../../../jobs/src/judgeAlert.js';

/**
 * 熱中症アラート判定ジョブ
 * 1時間ごとに実行し、警戒レベル以上の地域の世帯に通知
 */
export class HeatAlertJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.notificationWindows = [9, 13, 17]; // 通知時刻（時）
  }

  /**
   * ジョブを実行
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('HeatAlertJob is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    logger.info('HeatAlertJob started');

    try {
      const hour = new Date().getHours();
      
      // 夜間（22時-7時）はスキップ
      if (hour >= 22 || hour < 7) {
        logger.info('Skipping night hours (22:00-07:00)');
        return;
      }

      // 通知時刻でない場合はスキップ
      if (!this.notificationWindows.includes(hour)) {
        logger.info(`Not notification window. Next: ${this.getNextNotificationTime()}`);
        return;
      }

      // 1. アクティブな世帯を取得
      const { data: households, error: householdError } = await supabaseDataStore.searchHouseholds();
      
      if (householdError) {
        throw new Error(`Failed to fetch households: ${householdError.message}`);
      }

      logger.info(`Processing ${households.length} households`);

      // 2. 地域ごとにグループ化
      const householdsByGrid = this.groupHouseholdsByGrid(households);

      // 3. 各地域の暑さ指標をチェック
      for (const [grid, gridHouseholds] of Object.entries(householdsByGrid)) {
        await this.processGrid(grid, gridHouseholds, hour);
      }

      // 実行時間を記録
      const duration = Date.now() - startTime;
      logger.info(`HeatAlertJob completed in ${duration}ms`);
      this.lastRun = new Date();

    } catch (error) {
      logger.error('HeatAlertJob failed', { error: error.message });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 地域メッシュごとに処理
   */
  async processGrid(grid, households, hour) {
    try {
      // 暑さ指標を取得
      const weatherData = await weatherService.getWeatherByMesh(grid);
      
      logger.info(`Grid ${grid}: WBGT=${weatherData.wbgt}, Level=${weatherData.level}`);

      // アラート判定
      const { shouldIssue, reason } = judgeAlert({ 
        level: weatherData.level, 
        hour 
      });

      if (!shouldIssue) {
        logger.info(`Grid ${grid}: No alert needed (${reason})`);
        return;
      }

      // 警戒レベル以上の場合、各世帯にアラート発行
      for (const household of households) {
        await this.issueAlertForHousehold(household, weatherData);
      }

    } catch (error) {
      logger.error(`Failed to process grid ${grid}`, { error: error.message });
    }
  }

  /**
   * 世帯ごとにアラート発行
   */
  async issueAlertForHousehold(household, weatherData) {
    try {
      // 本日のアラートが既にあるかチェック
      const today = new Date().toISOString().split('T')[0];
      const { data: existingAlerts } = await supabaseDataStore.getTodayAlerts();
      
      const existingAlert = existingAlerts?.find(a => 
        a.household_id === household.id && 
        a.date === today &&
        a.status === 'ok'
      );

      if (existingAlert) {
        logger.info(`Household ${household.name} already responded today`);
        return;
      }

      // アラート作成
      const { data: alert, error: alertError } = await supabaseDataStore.createAlert({
        household_id: household.id,
        level: weatherData.level,
        wbgt: weatherData.wbgt,
        status: 'open',
        metadata: {
          grid: household.address_grid,
          temp: weatherData.temp,
          humidity: weatherData.humidity
        }
      });

      if (alertError) {
        throw new Error(`Failed to create alert: ${alertError.message}`);
      }

      logger.info(`Alert created for ${household.name}`, { alertId: alert.id });

      // 初回の発信
      await this.makeFirstCall(household, alert);

    } catch (error) {
      logger.error(`Failed to issue alert for household ${household.id}`, { 
        error: error.message 
      });
    }
  }

  /**
   * 初回の電話発信
   */
  async makeFirstCall(household, alert) {
    try {
      const result = await twilioService.makeCall({
        to: household.phone,
        alertId: alert.id,
        householdName: household.name,
        attempt: 1
      });

      if (result.success) {
        logger.info(`Call initiated for ${household.name}`, { 
          callSid: result.callSid 
        });

        // 通話ログを記録
        await supabaseDataStore.createCallLog({
          alert_id: alert.id,
          household_id: household.id,
          call_id: result.callSid,
          attempt: 1,
          result: 'pending',
          provider: 'twilio'
        });
      } else {
        logger.error(`Failed to call ${household.name}`, { 
          error: result.error 
        });
        
        // 発信失敗時はSMS送信
        await this.sendFallbackSMS(household, alert);
      }

    } catch (error) {
      logger.error(`Failed to make call`, { error: error.message });
    }
  }

  /**
   * フォールバックSMS送信
   */
  async sendFallbackSMS(household, alert) {
    try {
      const message = `【熱中症予防】本日は暑さ指数が警戒レベルです。体調確認のお電話をさせていただきます。水分補給を忘れずに。`;
      
      const result = await twilioService.sendSms({
        to: household.phone,
        body: message,
        alertId: alert.id
      });

      if (result.success) {
        logger.info(`SMS sent to ${household.name}`);
        
        await supabaseDataStore.createNotification({
          alert_id: alert.id,
          channel: 'sms',
          recipient: household.phone,
          content: { message },
          status: 'sent'
        });
      }

    } catch (error) {
      logger.error(`Failed to send SMS`, { error: error.message });
    }
  }

  /**
   * 世帯を地域メッシュごとにグループ化
   */
  groupHouseholdsByGrid(households) {
    const groups = {};
    
    for (const household of households) {
      const grid = household.address_grid || 'default';
      if (!groups[grid]) {
        groups[grid] = [];
      }
      groups[grid].push(household);
    }
    
    return groups;
  }

  /**
   * 次の通知時刻を取得
   */
  getNextNotificationTime() {
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const hour of this.notificationWindows) {
      if (hour > currentHour) {
        return `${hour}:00`;
      }
    }
    
    // 今日の通知時刻を過ぎている場合は明日の最初の時刻
    return `明日 ${this.notificationWindows[0]}:00`;
  }

  /**
   * ジョブのステータスを取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.getNextNotificationTime(),
      notificationWindows: this.notificationWindows
    };
  }
}

export const heatAlertJob = new HeatAlertJob();