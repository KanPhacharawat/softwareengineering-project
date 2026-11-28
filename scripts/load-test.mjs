// F-11 W1 load test (NFR-06, AC-63, TEST-NFR-06). Run: npm run load-test
// Reads only GET endpoints plus a capped login run; writes no domain data.
import { mkdirSync, writeFileSync } from 'node:fs';
import autocannon from 'autocannon';

const VARS = ['LOAD_TEST_URL', 'LOAD_TEST_EMAIL', 'LOAD_TEST_PASSWORD', 'LOAD_TEST_VERSION'];
const missing = VARS.filter((v) => !process.env[v]);
if (missing.length) {
  console.error(`Missing env: ${missing.join(', ')}`);
  process.exit(2);
}
const { LOAD_TEST_URL, LOAD_TEST_EMAIL, LOAD_TEST_PASSWORD, LOAD_TEST_VERSION } = process.env;
const base = LOAD_TEST_URL.replace(/\/$/, '');
const loginBody = JSON.stringify({ email: LOAD_TEST_EMAIL, password: LOAD_TEST_PASSWORD });
const json = { 'content-type': 'application/json' };

const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: json, body: loginBody });
if (!login.ok) {
  console.error(`Login failed (${login.status})`);
  process.exit(2);
}
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const get = async (path) => (await fetch(`${base}${path}`, { headers: { cookie } })).json();

const { teams } = await get('/api/teams');
if (!teams?.length) {
  console.error('Seed data has no team');
  process.exit(2);
}
const teamId = teams[0].id;
const { milestones } = await get(`/api/teams/${teamId}/milestones`);
if (!milestones?.length) {
  console.error('Seed data has no milestone');
  process.exit(2);
}

const runs = [
  { name: 'GET /api/auth/me', path: '/api/auth/me' },
  { name: 'GET /api/teams', path: '/api/teams' },
  { name: 'GET /api/teams/:teamId/milestones', path: `/api/teams/${teamId}/milestones` },
  { name: 'GET /api/milestones/:id', path: `/api/milestones/${milestones[0].id}` },
  { name: 'GET /api/teams/:teamId/board', path: `/api/teams/${teamId}/board` },
  { name: 'GET /api/reports/supervisor-summary', path: '/api/reports/supervisor-summary' },
  // Last and without our cookie: each login regenerates the session, which would log the GET runs out.
  { name: 'POST /api/auth/login', path: '/api/auth/login', method: 'POST', headers: json, body: loginBody, amount: 200 },
];

// Pass rule (contract decision 2): p97.5 < 500 ms, 0 non-2xx, 0 errors/timeouts.
function verdict(r) {
  return r.latency.p97_5 < 500 && r.non2xx === 0 && r.errors === 0 && r.timeouts === 0 ? 'PASS' : 'FAIL';
}

const rows = [];
for (const run of runs) {
  const { name, path, amount, ...opts } = run;
  const r = await autocannon({
    url: `${base}${path}`,
    connections: 20,
    ...(amount ? { amount } : { duration: 30 }),
    headers: opts.method ? opts.headers : { cookie },
    method: opts.method ?? 'GET',
    body: opts.body,
  });
  rows.push([name, r.requests.total, r.latency.p50, r.latency.p97_5, r.latency.p99, r.non2xx, r.errors + r.timeouts, verdict(r)]);
  console.error(`${name}: ${verdict(r)}`);
}

const head = ['endpoint', 'requests', 'p50 ms', 'p97.5 ms', 'p99 ms', 'non-2xx', 'errors', 'result'];
const table = [head, ...rows].map((r) => r.join(' | ')).join('\n');
const failed = rows.some((r) => r[7] === 'FAIL');
const out = `# TEST-NFR-06 load test (F-11 #108), ${new Date().toISOString()}
# target: ${base}
# version: ${LOAD_TEST_VERSION}
# 20 connections; GET endpoints 30 s each; login capped at 200 requests
# pass rule: p97.5 < 500 ms, 0 non-2xx, 0 errors/timeouts

${table}

Overall: ${failed ? 'FAIL' : 'PASS'}
`;
mkdirSync('docs/evidence/F-11', { recursive: true });
const file = `docs/evidence/F-11/load-test-${LOAD_TEST_VERSION.replace(/[^\w.-]+/g, '_')}.txt`;
writeFileSync(file, out);
console.log(out);
console.log(`Saved ${file}`);
process.exit(failed ? 1 : 0);
