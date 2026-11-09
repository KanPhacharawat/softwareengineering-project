import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/require-role.js';
import { createFeedback } from '../services/feedback-service.js';

export const submissionsRouter = Router();

// POST /api/submissions/:submissionId/feedback (FR-10, BR-02, BR-03, BR-08, AC-17, AC-19, AC-20)
submissionsRouter.post('/:submissionId/feedback', requireRole(Role.SUPERVISOR), async (req, res) => {
  const submissionId = req.params.submissionId as string;
  const feedback = await createFeedback(req.user!, submissionId, req.body ?? {});
  res.status(201).json({ feedback });
});

