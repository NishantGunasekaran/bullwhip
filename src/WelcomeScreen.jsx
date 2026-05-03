import { useState, useMemo, useCallback } from 'react';
import {
  createSession,
  createTournament,
  joinSession,
  joinTournament,
} from './sessionService';
import { hashStringToSeed } from './demandCurve';
import {
  AI_STYLE_OPTIONS,
  DEMAND_PROFILE_OPTIONS,
  getAiStyleOption,
  getDemandProfileOption,
} from './demandProfilesMeta';

const SOLO_ROLES = [
  { name: 'retailer', letter: 'R', color: '#4a6fa5', blurb: 'End-customer demand' },
  { name: 'wholesaler', letter: 'W', color: '#2a6f62', blurb: 'Supplies retailer' },
  { name: 'distributor', letter: 'D', color: '#9a7b2c', blurb: 'Supplies wholesaler' },
  { name: 'factory', letter: 'F', color: '#b54a3f', blurb: 'Production & lead time' },
];

const WELCOME_MODE_TILES = [
  { key: 'solo', icon: '🎮', title: 'Solo Play', blurb: 'You control one role. AI manages the other 3.' },
  { key: 'full', icon: '🎯', title: 'Full Control', blurb: 'Control all 4 roles. Great for demos.' },
  { key: 'create', icon: '🏫', title: 'Create Session', blurb: 'Instructor: create a 4-player session.' },
  { key: 'join', icon: '🔗', title: 'Join Session', blurb: 'Enter a session code. Role auto-assigned.' },
  { key: 'tournament_create', icon: '🏆', title: 'Create Tournament', blurb: 'Multiple teams compete simultaneously.' },
  { key: 'tournament_join', icon: '🎽', title: 'Join Tournament', blurb: 'Enter a code. Auto-assigned to a team and role.' },
];

const TOURNAMENT_TEAM_COUNTS = [2, 3, 4, 5, 6, 8];

const META_HINT_STYLE = {
  fontSize: '12px',
  color: '#5a6578',
  lineHeight: 1.55,
  background: '#f9fafb',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
};

export function WelcomeScreen({ onStart }) {
  const [mode, setMode] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [numTeams, setNumTeams] = useState(2);
  const [demandProfile, setDemandProfile] = useState('classic');
  const [aiStyle, setAiStyle] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demandSel = getDemandProfileOption(demandProfile);
  const aiSel = getAiStyleOption(aiStyle);

  const canStart = useMemo(
    () =>
      (mode === 'solo' && selectedRole && playerName.trim()) ||
      mode === 'full' ||
      (mode === 'create' && playerName.trim()) ||
      (mode === 'join' && playerName.trim() && joinCode.length === 6) ||
      mode === 'tournament_create' ||
      (mode === 'tournament_join' && playerName.trim() && joinCode.length === 6),
    [mode, selectedRole, playerName, joinCode]
  );

  const selectMode = useCallback((key) => {
    setMode(key);
    setError(null);
    setJoinCode('');
    setSelectedRole(null);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      if (mode === 'solo') {
        const demandSeed = hashStringToSeed(`${playerName.trim()}|${selectedRole}|solo`);
        onStart({
          mode: 'solo',
          playerRole: selectedRole,
          playerName: playerName.trim(),
          demandProfile,
          aiStyle,
          demandSeed,
        });

      } else if (mode === 'full') {
        onStart({ mode: 'full', playerRole: null });

      } else if (mode === 'create') {
        const session = await createSession();
        onStart({
          mode: 'multiplayer',
          playerRole: null,
          session,
          player: null,
          isCreator: true,
        });

      } else if (mode === 'join') {
        const { session, player } = await joinSession(joinCode, playerName.trim());
        onStart({
          mode: 'multiplayer',
          playerRole: player.role,
          session,
          player,
          isCreator: false,
        });

      } else if (mode === 'tournament_create') {
        const { tournament, sessions } = await createTournament(numTeams, {
          demandProfile,
          aiStyle,
        });
        if (tournament == null || tournament.id == null || tournament.id === '' || !tournament.code) {
          throw new Error(
            'Tournament was created but the server response was incomplete. Check Supabase RLS policies allow read after insert on tournaments.'
          );
        }
        onStart({
          mode: 'tournament',
          tournament,
          sessions,
          player: null,
          session: null,
          isCreator: true,
        });

      } else if (mode === 'tournament_join') {
        const { tournament, session, player } = await joinTournament(
          joinCode,
          playerName.trim()
        );
        onStart({
          mode: 'tournament',
          tournament,
          sessions: null,
          session,
          player,
          playerRole: player.role,
          isCreator: false,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startLabel = () => {
    if (loading) return 'Please wait...';
    if (mode === 'solo' && selectedRole) return `Play as ${selectedRole} →`;
    if (mode === 'full') return 'Start full game →';
    if (mode === 'create') return 'Create session →';
    if (mode === 'join') return 'Join session →';
    if (mode === 'tournament_create') return `Create tournament (${numTeams} teams) →`;
    if (mode === 'tournament_join') return 'Join tournament →';
    return 'Select a mode to start';
  };

  return (
    <div className="ma-welcome ma-shell-enter">
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
            <li>Goal: <strong>lowest total system cost</strong> over 20 weeks.</li>
          </ol>
        </div>

        {/* Shared demand & AI — used for solo play and tournaments you create */}
        <div className="ma-welcome-card">
          <h2>Demand & AI</h2>
          <p style={{ fontSize: '13px', color: '#5a6578', margin: '0.5rem 0 1.25rem', lineHeight: 1.6 }}>
            These apply to <strong>solo play</strong> (your AI teammates) and <strong>tournaments you create</strong>{' '}
            (every team shares the same demand curve; empty slots use this AI style). Joining someone else’s
            session or tournament uses their host’s settings.
          </p>
          <label style={{
            fontSize: '13px', fontWeight: 600, display: 'block',
            marginBottom: '6px',
          }}>
            Customer demand pattern
          </label>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
            Pick a scenario to study how demand shape interacts with ordering delays (bullwhip). For solo,
            “noisy” demand is seeded from your name and role when you start.
          </p>
          <select
            className="ma-field"
            value={demandProfile}
            onChange={e => setDemandProfile(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          >
            {DEMAND_PROFILE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <div style={{ ...META_HINT_STYLE, marginBottom: '1rem' }}>
            {demandSel?.short}
            <div style={{ marginTop: '0.5rem' }}>
              <em>Bullwhip:</em>{' '}
              {demandSel?.bullwhipNote}
            </div>
            {demandSel?.learnMoreUrl && (
              <a
                href={demandSel.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#2f6f9f', marginTop: '0.5rem', display: 'inline-block' }}
              >
                {demandSel.learnMoreLabel} ↗
              </a>
            )}
          </div>

          <label style={{
            fontSize: '13px', fontWeight: 600, display: 'block',
            marginBottom: '6px',
          }}>
            AI ghost behavior
          </label>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 0.75rem', lineHeight: 1.55 }}>
            Order-up-to style ghosts for the other three roles in solo, and for empty seats in tournaments you create.
          </p>
          <select
            className="ma-field"
            value={aiStyle}
            onChange={e => setAiStyle(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          >
            {AI_STYLE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <div style={META_HINT_STYLE}>
            {aiSel?.short}
            <div style={{ marginTop: '0.5rem' }}>
              <em>Note:</em>{' '}
              {aiSel?.bullwhipNote}
            </div>
            {aiSel?.learnMoreUrl && (
              <a
                href={aiSel.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#2f6f9f', marginTop: '0.5rem', display: 'inline-block' }}
              >
                {aiSel.learnMoreLabel} ↗
              </a>
            )}
          </div>
        </div>

        {/* Mode selection */}
        <div className="ma-welcome-card">
          <h2>Choose your mode</h2>
          <div className="ma-mode-grid">
            {WELCOME_MODE_TILES.map(m => (
              <button
                key={m.key}
                type="button"
                className={`ma-mode-tile${mode === m.key ? ' ma-mode-tile--active' : ''}`}
                onClick={() => selectMode(m.key)}
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

        {/* Player name */}
        {mode && mode !== 'full' && mode !== 'tournament_create' && (
          <div className="ma-welcome-card">
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Your name
            </label>
            <input
              type="text"
              className="ma-field"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
            />
          </div>
        )}

        {/* Solo role picker */}
        {mode === 'solo' && (
          <div className="ma-welcome-card">
            <h2>Pick your role</h2>
            <p style={{ fontSize: '13px', color: '#5a6578', margin: '0.5rem 0 1rem' }}>
              AI ghost players will manage the other 3 tiers.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {SOLO_ROLES.map(role => (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => setSelectedRole(role.name)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${selectedRole === role.name ? role.color : 'rgba(28,45,74,0.15)'}`,
                    borderRadius: '10px',
                    background: selectedRole === role.name ? `${role.color}12` : 'white',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: role.color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700
                    }}>
                      {role.letter}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '14px', textTransform: 'capitalize' }}>
                      {role.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#5a6578', lineHeight: 1.5, margin: 0 }}>
                    {role.blurb}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create session info */}
        {mode === 'create' && (
          <div className="ma-welcome-card" style={{ background: '#f0f7ff', border: '1px solid #bae6fd' }}>
            <h2 style={{ color: '#0c4a6e' }}>Creating a session</h2>
            <p style={{ fontSize: '13px', color: '#0369a1', marginTop: '0.5rem', lineHeight: 1.6 }}>
              You'll get a 6-digit code to share with up to 4 players.
              Roles are <strong>auto-assigned randomly</strong> — anonymous until debrief.
            </p>
          </div>
        )}

        {/* Join session code input */}
        {mode === 'join' && (
          <div className="ma-welcome-card">
            <h2>Join a session</h2>
            <p style={{ fontSize: '13px', color: '#5a6578', margin: '0.5rem 0 1rem' }}>
              Your role will be <strong>randomly assigned</strong> when you join.
            </p>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Session code
            </label>
            <input
              type="text"
              className="ma-field ma-code-field"
              placeholder="Enter 6-digit code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>
        )}

        {/* Tournament create settings */}
        {mode === 'tournament_create' && (
          <div className="ma-welcome-card">
            <h2>Tournament settings</h2>
            <p style={{ fontSize: '13px', color: '#5a6578', margin: '0.5rem 0 1.25rem', lineHeight: 1.6 }}>
              Demand and AI behavior are set in the <strong>Demand & AI</strong> section above (shared with solo).
              Roles are auto-assigned anonymously; empty slots become AI players.
            </p>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Number of teams
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {TOURNAMENT_TEAM_COUNTS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumTeams(n)}
                  style={{
                    padding: '8px 18px',
                    border: `2px solid ${numTeams === n ? '#2f6f9f' : '#d1d5db'}`,
                    borderRadius: '8px',
                    background: numTeams === n ? '#f0f7ff' : 'white',
                    cursor: 'pointer',
                    fontWeight: numTeams === n ? 700 : 400,
                    fontSize: '15px',
                    color: numTeams === n ? '#2f6f9f' : '#374151'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.75rem' }}>
              {numTeams} teams × 4 roles = up to {numTeams * 4} players total
            </p>
          </div>
        )}

        {/* Tournament join */}
        {mode === 'tournament_join' && (
          <div className="ma-welcome-card">
            <h2>Join a tournament</h2>
            <p style={{ fontSize: '13px', color: '#5a6578', margin: '0.5rem 0 1rem', lineHeight: 1.6 }}>
              You'll be <strong>auto-assigned to a team and role</strong>.
              Your role stays anonymous until the debrief.
            </p>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Tournament code
            </label>
            <input
              type="text"
              className="ma-field ma-code-field"
              placeholder="Enter 6-digit code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5',
            borderRadius: '8px', padding: '0.75rem 1rem',
            fontSize: '13px', color: '#dc2626'
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