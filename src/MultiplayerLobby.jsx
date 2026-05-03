import { useState, useEffect } from 'react';
import {
  getPlayers,
  subscribeToPlayers,
  updateSession,
  joinSessionWithRole,
  subscribeToSession,
} from './sessionService';

const ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'];

const ROLE_COLOR = {
  retailer: '#4a6fa5',
  wholesaler: '#2a6f62',
  distributor: '#9a7b2c',
  factory: '#b54a3f',
};

const LETTER = {
  retailer: 'R',
  wholesaler: 'W',
  distributor: 'D',
  factory: 'F',
};

const ROLE_BLURB = {
  retailer: 'End-customer demand',
  wholesaler: 'Supplies retailer',
  distributor: 'Supplies wholesaler',
  factory: 'Production & lead time',
};

export function MultiplayerLobby({ session, player, onGameStart, onJoinAsPlayer, isCreator }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [joiningRole, setJoiningRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joinError, setJoinError] = useState(null);
  const [showJoinSection, setShowJoinSection] = useState(false);

  // isCreator = created the session (always true for the person who made it)
  // isInstructor = no player role yet (pure observer)
  // Both can start the game
  const isInstructor = !player;
  const canStartGame = isCreator || isInstructor;

  useEffect(() => {
    const load = async () => {
      const data = await getPlayers(session.id);
      setPlayers(data);
      setLoading(false);
    };
    load();

    // Subscribe to new players joining
    const playerSub = subscribeToPlayers(session.id, async () => {
      const data = await getPlayers(session.id);
      setPlayers(data);
    });

    // Subscribe to session status — when instructor starts,
    // all waiting players automatically transition to the game
    const sessionSub = subscribeToSession(session.id, (payload) => {
      if (payload.new?.status === 'playing') {
        const ghostRoles = payload.new?.ghost_roles || [];
        onGameStart({ ghostRoles });
      }
    });

    return () => {
      playerSub.unsubscribe();
      sessionSub.unsubscribe();
    };
  }, [session.id]);

  const joinedRoles = players.map(p => p.role);
  const ghostRoles = ROLES.filter(r => !joinedRoles.includes(r));
  const humanCount = joinedRoles.length;

  const handleStartGame = async () => {
    setStarting(true);
    const currentGhostRoles = ROLES.filter(r => !players.map(p => p.role).includes(r));
    await updateSession(session.id, {
      status: 'playing',
      ghost_roles: currentGhostRoles
    });
    onGameStart({ ghostRoles: currentGhostRoles });
  };

  const handleJoinAsPlayer = async () => {
    if (!joiningRole) return;
    setJoinError(null);

    try {
      const name = playerName.trim() || 'Instructor';
      const newPlayer = await joinSessionWithRole(
        session.id,
        session.code,
        joiningRole,
        name.trim() || 'Instructor'
      );
      onJoinAsPlayer(newPlayer);
      setShowJoinSection(false);
    } catch (err) {
      setJoinError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="ma-welcome ma-shell-enter">
        <div className="ma-welcome-body">
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ma-muted)' }}>
            Loading session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ma-welcome ma-shell-enter">
      <header className="ma-welcome-hero">
        <h1>Beer Game</h1>
        <p>
          {isInstructor
            ? 'Share the code below with your players. Start when ready.'
            : 'Waiting for the instructor to start the game...'}
        </p>
      </header>

      <div className="ma-welcome-body">

        {/* Session code */}
        <div className="ma-welcome-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#5a6578', marginBottom: '0.75rem' }}>
            Share this code with players:
          </p>
          <div style={{
            fontSize: '52px',
            fontWeight: 800,
            letterSpacing: '0.25em',
            color: '#1c2d4a',
            fontFamily: 'monospace',
            marginBottom: '0.5rem'
          }}>
            {session.code}
          </div>
          <p style={{ fontSize: '12px', color: '#5a6578' }}>
            Players go to the game URL → "Join Session" → enter this code
          </p>
        </div>

        {/* Player slots */}
        <div className="ma-welcome-card">
          <h2 style={{ marginBottom: '0.5rem' }}>
            Players joined ({humanCount} / 4)
          </h2>
          <p style={{ fontSize: '13px', color: '#5a6578', marginBottom: '1rem' }}>
            Empty slots will be filled by AI ghost players automatically.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}>
            {ROLES.map(role => {
              const joined = players.find(p => p.role === role);
              return (
                <div
                  key={role}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${joined ? ROLE_COLOR[role] : 'rgba(28,45,74,0.15)'}`,
                    borderRadius: '10px',
                    background: joined ? `${ROLE_COLOR[role]}10` : '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <span style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    background: joined ? ROLE_COLOR[role] : '#d1d5db',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, flexShrink: 0
                  }}>
                    {LETTER[role]}
                  </span>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      color: joined ? ROLE_COLOR[role] : '#9ca3af'
                    }}>
                      {role}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {joined ? `✅ ${joined.player_name}` : '🤖 Will be AI ghost'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Instructor: join as a player */}
        {canStartGame && !player && (
          <div className="ma-welcome-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: showJoinSection ? '1rem' : 0
            }}>
              <div>
                <h2 style={{ marginBottom: '2px' }}>Join as a player</h2>
                <p style={{ fontSize: '13px', color: '#5a6578' }}>
                  Play one of the roles yourself
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowJoinSection(prev => !prev);
                  setJoinError(null);
                  setJoiningRole(null);
                }}
                style={{
                  padding: '6px 14px',
                  border: '1px solid rgba(28,45,74,0.2)',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1c2d4a'
                }}
              >
                {showJoinSection ? 'Cancel' : '+ Join a role'}
              </button>
            </div>

            {showJoinSection && (
              <>
                {/* Name input */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    fontSize: '13px', fontWeight: 600,
                    display: 'block', marginBottom: '6px'
                  }}>
                    Your name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '2px solid #d1d5db', borderRadius: '8px',
                      fontSize: '14px', fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Role picker — only show available roles */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    fontSize: '13px', fontWeight: 600,
                    display: 'block', marginBottom: '8px'
                  }}>
                    Pick an available role
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem'
                  }}>
                    {ROLES.map(role => {
                      const taken = joinedRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={taken}
                          onClick={() => !taken && setJoiningRole(role)}
                          style={{
                            padding: '0.75rem',
                            border: `2px solid ${joiningRole === role
                              ? ROLE_COLOR[role]
                              : taken ? '#e5e7eb' : 'rgba(28,45,74,0.15)'}`,
                            borderRadius: '10px',
                            background: taken ? '#f3f4f6'
                              : joiningRole === role
                                ? `${ROLE_COLOR[role]}12`
                                : 'white',
                            cursor: taken ? 'not-allowed' : 'pointer',
                            opacity: taken ? 0.5 : 1,
                            textAlign: 'left'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{
                              width: '26px', height: '26px',
                              borderRadius: '50%',
                              background: taken ? '#9ca3af' : ROLE_COLOR[role],
                              color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 700, flexShrink: 0
                            }}>
                              {LETTER[role]}
                            </span>
                            <div>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                textTransform: 'capitalize'
                              }}>
                                {role}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                {taken ? 'Already taken' : ROLE_BLURB[role]}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Error message */}
                {joinError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '13px',
                    color: '#dc2626',
                    marginBottom: '1rem'
                  }}>
                    ⚠️ {joinError}
                  </div>
                )}

                {/* Join button */}
                <button
                  type="button"
                  onClick={handleJoinAsPlayer}
                  disabled={!joiningRole}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: joiningRole ? ROLE_COLOR[joiningRole] : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: joiningRole ? 'pointer' : 'not-allowed',
                    textTransform: 'capitalize'
                  }}
                >
                  {joiningRole
                    ? `Join as ${joiningRole} →`
                    : 'Select a role to join'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Ghost roles notice */}
        {ghostRoles.length > 0 && canStartGame && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '1rem',
            fontSize: '13px',
            color: '#78350f'
          }}>
            <strong>🤖 {ghostRoles.length} ghost player{ghostRoles.length > 1 ? 's' : ''}:</strong>{' '}
            <span style={{ textTransform: 'capitalize' }}>
              {ghostRoles.join(', ')}
            </span>{' '}
            will be managed by AI. You can start now or wait for more players.
          </div>
        )}

        {/* Your role indicator for players */}
        {player && isCreator && (
          <div style={{
            background: `${ROLE_COLOR[player.role]}15`,
            border: `1px solid ${ROLE_COLOR[player.role]}`,
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            ✅ You are playing as{' '}
            <strong style={{
              textTransform: 'capitalize',
              color: ROLE_COLOR[player.role]
            }}>
              {player.role}
            </strong>
            {' '}— click Start when ready.
          </div>
        )}

        {/* Start button — creator always sees this */}
        {canStartGame && (
          <div className="ma-welcome-actions">
            <button
              type="button"
              className="ma-btn-start"
              onClick={handleStartGame}
              disabled={starting}
              style={{ opacity: starting ? 0.6 : 1 }}
            >
              {starting
                ? 'Starting...'
                : humanCount === 4
                  ? 'Start game →'
                  : `Start with ${humanCount} player${humanCount !== 1 ? 's' : ''} + ${ghostRoles.length} AI →`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}