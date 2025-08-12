import { app } from '../app-improved.js';
import { dataStore } from '../services/dataStore.js';

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(method, path, body = null, expectedStatus = 200) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    
    return { success: true, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Starting API tests...\n');
  
  const tests = [
    {
      name: 'Health check',
      test: async () => {
        const result = await testEndpoint('GET', '/_stub/state');
        return result.success && result.data.ok;
      }
    },
    {
      name: 'Create household',
      test: async () => {
        const household = {
          name: 'テスト太郎',
          phone: '+819098765432',
          addressGrid: '5339-24-TEST',
          riskFlag: false
        };
        const result = await testEndpoint('POST', '/stub/households', household, 201);
        return result.success && result.data.id;
      }
    },
    {
      name: 'Search households',
      test: async () => {
        const result = await testEndpoint('GET', '/stub/households?q=山田');
        return result.success && Array.isArray(result.data.data);
      }
    },
    {
      name: 'Weather API',
      test: async () => {
        const result = await testEndpoint('GET', '/stub/weather?grid=5339-24-TEST');
        return result.success && result.data.level && result.data.wbgt;
      }
    },
    {
      name: 'Today alerts',
      test: async () => {
        const result = await testEndpoint('GET', '/stub/alerts/today');
        return result.success && result.data.summary;
      }
    },
    {
      name: 'Start call',
      test: async () => {
        const result = await testEndpoint('POST', '/stub/call', { alert_id: 'test_alert' });
        return result.success && result.data.call_id;
      }
    },
    {
      name: 'Send SMS',
      test: async () => {
        const result = await testEndpoint('POST', '/stub/sms', { 
          to: '+819012345678',
          reason: 'test'
        });
        return result.success && result.data.sms_id;
      }
    },
    {
      name: 'LINE push stub',
      test: async () => {
        const result = await testEndpoint('POST', '/stub/line', {
          to: 'U_test',
          message: 'test'
        });
        return result.success && result.data.push_id;
      }
    },
    {
      name: 'Invalid household (validation)',
      test: async () => {
        const result = await testEndpoint('POST', '/stub/households', { name: '' }, 400);
        return result.success;
      }
    },
    {
      name: 'Not found route',
      test: async () => {
        const result = await testEndpoint('GET', '/invalid/route', null, 404);
        return result.success;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

export { runTests };