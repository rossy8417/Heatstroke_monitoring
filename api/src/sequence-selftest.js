import http from 'http';
import { app } from './app.js';

const server = app.listen(0, async () => {
  const { port } = server.address();
  try {
    const start = await request({ path: `/stub/sequence/start`, method: 'POST', port, body: { alert_id: 'a_seq', household_id: 'h_seq', delay_ms: 50, final_dtmf: '1' } });
    const seqId = start.sequence_id;
    await sleep(120); // wait for sequence to complete
    const seq = await request({ path: `/_stub/sequence/${seqId}`, port });
    if (seq?.sequence?.status !== 'done') throw new Error('sequence not done');
    const steps = seq.sequence.steps;
    const ok = steps[0]?.type === 'call' && steps[0]?.attempt === 1 && steps[0]?.result === 'noanswer'
      && steps[1]?.type === 'sms'
      && steps[2]?.type === 'call' && steps[2]?.attempt === 2 && steps[2]?.result === '1';
    if (!ok) {
      console.error(JSON.stringify(seq, null, 2));
      process.exit(1);
    }
    console.log('sequence selftest OK');
  } finally {
    server.close();
  }
});

function request({ path, method = 'GET', port, body }) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : undefined;
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: {
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': data.length } : {}),
    }}, (res) => {
      let chunks = '';
      res.setEncoding('utf8');
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks || '{}'));
        } catch (e) {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
