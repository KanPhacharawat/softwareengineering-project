// F-10 Supervisor summary report: TEST-U10, TEST-62..TEST-66 (AC-58..AC-61, FR-18, BR-02, BR-03, NFR-02, NFR-03)
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { SEED_PASSWORD, seedTeams, seedUsers } from '../prisma/seed.js';
import { createRevisionRequestedSubmission, loginCookie } from './helpers.js';
import type { BoardCard } from '../src/domain/board.js';
import type { MilestoneStatus } from '../src/domain/milestone.js';
import { buildSupervisorReport, buildTeamReportRow, type TeamReportRow } from '../src/domain/report.js';

const app = createApp();
const [SUP1, SUP2, S1, S2, S3] = seedUsers;
const [ALPHA, BETA, GAMMA] = seedTeams;

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;
let s3: string;

const DAY = 86_400_000;
const HOUR = 3_600_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const REPORT_URL = '/api/reports/supervisor-summary';

const get = (path: string, cookie?: string) =>
  cookie ? request(app).get(path).set('Cookie', cookie) : request(app).get(path);

const send = async (method: 'post' | 'put' | 'patch', path: string, cookie: string, body?: object) => {
  const res = await request(app)[method](path).set('Cookie', cookie).send(body ?? {});
  if (res.status >= 300) throw new Error(`${method.toUpperCase()} ${path} -> ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
};

async function resetAllTeamMilestones() {
  await prisma.milestone.deleteMany({ where: { teamId: { in: [ALPHA.id, BETA.id, GAMMA.id] } } });
}

async function createMilestone(teamId: string, supCookie: string, title: string, dueInDays = 7) {
  const { milestone } = await send('post', `/api/teams/${teamId}/milestones`, supCookie, {
    title,
    dueAt: inDays(dueInDays),
  });
  return milestone.id as string;
}

async function submit(milestoneId: string, studentCookie: string) {
  const { submission } = await send('post', `/api/milestones/${milestoneId}/submission`, studentCookie, {
    title: 'Report deliverable',
    link: 'https://github.com/example/cpms/pull/107',
  });
  return submission.id as string;
}

const feedback = (submissionId: string, supCookie: string, comment = 'Looks fine') =>
  send('post', `/api/submissions/${submissionId}/feedback`, supCookie, { comment });

const grade = (submissionId: string, supCookie: string, score: number) =>
  send('put', `/api/submissions/${submissionId}/grade`, supCookie, { score });

beforeAll(async () => {
  [sup1, sup2, s1, s2, s3] = await Promise.all([SUP1, SUP2, S1, S2, S3].map((u) => loginCookie(app, u.email)));
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

describe('TEST-U10 buildTeamReportRow & buildSupervisorReport (AC-58, AC-59)', () => {
  it('TEST-U10 sorts teams by name, computes row counts and weighted overall averageScore', () => {
    const teamBCards: BoardCard[] = [
      card({ id: 'b1', status: 'FEEDBACK_GIVEN', versionNumber: 1, score: 60 }),
      card({ id: 'b2', status: 'FEEDBACK_GIVEN', versionNumber: 1, score: 60 }),
      card({ id: 'b3', status: 'FEEDBACK_GIVEN', versionNumber: 1, score: 60 }),
    ];
    const teamACards: BoardCard[] = [
      card({ id: 'a1', status: 'OPEN' }),
      card({ id: 'a2', status: 'SUBMITTED', versionNumber: 1, lateAt: '2026-11-25T10:00:00.000Z' }),
      card({ id: 'a3', status: 'REVISION_REQUESTED', versionNumber: 1 }),
      card({ id: 'a4', status: 'FEEDBACK_GIVEN', versionNumber: 1, closedAt: '2026-11-26T00:00:00.000Z', score: 100 }),
      card({ id: 'a5', status: 'MISSED' }),
    ];

    const report = buildSupervisorReport([
      { id: 'tb', name: 'Team B', cards: teamBCards },
      { id: 'tc', name: 'Team C', cards: [] },
      { id: 'ta', name: 'Team A', cards: teamACards },
    ]);

    expect(report.teams.map((t) => t.teamName)).toEqual(['Team A', 'Team B', 'Team C']);
    expect(report.teams[0]).toEqual({
      teamId: 'ta',
      teamName: 'Team A',
      milestonesTotal: 5,
      submitted: 3,
      late: 1,
      missing: 1,
      feedbackPending: 1,
      revisionRequested: 1,
      closed: 1,
      graded: 1,
      averageScore: 100,
    });
    expect(report.teams[2]).toEqual({
      teamId: 'tc',
      teamName: 'Team C',
      milestonesTotal: 0,
      submitted: 0,
      late: 0,
      missing: 0,
      feedbackPending: 0,
      revisionRequested: 0,
      closed: 0,
      graded: 0,
      averageScore: null,
    });
    // Weighted across 4 graded milestones: (100 + 60 + 60 + 60) / 4 = 70 (NOT (100 + 60) / 2 = 80).
    expect(report.overall).toEqual({
      teamCount: 3,
      milestonesTotal: 8,
      submitted: 6,
      late: 1,
      missing: 1,
      feedbackPending: 1,
      revisionRequested: 1,
      closed: 1,
      graded: 4,
      averageScore: 70,
    });
  });

  it('TEST-U10 rounds half-up on .x5 tie and keeps single score 0 distinct from null', () => {
    const tieRow = buildTeamReportRow(
      { id: 't1', name: 'Tie' },
      [80, 81, 80, 80].map((score, i) => card({ id: `g${i}`, status: 'FEEDBACK_GIVEN', versionNumber: 1, score })),
    );
    expect(tieRow.averageScore).toBe(80.3);

    const zeroRow = buildTeamReportRow({ id: 't2', name: 'Zero' }, [
      card({ id: 'z1', status: 'FEEDBACK_GIVEN', versionNumber: 1, score: 0 }),
    ]);
    expect(zeroRow).toMatchObject({ graded: 1, averageScore: 0 });
  });

  it('TEST-U10 supervisor with 0 assigned teams returns empty teams and zeroed overall', () => {
    expect(buildSupervisorReport([])).toEqual({
      teams: [],
      overall: {
        teamCount: 0,
        milestonesTotal: 0,
        submitted: 0,
        late: 0,
        missing: 0,
        feedbackPending: 0,
        revisionRequested: 0,
        closed: 0,
        graded: 0,
        averageScore: null,
      },
    });
  });
});

describe('TEST-62 per-team counts and supervisor scoping (AC-58)', () => {
  it('TEST-62 Sup1 gets Alpha and Beta only with exact counts; Gamma is excluded', async () => {
    await resetAllTeamMilestones();

    // Alpha: (a) open, (b) submitted, (c) revision requested, (d) feedback + closed + graded 85, (e) missed.
    await createMilestone(ALPHA.id, sup1, 'A open', 7);
    const bMs = await createMilestone(ALPHA.id, sup1, 'B submitted', 8);
    await submit(bMs, s1);
    await createRevisionRequestedSubmission(app, { sup1, s1 });
    const fg = await createRevisionRequestedSubmission(app, { sup1, s1 }, { withRequest: false });
    await send('post', `/api/milestones/${fg.milestoneId}/close`, sup1);
    await grade(fg.submissionId, sup1, 85);
    const missedMs = await createMilestone(ALPHA.id, sup1, 'E missed', 7);
    await prisma.milestone.update({ where: { id: missedMs }, data: { dueAt: new Date(Date.now() - 2 * DAY) } });

    // Beta: 1 late submitted milestone.
    const betaMs = await createMilestone(BETA.id, sup1, 'Beta late', 7);
    const betaSub = await submit(betaMs, s3);
    await prisma.submission.update({ where: { id: betaSub }, data: { lateAt: new Date(Date.now() - HOUR) } });

    // Gamma (Sup2): 2 milestones (must not appear in Sup1's report).
    await createMilestone(GAMMA.id, sup2, 'Gamma 1', 7);
    await createMilestone(GAMMA.id, sup2, 'Gamma 2', 8);

    const res = await get(REPORT_URL, sup1);
    expect(res.status).toBe(200);
    expect(res.body.teams.map((t: TeamReportRow) => t.teamName)).toEqual(['Alpha', 'Beta']);
    expect(res.body.teams[0]).toEqual({
      teamId: ALPHA.id,
      teamName: 'Alpha',
      milestonesTotal: 5,
      submitted: 3,
      late: 0,
      missing: 1,
      feedbackPending: 1,
      revisionRequested: 1,
      closed: 1,
      graded: 1,
      averageScore: 85,
    });
    expect(res.body.teams[1]).toEqual({
      teamId: BETA.id,
      teamName: 'Beta',
      milestonesTotal: 1,
      submitted: 1,
      late: 1,
      missing: 0,
      feedbackPending: 1,
      revisionRequested: 0,
      closed: 0,
      graded: 0,
      averageScore: null,
    });
    expect(res.body.overall).toEqual({
      teamCount: 2,
      milestonesTotal: 6,
      submitted: 4,
      late: 1,
      missing: 1,
      feedbackPending: 2,
      revisionRequested: 1,
      closed: 1,
      graded: 1,
      averageScore: 85,
    });
  });
});

describe('TEST-63 weighted overall average, empty team, and 0-team supervisor (AC-59)', () => {
  it('TEST-63 computes weighted overall average, handles empty Beta, and handles supervisor with 0 teams', async () => {
    await resetAllTeamMilestones();

    // (1) Alpha: 1 graded (100); Beta: 3 graded (60, 60, 60).
    const aMs = await createMilestone(ALPHA.id, sup1, 'Alpha graded', 7);
    const aSub = await submit(aMs, s1);
    await feedback(aSub, sup1);
    await grade(aSub, sup1, 100);

    for (let i = 1; i <= 3; i++) {
      const bMs = await createMilestone(BETA.id, sup1, `Beta graded ${i}`, 7 + i);
      const bSub = await submit(bMs, s3);
      await feedback(bSub, sup1);
      await grade(bSub, sup1, 60);
    }

    const r1 = await get(REPORT_URL, sup1);
    expect(r1.status).toBe(200);
    expect(r1.body.overall).toMatchObject({ teamCount: 2, graded: 4, averageScore: 70 });

    // (2) Delete Beta's milestones so Beta has 0 milestones.
    await prisma.milestone.deleteMany({ where: { teamId: BETA.id } });
    const r2 = await get(REPORT_URL, sup1);
    expect(r2.status).toBe(200);
    const betaRow = r2.body.teams.find((t: TeamReportRow) => t.teamId === BETA.id);
    expect(betaRow).toEqual({
      teamId: BETA.id,
      teamName: 'Beta',
      milestonesTotal: 0,
      submitted: 0,
      late: 0,
      missing: 0,
      feedbackPending: 0,
      revisionRequested: 0,
      closed: 0,
      graded: 0,
      averageScore: null,
    });

    // (3) Temporary supervisor Sup3 with 0 assigned teams.
    const sup3Email = `sup3-report-${Date.now()}@cpms.test`;
    const sup3User = await prisma.user.create({
      data: {
        email: sup3Email,
        name: 'Supervisor Three',
        role: 'SUPERVISOR',
        passwordHash: await bcrypt.hash(SEED_PASSWORD, 10),
      },
    });
    try {
      const sup3Cookie = await loginCookie(app, sup3Email);
      const r3 = await get(REPORT_URL, sup3Cookie);
      expect(r3.status).toBe(200);
      expect(r3.body).toEqual({
        teams: [],
        overall: {
          teamCount: 0,
          milestonesTotal: 0,
          submitted: 0,
          late: 0,
          missing: 0,
          feedbackPending: 0,
          revisionRequested: 0,
          closed: 0,
          graded: 0,
          averageScore: null,
        },
      });
    } finally {
      await prisma.user.delete({ where: { id: sup3User.id } });
    }
  });
});

describe('TEST-64 report reflects stored state transitions (AC-60)', () => {
  it('TEST-64 tracks late persistence across extension, v2 feedbackPending, grading, and expired revision', async () => {
    await resetAllTeamMilestones();

    const alphaRow = async () => {
      const res = await get(REPORT_URL, sup1);
      expect(res.status).toBe(200);
      return res.body.teams.find((t: TeamReportRow) => t.teamId === ALPHA.id) as TeamReportRow;
    };

    // Step 1 (milestone 1 only): late submit inside 24 h grace window -> feedback -> F-07 due-date extension -> revision -> v2 -> feedback -> grade 88.
    const m1 = await createMilestone(ALPHA.id, sup1, 'Transition M1', 7);
    await prisma.milestone.update({ where: { id: m1 }, data: { dueAt: new Date(Date.now() - HOUR) } });
    const sub1 = await submit(m1, s1);
    expect(await alphaRow()).toMatchObject({ submitted: 1, late: 1, feedbackPending: 1 });

    await feedback(sub1, sup1, 'First review');
    expect(await alphaRow()).toMatchObject({ submitted: 1, late: 1, feedbackPending: 0 });

    await send('patch', `/api/milestones/${m1}`, sup1, { dueAt: inDays(7) });
    expect(await alphaRow()).toMatchObject({ late: 1 });

    await send('post', `/api/submissions/${sub1}/revision-request`, sup1, {
      reason: 'Please revise',
      dueAt: inDays(3),
    });
    expect(await alphaRow()).toMatchObject({ revisionRequested: 1 });

    await send('post', `/api/submissions/${sub1}/versions`, s2, {
      title: 'Revised v2',
      link: 'https://github.com/example/cpms/pull/107-v2',
    });
    expect(await alphaRow()).toMatchObject({ revisionRequested: 0, feedbackPending: 1, late: 1 });

    await feedback(sub1, sup1, 'Second review');
    await grade(sub1, sup1, 88);
    expect(await alphaRow()).toMatchObject({ feedbackPending: 0, graded: 1, averageScore: 88, late: 1 });

    // Step 2 (after step 1): milestone 2 with expired revision request (RevisionRequest.dueAt moved to past).
    const m2 = await createRevisionRequestedSubmission(app, { sup1, s1 });
    await prisma.revisionRequest.updateMany({
      where: { submissionId: m2.submissionId },
      data: { dueAt: new Date(Date.now() - 60_000) },
    });
    expect(await alphaRow()).toMatchObject({
      submitted: 2,
      revisionRequested: 0,
      feedbackPending: 0,
    });
  });
});

describe('TEST-65 report permissions (AC-61, BR-02, BR-03, NFR-02, NFR-03)', () => {
  it('TEST-65 supervisors see only assigned teams; students get 403; anonymous gets 401', async () => {
    await resetAllTeamMilestones();
    await createMilestone(ALPHA.id, sup1, 'Alpha perm', 7);
    await createMilestone(GAMMA.id, sup2, 'Gamma perm', 7);

    const [rSup1, rSup2, rS1, rS3, rAnon] = await Promise.all([
      get(REPORT_URL, sup1),
      get(REPORT_URL, sup2),
      get(REPORT_URL, s1),
      get(REPORT_URL, s3),
      get(REPORT_URL),
    ]);

    expect([rSup1.status, rSup2.status, rS1.status, rS3.status, rAnon.status]).toEqual([200, 200, 403, 403, 401]);
    expect(rSup1.body.teams.map((t: TeamReportRow) => t.teamName)).toEqual(['Alpha', 'Beta']);
    expect(rSup2.body.teams.map((t: TeamReportRow) => t.teamName)).toEqual(['Gamma']);

    expect(rS1.body).toEqual({ error: { code: 'FORBIDDEN', message: 'You do not have permission to do this' } });
    expect(rS1.body.teams).toBeUndefined();
    expect(rS1.body.overall).toBeUndefined();
    expect(rS3.body.error.code).toBe('FORBIDDEN');
    expect(rS3.body.teams).toBeUndefined();
    expect(rAnon.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('TEST-66 report is read-only (AC-61)', () => {
  it('TEST-66 GET report changes no rows', async () => {
    // Ensure Submission, SubmissionVersion, Feedback, RevisionRequest, and Grade tables are all non-empty.
    const gradedFx = await createRevisionRequestedSubmission(app, { sup1, s1 }, { withRequest: false });
    await grade(gradedFx.submissionId, sup1, 90);
    await createRevisionRequestedSubmission(app, { sup1, s1 });

    const counts = () =>
      Promise.all([
        prisma.team.count(),
        prisma.milestone.count(),
        prisma.submission.count(),
        prisma.submissionVersion.count(),
        prisma.feedback.count(),
        prisma.revisionRequest.count(),
        prisma.grade.count(),
      ]);
    const before = await counts();
    for (const c of before) expect(c).toBeGreaterThan(0);
    for (const cookie of [sup1, sup2, sup1, sup2, sup1, sup2]) {
      expect((await get(REPORT_URL, cookie)).status).toBe(200);
    }
    expect(await counts()).toEqual(before);
  });
});
