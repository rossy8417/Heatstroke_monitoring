import express from 'express';
import morgan from 'morgan';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import cors from 'cors';
import { Client as LineClient, middleware as lineMiddleware } from '@line/bot-sdk';
import apiRoutes from './routes/apiRoutes.js';

export const app = express();
app.use(morgan('dev'));
app.use(cors());

// Optional LINE client (only if access token provided)
const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const lineClient = lineAccessToken ? new LineClient({ channelAccessToken: lineAccessToken }) : null;

// Define LINE webhook BEFORE json parser to avoid 400 on verification
const configuredLineSecret = process.env.LINE_CHANNEL_SECRET;
const lineWebhookMiddlewares = configuredLineSecret ? [lineMiddleware({ channelSecret: configuredLineSecret })] : [express.json()];
app.get('/webhooks/line', (req, res) => res.status(200).send('OK'));
app.post('/webhooks/line', ...lineWebhookMiddlewares, (req, res) => {
  const body = req.body || {};
  state.webhooks.push({ type: 'line', payload: body, ts: Date.now() });
  try {
    const events = body.events || [];
    for (const ev of events) {
      if (ev.type === 'postback') {
        const data = typeof ev.postback?.data === 'string' ? parseQuery(ev.postback.data) : (ev.postback?.data || {});
        const action = data.action;
        const alertId = data.alert_id;
        if (action && alertId) applyLineAction(action, alertId);
        // Fire-and-forget ACK to user for better UX
        try {
          if (lineClient && ev.replyToken && action) {
            const ackText = action === 'take_care' ? '対応中を記録しました' : action === 'done' ? '完了を記録しました' : '受け付けました';
            // Do not await inside webhook; avoid delaying 200 response
            void lineClient.replyMessage(ev.replyToken, { type: 'text', text: ackText });
          }
        } catch {}
      }
    }
  } catch {}
  res.json({ ok: true });
});

// JSON parser for other routes (must come after LINE webhook route)
app.use(express.json());

// In-memory stub state
export const state = {
  calls: [],
  sms: [],
  linePushes: [],
  webhooks: [],
  sequences: {},
  households: [
    {
      id: 'h1',
      name: '山田花子',
      phone: '+819012345678',
      address_grid: '5339-24-XXXX',
      risk_flag: true,
      contacts: [
        { type: 'family', priority: 1, line_user_id: 'U_dummy1', phone: '+818012345678' },
      ],
      consent_at: null,
      notes: '独居',
    },
  ],
  alerts: [
    { id: 'a1', household: '山田花子（5339-24）', status: 'unanswered', minutes: 8, inProgress: false },
    { id: 'a2', household: '佐藤太郎（5339-25）', status: 'ok', minutes: 3, inProgress: false },
    { id: 'a3', household: '鈴木一郎（5339-24）', status: 'help', minutes: 1, inProgress: false },
  ],
};

// Simple LINE message templates
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

// Health
app.get('/_stub/state', (req, res) => {
  res.json({ ok: true, counts: {
    calls: state.calls.length,
    sms: state.sms.length,
    linePushes: state.linePushes.length,
    webhooks: state.webhooks.length,
    sequences: Object.keys(state.sequences).length,
  }});
});

// List recent webhooks (for debugging)
app.get('/_stub/webhooks', (req, res) => {
  const { type, limit } = req.query;
  let items = state.webhooks;
  if (type) items = items.filter(w => w.type === String(type));
  const lim = Math.min(Number(limit ?? 20), 200);
  res.json({ ok: true, data: items.slice(-lim) });
});

// Get last LINE userId seen in webhook events
app.get('/_stub/line/last-user', (req, res) => {
  for (let i = state.webhooks.length - 1; i >= 0; i--) {
    const w = state.webhooks[i];
    if (w.type !== 'line') continue;
    const events = w.payload?.events || [];
    for (const ev of events) {
      const uid = ev?.source?.userId;
      if (uid) return res.json({ ok: true, userId: uid, eventType: ev.type });
    }
  }
  res.status(404).json({ error: 'not_found' });
});

// Weather stub
app.get('/stub/weather', (req, res) => {
  const grid = req.query.grid || '5339-24-XXXX';
  res.json({ level: '警戒', wbgt: 29.2, grid });
});

// Alerts list stub for Admin UI
app.get('/stub/alerts/today', (req, res) => {
  const list = state.alerts;
  const summary = computeSummary(list);
  res.json({ ok: true, data: list, summary });
});

app.post('/stub/alerts/reset', (req, res) => {
  state.alerts = [
    { id: 'a1', household: '山田花子（5339-24）', status: 'unanswered', minutes: 8, inProgress: false },
    { id: 'a2', household: '佐藤太郎（5339-25）', status: 'ok', minutes: 3, inProgress: false },
    { id: 'a3', household: '鈴木一郎（5339-24）', status: 'help', minutes: 1, inProgress: false },
  ];
  res.json({ ok: true });
});

// Call stub: simulate async completion posting to /webhooks/voice
app.post('/stub/call', async (req, res) => {
  const callId = `c_${nanoid(8)}`;
  const alertId = req.body?.alert_id || `a_${nanoid(6)}`;
  const dtmf = req.body?.force_dtmf; // optional forced outcome
  const duration = Math.floor(Math.random() * 50) + 10;
  state.calls.push({ callId, alertId, requestedAt: new Date().toISOString() });
  res.json({ ok: true, call_id: callId, alert_id: alertId });
  // simulate provider callback (push into state)
  setTimeout(() => {
    const payload = {
      call_id: callId,
      alert_id: alertId,
      status: 'completed',
      dtmf: dtmf ?? ['1','2','3','noanswer'][Math.floor(Math.random()*4)],
      duration_sec: duration,
    };
    state.webhooks.push({ type: 'voice', payload, ts: Date.now() });
  }, 300);
});

// LINE push stub
app.post('/stub/line', (req, res) => {
  const id = `l_${nanoid(8)}`;
  state.linePushes.push({ id, body: req.body, ts: Date.now() });
  res.json({ ok: true, push_id: id });
});

// LINE push with template (uses real push when LINE access token is configured)
app.post('/stub/line/push', async (req, res) => {
  const id = `l_${nanoid(8)}`;
  const { to, to_line_user_id, template_id } = req.body || {};
  const baseParams = (req.body && req.body.params) || {};
  const providedAlertId = req.body?.alert_id || baseParams.alert_id;
  const params = providedAlertId ? { ...baseParams, alert_id: providedAlertId } : baseParams;
  const render = lineTemplates[template_id];
  if (!render) return res.status(400).json({ error: 'unknown_template' });
  const message = render(params);
  const record = { id, to: to || to_line_user_id, template_id, message, params, ts: Date.now() };
  state.linePushes.push(record);
  try {
    if (lineClient && (to || to_line_user_id)) {
      const lineMessage = buildLineMessage(template_id, params);
      await lineClient.pushMessage(to || to_line_user_id, lineMessage);
      return res.json({ ok: true, push_id: id, message, delivered: true, note: providedAlertId ? undefined : 'warning: alert_id not provided; postback may not update server state' });
    }
    // スタブモード（LINE未設定時）は常に成功を返す
    return res.json({ ok: true, push_id: id, message, delivered: false, stub_mode: true, note: 'LINE未設定のためスタブモードで動作' });
  } catch (e) {
    console.error('LINE push error:', e);
    // スタブモードでは502エラーを返さずに警告付きで成功を返す
    return res.json({ ok: true, push_id: id, message, delivered: false, error: 'line_push_failed', detail: String(e?.message || e), stub_mode: true });
  }
});

// SMS stub
app.post('/stub/sms', (req, res) => {
  const id = `s_${nanoid(8)}`;
  const to = req.body?.to || 'unknown';
  const reason = req.body?.reason || 'unanswered_1';
  state.sms.push({ id, to, reason, body: req.body, ts: Date.now() });
  res.json({ ok: true, sms_id: id });
});

// Households CRUD (stub)
app.get('/stub/households', (req, res) => {
  const q = String(req.query.q || '').trim();
  let list = state.households;
  if (q) {
    const ql = q.toLowerCase();
    list = list.filter((h) =>
      h.name?.toLowerCase().includes(ql) || h.phone?.includes(q) || h.address_grid?.toLowerCase().includes(ql)
    );
  }
  res.json({ ok: true, data: list });
});

app.post('/stub/households', (req, res) => {
  const body = req.body || {};
  const errors = [];
  if (!body.name) errors.push('name is required');
  if (!body.phone) errors.push('phone is required');
  if (errors.length) return res.status(400).json({ error: 'validation', details: errors });
  const id = `h_${nanoid(6)}`;
  const record = {
    id,
    name: String(body.name),
    phone: String(body.phone),
    address_grid: body.address_grid ? String(body.address_grid) : null,
    risk_flag: Boolean(body.risk_flag),
    contacts: Array.isArray(body.contacts) ? body.contacts : [],
    consent_at: body.consent_at || null,
    notes: body.notes ? String(body.notes) : '',
  };
  state.households.push(record);
  res.status(201).json({ ok: true, id, household: record });
});

app.put('/stub/households/:id', (req, res) => {
  const target = state.households.find((h) => h.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'not_found' });
  const b = req.body || {};
  if (b.name !== undefined) target.name = String(b.name);
  if (b.phone !== undefined) target.phone = String(b.phone);
  if (b.address_grid !== undefined) target.address_grid = b.address_grid ? String(b.address_grid) : null;
  if (b.risk_flag !== undefined) target.risk_flag = Boolean(b.risk_flag);
  if (b.contacts !== undefined) target.contacts = Array.isArray(b.contacts) ? b.contacts : target.contacts;
  if (b.consent_at !== undefined) target.consent_at = b.consent_at;
  if (b.notes !== undefined) target.notes = String(b.notes ?? '');
  res.json({ ok: true, household: target });
});

app.delete('/stub/households/:id', (req, res) => {
  const before = state.households.length;
  state.households = state.households.filter((h) => h.id !== req.params.id);
  if (state.households.length === before) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// Webhook: voice results
app.post('/webhooks/voice', verifySignatureOptional, (req, res) => {
  state.webhooks.push({ type: 'voice', payload: req.body, ts: Date.now() });
  res.json({ ok: true });
});

// Webhook: sms delivery
app.post('/webhooks/sms', verifySignatureOptional, (req, res) => {
  state.webhooks.push({ type: 'sms', payload: req.body, ts: Date.now() });
  res.json({ ok: true });
});


// LINE postback simulation (対応中/完了)
app.post('/stub/line/postback', (req, res) => {
  const { action, alert_id } = req.body || {};
  const target = state.alerts.find(a => a.id === alert_id);
  if (!target) return res.status(404).json({ error: 'alert_not_found' });
  if (action === 'take_care') {
    target.inProgress = true;
  } else if (action === 'done') {
    target.inProgress = false;
    target.status = 'ok';
  }
  state.webhooks.push({ type: 'line_postback', payload: { action, alert_id }, ts: Date.now() });
  res.json({ ok: true, alert: target, summary: computeSummary(state.alerts) });
});

// Orchestrate unanswered sequence: call#1 -> SMS -> delay -> call#2
app.post('/stub/sequence/start', (req, res) => {
  const alertId = req.body?.alert_id || `a_${nanoid(6)}`;
  const householdId = req.body?.household_id || `h_${nanoid(6)}`;
  const delayMs = Number(req.body?.delay_ms ?? 300000); // default 5 minutes
  const finalDtmf = req.body?.final_dtmf; // optional outcome for 2nd call
  const seqId = `seq_${nanoid(8)}`;
  const now = Date.now();
  state.sequences[seqId] = {
    id: seqId,
    alertId,
    householdId,
    status: 'running',
    steps: [],
    createdAt: now,
  };

  // step 1: call #1 (assume noanswer)
  const call1Id = `c_${nanoid(8)}`;
  state.calls.push({ callId: call1Id, alertId, householdId, attempt: 1, result: 'noanswer', ts: now });
  state.sequences[seqId].steps.push({ type: 'call', attempt: 1, result: 'noanswer', callId: call1Id, ts: now });

  // step 2: SMS
  const smsId = `s_${nanoid(8)}`;
  state.sms.push({ id: smsId, to: householdId, reason: 'unanswered_1', ts: Date.now() });
  state.sequences[seqId].steps.push({ type: 'sms', smsId, ts: Date.now() });

  // step 3: after delayMs, call #2
  setTimeout(() => {
    const call2Id = `c_${nanoid(8)}`;
    const outcome = finalDtmf ?? 'noanswer';
    state.calls.push({ callId: call2Id, alertId, householdId, attempt: 2, result: outcome, ts: Date.now() });
    state.sequences[seqId].steps.push({ type: 'call', attempt: 2, result: outcome, callId: call2Id, ts: Date.now() });
    state.sequences[seqId].status = 'done';
  }, Math.max(0, delayMs));

  res.json({ ok: true, sequence_id: seqId });
});

// Inspect sequence
app.get('/_stub/sequence/:id', (req, res) => {
  const seq = state.sequences[req.params.id];
  if (!seq) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, sequence: seq });
});

function verifySignatureOptional(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return next();
  const sig = req.get('X-Signature');
  if (!sig) return res.status(401).json({ error: 'missing signature' });
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (!sig.endsWith(hmac)) return res.status(401).json({ error: 'bad signature' });
  next();
}

function computeSummary(list) {
  const sum = { ok: 0, unanswered: 0, tired: 0, help: 0 };
  for (const a of list) {
    if (a.status in sum) sum[a.status]++;
  }
  return sum;
}

// (signature check handled by route-level middleware above)

function buildLineMessage(templateId, params) {
  const tmpl = lineTemplates[templateId]?.(params) || { title: '通知', body: '' };
  // Send as simple text with quick reply buttons for MVP
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
  const target = state.alerts.find((a) => a.id === alertId);
  if (!target) return;
  if (action === 'take_care') {
    target.inProgress = true;
  } else if (action === 'done') {
    target.inProgress = false;
    target.status = 'ok';
  }
}

function parseQuery(qs) {
  const out = {};
  for (const [k, v] of new URLSearchParams(qs)) out[k] = v;
  return out;
}

// API routes registration
app.use('/api', apiRoutes);
