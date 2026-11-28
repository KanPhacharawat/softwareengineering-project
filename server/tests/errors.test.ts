// F-11 failure handling: TEST-69 (AC-65). Unknown errors never leak stack, SQL or message.
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/errors.js';

describe('errorHandler (unexpected error)', () => {
  it('TEST-69 returns the fixed 500 body with no stack or internal message', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('relation "Secret" password=x');
    });
    app.use(errorHandler);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
    expect(res.text).not.toMatch(/stack|relation|password/);
    expect(log).toHaveBeenCalled(); // still logged on the server
    log.mockRestore();
  });
});
