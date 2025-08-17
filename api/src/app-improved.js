import express from 'express';
import morgan from 'morgan';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import cors from 'cors';
import { Client as LineClient, middleware as lineMiddleware } from '@line/bot-sdk';
import { errorHandler, notFoundHandler, AppError, asyncHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { validateEnv, getConfig } from './utils/envValidator.js';
import { dataStore } from './services/dataStore.js';
import { weatherService } from './services/weatherService.js';
import apiRoutes from './routes/apiRoutes.js';
import twilioRoutes from './routes/twilioRoutes.js';
import lineRoutes from './routes/lineRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const envValidation = validateEnv();
if (envValidation.warnings.length > 0) {
  envValidation.warnings.forEach(w => logger.warn(w));
}

const config = getConfig();

import { requestIdMiddleware } from './middleware/requestId.js';

export const app = express();

// リクエストIDミドルウェアを最初に追加
app.use(requestIdMiddleware);

app.use(morgan('dev'));
app.use(cors());

const lineClient = config.line.channelAccessToken 
  ? new LineClient({ channelAccessToken: config.line.channelAccessToken }) 
  : null;

const lineWebhookMiddlewares = config.line.channelSecret 
  ? [lineMiddleware({ channelSecret: config.line.channelSecret })] 
  : [express.json()];

app.get('/webhooks/line', (req, res) => res.status(200).send('OK'));

app.post('/webhooks/line', ...lineWebhookMiddlewares, asyncHandler(async (req, res) => {
  const body = req.body || {};
  dataStore.addWebhook('line', body);
  
  try {
    const events = body.events || [];
    for (const ev of events) {
      if (ev.type === 'postback') {
        const data = typeof ev.postback?.data === 'string' 
          ? parseQuery(ev.postback.data) 
          : (ev.postback?.data || {});
        const action = data.action;
        const alertId = data.alert_id;
        
        if (action && alertId) {
          applyLineAction(action, alertId);
          logger.info('LINE postback processed', { action, alertId });
        }
        
        if (lineClient && ev.replyToken && action) {
          const ackText = action === 'take_care' 
            ? '対応中を記録しました' 
            : action === 'done' 
              ? '完了を記録しました' 
              : '受け付けました';
          void lineClient.replyMessage(ev.replyToken, { type: 'text', text: ackText });
        }
      }
    }
  } catch (error) {
    logger.error('Error processing LINE webhook', { error: error.message });
  }
  
  res.json({ ok: true });
}));

app.use(express.json());

// 実データAPI
app.use('/api', apiRoutes);

// Twilio Webhooks / IVR
app.use('/webhooks/twilio', twilioRoutes);

// LINE routes
app.use('/line', lineRoutes);

// Health check routes
app.use('/', healthRoutes);

const lineTemplates = {
  family_unanswered: ({ name, phone }) => ({
    title: `【未応答】${name}さんに2回お電話しました`,
    body: '今すぐご確認をお願いします。',
    buttons: [
      { label: '今すぐ電話', type: 'link', href: phone ? `tel:${phone}` : undefined },
      { label: '対応中', type: 'postback', data: { action: 'take_care' } },
      { label: '近隣へ依頼', type: 'postback', data: { action: 'ask_neighbor' } },
    ],
  }),
  urgent_incident: ({ name }) => ({
    title: `【至急】${name}さんが助けを求めています`,
    body: 'すぐに連絡をお願いします。迷ったら119へ。',
    buttons: [
      { label: '今すぐ電話', type: 'link', href: undefined },
      { label: '対応中', type: 'postback', data: { action: 'take_care' } },
      { label: '119/救急相談', type: 'link', href: 'tel:119' },
    ],
  }),
  in_progress: ({ name }) => ({
    title: `【対応中】${name}さんの対応を開始しました`,
    body: '完了したら記録してください。',
    buttons: [
      { label: '完了を記録', type: 'postback', data: { action: 'done' } },
    ],
  }),
};

app.get('/_stub/state', asyncHandler(async (req, res) => {
  const webhooks = dataStore.getWebhooks();
  res.json({ 
    ok: true, 
    counts: {
      households: dataStore.households.size,
      alerts: dataStore.alerts.size,
      callLogs: dataStore.callLogs.size,
      notifications: dataStore.notifications.size,
      webhooks: webhooks.length,
      sequences: dataStore.sequences.size,
    }
  });
}));

app.get('/_stub/webhooks', asyncHandler(async (req, res) => {
  const { type, limit } = req.query;
  const lim = Math.min(Number(limit ?? 20), 200);
  const items = dataStore.getWebhooks(type, lim);
  res.json({ ok: true, data: items });
}));

app.get('/_stub/line/last-user', asyncHandler(async (req, res) => {
  const webhooks = dataStore.getWebhooks('line', 100);
  for (let i = webhooks.length - 1; i >= 0; i--) {
    const w = webhooks[i];
    const events = w.payload?.events || [];
    for (const ev of events) {
      const uid = ev?.source?.userId;
      if (uid) {
        return res.json({ ok: true, userId: uid, eventType: ev.type });
      }
    }
  }
  throw new AppError('No LINE user found', 404, 'NOT_FOUND');
}));

app.get('/stub/weather', asyncHandler(async (req, res) => {
  const grid = req.query.grid || '5339-24-XXXX';
  
  // 実際の気象データを取得（気象庁アメダス）
  if (req.query.real === 'true') {
    try {
      const weatherData = await weatherService.getWeatherByMesh(grid);
      logger.info('Real weather data fetched', { grid, wbgt: weatherData.wbgt, level: weatherData.level });
      return res.json(weatherData);
    } catch (error) {
      logger.error('Failed to fetch real weather', { error: error.message });
      // フォールバックとしてスタブデータを返す
    }
  }
  
  // スタブデータ（テスト用）
  res.json({ level: '警戒', wbgt: 29.2, grid });
}));

app.get('/weather/stations', asyncHandler(async (req, res) => {
  const stations = await weatherService.getStations();
  res.json({ ok: true, count: Object.keys(stations).length, stations });
}));

app.get('/weather/nearest', asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  
  if (isNaN(lat) || isNaN(lon)) {
    throw new AppError('Invalid latitude or longitude', 400, 'INVALID_PARAMS');
  }
  
  const station = await weatherService.findNearestStation(lat, lon);
  const weatherData = await weatherService.getLatestData(station.id);
  
  const temp = weatherData.temp?.[0];
  const humidity = weatherData.humidity?.[0];
  const wbgt = temp && humidity ? weatherService.calculateWBGT(temp, humidity) : null;
  const level = wbgt ? weatherService.getAlertLevel(wbgt) : null;
  
  res.json({
    ok: true,
    station,
    weather: weatherData,
    wbgt,
    level
  });
}));

app.get('/stub/alerts/today', asyncHandler(async (req, res) => {
  const alerts = dataStore.getTodayAlerts();
  const summary = dataStore.getAlertSummary();
  res.json({ ok: true, data: alerts.map(a => a.toJSON()), summary });
}));

app.post('/stub/alerts/reset', asyncHandler(async (req, res) => {
  dataStore.alerts.clear();
  dataStore.createAlert({ id: 'a1', householdId: 'h1', level: '警戒', status: 'unanswered' });
  dataStore.createAlert({ id: 'a2', householdId: 'h2', level: '警戒', status: 'ok' });
  dataStore.createAlert({ id: 'a3', householdId: 'h3', level: '厳重警戒', status: 'help' });
  
  logger.info('Alerts reset to default state');
  res.json({ ok: true });
}));

app.post('/stub/call', asyncHandler(async (req, res) => {
  const callId = `c_${nanoid(8)}`;
  const alertId = req.body?.alert_id || `a_${nanoid(6)}`;
  const dtmf = req.body?.force_dtmf;
  const duration = Math.floor(Math.random() * 50) + 10;
  
  dataStore.createCallLog({
    id: callId,
    alertId,
    householdId: req.body?.household_id,
    result: 'pending'
  });
  
  res.json({ ok: true, call_id: callId, alert_id: alertId });
  
  setTimeout(() => {
    const payload = {
      call_id: callId,
      alert_id: alertId,
      status: 'completed',
      dtmf: dtmf ?? ['1','2','3','noanswer'][Math.floor(Math.random()*4)],
      duration_sec: duration,
    };
    dataStore.addWebhook('voice', payload);
    logger.info('Call completed', { callId, alertId, dtmf: payload.dtmf });
  }, 300);
}));

app.post('/stub/line', asyncHandler(async (req, res) => {
  const id = `l_${nanoid(8)}`;
  const notification = dataStore.createNotification({
    id,
    alertId: req.body?.alert_id || 'unknown',
    channel: 'line',
    to: req.body?.to || req.body?.to_line_user_id || 'unknown',
    content: req.body
  });
  
  res.json({ ok: true, push_id: id });
}));

app.post('/stub/line/push', asyncHandler(async (req, res) => {
  const id = `l_${nanoid(8)}`;
  const { to, to_line_user_id, template_id } = req.body || {};
  const baseParams = (req.body && req.body.params) || {};
  const providedAlertId = req.body?.alert_id || baseParams.alert_id;
  const params = providedAlertId ? { ...baseParams, alert_id: providedAlertId } : baseParams;
  
  const render = lineTemplates[template_id];
  if (!render) {
    throw new AppError('Unknown template', 400, 'UNKNOWN_TEMPLATE');
  }
  
  const message = render(params);
  const recipient = to || to_line_user_id;
  
  const notification = dataStore.createNotification({
    id,
    alertId: providedAlertId || 'unknown',
    channel: 'line',
    to: recipient,
    templateId: template_id,
    content: { message, params }
  });
  
  try {
    if (lineClient && recipient) {
      const lineMessage = buildLineMessage(template_id, params);
      await lineClient.pushMessage(recipient, lineMessage);
      notification.markAsDelivered();
      logger.info('LINE message sent', { id, to: recipient, template: template_id });
      return res.json({ ok: true, push_id: id, message, delivered: true });
    }
    return res.json({ ok: true, push_id: id, message, delivered: false });
  } catch (error) {
    notification.markAsFailed();
    logger.error('LINE push failed', { error: error.message, to: recipient });
    throw new AppError('LINE push failed', 502, 'LINE_PUSH_FAILED');
  }
}));

app.post('/stub/sms', asyncHandler(async (req, res) => {
  const id = `s_${nanoid(8)}`;
  const to = req.body?.to || 'unknown';
  const reason = req.body?.reason || 'unanswered_1';
  
  const notification = dataStore.createNotification({
    id,
    alertId: req.body?.alert_id || 'unknown',
    channel: 'sms',
    to,
    content: { reason, body: req.body }
  });
  
  res.json({ ok: true, sms_id: id });
}));

app.get('/stub/households', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const households = dataStore.searchHouseholds(q);
  res.json({ ok: true, data: households.map(h => h.toJSON()) });
}));

app.post('/stub/households', asyncHandler(async (req, res) => {
  const household = dataStore.createHousehold(req.body);
  logger.info('Household created', { id: household.id, name: household.name });
  res.status(201).json({ ok: true, id: household.id, household: household.toJSON() });
}));

app.put('/stub/households/:id', asyncHandler(async (req, res) => {
  const household = dataStore.updateHousehold(req.params.id, req.body);
  if (!household) {
    throw new AppError('Household not found', 404, 'NOT_FOUND');
  }
  logger.info('Household updated', { id: household.id });
  res.json({ ok: true, household: household.toJSON() });
}));

app.delete('/stub/households/:id', asyncHandler(async (req, res) => {
  const deleted = dataStore.deleteHousehold(req.params.id);
  if (!deleted) {
    throw new AppError('Household not found', 404, 'NOT_FOUND');
  }
  logger.info('Household deleted', { id: req.params.id });
  res.json({ ok: true });
}));

app.post('/webhooks/voice', verifySignatureOptional, asyncHandler(async (req, res) => {
  dataStore.addWebhook('voice', req.body);
  logger.info('Voice webhook received', { payload: req.body });
  res.json({ ok: true });
}));

app.post('/webhooks/sms', verifySignatureOptional, asyncHandler(async (req, res) => {
  dataStore.addWebhook('sms', req.body);
  logger.info('SMS webhook received', { payload: req.body });
  res.json({ ok: true });
}));

app.post('/stub/line/postback', asyncHandler(async (req, res) => {
  const { action, alert_id } = req.body || {};
  const alert = dataStore.getAlert(alert_id);
  
  if (!alert) {
    throw new AppError('Alert not found', 404, 'ALERT_NOT_FOUND');
  }
  
  if (action === 'take_care') {
    alert.markAsInProgress();
  } else if (action === 'done') {
    alert.markAsCompleted();
  }
  
  dataStore.addWebhook('line_postback', { action, alert_id });
  logger.info('LINE postback processed', { action, alertId: alert_id });
  
  const summary = dataStore.getAlertSummary();
  res.json({ ok: true, alert: alert.toJSON(), summary });
}));

app.post('/stub/sequence/start', asyncHandler(async (req, res) => {
  const alertId = req.body?.alert_id || `a_${nanoid(6)}`;
  const householdId = req.body?.household_id || `h_${nanoid(6)}`;
  const delayMs = Number(req.body?.delay_ms ?? 300000);
  const finalDtmf = req.body?.final_dtmf;
  const seqId = `seq_${nanoid(8)}`;
  const now = Date.now();
  
  const sequence = {
    id: seqId,
    alertId,
    householdId,
    status: 'running',
    steps: [],
    createdAt: now,
  };
  
  dataStore.sequences.set(seqId, sequence);
  
  const call1 = dataStore.createCallLog({
    alertId,
    householdId,
    attempt: 1,
    result: 'noanswer'
  });
  sequence.steps.push({ type: 'call', attempt: 1, result: 'noanswer', callId: call1.id, ts: now });
  
  const sms = dataStore.createNotification({
    alertId,
    channel: 'sms',
    to: householdId,
    content: { reason: 'unanswered_1' }
  });
  sequence.steps.push({ type: 'sms', smsId: sms.id, ts: Date.now() });
  
  setTimeout(() => {
    const outcome = finalDtmf ?? 'noanswer';
    const call2 = dataStore.createCallLog({
      alertId,
      householdId,
      attempt: 2,
      result: outcome
    });
    sequence.steps.push({ type: 'call', attempt: 2, result: outcome, callId: call2.id, ts: Date.now() });
    sequence.status = 'done';
    logger.info('Sequence completed', { seqId, outcome });
  }, Math.max(0, delayMs));
  
  res.json({ ok: true, sequence_id: seqId });
}));

app.get('/_stub/sequence/:id', asyncHandler(async (req, res) => {
  const seq = dataStore.sequences.get(req.params.id);
  if (!seq) {
    throw new AppError('Sequence not found', 404, 'NOT_FOUND');
  }
  res.json({ ok: true, sequence: seq });
}));

function verifySignatureOptional(req, res, next) {
  const secret = config.webhookSecret;
  if (!secret) return next();
  
  const sig = req.get('X-Signature');
  if (!sig) {
    throw new AppError('Missing signature', 401, 'MISSING_SIGNATURE');
  }
  
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  
  if (!sig.endsWith(hmac)) {
    throw new AppError('Invalid signature', 401, 'INVALID_SIGNATURE');
  }
  
  next();
}

function buildLineMessage(templateId, params) {
  const tmpl = lineTemplates[templateId]?.(params) || { title: '通知', body: '' };
  const items = (tmpl.buttons || []).map((b) => {
    if (b.type === 'postback') {
      return {
        type: 'action',
        action: {
          type: 'postback',
          label: b.label,
          data: new URLSearchParams({ ...(b.data || {}), alert_id: params.alert_id || '' }).toString(),
        },
      };
    }
    return { type: 'action', action: { type: 'uri', label: b.label, uri: b.href || 'https://line.me' } };
  });
  
  return {
    type: 'text',
    text: `${tmpl.title}\n${tmpl.body}`.slice(0, 1000),
    quickReply: items.length ? { items } : undefined,
  };
}

function applyLineAction(action, alertId) {
  const alert = dataStore.getAlert(alertId);
  if (!alert) return;
  
  if (action === 'take_care') {
    alert.markAsInProgress();
    dataStore.updateAlertStatus(alertId, alert.status, 'line_user');
  } else if (action === 'done') {
    alert.markAsCompleted();
    dataStore.updateAlertStatus(alertId, 'ok', 'line_user');
  }
}

function parseQuery(qs) {
  const out = {};
  for (const [k, v] of new URLSearchParams(qs)) out[k] = v;
  return out;
}

app.use(notFoundHandler);
app.use(errorHandler);