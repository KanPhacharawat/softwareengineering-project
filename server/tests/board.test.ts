// F-09 Team progress board: TEST-U09, TEST-57..TEST-61 (AC-53..AC-56, FR-17, FR-19, BR-01, BR-02, NFR-02, NFR-03)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';
import { BOARD_COLUMNS, buildProgressBoard, summarizeProgress, type BoardCard } from '../src/domain/board.js';
import type { MilestoneStatus } from '../src/domain/milestone.js';

const app = createApp();
const [SUP1, SUP2, S1, S2, S3] = seedUsers;
const [ALPHA, BETA] = seedTeams;

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;
let s3: string;

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const boardUrl = (teamId: string) => `/api/teams/${teamId}/board`;
const get = (path: string, cookie?: string) => (cookie ? request(app).get(path).set('Cookie', cookie) : request(app).get(path));
const send = async (method: 'post' | 'put', path: string, cookie: string, body?: object) => {
  const res = await request(app)[method](path).set('Cookie', cookie).send(body ?? {});
  if (res.status >= 300) throw new Error(`${method.toUpperCase()} ${path} -> ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
};

async function createMilestone(title: string, dueInDays = 7) {
  const { milestone } = await send('post', `/api/teams/${ALPHA.id}/milestones`, sup1, { title, dueAt: inDays(dueInDays) });
  return milestone.id as string;
}
async function submit(milestoneId: string, cookie = s1) {
  const { submission } = await send('post', `/api/milestones/${milestoneId}/submission`, cookie, {
    title: 'Board work',
    link: 'https://github.com/example/cpms/pull/106',
  });
  return submission.id as string;
}
const feedback = (submissionId: string, comment = 'Looks fine') =>
  send('post', `/api/submissions/${submissionId}/feedback`, sup1, { comment });
const grade = (submissionId: string, score: number) => send('put', `/api/submissions/${submissionId}/grade`, sup1, { score });

function cardsOf(body: { columns: { status: MilestoneStatus; cards: BoardCard[] }[] }) {
  return body.columns.flatMap((c) => c.cards.map((card) => ({ column: c.status, card })));
}
function find(body: Parameters<typeof cardsOf>[0], id: string) {
  const hits = cardsOf(body).filter((x) => x.card.id === id);
  expect(hits, `milestone ${id} appears exactly once`).toHaveLength(1);
  return hits[0];
}

// TEST-57 fixture: one Alpha milestone per status, (d) closed.
const fx = { open: '', submitted: '', submittedSub: '', revision: '', feedbackClosed: '', feedbackClosedSub: '', missed: '' };

beforeAll(async () => {
  [sup1, sup2, s1, s2, s3] = await Promise.all([SUP1, SUP2, S1, S2, S3].map((u) => loginCookie(app, u.email)));
  // Board counts need a known set of milestones: start Alpha and Beta empty (cascades to submissions etc.).
  await prisma.milestone.deleteMany({ where: { teamId: { in: [ALPHA.id, BETA.id] } } });

  fx.open = await createMilestone('A open', 7);
  fx.submitted = await createMilestone('B submitted', 8);
  fx.submittedSub = await submit(fx.submitted);
  const rr = await createRevisionRequestedSubmission(app, { sup1, s1 });
  fx.revision = rr.milestoneId;
  const fg = await createRevisionRequestedSubmission(app, { sup1, s1 }, { withRequest: false });
  fx.feedbackClosed = fg.milestoneId;
  fx.feedbackClosedSub = fg.submissionId;
  await send('post', `/api/milestones/${fx.feedbackClosed}/close`, sup1);
  fx.missed = await createMilestone('E missed', 7);
  await prisma.milestone.update({ where: { id: fx.missed }, data: { dueAt: new Date(Date.now() - 2 * DAY) } });
});

const card = (over: Partial<BoardCard> & { id: string; status: MilestoneStatus }): BoardCard => ({
  title: over.id,
  dueAt: '2026-12-01T10:00:00.000Z',
  closedAt: null,
  lateAt: null,
  versionNumber: null,
  score: null,
  ...over,
});

describe('TEST-U09 buildProgressBoard & summarizeProgress (AC-53, AC-54)', () => {
  it('TEST-U09 places each card in its status column, fixed order, sorted by dueAt; closed stays in its column', () => {
    const cards = [
      card({ id: 'o2', status: 'OPEN', dueAt: '2026-12-09T00:00:00.000Z' }),
      card({ id: 'o1', status: 'OPEN', dueAt: '2026-12-02T00:00:00.000Z' }),
      card({ id: 's', status: 'SUBMITTED' }),
      card({ id: 'r', status: 'REVISION_REQUESTED' }),
      card({ id: 'f', status: 'FEEDBACK_GIVEN', closedAt: '2026-11-26T00:00:00.000Z' }),
      card({ id: 'm', status: 'MISSED' }),
    ];
    const board = buildProgressBoard(cards);
    expect(BOARD_COLUMNS).toEqual(['OPEN', 'SUBMITTED', 'REVISION_REQUESTED', 'FEEDBACK_GIVEN', 'MISSED']);
    expect(board.columns.map((c) => c.status)).toEqual(BOARD_COLUMNS);
    expect(board.columns.map((c) => c.cards.map((x) => x.id))).toEqual([['o1', 'o2'], ['s'], ['r'], ['f'], ['m']]);
    expect(board.summary).toEqual({
      total: 6,
      byStatus: { OPEN: 2, SUBMITTED: 1, REVISION_REQUESTED: 1, FEEDBACK_GIVEN: 1, MISSED: 1 },
      closed: 1,
      graded: 0,
      averageScore: null,
    });
  });

  it('TEST-U09 averages graded scores rounded half-up to 1 decimal', () => {
    const graded = (...scores: number[]) =>
      summarizeProgress(scores.map((score, i) => card({ id: `g${i}`, status: 'FEEDBACK_GIVEN', score })));
    expect(graded(85, 90).averageScore).toBe(87.5);
    expect(graded(85, 90, 91).averageScore).toBe(88.7);
    expect(graded(80, 81, 80, 80).averageScore).toBe(80.3);
    expect(graded(0)).toMatchObject({ graded: 1, averageScore: 0 });
  });

  it('TEST-U09 empty team: zeros, five empty columns, averageScore null', () => {
    const board = buildProgressBoard([]);
    expect(board.columns).toEqual(BOARD_COLUMNS.map((status) => ({ status, cards: [] })));
    expect(board.summary).toEqual({
      total: 0,
      byStatus: { OPEN: 0, SUBMITTED: 0, REVISION_REQUESTED: 0, FEEDBACK_GIVEN: 0, MISSED: 0 },
      closed: 0,
      graded: 0,
      averageScore: null,
    });
  });
});

describe('TEST-57 board columns from stored data (AC-53)', () => {
  it('TEST-57 every Alpha milestone appears once in the column of its status', async () => {
    const res = await get(boardUrl(ALPHA.id), s1);
    expect(res.status).toBe(200);
    expect(res.body.team).toEqual({ id: ALPHA.id, name: 'Alpha' });
    expect(res.body.columns.map((c: { status: string }) => c.status)).toEqual(BOARD_COLUMNS);
    expect(find(res.body, fx.open).column).toBe('OPEN');
    expect(find(res.body, fx.submitted).column).toBe('SUBMITTED');
    expect(find(res.body, fx.revision).column).toBe('REVISION_REQUESTED');
    const closed = find(res.body, fx.feedbackClosed);
    expect(closed.column).toBe('FEEDBACK_GIVEN');
    expect(closed.card.closedAt).not.toBeNull();
    expect(find(res.body, fx.missed).column).toBe('MISSED');
    expect(cardsOf(res.body)).toHaveLength(5);
  });
});

describe('TEST-58 progress summary (AC-54)', () => {
  it('TEST-58 counts per status, closed, graded and average; empty Beta board', async () => {
    await grade(fx.feedbackClosedSub, 85);
    await feedback(fx.submittedSub);
    await grade(fx.submittedSub, 90);

    const alpha = await get(boardUrl(ALPHA.id), s1);
    expect(alpha.status).toBe(200);
    expect(alpha.body.summary).toEqual({
      total: 5,
      byStatus: { OPEN: 1, SUBMITTED: 0, REVISION_REQUESTED: 1, FEEDBACK_GIVEN: 2, MISSED: 1 },
      closed: 1,
      graded: 2,
      averageScore: 87.5,
    });

    const beta = await get(boardUrl(BETA.id), s3);
    expect(beta.status).toBe(200);
    expect(beta.body.summary).toEqual({
      total: 0,
      byStatus: { OPEN: 0, SUBMITTED: 0, REVISION_REQUESTED: 0, FEEDBACK_GIVEN: 0, MISSED: 0 },
      closed: 0,
      graded: 0,
      averageScore: null,
    });
    expect(beta.body.columns).toEqual(BOARD_COLUMNS.map((status) => ({ status, cards: [] })));
  });
});

describe('TEST-59 cards reflect stored versions, grades, lateAt and expiry (AC-55)', () => {
  it('TEST-59 resubmitted + graded card, late card, expired revision request card', async () => {
    const r = await createRevisionRequestedSubmission(app, { sup1, s1 });
    await send('post', `/api/submissions/${r.submissionId}/versions`, s2, { title: 'Revised', link: 'https://example.com/v2' });
    await feedback(r.submissionId, 'Better now');
    await grade(r.submissionId, 88);

    const lateMs = await createMilestone('Late one', 7);
    const lateSub = await submit(lateMs);
    const lateAt = new Date('2026-11-20T03:00:00.000Z');
    await prisma.submission.update({ where: { id: lateSub }, data: { lateAt } });

    const expired = await createRevisionRequestedSubmission(app, { sup1, s1 });
    const before = await get(boardUrl(ALPHA.id), s1);
    expect(find(before.body, expired.milestoneId).column).toBe('REVISION_REQUESTED');
    await prisma.revisionRequest.updateMany({
      where: { submissionId: expired.submissionId },
      data: { dueAt: new Date(Date.now() - 60_000) },
    });

    const res = await get(boardUrl(ALPHA.id), s1);
    const resub = find(res.body, r.milestoneId);
    expect(resub.column).toBe('FEEDBACK_GIVEN');
    expect(resub.card).toMatchObject({ versionNumber: 2, score: 88 });
    expect(find(res.body, lateMs).card.lateAt).toBe(lateAt.toISOString());
    const exp = find(res.body, expired.milestoneId);
    expect(exp.column).toBe('FEEDBACK_GIVEN');
    expect(exp.card.score).toBeNull();
    expect(find(res.body, fx.open).card).toMatchObject({ versionNumber: null, score: null, lateAt: null });
  });
});

describe('TEST-60 board permissions (AC-56, BR-01, BR-02, NFR-02, NFR-03)', () => {
  it('TEST-60 members and assigned supervisor 200 with identical bodies; others 404; anonymous 401', async () => {
    const [r1, r2, r3, rSup1, rSup2, anon] = await Promise.all([
      get(boardUrl(ALPHA.id), s1),
      get(boardUrl(ALPHA.id), s2),
      get(boardUrl(ALPHA.id), s3),
      get(boardUrl(ALPHA.id), sup1),
      get(boardUrl(ALPHA.id), sup2),
      get(boardUrl(ALPHA.id)),
    ]);
    expect([r1.status, r2.status, r3.status, rSup1.status, rSup2.status, anon.status]).toEqual([200, 200, 404, 200, 404, 401]);
    expect(r2.body).toEqual(r1.body);
    expect(rSup1.body).toEqual(r1.body);
    expect(r3.body.summary).toBeUndefined();
    expect(rSup2.body.columns).toBeUndefined();

    expect((await get(boardUrl('not-a-uuid'), sup1)).status).toBe(404);
    expect((await get(boardUrl('00000000-0000-4000-8000-00000000ffff'), sup1)).status).toBe(404);
  });
});

describe('TEST-61 board is read-only (AC-56)', () => {
  it('TEST-61 GET board changes no rows', async () => {
    const counts = () =>
      Promise.all([
        prisma.milestone.count(),
        prisma.submission.count(),
        prisma.submissionVersion.count(),
        prisma.feedback.count(),
        prisma.revisionRequest.count(),
        prisma.grade.count(),
      ]);
    const before = await counts();
    for (const cookie of [s1, sup1, s1, sup1, s1, sup1]) {
      expect((await get(boardUrl(ALPHA.id), cookie)).status).toBe(200);
    }
    expect(await counts()).toEqual(before);
  });
});
