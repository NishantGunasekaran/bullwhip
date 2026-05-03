import { useState, useEffect, useCallback } from 'react';
import {
  assignRandomLabelsToAllAiTeams,
  getTournamentSessions,
  getTakenRoles,
  startTournament,
  subscribeToTournamentSessions,
  subscribeToPlayers,
  updateSession,
} from './sessionService';
import { labelForAiStyle, labelForDemandProfile } from './demandProfilesMeta';

const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'];

export function TournamentLobby({ tournament, player, session, onGameStart, isCreator }) {
  const [teams, setTeams] = useState([]);
  /** Keeps team name text while typing; server polls would otherwise overwrite controlled inputs. */
  const [teamLabelDraftBySessionId, setTeamLabelDraftBySessionId] = useState({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sessionIds, setSessionIds] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const loadTeams = useCallback(async () => {
    if (!tournament?.id) return;
    try {
      const sessions = await getTournamentSessions(tournament.id);
      const teamsData = await Promise.all(
        sessions.map(async s => {
          const taken = await getTakenRoles(s.id);
          return { ...s, playerCount: taken.length };
        })
      );
      setTeams(teamsData);
      setSessionIds(sessions.map(s => s.id));
      setLoadError(null);
    } catch (err) {
      console.error('TournamentLobby loadTeams:', err);
      setLoadError(err?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [tournament]);

  useEffect(() => {
    if (!tournament?.id) return;
    queueMicrotask(() => {
      void loadTeams();
    });
  }, [tournament?.id, loadTeams]);

  useEffect(() => {
    if (!tournament?.id) return;
    const sub = subscribeToTournamentSessions(tournament.id, payload => {
      if (!isCreator && session &&
          payload.new?.id === session.id &&
          payload.new?.status === 'playing') {
        onGameStart({ ghostRoles: payload.new?.ghost_roles || [] });
      }
      loadTeams();
    });
    return () => sub.unsubscribe();
  }, [tournament?.id, session?.id, isCreator]);

  useEffect(() => {
    if (sessionIds.length === 0) return;
    const subs = sessionIds.map(sid => subscribeToPlayers(sid, () => loadTeams()));
    return () => subs.forEach(s => s.unsubscribe());
  }, [sessionIds.join(',')]);

  useEffect(() => {
    if (!tournament?.id) return;
    const interval = setInterval(loadTeams, 5000);
    return () => clearInterval(interval);
  }, [tournament?.id]);

  if (!tournament?.id) {
    return (
      <div className="ma-welcome ma-shell-enter">
        <div className="ma-welcome-body" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Loading tournament…
        </div>
      </div>
    );
  }

  const totalPlayers = teams.reduce((sum, t) => sum + t.playerCount, 0);
  const totalSlots = (tournament.num_teams ?? 0) * 4;

  const handleStart = async () => {
    setStarting(true);
    try {
      const freshSessions = await getTournamentSessions(tournament.id);
      const sessionGhostRoles = {};
      for (const s of freshSessions) {
        const taken = await getTakenRoles(s.id);
        sessionGhostRoles[s.id] = ROLES.filter(r => !taken.includes(r));
      }
      await startTournament(tournament.id);
      await assignRandomLabelsToAllAiTeams(tournament.id);
      const sessionsAfterLabels = await getTournamentSessions(tournament.id);
      const homeSession = sessionsAfterLabels[0];
      onGameStart({
        ghostRoles: sessionGhostRoles[homeSession?.id] || ROLES,
        allSessions: sessionsAfterLabels,
        sessionGhostRoles,
        homeSession,
      });
    } catch (err) {
      console.error('Failed to start:', err);
      setStarting(false);
    }
  };

  return (
    <div className="ma-welcome ma-shell-enter">
      <header className="ma-welcome-hero">
        <h1>Beer Game · Tournament</h1>
        <p>
          {isCreator
            ? 'Share the code. Start when ready — empty slots become AI.'
            : `You joined Team ${session?.team_number}. Waiting for the tournament to start...`}
        </p>
        <p style={{
          fontSize: '13px',
          opacity: 0.95,
          maxWidth: '36rem',
          margin: '0.75rem auto 0',
          lineHeight: 1.5,
        }}>
          <strong>Demand:</strong>{' '}
          {labelForDemandProfile(tournament.demand_profile ?? 'classic')}
          {' · '}
          <strong>AI style:</strong>{' '}
          {labelForAiStyle(tournament.ai_style ?? 'standard')}
        </p>
      </header>

      <div className="ma-welcome-body">

        {loadError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '13px',
            color: '#b91c1c',
          }}>
            ⚠️ {loadError}
          </div>
        )}

        {/* Code */}
        <div className="ma-welcome-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#5a6578', marginBottom: '0.75rem' }}>
            Tournament code:
          </p>
          <div style={{
            fontSize: '52px', fontWeight: 800, letterSpacing: '0.25em',
            color: '#1c2d4a', fontFamily: 'monospace', marginBottom: '0.5rem'
          }}>
            {tournament.code}
          </div>
          <p style={{ fontSize: '12px', color: '#5a6578' }}>
            Players → "Join Tournament" → enter this code
          </p>
        </div>

        {/* Progress summary */}
        <div style={{
          background: '#f0f7ff', border: '1px solid #bae6fd',
          borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '13px',
          color: '#0369a1', display: 'flex', justifyContent: 'space-between'
        }}>
          <span>
            <strong>{totalPlayers}</strong> of <strong>{totalSlots}</strong> players joined
          </span>
          <span style={{ fontSize: '11px', color: '#7dd3fc' }}>Updates automatically</span>
        </div>

        {/* Team cards — Bug 2 fix: show count only, NO role breakdown */}
        <div className="ma-welcome-card">
          <h2 style={{ marginBottom: '1rem' }}>{tournament.num_teams} teams</h2>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>
              Loading...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem'
            }}>
              {teams.map(team => {
                const isMyTeam = session?.id === team.id;
                const pct = (team.playerCount / 4) * 100;
                return (
                  <div key={team.id} style={{
                    padding: '1rem',
                    border: `2px solid ${isMyTeam ? '#2f6f9f' : 'rgba(28,45,74,0.15)'}`,
                    borderRadius: '10px',
                    background: isMyTeam ? '#f0f7ff' : '#f9fafb',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontWeight: 700, fontSize: '14px', marginBottom: '6px',
                      display: 'flex', justifyContent: 'center',
                      alignItems: 'center', gap: '6px'
                    }}>
                      Team {team.team_number}
                      {isMyTeam && (
                        <span style={{
                          fontSize: '10px', color: '#2f6f9f',
                          background: '#dbeafe', padding: '1px 6px',
                          borderRadius: '8px', fontWeight: 600
                        }}>
                          You
                        </span>
                      )}
                    </div>
                    {/* Only show count — Bug 2 fix */}
                    <div style={{
                      fontSize: '24px', fontWeight: 700,
                      color: team.playerCount === 4 ? '#059669' : '#1c2d4a',
                      marginBottom: '4px'
                    }}>
                      {team.playerCount}/4
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                      players joined
                    </div>
                    <div style={{ background: '#e5e7eb', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: isMyTeam ? '#2f6f9f' : '#9ca3af',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                    {isCreator && (
                      <label style={{
                        display: 'block',
                        marginTop: '10px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#5a6578',
                      }}>
                        Team name (optional)
                        <input
                          type="text"
                          maxLength={48}
                          placeholder="e.g. Thirsty Trucks"
                          value={
                            teamLabelDraftBySessionId[team.id] !== undefined
                              ? teamLabelDraftBySessionId[team.id]
                              : (team.team_label ?? '')
                          }
                          onChange={e => {
                            const v = e.target.value;
                            setTeamLabelDraftBySessionId(prev => ({ ...prev, [team.id]: v }));
                          }}
                          onBlur={async e => {
                            const raw = teamLabelDraftBySessionId[team.id] !== undefined
                              ? teamLabelDraftBySessionId[team.id]
                              : e.target.value;
                            const v = String(raw ?? '').trim();
                            try {
                              await updateSession(team.id, { team_label: v || null });
                              setLoadError(null);
                              setTeamLabelDraftBySessionId(prev => {
                                const next = { ...prev };
                                delete next[team.id];
                                return next;
                              });
                              setTeams(prev =>
                                prev.map(x =>
                                  x.id === team.id ? { ...x, team_label: v || null } : x
                                )
                              );
                            } catch (err) {
                              setLoadError(
                                err?.message ||
                                  'Could not save team name. Add column sessions.team_label (see supabase/migrations).'
                              );
                            }
                          }}
                          style={{
                            width: '100%',
                            marginTop: '4px',
                            padding: '8px 10px',
                            fontSize: '13px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bug 2 fix: player card shows NO role info */}
        {player && session && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: '10px', padding: '1rem',
            textAlign: 'center', fontSize: '14px'
          }}>
            ✅ You joined <strong>Team {session.team_number}</strong>.
            Your role will be revealed when the game starts. 🎭
          </div>
        )}

        {isCreator && (
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '0.75rem',
            lineHeight: 1.5,
          }}>
            Name each team if you like. Teams with only AI players get a random silly name when you
            start — you can edit names above until then.
          </div>
        )}

        {/* Ghost notice */}
        {isCreator && totalSlots - totalPlayers > 0 && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: '10px', padding: '1rem',
            fontSize: '13px', color: '#78350f'
          }}>
            🤖 <strong>{totalSlots - totalPlayers}</strong> empty slot
            {totalSlots - totalPlayers !== 1 ? 's' : ''} will be AI players.
          </div>
        )}

        {isCreator && (
          <div className="ma-welcome-actions">
            <button
              type="button"
              className="ma-btn-start"
              onClick={handleStart}
              disabled={starting}
              style={{ opacity: starting ? 0.6 : 1 }}
            >
              {starting ? 'Starting...' : `Start · ${tournament.num_teams} teams →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}