import { Household, Alert, CallLog, Notification, AuditLog } from '../models/dataModels.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

class DataStore {
  constructor() {
    this.households = new Map();
    this.alerts = new Map();
    this.callLogs = new Map();
    this.notifications = new Map();
    this.auditLogs = new Map();
    this.webhooks = [];
    this.sequences = new Map();
    
    this.initializeTestData();
  }

  initializeTestData() {
    const h1 = new Household({
      id: 'h1',
      tenantId: 't_001',
      name: '山田花子',
      phone: '+819012345678',
      addressGrid: '5339-24-XXXX',
      riskFlag: true,
      contacts: [
        { type: 'family', priority: 1, line_user_id: 'U_dummy1', phone: '+818012345678' }
      ],
      notes: '独居'
    });
    this.households.set(h1.id, h1);

    const alerts = [
      { id: 'a1', householdId: 'h1', level: '警戒', status: 'unanswered' },
      { id: 'a2', householdId: 'h2', level: '警戒', status: 'ok' },
      { id: 'a3', householdId: 'h3', level: '厳重警戒', status: 'help' }
    ];
    
    alerts.forEach(a => {
      const alert = new Alert(a);
      this.alerts.set(alert.id, alert);
    });
  }

  createHousehold(data) {
    const id = data.id || `h_${nanoid(6)}`;
    const household = new Household({ ...data, id });
    const validation = household.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.households.set(id, household);
    this.createAuditLog('CREATE_HOUSEHOLD', 'system', 'household', id, { name: household.name });
    return household;
  }

  getHousehold(id) {
    return this.households.get(id);
  }

  updateHousehold(id, updates) {
    const household = this.households.get(id);
    if (!household) return null;
    
    Object.assign(household, updates);
    household.updatedAt = new Date().toISOString();
    
    const validation = household.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.createAuditLog('UPDATE_HOUSEHOLD', 'system', 'household', id, { updates });
    return household;
  }

  deleteHousehold(id) {
    const existed = this.households.has(id);
    if (existed) {
      this.households.delete(id);
      this.createAuditLog('DELETE_HOUSEHOLD', 'system', 'household', id, {});
    }
    return existed;
  }

  searchHouseholds(query = '') {
    const results = [];
    const q = query.toLowerCase();
    
    for (const household of this.households.values()) {
      if (!query || 
          household.name?.toLowerCase().includes(q) ||
          household.phone?.includes(query) ||
          household.addressGrid?.toLowerCase().includes(q)) {
        results.push(household);
      }
    }
    
    return results;
  }

  createAlert(data) {
    const id = data.id || `a_${nanoid(6)}`;
    const alert = new Alert({ ...data, id });
    const validation = alert.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.alerts.set(id, alert);
    this.createAuditLog('CREATE_ALERT', 'system', 'alert', id, { level: alert.level });
    return alert;
  }

  getAlert(id) {
    return this.alerts.get(id);
  }

  updateAlertStatus(id, status, actor = 'system') {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    
    const oldStatus = alert.status;
    alert.status = status;
    
    if (status === 'ok' || status === 'help') {
      alert.closedAt = new Date().toISOString();
      alert.inProgress = false;
    }
    
    this.createAuditLog('UPDATE_ALERT_STATUS', actor, 'alert', id, { oldStatus, newStatus: status });
    return alert;
  }

  getTodayAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const results = [];
    
    for (const alert of this.alerts.values()) {
      if (alert.date === today) {
        results.push(alert);
      }
    }
    
    return results;
  }

  createCallLog(data) {
    const id = data.id || `c_${nanoid(8)}`;
    const callLog = new CallLog({ ...data, id });
    const validation = callLog.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.callLogs.set(id, callLog);
    return callLog;
  }

  createNotification(data) {
    const id = data.id || `n_${nanoid(8)}`;
    const notification = new Notification({ ...data, id });
    const validation = notification.validate();
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.notifications.set(id, notification);
    return notification;
  }

  createAuditLog(action, actor, targetType, targetId, details) {
    const id = `audit_${nanoid(12)}`;
    const previousHash = this.getLatestAuditHash();
    const auditData = {
      id,
      actor,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };
    
    const hashContent = JSON.stringify({ ...auditData, previousHash });
    const hash = crypto.createHash('sha256').update(hashContent).digest('hex');
    
    const auditLog = new AuditLog({ ...auditData, hashChain: hash });
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  getLatestAuditHash() {
    const logs = Array.from(this.auditLogs.values());
    if (logs.length === 0) return 'GENESIS';
    return logs[logs.length - 1].hashChain;
  }

  addWebhook(type, payload) {
    this.webhooks.push({
      type,
      payload,
      ts: Date.now()
    });
  }

  getWebhooks(type = null, limit = 20) {
    let items = this.webhooks;
    if (type) {
      items = items.filter(w => w.type === type);
    }
    return items.slice(-limit);
  }

  getAlertSummary() {
    const summary = {
      ok: 0,
      unanswered: 0,
      tired: 0,
      help: 0,
      escalated: 0,
      open: 0
    };
    
    for (const alert of this.alerts.values()) {
      if (summary.hasOwnProperty(alert.status)) {
        summary[alert.status]++;
      }
    }
    
    return summary;
  }
}

export const dataStore = new DataStore();