// TEST-00a (AC-00a, AC-00b) plus Lab 5 cloud-readiness checks (readiness probe, single-container UI)
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('returns 200 { ok: true }', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/ready', () => {
  it('returns 200 when the database answers', async () => {
    const res = await request(createApp()).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, database: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    const down = () => Promise.reject(new Error('connect ECONNREFUSED'));
    const res = await request(createApp({ checkDatabase: down })).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, database: 'down' });
  });
});

describe('serving the built web app', () => {
  const dist = mkdtempSync(path.join(tmpdir(), 'cpms-web-'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="root"></div>');
  const app = createApp({ webDistDir: dist });
  afterAll(() => rmSync(dist, { recursive: true, force: true }));

  it('serves index.html at /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="root"');
  });

  it('falls back to index.html for client-side routes', async () => {
    const res = await request(app).get('/teams/some-id');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="root"');
  });

  it('keeps API behaviour for unknown /api paths', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(401);
  });
});
