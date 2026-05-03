import { supabase } from './supabase';
import { TIERS } from './gameState';
import { randomSillyTeamName } from './sillyTeamNames';

/**
 * Sum of tier total costs, with fallback to costHistory if cumulative totals are missing
 * (e.g. older snapshots or JSON shape quirks from the database).
 */
export function totalCostFromGameState(gs) {
  if (!gs?.tiers) return 0;
  let sum = 0;
  for (const t of TIERS) {
    const tier = gs.tiers[t];
    if (!tier) continue;
    const v = Number(tier.totalCost);
    if (Number.isFinite(v)) sum += v;
  }
  if (sum > 0) return Math.round(sum);

  let fromHist = 0;
  for (const t of TIERS) {
    const ch = gs.tiers[t]?.costHistory;
    if (Array.isArray(ch)) {
      fromHist += ch.reduce((a, v) => a + (Number(v) || 0), 0);
    }
  }
  return Math.round(fromHist);
}

const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'];

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// ─── Auto-assign role ─────────────────────────────────────────
async function getNextAvailableRole(sessionId) {
  const { data } = await supabase
    .from('players')
    .select('role')
    .eq('session_id', sessionId);

  const taken = (data || []).map(p => p.role);
  const available = ROLES.filter(r => !taken.includes(r));

  if (available.length === 0) throw new Error('Session is full.');

  // Assign randomly from available roles
  return available[Math.floor(Math.random() * available.length)];
}

// ─── Sessions ─────────────────────────────────────────────────
export async function createSession(tournamentId = null, teamNumber = null) {
  const code = generateCode();
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      code,
      status: 'lobby',
      round: 0,
      ghost_roles: [],
      tournament_id: tournamentId,
      team_number: teamNumber,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data;
}

export async function joinSession(code, playerName) {
  // Find session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (sessionError || !session) throw new Error('Session not found. Check the code and try again.');
  if (session.status === 'finished') throw new Error('This session has already finished.');

  // Auto-assign role
  const role = await getNextAvailableRole(session.id);

  // Join with assigned role
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      session_id: session.id,
      role,
      player_name: playerName,
    })
    .select()
    .single();

  if (playerError) throw new Error(`Failed to join: ${playerError.message}`);
  return { session, player };
}

export async function joinSessionWithRole(sessionId, code, role, playerName) {
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('session_id', sessionId)
    .eq('role', role)
    .single();

  if (existing) throw new Error(`The ${role} role is already taken.`);

  const { data: player, error } = await supabase
    .from('players')
    .insert({ session_id: sessionId, role, player_name: playerName })
    .select()
    .single();

  if (error) throw new Error(`Failed to join: ${error.message}`);
  return player;
}

export async function getPlayers(sessionId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId);
  if (error) throw new Error(`Failed to get players: ${error.message}`);
  return data || [];
}

export async function getTakenRoles(sessionId) {
  const { data } = await supabase
    .from('players')
    .select('role')
    .eq('session_id', sessionId);
  return (data || []).map(p => p.role);
}

export async function submitOrder(sessionId, round, role, orderQty) {
  const { error } = await supabase
    .from('orders_submitted')
    .upsert({
      session_id: sessionId,
      round,
      role,
      order_qty: orderQty,
    }, { onConflict: 'session_id,round,role' });
  if (error) throw new Error(`Failed to submit order: ${error.message}`);
}

export async function getOrdersForRound(sessionId, round) {
  const { data, error } = await supabase
    .from('orders_submitted')
    .select('*')
    .eq('session_id', sessionId)
    .eq('round', round);
  if (error) throw new Error(`Failed to get orders: ${error.message}`);
  return data || [];
}

export async function saveGameState(sessionId, round, gameState) {
  const { error } = await supabase
    .from('game_rounds')
    .insert({ session_id: sessionId, round, game_state: gameState });
  if (error) throw new Error(`Failed to save game state: ${error.message}`);
}

export async function getLatestGameState(sessionId) {
  const { data } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('round', { ascending: false })
    .limit(1)
    .single();
  return data?.game_state || null;
}

export async function updateSession(sessionId, updates) {
  const { error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId);
  if (error) throw new Error(`Failed to update session: ${error.message}`);
}

// ─── Tournaments ──────────────────────────────────────────────
export async function createTournament(numTeams, opts = {}) {
  const code = generateCode(6);
  const demand_profile = opts.demandProfile ?? opts.demand_profile ?? 'classic';
  const ai_style = opts.aiStyle ?? opts.ai_style ?? 'standard';

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      code,
      num_teams: numTeams,
      status: 'lobby',
      demand_profile,
      ai_style,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create tournament: ${error.message}`);

  // Create one session per team
  const sessions = [];
  for (let i = 1; i <= numTeams; i++) {
    const session = await createSession(tournament.id, i);
    sessions.push(session);
  }

  return { tournament, sessions };
}

export async function getTournamentSessions(tournamentId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('team_number');
  if (error) throw new Error(`Failed to get sessions: ${error.message}`);
  return data || [];
}

export async function joinTournament(code, playerName) {
  // Find the tournament
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (error || !tournament) throw new Error('Tournament not found. Check the code.');
  if (tournament.status === 'finished') throw new Error('This tournament has already finished.');

  // Get all sessions for this tournament
  const sessions = await getTournamentSessions(tournament.id);

  // Find a session that isn't full yet
  for (const session of sessions) {
    const taken = await getTakenRoles(session.id);
    if (taken.length < 4) {
      // Join this session with auto-assigned role
      const available = ROLES.filter(r => !taken.includes(r));
      const role = available[Math.floor(Math.random() * available.length)];

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ session_id: session.id, role, player_name: playerName })
        .select()
        .single();

      if (playerError) throw new Error(`Failed to join: ${playerError.message}`);
      return { tournament, session, player };
    }
  }

  throw new Error('All teams are full.');
}

export async function startTournament(tournamentId) {
  // Start all sessions in the tournament simultaneously
  const sessions = await getTournamentSessions(tournamentId);

  for (const session of sessions) {
    const taken = await getTakenRoles(session.id);
    const ghostRoles = ROLES.filter(r => !taken.includes(r));
    await updateSession(session.id, {
      status: 'playing',
      ghost_roles: ghostRoles
    });
  }

  await supabase
    .from('tournaments')
    .update({ status: 'playing' })
    .eq('id', tournamentId);
}

/** All-human slots empty: assign a random silly display name (requires sessions.team_label column). */
export async function assignRandomLabelsToAllAiTeams(tournamentId) {
  const sessions = await getTournamentSessions(tournamentId);
  for (const session of sessions) {
    const taken = await getTakenRoles(session.id);
    if (taken.length > 0) continue;
    if (session.team_label && String(session.team_label).trim()) continue;
    const label = randomSillyTeamName();
    try {
      await updateSession(session.id, { team_label: label });
    } catch (e) {
      console.warn(
        'assignRandomLabelsToAllAiTeams: add column team_label on sessions (see supabase/migrations) or RLS may block update:',
        e
      );
    }
  }
}

export async function getTournamentLeaderboard(tournamentId) {
  const sessions = await getTournamentSessions(tournamentId);

  const leaderboard = await Promise.all(sessions.map(async (session) => {
    const gameState = await getLatestGameState(session.id);
    const players = await getPlayers(session.id);

    let totalCost = 0;
    let round = 0;

    if (gameState) {
      totalCost = totalCostFromGameState(gameState);
      round = gameState.round ?? 0;
    }

    return {
      teamNumber: session.team_number,
      sessionId: session.id,
      teamLabel: session.team_label ?? null,
      status: session.status,
      totalCost,
      round,
      players: players.map(p => ({ name: p.player_name, role: p.role })),
    };
  }));

  // Sort by cost (lowest = best)
  return leaderboard.sort((a, b) => a.totalCost - b.totalCost);
}

// ─── Subscriptions ────────────────────────────────────────────
export function subscribeToPlayers(sessionId, callback) {
  return supabase
    .channel(`players:${sessionId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'players',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}

export function subscribeToOrders(sessionId, callback) {
  const filter = `session_id=eq.${sessionId}`;
  return supabase
    .channel(`orders:${sessionId}`)
    // upsert() often emits UPDATE on conflict, not INSERT — both must advance the round
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'orders_submitted', filter,
    }, callback)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'orders_submitted', filter,
    }, callback)
    .subscribe();
}

export function subscribeToSession(sessionId, callback) {
  return supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'sessions',
      filter: `id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}

export function subscribeToGameRounds(sessionId, callback) {
  return supabase
    .channel(`game_rounds:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'game_rounds',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}

export function subscribeToTournamentSessions(tournamentId, callback) {
  return supabase
    .channel(`tournament:${tournamentId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'sessions',
      filter: `tournament_id=eq.${tournamentId}`,
    }, callback)
    .subscribe();
}