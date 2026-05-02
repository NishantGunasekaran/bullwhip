import { useState } from 'react';
import {
  createSession,
  joinSession,
  getTakenRoles
} from './sessionService';

const ROLES = [
  { name: 'retailer',    letter: 'R', title: 'Retailer',    blurb: 'End-customer demand',       color: '#4a6fa5' },
  { name: 'wholesaler',  letter: 'W', title: 'Wholesaler',  blurb: 'Supplies retailer',          color: '#2a6f62' },
  { name: 'distributor', letter: 'D', title: 'Distributor', blurb: 'Supplies wholesaler',        color: '#9a7b2c' },
  { name: 'factory',     letter: 'F', title: 'Factory',     blurb: 'Production & lead time',     color: '#b54a3f' },
];

export function WelcomeScreen({ onStart }) {
  const [mode, setMode] = useState(null); // 'solo' | 'full' | 'create' | 'join'
  const [selectedRole, setSelectedRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [takenRoles, setTakenRoles] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // When join mode and code changes, fetch taken roles
  const handleCodeChange = async (code) => {
    setJoinCode(code);
    setSelectedRole(null);
    setError(null);
    if (code.length === 6) {
      try {
        const { data: session } = await import('./supabase').then(m =>
          m.supabase.from('sessions').select('id').eq('code', code.toUpperCase()).single()
        );
        if (session) {
          setSessionId(session.id);
          const taken = await getTakenRoles(session.id);
          setTakenRoles(taken);
        }
      } catch {
        setTakenRoles([]);
      }
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      if (mode === 'solo') {
        onStart({ mode: 'solo', playerRole: selectedRole });

      } else if (mode === 'full') {
        onStart({ mode: 'full', playerRole: null });

      } else if (mode === 'create') {
        // Instructor creates a session
        const session = await createSession();
        onStart({ mode: 'multiplayer', playerRole: null, session, player: null });

      } else if (mode === 'join') {
        // Player joins a session
        const name = playerName.trim() || 'Player';
        const { session, player } = await joinSession(joinCode, selectedRole, name);
        onStart({ mode: 'multiplayer', playerRole: selectedRole, session, player });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canStart =
    (mode === 'solo' && selectedRole) ||
    (mode === 'full') ||
    (mode === 'create') ||
    (mode === 'join' && selectedRole && joinCode.length === 6);

  const startLabel = () => {
    if (loading) return 'Please wait...';
    if (mode === 'solo' && selectedRole)
      return `Play as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} →`;
    if (mode === 'full') return 'Start full game →';
    if (mode === 'create') return 'Create session →';
    if (mode === 'join' && canStart) return 'Join session →';
    return 'Select a mode to start';
  };

  return (
    <div className="ma-welcome">
      <header className="ma-welcome-hero">
        <h1>Beer Game</h1>
        <p>
          Board-style supply chain simulation — see how small demand changes become
          large order swings upstream (bullwhip effect).
        </p>
      </header>

      <div className="ma-welcome-body">

        {/* How it works */}
        <div className="ma-welcome-card">
          <h2>How it works</h2>
          <ol>
            <li>Each week: receive goods, read orders, ship, then order upstream.</li>
            <li>Transport and order delays: <strong>2 weeks each</strong>.</li>
            <li>Holding <strong>₹0.50</strong>/unit/week · Backlog <strong>₹1.00</strong>/unit/week.</li>
            <li>Smooth start: stock <strong>12</strong>, <strong>4</strong> in each pipeline slot.</li>
            <li>Goal: <strong>lowest total system cost</strong> over 20 weeks.</li>
          </ol>
        </div>

        {/* Mode selection */}
        <div className="ma-welcome-card">
          <h2>Choose your mode</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginTop: '1rem'
          }}>
            {[
              {
                key: 'solo',
                icon: '🎮',
                title: 'Solo Play',
                blurb: 'You control one role. AI manages the other 3 tiers.'
              },
              {
                key: 'full',
                icon: '🎯',
                title: 'Full Control',
                blurb: 'You control all 4 roles. Great for demos.'
              },
              {
                key: 'create',
                icon: '🏫',
                title: 'Create Session',
                blurb: 'Instructor: create a session and share the code.'
              },
              {
                key: 'join',
                icon: '🔗',
                title: 'Join Session',
                blurb: 'Player: enter a session code from your instructor.'
              },
            ].map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => { setMode(m.key); setSelectedRole(null); setError(null); }}
                style={{
                  padding: '1rem',
                  border: `2px solid ${mode === m.key ? '#2f6f9f' : 'rgba(28,45,74,0.2)'}`,
                  borderRadius: '10px',
                  background: mode === m.key ? '#f0f7ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                  {m.icon} {m.title}
                </div>
                <div style={{ fontSize: '12px', color: '#5a6578', lineHeight: 1.5 }}>
                  {m.blurb}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Solo: role picker */}
        {mode === 'solo' && (
          <div className="ma-welcome-card">
            <h2>Pick your role</h2>
            <p style={{ fontSize: '13px', color: '#5a6578', margin: '0.5rem 0 1rem' }}>
              AI ghost players will manage the other 3 tiers automatically.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {ROLES.map(role => (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => setSelectedRole(role.name)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${selectedRole === role.name ? role.color : 'rgba(28,45,74,0.15)'}`,
                    borderRadius: '10px',
                    background: selectedRole === role.name ? `${role.color}12` : 'white',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: role.color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, flexShrink: 0
                    }}>
                      {role.letter}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{role.title}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#5a6578', lineHeight: 1.5, margin: 0 }}>
                    {role.blurb}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create session: nothing extra to fill */}
        {mode === 'create' && (
          <div className="ma-welcome-card" style={{
            background: '#f0f7ff',
            border: '1px solid #bae6fd'
          }}>
            <h2 style={{ color: '#0c4a6e' }}>Creating a session</h2>
            <p style={{ fontSize: '13px', color: '#0369a1', marginTop: '0.5rem', lineHeight: 1.6 }}>
              Click "Create session" below. You'll get a 6-digit code to share
              with your 4 players. Once all players join, you can start the game.
            </p>
          </div>
        )}

        {/* Join session: code input + role picker */}
        {mode === 'join' && (
          <div className="ma-welcome-card">
            <h2>Join a session</h2>

            <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
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

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Session code
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit code (e.g. X7M3K9)"
                value={joinCode}
                onChange={e => handleCodeChange(e.target.value.toUpperCase())}
                maxLength={6}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '2px solid #d1d5db', borderRadius: '8px',
                  fontSize: '18px', fontFamily: 'monospace',
                  letterSpacing: '0.2em', textTransform: 'uppercase'
                }}
              />
            </div>

            {joinCode.length === 6 && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Pick your role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {ROLES.map(role => {
                    const taken = takenRoles.includes(role.name);
                    return (
                      <button
                        key={role.name}
                        type="button"
                        disabled={taken}
                        onClick={() => !taken && setSelectedRole(role.name)}
                        style={{
                          padding: '0.75rem',
                          border: `2px solid ${selectedRole === role.name
                            ? role.color
                            : taken ? '#e5e7eb' : 'rgba(28,45,74,0.15)'}`,
                          borderRadius: '10px',
                          background: taken ? '#f3f4f6'
                            : selectedRole === role.name ? `${role.color}12` : 'white',
                          cursor: taken ? 'not-allowed' : 'pointer',
                          opacity: taken ? 0.5 : 1,
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: taken ? '#9ca3af' : role.color,
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 700, flexShrink: 0
                          }}>
                            {role.letter}
                          </span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>
                              {role.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                              {taken ? 'Already taken' : role.blurb}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '13px',
            color: '#dc2626'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Start button */}
        <div className="ma-welcome-actions">
          <button
            type="button"
            className="ma-btn-start"
            onClick={handleStart}
            disabled={!canStart || loading}
            style={{
              opacity: !canStart || loading ? 0.4 : 1,
              cursor: !canStart || loading ? 'not-allowed' : 'pointer'
            }}
          >
            {startLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}