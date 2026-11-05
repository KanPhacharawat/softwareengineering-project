import { describe, expect, it } from 'vitest';
import { canChangeSubmission, validateMilestone, validateSubmission } from '../../src/domain/rules.js';

const now = new Date('2026-11-06T10:00:00.000Z');
const iso = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe('TEST-U01 AC-07 validateMilestone (BR-04)', () => {
  it.each([
    ['ab', false],
    ['abc', true],
    ['x'.repeat(120), true],
    ['x'.repeat(121), false],
    ['   ab   ', false],
  ])('title %j valid=%s', (title, valid) => {
    expect(validateMilestone({ title, dueAt: iso(60_000) }, now).ok).toBe(valid);
  });

  it('rejects a due date in the past or equal to now, accepts the future', () => {
    const past = validateMilestone({ title: 'Demo', dueAt: iso(-1) }, now);
    expect(past).toEqual({ ok: false, code: 'VALIDATION_ERROR', fields: { dueAt: expect.any(String) } });
    expect(validateMilestone({ title: 'Demo', dueAt: iso(0) }, now).ok).toBe(false);
    expect(validateMilestone({ title: 'Demo', dueAt: iso(1) }, now).ok).toBe(true);
  });

  it('rejects an invalid date string and a description over 2000 chars', () => {
    expect(validateMilestone({ title: 'Demo', dueAt: 'tomorrow' }, now).ok).toBe(false);
    expect(validateMilestone({ title: 'Demo', dueAt: iso(1), description: 'x'.repeat(2001) }, now).ok).toBe(false);
    expect(validateMilestone({ title: 'Demo', dueAt: iso(1), description: 'x'.repeat(2000) }, now).ok).toBe(true);
  });
});

describe('TEST-U02 AC-13 AC-18 canChangeSubmission (BR-06, BR-07)', () => {
  const milestone = { dueAt: now };
  it('allows changes only strictly before the due time', () => {
    expect(canChangeSubmission(milestone, null, new Date(now.getTime() - 1))).toEqual({ ok: true });
    expect(canChangeSubmission(milestone, null, now)).toEqual({ ok: false, code: 'DEADLINE_PASSED' });
    expect(canChangeSubmission(milestone, null, new Date(now.getTime() + 1))).toEqual({ ok: false, code: 'DEADLINE_PASSED' });
  });

  it('locks a submission once it has feedback, even before the deadline', () => {
    const before = new Date(now.getTime() - 60_000);
    expect(canChangeSubmission(milestone, { hasFeedback: false }, before)).toEqual({ ok: true });
    expect(canChangeSubmission(milestone, { hasFeedback: true }, before)).toEqual({ ok: false, code: 'SUBMISSION_LOCKED' });
  });
});

describe('TEST-U03 AC-14 validateSubmission (BR-09)', () => {
  const base = { title: 'Sprint demo', description: 'See link' };
  it.each([
    ['http://example.com/doc', true],
    ['https://github.com/team/repo', true],
    ['ftp://example.com/file', false],
    ['/relative/path', false],
    ['not a url', false],
    ['javascript:alert(1)', false],
    ['https://e.com/' + 'a'.repeat(500 - 14), true],
    ['https://e.com/' + 'a'.repeat(501 - 14), false],
  ])('link %j valid=%s', (link, valid) => {
    const r = validateSubmission({ ...base, link });
    expect(r.ok).toBe(valid);
    if (!r.ok) expect(r.fields).toHaveProperty('link');
  });

  it('requires a 3..120 char title', () => {
    const r = validateSubmission({ title: 'ab', link: 'https://e.com' });
    expect(r).toEqual({ ok: false, code: 'VALIDATION_ERROR', fields: { title: expect.any(String) } });
  });
});
