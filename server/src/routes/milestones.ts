import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/require-role.js';
import { createSubmission, getMilestoneDetail, updateSubmission } from '../services/submission-service.js';

export const milestonesRouter = Router();

// GET /api/milestones/:milestoneId (FR-08, AC-11, AC-15)
milestonesRouter.get('/:milestoneId', async (req, res) => {
  const milestoneId = req.params.milestoneId as string;
  const detail = await getMilestoneDetail(req.user!, milestoneId);
  res.json(detail);
});

// POST /api/milestones/:milestoneId/submission (FR-07, BR-03, BR-05, BR-06, BR-09, AC-11..AC-14, AC-09)
milestonesRouter.post('/:milestoneId/submission', requireRole(Role.STUDENT), async (req, res) => {
  const milestoneId = req.params.milestoneId as string;
  const submission = await createSubmission(req.user!, milestoneId, req.body ?? {});
  res.status(201).json({ submission });
});

// PUT /api/milestones/:milestoneId/submission (FR-09, BR-03, BR-06, BR-07, BR-09, AC-16)
milestonesRouter.put('/:milestoneId/submission', requireRole(Role.STUDENT), async (req, res) => {
  const milestoneId = req.params.milestoneId as string;
  const submission = await updateSubmission(req.user!, milestoneId, req.body ?? {});
  res.json({ submission });
});
