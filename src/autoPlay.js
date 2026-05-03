import { createInitialGameState } from './gameState';
import { advanceRound } from './roundEngine';
import { getDemandForRound } from './demandCurve';
import { ghostOrder } from './ghostPlayer';
import { saveGameState, updateSession } from './sessionService';

const ALL_ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'];
const DELAY_MS = 80; // small delay between rounds to not hammer Supabase

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs a single all-AI session through all 20 rounds automatically.
 * Saves each round's state to Supabase so the leaderboard updates live.
 * @param {object} [options]
 * @param {object} [options.demandContext] — passed to getDemandForRound
 * @param {string} [options.aiStyle] — ghost policy id
 */
export async function runAutoSession(sessionId, options = {}) {
  const demandCtx = options.demandContext ?? { profile: 'classic', seed: 1 };
  const aiStyle = options.aiStyle ?? 'standard';

  let game = createInitialGameState();

  for (let r = 0; r < 20; r++) {
    const demand = getDemandForRound(r, demandCtx);
    const orders = {};

    for (const role of ALL_ROLES) {
      orders[role] = ghostOrder(game.tiers[role], aiStyle);
    }

    game = advanceRound(game, orders, demand);

    await saveGameState(sessionId, game.round, game);
    await updateSession(sessionId, {
      round: game.round,
      status: game.round >= 20 || game.phase === 'gameover' ? 'finished' : 'playing',
    });
    await sleep(DELAY_MS);
  }

  await updateSession(sessionId, { round: 20, status: 'finished' });
  return game;
}

/**
 * Runs all sessions in a tournament that have all-AI roles in parallel.
 * Sessions with human players are skipped (they self-advance).
 */
export async function runAllAutoSessions(sessions, sessionGhostRoles, runOptions = {}) {
  const allAISessions = sessions.filter(s => {
    const ghosts = sessionGhostRoles?.[s.id] || [];
    return ghosts.length === 4;
  });

  if (allAISessions.length === 0) return;

  await Promise.all(allAISessions.map(s => runAutoSession(s.id, runOptions)));
}