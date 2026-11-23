import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/require-role.js';
import { createFeedback } from '../services/feedback-service.js';
import { createRevisionRequest } from '../services/revision-service.js';
import { resubmit } from '../services/submission-service.js';

export const submissionsRouter = Router();

// POST /api/submissions/:submissionId/feedback (FR-10, BR-02, BR-03, BR-08, AC-17, AC-19, AC-20)
submissionsRouter.post('/:submissionId/feedback', requireRole(Role.SUPERVISOR), async (req, res) => {
  const submissionId = req.params.submissionId as string;
  const feedback = await createFeedback(req.user!, submissionId, req.body ?? {});
  res.status(201).json({ feedback });
});


// POST /api/submissions/:submissionId/revision-request (FR-11, BR-10, AC-24..AC-27)
submissionsRouter.post('/:submissionId/revision-request', requireRole(Role.SUPERVISOR), async (req, res) => {
  const revisionRequest = await createRevisionRequest(req.user!, req.params.submissionId as string, req.body ?? {});
  res.status(201).json({ revisionRequest });
});

// POST /api/submissions/:submissionId/versions (FR-12, BR-10, BR-11, AC-28..AC-30)
submissionsRouter.post('/:submissionId/versions', requireRole(Role.STUDENT), async (req, res) => {
  const submission = await resubmit(req.user!, req.params.submissionId as string, req.body ?? {});
  res.status(201).json({ submission });
});
