import { supabase } from './supabase';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export async function createSession() {
  const code = generateCode();
  const { data, error } = await supabase
    .from('sessions')
    .insert({ code, status: 'lobby', round: 0, ghost_roles: [] })
    .select()
    .single();
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data;
}

export async function joinSession(code, role, playerName) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (sessionError || !session) throw new Error('Session not found. Check the code and try again.');
  if (session.status === 'finished') throw new Error('This session has already finished.');

  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('session_id', session.id)
    .eq('role', role)
    .single();

  if (existing) throw new Error(`The ${role} role is already taken in this session.`);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ session_id: session.id, role, player_name: playerName })
    .select()
    .single();

  if (playerError) throw new Error(`Failed to join session: ${playerError.message}`);
  return { session, player };
}

export async function getPlayers(sessionId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId);
  if (error) throw new Error(`Failed to get players: ${error.message}`);
  return data;
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
  const { data, error } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('round', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data?.game_state || null;
}

export async function updateSession(sessionId, updates) {
  const { error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId);
  if (error) throw new Error(`Failed to update session: ${error.message}`);
}

export function subscribeToPlayers(sessionId, callback) {
  return supabase
    .channel(`players:${sessionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}

export function subscribeToOrders(sessionId, callback) {
  return supabase
    .channel(`orders:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders_submitted',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}

export function subscribeToSession(sessionId, callback) {
  return supabase
    .channel(`session:${sessionId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}

export function subscribeToGameRounds(sessionId, callback) {
  return supabase
    .channel(`game_rounds:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'game_rounds',
      filter: `session_id=eq.${sessionId}`,
    }, callback)
    .subscribe();
}