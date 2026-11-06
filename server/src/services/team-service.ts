import type { PublicUser } from './auth-service.js';

// TDD red stub: replaced by the real check in the F-02 implementation commit.
export async function loadTeamInScope(_user: PublicUser, _teamId: string): Promise<{ id: string }> {
  throw new Error('not implemented');
}
