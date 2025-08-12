export class Household {
  constructor(data) {
    this.id = data.id;
    this.tenantId = data.tenantId;
    this.name = data.name;
    this.phone = data.phone;
    this.addressGrid = data.addressGrid || null;
    this.riskFlag = data.riskFlag || false;
    this.contacts = data.contacts || [];
    this.consentAt = data.consentAt || null;
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    if (!this.name) errors.push('Name is required');
    if (!this.phone) errors.push('Phone is required');
    if (!this.phone.match(/^\+?[0-9]{10,15}$/)) errors.push('Invalid phone format');
    
    for (const contact of this.contacts) {
      if (!contact.type || !['family', 'neighbor', 'staff'].includes(contact.type)) {
        errors.push('Invalid contact type');
      }
      if (!contact.priority || contact.priority < 1) {
        errors.push('Contact priority must be >= 1');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      phone: this.phone,
      addressGrid: this.addressGrid,
      riskFlag: this.riskFlag,
      contacts: this.contacts,
      consentAt: this.consentAt,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class Alert {
  constructor(data) {
    this.id = data.id;
    this.householdId = data.householdId;
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.level = data.level;
    this.status = data.status || 'open';
    this.firstTriggerAt = data.firstTriggerAt || new Date().toISOString();
    this.closedAt = data.closedAt || null;
    this.inProgress = data.inProgress || false;
    this.metadata = data.metadata || {};
  }

  validate() {
    const errors = [];
    const validLevels = ['注意', '警戒', '厳重警戒', '危険'];
    const validStatuses = ['open', 'ok', 'escalated', 'help', 'unanswered'];
    
    if (!this.householdId) errors.push('Household ID is required');
    if (!validLevels.includes(this.level)) errors.push('Invalid alert level');
    if (!validStatuses.includes(this.status)) errors.push('Invalid alert status');
    
    return { isValid: errors.length === 0, errors };
  }

  markAsCompleted() {
    this.status = 'ok';
    this.closedAt = new Date().toISOString();
    this.inProgress = false;
  }

  markAsInProgress() {
    this.inProgress = true;
  }

  escalate() {
    this.status = 'escalated';
  }

  toJSON() {
    return {
      id: this.id,
      householdId: this.householdId,
      date: this.date,
      level: this.level,
      status: this.status,
      firstTriggerAt: this.firstTriggerAt,
      closedAt: this.closedAt,
      inProgress: this.inProgress,
      metadata: this.metadata
    };
  }
}

export class CallLog {
  constructor(data) {
    this.id = data.id;
    this.alertId = data.alertId;
    this.householdId = data.householdId;
    this.attempt = data.attempt || 1;
    this.startedAt = data.startedAt || new Date().toISOString();
    this.durationSec = data.durationSec || 0;
    this.result = data.result || 'pending';
    this.dtmf = data.dtmf || null;
    this.recordingUrl = data.recordingUrl || null;
  }

  validate() {
    const errors = [];
    const validResults = ['ok', 'noanswer', 'busy', 'failed', 'help', 'tired', 'pending'];
    
    if (!this.alertId) errors.push('Alert ID is required');
    if (!validResults.includes(this.result)) errors.push('Invalid call result');
    if (this.dtmf && !['1', '2', '3'].includes(this.dtmf)) errors.push('Invalid DTMF input');
    
    return { isValid: errors.length === 0, errors };
  }

  toJSON() {
    return {
      id: this.id,
      alertId: this.alertId,
      householdId: this.householdId,
      attempt: this.attempt,
      startedAt: this.startedAt,
      durationSec: this.durationSec,
      result: this.result,
      dtmf: this.dtmf,
      recordingUrl: this.recordingUrl
    };
  }
}

export class Notification {
  constructor(data) {
    this.id = data.id;
    this.alertId = data.alertId;
    this.channel = data.channel;
    this.to = data.to;
    this.templateId = data.templateId || null;
    this.status = data.status || 'pending';
    this.deliveredAt = data.deliveredAt || null;
    this.content = data.content || {};
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  validate() {
    const errors = [];
    const validChannels = ['phone', 'sms', 'line'];
    const validStatuses = ['pending', 'sent', 'delivered', 'failed'];
    
    if (!this.alertId) errors.push('Alert ID is required');
    if (!validChannels.includes(this.channel)) errors.push('Invalid channel');
    if (!this.to) errors.push('Recipient is required');
    if (!validStatuses.includes(this.status)) errors.push('Invalid status');
    
    return { isValid: errors.length === 0, errors };
  }

  markAsDelivered() {
    this.status = 'delivered';
    this.deliveredAt = new Date().toISOString();
  }

  markAsFailed() {
    this.status = 'failed';
  }

  toJSON() {
    return {
      id: this.id,
      alertId: this.alertId,
      channel: this.channel,
      to: this.to,
      templateId: this.templateId,
      status: this.status,
      deliveredAt: this.deliveredAt,
      content: this.content,
      createdAt: this.createdAt
    };
  }
}

export class AuditLog {
  constructor(data) {
    this.id = data.id;
    this.actor = data.actor;
    this.role = data.role || 'system';
    this.action = data.action;
    this.targetType = data.targetType;
    this.targetId = data.targetId;
    this.details = data.details || {};
    this.timestamp = data.timestamp || new Date().toISOString();
    this.hashChain = data.hashChain || null;
  }

  toJSON() {
    return {
      id: this.id,
      actor: this.actor,
      role: this.role,
      action: this.action,
      targetType: this.targetType,
      targetId: this.targetId,
      details: this.details,
      timestamp: this.timestamp,
      hashChain: this.hashChain
    };
  }
}