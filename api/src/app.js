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
  sequences: {},
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

// SMS stub
app.post('/stub/sms', (req, res) => {
  const id = `s_${nanoid(8)}`;
  const to = req.body?.to || 'unknown';
  const reason = req.body?.reason || 'unanswered_1';
  state.sms.push({ id, to, reason, body: req.body, ts: Date.now() });
  res.json({ ok: true, sms_id: id });
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
