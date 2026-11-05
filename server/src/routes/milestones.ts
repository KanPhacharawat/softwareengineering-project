import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { parseBody } from '../lib/validate.js';
import { requireRole } from '../middleware/auth.js';
import { milestoneService } from '../services/milestones.js';

const milestoneBody = z.object({
  title: z.string({ required_error: 'Title is required' }),
  description: z.string().optional(),
  dueAt: z.string({ required_error: 'Due date is required' }),
});
const submissionBody = z.object({
  title: z.string({ required_error: 'Title is required' }),
  description: z.string().optional(),
  link: z.string({ required_error: 'Link is required' }),
});
const feedbackBody = z.object({ comment: z.string({ required_error: 'Feedback is required' }) });

export function milestoneRoutes(prisma: PrismaClient, now: () => Date) {
  const svc = milestoneService(prisma, now);
  const r = Router();

  r.get('/teams/:teamId/milestones', async (req, res) => {
    res.json({ milestones: await svc.list(req.user!, String(req.params.teamId)) });
  });
  r.post('/teams/:teamId/milestones', requireRole('SUPERVISOR'), async (req, res) => {
    const body = parseBody(milestoneBody, req.body);
    res.status(201).json({ milestone: await svc.create(req.user!, String(req.params.teamId), body) });
  });

  r.get('/milestones/:milestoneId', async (req, res) => {
    res.json(await svc.get(req.user!, String(req.params.milestoneId)));
  });
  r.post('/milestones/:milestoneId/submission', requireRole('STUDENT'), async (req, res) => {
    const body = parseBody(submissionBody, req.body);
    res.status(201).json({ submission: await svc.submit(req.user!, String(req.params.milestoneId), body) });
  });
  r.put('/milestones/:milestoneId/submission', requireRole('STUDENT'), async (req, res) => {
    const body = parseBody(submissionBody, req.body);
    res.json({ submission: await svc.edit(req.user!, String(req.params.milestoneId), body) });
  });

  r.post('/submissions/:submissionId/feedback', requireRole('SUPERVISOR'), async (req, res) => {
    const { comment } = parseBody(feedbackBody, req.body);
    res.status(201).json({ feedback: await svc.addFeedback(req.user!, String(req.params.submissionId), comment) });
  });

  return r;
}
