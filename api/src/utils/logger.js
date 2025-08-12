import { createWriteStream } from 'fs';
import { join } from 'path';

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  formatLog(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
      env: process.env.NODE_ENV || 'development'
    });
  }

  log(level, message, meta) {
    if (this.levels[level] <= this.levels[this.logLevel]) {
      const logEntry = this.formatLog(level, message, meta);
      
      if (level === 'error') {
        console.error(logEntry);
      } else {
        console.log(logEntry);
      }
    }
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  audit(action, actor, target, details = {}) {
    const auditEntry = {
      type: 'audit',
      action,
      actor,
      target,
      details,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(auditEntry));
  }
}

export const logger = new Logger();