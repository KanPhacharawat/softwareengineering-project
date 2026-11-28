import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/require-role.js';
import { getSupervisorSummaryReport } from '../services/report-service.js';

export const reportsRouter = Router();

// GET /api/reports/supervisor-summary (F-10, FR-18, BR-02, BR-03, AC-58..AC-61)
reportsRouter.get('/supervisor-summary', requireRole(Role.SUPERVISOR), async (req, res) => {
  res.json(await getSupervisorSummaryReport(req.user!.id));
});
