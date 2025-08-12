import express from 'express';
import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { weatherService } from '../services/weatherService.js';
import { twilioService } from '../services/twilioService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// データストアの初期化
supabaseDataStore.initialize().catch(err => {
  logger.error('Failed to initialize data store', { error: err.message });
});

// ================== 世帯管理 ==================

// 世帯検索・一覧
router.get('/households', async (req, res) => {
  try {
    const { q } = req.query;
    // テナントIDを一時的に無効化（デバッグ用）
    const { data, error } = await supabaseDataStore.searchHouseholds(q);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ data });
  } catch (error) {
    logger.error('Failed to search households', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 世帯詳細
router.get('/households/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseDataStore.getHousehold(req.params.id);
    
    if (error) {
      return res.status(404).json({ error: 'Household not found' });
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Failed to get household', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 世帯作成
router.post('/households', async (req, res) => {
  try {
    const { data, error } = await supabaseDataStore.createHousehold(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json(data);
  } catch (error) {
    logger.error('Failed to create household', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 世帯更新
router.put('/households/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseDataStore.updateHousehold(req.params.id, req.body);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Failed to update household', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 世帯削除
router.delete('/households/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseDataStore.deleteHousehold(req.params.id);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete household', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== アラート管理 ==================

// 本日のアラート一覧
router.get('/alerts/today', async (req, res) => {
  try {
    // テナントIDを一時的に無効化（デバッグ用）
    const { data, error } = await supabaseDataStore.getTodayAlerts();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // サマリーも取得
    const { data: summary } = await supabaseDataStore.getAlertSummary();
    
    // サマリーのキー名を変換（_countを削除）
    const formattedSummary = summary ? {
      ok: summary.ok_count || summary.ok || 0,
      unanswered: summary.unanswered_count || summary.unanswered || 0,
      tired: summary.tired_count || summary.tired || 0,
      help: summary.help_count || summary.help || 0,
      escalated: summary.escalated_count || summary.escalated || 0,
      open: summary.in_progress_count || summary.open || 0
    } : { ok: 0, unanswered: 0, tired: 0, help: 0, escalated: 0, open: 0 };
    
    res.json({ 
      data: data || [],
      summary: formattedSummary
    });
  } catch (error) {
    logger.error('Failed to get today alerts', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// アラートサマリー
router.get('/alerts/summary', async (req, res) => {
  try {
    const { data, error } = await supabaseDataStore.getAlertSummary();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // サマリーのキー名を変換（_countを削除）
    const formattedSummary = data ? {
      ok: data.ok_count || data.ok || 0,
      unanswered: data.unanswered_count || data.unanswered || 0,
      tired: data.tired_count || data.tired || 0,
      help: data.help_count || data.help || 0,
      escalated: data.escalated_count || data.escalated || 0,
      open: data.in_progress_count || data.open || 0
    } : { ok: 0, unanswered: 0, tired: 0, help: 0, escalated: 0, open: 0 };
    
    res.json(formattedSummary);
  } catch (error) {
    logger.error('Failed to get alert summary', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// アラートステータス更新
router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    // in_progressの場合は、フラグを立てるだけでstatusは変更しない
    if (status === 'in_progress') {
      const { data: alert } = await supabaseDataStore.getAlert(req.params.id);
      if (alert) {
        // in_progressフラグを更新
        const { data, error } = await supabaseDataStore.updateAlert(req.params.id, { 
          in_progress: true 
        });
        if (error) {
          return res.status(400).json({ error: error.message });
        }
        return res.json(data);
      }
    }
    
    // 通常のステータス更新
    const { data, error } = await supabaseDataStore.updateAlertStatus(req.params.id, status);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    logger.error('Failed to update alert status', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// アラート再試行（電話再発信）
router.post('/alerts/retry', async (req, res) => {
  try {
    const { alert_id } = req.body;
    
    // アラート情報を取得
    const { data: alert, error: alertError } = await supabaseDataStore.getAlert(alert_id);
    
    if (alertError || !alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    // 電話を発信
    const result = await twilioService.makeCall({
      to: alert.household.phone,
      alertId: alert.id,
      householdName: alert.household.name,
      attempt: 2 // 再試行
    });
    
    if (result.success) {
      // 通話ログを記録
      await supabaseDataStore.createCallLog({
        alert_id: alert.id,
        household_id: alert.household_id,
        call_id: result.callSid,
        attempt: 2,
        result: 'pending',
        provider: 'twilio'
      });
      
      res.json({ success: true, callSid: result.callSid });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Failed to retry alert', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== 気象情報 ==================

// 現在の気象情報
router.get('/weather', async (req, res) => {
  try {
    const { grid } = req.query;
    const weatherData = await weatherService.getWeatherByMesh(grid || '5339-24');
    
    res.json(weatherData);
  } catch (error) {
    logger.error('Failed to get weather', { error: error.message });
    
    // フォールバック値を返す
    res.json({
      temp: 30,
      humidity: 65,
      wbgt: 28,
      level: '警戒',
      stationName: 'データ取得失敗'
    });
  }
});

// ================== 統計・レポート ==================

// 月次統計
router.get('/reports/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    // TODO: 実装
    res.json({
      totalAlerts: 0,
      responseRate: 0,
      averageResponseTime: 0,
      byStatus: {}
    });
  } catch (error) {
    logger.error('Failed to get monthly report', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;