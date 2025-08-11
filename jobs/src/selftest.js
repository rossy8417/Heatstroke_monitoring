import { judgeAlert, planEscalation } from './judgeAlert.js';

const cases = [
  { level: '注意', hour: 9, expect: false },
  { level: '警戒', hour: 9, expect: true },
  { level: '厳重警戒', hour: 13, expect: true },
  { level: '危険', hour: 17, expect: true },
  { level: '警戒', hour: 23, expect: false },
];

const results = cases.map(c => ({
  in: c,
  out: judgeAlert(c),
}));

const allPass = results.every(r => r.out.shouldIssue === r.in.expect);

if (!allPass) {
  console.error(JSON.stringify(results, null, 2));
  process.exit(1);
}
console.log('jobs selftest OK');

// quick check planEscalation
const plan = planEscalation({ alertId: 'a1', household: { name: '山田花子', phone: '+81000000000' }, familyLineUserId: 'Uxxx' });
if (!(Array.isArray(plan) && plan.length === 4 && plan[3]?.type === 'line_push')) {
  console.error('planEscalation unexpected', plan);
  process.exit(1);
}
