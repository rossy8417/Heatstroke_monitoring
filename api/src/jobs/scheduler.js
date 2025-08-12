import { heatAlertJob } from './heatAlertJob.js';
import { escalationJob } from './escalationJob.js';
import { logger } from '../utils/logger.js';

/**
 * ジョブスケジューラー
 * 各種ジョブを定期実行
 */
class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.intervals = new Map();
    this.isRunning = false;
  }

  /**
   * スケジューラーを開始
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info('Starting job scheduler...');
    this.isRunning = true;

    // 熱中症アラートジョブ（1時間ごと）
    this.scheduleJob('heatAlert', heatAlertJob, 60 * 60 * 1000); // 1時間

    // エスカレーションジョブ（5分ごと）
    this.scheduleJob('escalation', escalationJob, 5 * 60 * 1000); // 5分

    // 初回実行
    this.runJob('heatAlert');

    logger.info('Job scheduler started');
  }

  /**
   * スケジューラーを停止
   */
  stop() {
    logger.info('Stopping job scheduler...');
    
    for (const [name, interval] of this.intervals.entries()) {
      clearInterval(interval);
      logger.info(`Stopped job: ${name}`);
    }
    
    this.intervals.clear();
    this.isRunning = false;
    
    logger.info('Job scheduler stopped');
  }

  /**
   * ジョブをスケジュール登録
   */
  scheduleJob(name, job, intervalMs) {
    if (this.intervals.has(name)) {
      logger.warn(`Job ${name} is already scheduled`);
      return;
    }

    this.jobs.set(name, job);
    
    const interval = setInterval(async () => {
      await this.runJob(name);
    }, intervalMs);
    
    this.intervals.set(name, interval);
    
    logger.info(`Scheduled job: ${name} (every ${intervalMs}ms)`);
  }

  /**
   * ジョブを即座に実行
   */
  async runJob(name) {
    const job = this.jobs.get(name);
    
    if (!job) {
      logger.error(`Job ${name} not found`);
      return;
    }

    try {
      logger.info(`Running job: ${name}`);
      await job.execute();
    } catch (error) {
      logger.error(`Job ${name} failed`, { error: error.message });
    }
  }

  /**
   * スケジューラーのステータスを取得
   */
  getStatus() {
    const jobStatuses = {};
    
    for (const [name, job] of this.jobs.entries()) {
      jobStatuses[name] = job.getStatus ? job.getStatus() : { running: false };
    }
    
    return {
      isRunning: this.isRunning,
      jobs: jobStatuses,
      scheduledJobs: Array.from(this.intervals.keys())
    };
  }
}

export const scheduler = new JobScheduler();

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  logger.info('Received SIGINT, stopping scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping scheduler...');
  scheduler.stop();
  process.exit(0);
});