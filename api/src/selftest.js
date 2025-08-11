import http from 'http';
import { app } from './app.js';

const server = app.listen(0, async () => {
  const { port } = server.address();
  try {
    const weather = await request({ path: `/stub/weather?grid=test`, port });
    const call = await request({ path: `/stub/call`, method: 'POST', port, body: { alert_id: 'a_test', force_dtmf: '1' } });
    const state = await request({ path: `/_stub/state`, port });
    console.log(JSON.stringify({ weather, call, state }, null, 2));
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
