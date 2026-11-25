// Sprint 2 cross-feature regression: TEST-51 (F-04/F-05 + F-06 + F-07 + F-08 on the same data; BR-01..BR-13, NFR-02, NFR-03)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seedTeams, seedUsers } from '../prisma/seed.js';
import { loginCookie } from './helpers.js';

const app = createApp();
const [SUP1, SUP2, S1, S2, S3] = seedUsers;
const [ALPHA] = seedTeams;
const user = (u: { id: string; name: string }) => ({ id: u.id, name: u.name });

const DAY = 86400000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

let sup1: string;
let sup2: string;
let s1: string;
let s2: string;
let s3: string;

beforeAll(async () => {
  [sup1, sup2, s1, s2, s3] = await Promise.all([SUP1, SUP2, S1, S2, S3].map((u) => loginCookie(app, u.email)));
});

const call = (method: 'get' | 'post' | 'put' | 'patch', path: string, cookie: string, body?: object) => {
  const req = request(app)[method](path).set('Cookie', cookie);
  return body === undefined ? req : req.send(body);
};

describe('TEST-51 Sprint 2 cross-feature journey (API + DB)', () => {
  it('TEST-51 create -> submit -> feedback -> revision -> v2 -> feedback -> grade -> edit due -> close -> history', async () => {
    // 1. Sup1 creates an Alpha milestone (+7d)
    const ms = await call('post', `/api/teams/${ALPHA.id}/milestones`, sup1, {
      title: `Regression S2 ${Date.now()}`,
      dueAt: inDays(7),
    });
    expect(ms.status, 'step 1').toBe(201);
    const milestoneId = ms.body.milestone.id as string;
    const msUrl = `/api/milestones/${milestoneId}`;
    const subUrl = `${msUrl}/submission`;

    // 2. S1 submits (createdBy S1)
    const created = await call('post', subUrl, s1, { title: 'Regression v1', link: 'https://example.com/v1' });
    expect(created.status, 'step 2').toBe(201);
    expect(created.body.submission.createdBy, 'step 2').toEqual(user(S1));
    const submissionId = created.body.submission.id as string;
    const url = (p: string) => `/api/submissions/${submissionId}/${p}`;

    // 16 (at step 2). Outsiders: S3 (other team) cannot submit, Sup2 (other supervisor) cannot read
    expect((await call('post', subUrl, s3, { title: 'x', link: 'https://example.com/x' })).status, 'step 16@2 S3').toBe(404);
    expect((await call('get', msUrl, sup2)).status, 'step 16@2 Sup2').toBe(404);

    // 3. S2 edits: submittedBy S2, createdBy still S1
    const edited = await call('put', subUrl, s2, { title: 'Regression v1 edited', link: 'https://example.com/v1' });
    expect(edited.status, 'step 3').toBe(200);
    expect(edited.body.submission.submittedBy, 'step 3').toEqual(user(S2));
    expect(edited.body.submission.createdBy, 'step 3').toEqual(user(S1));

    // 4. Sup1 feedback on v1
    expect((await call('post', url('feedback'), sup1, { comment: 'Add tests' })).status, 'step 4').toBe(201);

    // 5. S2 edit after feedback -> SUBMISSION_LOCKED (BR-07, TEST-27 behaviour)
    const locked = await call('put', subUrl, s2, { title: 'too late', link: 'https://example.com/v1' });
    expect(locked.status, 'step 5').toBe(409);
    expect(locked.body.error.code, 'step 5').toBe('SUBMISSION_LOCKED');

    // 6. Sup1 revision request (+3d), then grading is blocked while it is open
    expect((await call('post', url('revision-request'), sup1, { reason: 'Add test evidence', dueAt: inDays(3) })).status, 'step 6').toBe(201);
    const pending = await call('put', url('grade'), sup1, { score: 90 });
    expect(pending.status, 'step 6 grade').toBe(409);
    expect(pending.body.error.code, 'step 6 grade').toBe('REVISION_PENDING');

    // 7. S2 resubmits -> version 2
    const v2 = await call('post', url('versions'), s2, { title: 'Regression v2', link: 'https://example.com/v2' });
    expect(v2.status, 'step 7').toBe(201);
    expect(v2.body.submission.currentVersion, 'step 7').toBe(2);

    // 8. Sup1 feedback on v2
    expect((await call('post', url('feedback'), sup1, { comment: 'Good now' })).status, 'step 8').toBe(201);

    // 9. Sup1 grades 90
    const graded = await call('put', url('grade'), sup1, { score: 90 });
    expect(graded.status, 'step 9').toBe(200);
    expect(graded.body.grade.score, 'step 9').toBe(90);

    // 16 (at step 9). Sup2 cannot grade, S3 cannot read
    expect((await call('put', url('grade'), sup2, { score: 10 })).status, 'step 16@9 Sup2').toBe(404);
    expect((await call('get', msUrl, s3)).status, 'step 16@9 S3').toBe(404);

    // 10. Revision request on a graded submission -> SUBMISSION_GRADED
    const afterGrade = await call('post', url('revision-request'), sup1, { reason: 'again', dueAt: inDays(3) });
    expect(afterGrade.status, 'step 10').toBe(409);
    expect(afterGrade.body.error.code, 'step 10').toBe('SUBMISSION_GRADED');

    // 11. Sup1 moves the due date (+10d)
    expect((await call('patch', msUrl, sup1, { dueAt: inDays(10) })).status, 'step 11').toBe(200);

    // 12. Sup1 closes the milestone
    expect((await call('post', `${msUrl}/close`, sup1)).status, 'step 12').toBe(200);

    // 13. Student write after close -> MILESTONE_CLOSED
    const closed = await call('put', subUrl, s1, { title: 'after close', link: 'https://example.com/v3' });
    expect(closed.status, 'step 13').toBe(409);
    expect(closed.body.error.code, 'step 13').toBe('MILESTONE_CLOSED');

    // 14. History as S1: 2 versions, v1 feedback + revision request, v2 feedback, createdBy S1
    const history = await call('get', url('history'), s1);
    expect(history.status, 'step 14').toBe(200);
    expect(history.body.submission.createdBy, 'step 14').toEqual(user(S1));
    const [h1, h2, ...rest] = history.body.versions;
    expect(rest, 'step 14 version count').toEqual([]);
    expect(h1.versionNumber, 'step 14 v1').toBe(1);
    expect(h1.feedback.comment, 'step 14 v1 feedback').toBe('Add tests');
    expect(h1.revisionRequest.reason, 'step 14 v1 revision').toBe('Add test evidence');
    expect(h2.versionNumber, 'step 14 v2').toBe(2);
    expect(h2.feedback.comment, 'step 14 v2 feedback').toBe('Good now');

    // 16 (at step 14). Sup2 and S3 cannot read history
    expect((await call('get', url('history'), sup2)).status, 'step 16@14 Sup2').toBe(404);
    expect((await call('get', url('history'), s3)).status, 'step 16@14 S3').toBe(404);

    // 15. Milestone as S1: grade 90 and closedAt set
    const detail = await call('get', msUrl, s1);
    expect(detail.status, 'step 15').toBe(200);
    expect(detail.body.submission.grade.score, 'step 15 grade').toBe(90);
    expect(detail.body.milestone.closedAt, 'step 15 closedAt').toBeTruthy();
  });
});
