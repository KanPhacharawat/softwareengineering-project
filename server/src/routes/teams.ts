import { Router } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../errors.js';
import { validateMilestoneInput } from '../domain/milestone.js';
import { requireRole } from '../middleware/require-role.js';
import { createMilestone, listTeamMilestones } from '../services/milestone-service.js';
import { listVisibleTeams, loadTeamInScope } from '../services/team-service.js';
import { getTeamBoard } from '../services/board-service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      team?: import('../services/team-service.js').TeamView;
    }
  }
}

export const teamsRouter = Router();

// GET /api/teams (FR-04, AC-10)
teamsRouter.get('/', async (req, res) => {
  res.json({ teams: await listVisibleTeams(req.user!) });
});

// Team scope check for every /api/teams/:teamId/* path (BR-01, BR-02). It runs before any nested route, so a
// path under another team answers 404 even before that route exists (e.g. milestones before F-03).
teamsRouter.use('/:teamId', async (req, _res, next) => {
  req.team = await loadTeamInScope(req.user!, req.params.teamId);
  next();
});

// GET /api/teams/:teamId (AC-10)
teamsRouter.get('/:teamId', (req, res) => {
  res.json({ team: req.team });
});

// GET /api/teams/:teamId/milestones (FR-06, AC-06)
teamsRouter.get('/:teamId/milestones', async (req, res) => {
  const milestones = await listTeamMilestones(req.team!.id);
  res.json({ milestones });
});

// GET /api/teams/:teamId/board (F-09, FR-17, FR-19, AC-53..AC-56): same body for members and the assigned supervisor.
teamsRouter.get('/:teamId/board', async (req, res) => {
  const { id, name } = req.team!;
  res.json({ team: { id, name }, ...(await getTeamBoard(id)) });
});

// POST /api/teams/:teamId/milestones (FR-05, BR-03, BR-04, AC-06..AC-09)
teamsRouter.post('/:teamId/milestones', requireRole(Role.SUPERVISOR), async (req, res) => {
  const validation = validateMilestoneInput(req.body ?? {});
  if (!validation.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', validation.fields);
  }

  const milestone = await createMilestone(req.team!.id, req.user!.id, validation.data);
  res.status(201).json({ milestone });
});
