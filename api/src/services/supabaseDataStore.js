import { supabase, supabaseAdmin, handleSupabaseError } from '../db/supabase.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

class SupabaseDataStore {
  constructor() {
    this.isConnected = false;
    this.useInMemory = !supabase;
    
    // インメモリフォールバック用
    this.memoryStore = {
      households: new Map(),
      alerts: new Map(),
      callLogs: new Map(),
      notifications: new Map()
    };
  }

  async initialize() {
    if (this.useInMemory) {
      logger.warn('Using in-memory data store (Supabase not configured)');
      return false;  // falseを返してSupabase接続を試みる
    }

    try {
      const { error } = await supabase.from('households').select('count').limit(1);
      if (!error) {
        this.isConnected = true;
        logger.info('SupabaseDataStore initialized');
        return true;
      }
    } catch (err) {
      logger.error('Failed to initialize SupabaseDataStore', { error: err.message });
    }
    
    this.useInMemory = true;
    return false;
  }

  // ================== 世帯管理 ==================

  async createHousehold(data) {
    if (this.useInMemory) {
      const id = `h_${Date.now()}`;
      const household = { id, ...data, created_at: new Date().toISOString() };
      this.memoryStore.households.set(id, household);
      return { data: household, error: null };
    }

    const { data: household, error } = await supabaseAdmin
      .from('households')
      .insert([data])
      .select()
      .single();

    if (error) return { data: null, error: handleSupabaseError(error) };
    
    await this.createAuditLog('CREATE_HOUSEHOLD', 'system', 'household', household.id, { name: household.name });
    
    return { data: household, error: null };
  }

  async getHousehold(id) {
    if (this.useInMemory) {
      const household = this.memoryStore.households.get(id);
      return { data: household || null, error: household ? null : { message: 'Not found' } };
    }

    const { data, error } = await supabase
      .from('households')
      .select(`
        *,
        contacts (*)
      `)
      .eq('id', id)
      .single();

    return { data, error: handleSupabaseError(error) };
  }

  async updateHousehold(id, updates) {
    if (this.useInMemory) {
      const household = this.memoryStore.households.get(id);
      if (!household) return { data: null, error: { message: 'Not found' } };
      
      Object.assign(household, updates, { updated_at: new Date().toISOString() });
      return { data: household, error: null };
    }

    const { data, error } = await supabaseAdmin
      .from('households')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      await this.createAuditLog('UPDATE_HOUSEHOLD', 'system', 'household', id, { updates });
    }

    return { data, error: handleSupabaseError(error) };
  }

  async deleteHousehold(id) {
    if (this.useInMemory) {
      const existed = this.memoryStore.households.has(id);
      this.memoryStore.households.delete(id);
      return { data: existed, error: null };
    }

    const { error } = await supabaseAdmin
      .from('households')
      .delete()
      .eq('id', id);

    if (!error) {
      await this.createAuditLog('DELETE_HOUSEHOLD', 'system', 'household', id, {});
    }

    return { data: !error, error: handleSupabaseError(error) };
  }

  async searchHouseholds(query = '', tenantId = null) {
    if (this.useInMemory) {
      const results = [];
      const q = query.toLowerCase();
      
      for (const household of this.memoryStore.households.values()) {
        if (!query || 
            household.name?.toLowerCase().includes(q) ||
            household.phone?.includes(query) ||
            household.address_grid?.toLowerCase().includes(q)) {
          results.push(household);
        }
      }
      
      return { data: results, error: null };
    }

    let queryBuilder = supabase
      .from('households')
      .select(`
        *,
        contacts (*)
      `)
      .eq('is_active', true);

    if (tenantId) {
      queryBuilder = queryBuilder.eq('tenant_id', tenantId);
    }

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%,address_grid.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    return { data: data || [], error: handleSupabaseError(error) };
  }

  // ================== アラート管理 ==================

  async createAlert(data) {
    if (this.useInMemory) {
      const id = `a_${Date.now()}`;
      const alert = { 
        id, 
        ...data, 
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString() 
      };
      this.memoryStore.alerts.set(id, alert);
      return { data: alert, error: null };
    }

    const { data: alert, error } = await supabaseAdmin
      .from('alerts')
      .insert([data])
      .select()
      .single();

    if (error) return { data: null, error: handleSupabaseError(error) };
    
    await this.createAuditLog('CREATE_ALERT', 'system', 'alert', alert.id, { level: alert.level });
    
    return { data: alert, error: null };
  }

  async getAlert(id) {
    if (this.useInMemory) {
      const alert = this.memoryStore.alerts.get(id);
      return { data: alert || null, error: alert ? null : { message: 'Not found' } };
    }

    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        household:households(*)
      `)
      .eq('id', id)
      .single();

    return { data, error: handleSupabaseError(error) };
  }

  async updateAlert(id, updates) {
    if (this.useInMemory) {
      const alert = this.memoryStore.alerts.get(id);
      if (!alert) return { data: null, error: { message: 'Not found' } };
      
      Object.assign(alert, updates);
      return { data: alert, error: null };
    }

    const { data, error } = await supabaseAdmin
      .from('alerts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error: handleSupabaseError(error) };
  }

  async updateAlertStatus(id, status, actor = 'system') {
    if (this.useInMemory) {
      const alert = this.memoryStore.alerts.get(id);
      if (!alert) return { data: null, error: { message: 'Not found' } };
      
      const oldStatus = alert.status;
      alert.status = status;
      
      if (status === 'ok' || status === 'help') {
        alert.closed_at = new Date().toISOString();
        alert.in_progress = false;
      }
      
      return { data: alert, error: null };
    }

    const updates = { status };
    if (status === 'ok' || status === 'help') {
      updates.closed_at = new Date().toISOString();
      updates.in_progress = false;
    }

    const { data, error } = await supabaseAdmin
      .from('alerts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      await this.createAuditLog('UPDATE_ALERT_STATUS', actor, 'alert', id, { status });
    }

    return { data, error: handleSupabaseError(error) };
  }

  async getTodayAlerts(tenantId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.useInMemory) {
      const results = [];
      for (const alert of this.memoryStore.alerts.values()) {
        if (alert.date === today) {
          results.push(alert);
        }
      }
      return { data: results, error: null };
    }

    let queryBuilder = supabase
      .from('alerts')
      .select(`
        *,
        household:households(
          id,
          name,
          phone,
          address_grid,
          risk_flag
        )
      `)
      .eq('date', today);

    if (tenantId) {
      queryBuilder = queryBuilder.eq('household.tenant_id', tenantId);
    }

    const { data, error } = await queryBuilder.order('first_trigger_at', { ascending: false });

    return { data: data || [], error: handleSupabaseError(error) };
  }

  // ================== 通話ログ ==================

  async createCallLog(data) {
    if (this.useInMemory) {
      const id = `c_${Date.now()}`;
      const callLog = { id, ...data, created_at: new Date().toISOString() };
      this.memoryStore.callLogs.set(id, callLog);
      return { data: callLog, error: null };
    }

    const { data: callLog, error } = await supabaseAdmin
      .from('call_logs')
      .insert([data])
      .select()
      .single();

    return { data: callLog, error: handleSupabaseError(error) };
  }

  // ================== 通知記録 ==================

  async createNotification(data) {
    if (this.useInMemory) {
      const id = `n_${Date.now()}`;
      const notification = { id, ...data, created_at: new Date().toISOString() };
      this.memoryStore.notifications.set(id, notification);
      return { data: notification, error: null };
    }

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert([data])
      .select()
      .single();

    return { data: notification, error: handleSupabaseError(error) };
  }

  async updateNotificationStatus(id, status, deliveredAt = null) {
    if (this.useInMemory) {
      const notification = this.memoryStore.notifications.get(id);
      if (!notification) return { data: null, error: { message: 'Not found' } };
      
      notification.status = status;
      if (deliveredAt) notification.delivered_at = deliveredAt;
      
      return { data: notification, error: null };
    }

    const updates = { status };
    if (deliveredAt) updates.delivered_at = deliveredAt;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error: handleSupabaseError(error) };
  }

  // ================== 監査ログ ==================

  async createAuditLog(action, actor, targetType, targetId, details) {
    if (this.useInMemory) {
      // インメモリモードでは監査ログをスキップ
      return { data: null, error: null };
    }

    const previousHash = await this.getLatestAuditHash();
    const auditData = {
      actor,
      action,
      target_type: targetType,
      target_id: targetId,
      new_values: details
    };
    
    const hashContent = JSON.stringify({ ...auditData, previousHash });
    const hash = crypto.createHash('sha256').update(hashContent).digest('hex');
    
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{ ...auditData, hash_chain: hash }])
      .select()
      .single();

    return { data, error: handleSupabaseError(error) };
  }

  async getLatestAuditHash() {
    if (this.useInMemory) return 'GENESIS';

    const { data } = await supabase
      .from('audit_logs')
      .select('hash_chain')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.hash_chain || 'GENESIS';
  }

  // ================== 統計・サマリー ==================

  async getAlertSummary() {
    if (this.useInMemory) {
      const summary = {
        ok: 0,
        unanswered: 0,
        tired: 0,
        help: 0,
        escalated: 0,
        open: 0
      };
      
      for (const alert of this.memoryStore.alerts.values()) {
        if (summary.hasOwnProperty(alert.status)) {
          summary[alert.status]++;
        }
      }
      
      return { data: summary, error: null };
    }

    const { data, error } = await supabase
      .from('today_alerts_summary')
      .select('*')
      .single();

    if (error) {
      // ビューが存在しない場合は手動で集計
      const today = new Date().toISOString().split('T')[0];
      const { data: alerts } = await supabase
        .from('alerts')
        .select('status')
        .eq('date', today);

      const summary = {
        ok: 0,
        unanswered: 0,
        help: 0,
        escalated: 0,
        open: 0
      };

      if (alerts) {
        alerts.forEach(alert => {
          if (summary.hasOwnProperty(alert.status)) {
            summary[alert.status]++;
          }
        });
      }

      return { data: summary, error: null };
    }

    return { data, error: null };
  }
}

export const supabaseDataStore = new SupabaseDataStore();