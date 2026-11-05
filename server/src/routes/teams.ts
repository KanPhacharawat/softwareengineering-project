import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { getTeamInScope, listTeams } from '../services/teams.js';

export function teamsRouter(prisma: PrismaClient) {
  const r = Router();
  r.get('/', async (req, res) => {
    res.json({ teams: await listTeams(prisma, req.user!) });
  });
  r.get('/:teamId', async (req, res) => {
    res.json({ team: await getTeamInScope(prisma, req.user!, req.params.teamId) });
  });
  return r;
}
