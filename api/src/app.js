import express from 'express';
import morgan from 'morgan';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

export const app = express();
app.use(express.json());
app.use(morgan('dev'));

// In-memory stub state
export const state = {
  calls: [],
  sms: [],
  linePushes: [],
  webhooks: [],
};

// Health
app.get('/_stub/state', (req, res) => {
  res.json({ ok: true, counts: {
    calls: state.calls.length,
    sms: state.sms.length,
    linePushes: state.linePushes.length,
    webhooks: state.webhooks.length,
  }});
});

// Weather stub
app.get('/stub/weather', (req, res) => {
  const grid = req.query.grid || '5339-24-XXXX';
  res.json({ level: '警戒', wbgt: 29.2, grid });
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

// Webhook: line events
app.post('/webhooks/line', verifySignatureOptional, (req, res) => {
  state.webhooks.push({ type: 'line', payload: req.body, ts: Date.now() });
  res.json({ ok: true });
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
