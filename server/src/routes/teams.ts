import { Router } from 'express';
import { listVisibleTeams, loadTeamInScope } from '../services/team-service.js';

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
