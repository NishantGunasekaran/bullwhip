import { useState, useEffect } from 'react';
import { getPlayers, subscribeToPlayers, updateSession } from './sessionService';

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

export function MultiplayerLobby({ session, player, onGameStart }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const isInstructor = !player;

  useEffect(() => {
    const load = async () => {
      const data = await getPlayers(session.id);
      setPlayers(data);
      setLoading(false);
    };
    load();

    const sub = subscribeToPlayers(session.id, async () => {
      const data = await getPlayers(session.id);
      setPlayers(data);
    });

    return () => sub.unsubscribe();
  }, [session.id]);

  const joinedRoles = players.map(p => p.role);
  const ghostRoles = ROLES.filter(r => !joinedRoles.includes(r));
  const humanCount = joinedRoles.length;

  const handleStartGame = async () => {
    setStarting(true);
    // Save which roles are ghosts so the game knows
    await updateSession(session.id, {
      status: 'playing',
      ghost_roles: ghostRoles  // store ghost roles in session
    });
    onGameStart({ ghostRoles });
  };

  if (loading) {
    return (
      <div className="ma-welcome">
        <div className="ma-welcome-body">
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ma-muted)' }}>
            Loading session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ma-welcome">
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
              const isGhost = !joined;
              return (
                <div
                  key={role}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${joined
                      ? ROLE_COLOR[role]
                      : 'rgba(28,45,74,0.15)'}`,
                    borderRadius: '10px',
                    background: joined
                      ? `${ROLE_COLOR[role]}10`
                      : '#f9fafb',
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
                      {joined
                        ? `✅ ${joined.player_name}`
                        : '🤖 Will be AI ghost'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Your role indicator (for players) */}
        {player && (
          <div style={{
            background: `${ROLE_COLOR[player.role]}15`,
            border: `1px solid ${ROLE_COLOR[player.role]}`,
            borderRadius: '10px',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            You joined as{' '}
            <strong style={{
              textTransform: 'capitalize',
              color: ROLE_COLOR[player.role]
            }}>
              {player.role}
            </strong>
            {' '}— waiting for the instructor to start.
          </div>
        )}

        {/* Ghost roles notice */}
        {ghostRoles.length > 0 && isInstructor && (
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
            will be managed by AI using an order-up-to policy. You can start now or wait for more players.
          </div>
        )}

        {/* Start button — instructor only */}
        {isInstructor && (
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