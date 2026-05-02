import { useState } from 'react';

const ROLES = [
  {
    name: 'retailer',
    letter: 'R',
    title: 'Retailer',
    blurb: 'You face real customer demand. Be the first to feel the market.',
    color: '#4a6fa5'
  },
  {
    name: 'wholesaler',
    letter: 'W',
    title: 'Wholesaler',
    blurb: 'You supply the retailer. You only see their orders, not real demand.',
    color: '#2a6f62'
  },
  {
    name: 'distributor',
    letter: 'D',
    title: 'Distributor',
    blurb: 'You supply the wholesaler. Two steps removed from the customer.',
    color: '#9a7b2c'
  },
  {
    name: 'factory',
    letter: 'F',
    title: 'Factory',
    blurb: 'You produce goods. Furthest from demand — most exposed to the bullwhip.',
    color: '#b54a3f'
  },
];

export function WelcomeScreen({ onStart }) {
  const [mode, setMode] = useState(null); // 'solo' | 'full'
  const [selectedRole, setSelectedRole] = useState(null);

  const handleStart = () => {
    if (mode === 'solo' && !selectedRole) return;
    onStart({ mode, playerRole: mode === 'solo' ? selectedRole : null });
  };

  return (
    <div className="ma-welcome">
      <header className="ma-welcome-hero">
        <h1>Beer Game</h1>
        <p>
          Board-style supply chain simulation — see how small demand changes become large
          order swings upstream (bullwhip effect).
        </p>
      </header>

      <div className="ma-welcome-body">

        {/* How it works */}
        <div className="ma-welcome-card">
          <h2>How it works</h2>
          <ol>
            <li>Each week: receive goods, read customer orders, ship, then order upstream.</li>
            <li>Separate <strong>transport</strong> and <strong>order</strong> delays (two weeks each).</li>
            <li>Holding <strong>₹0.50</strong> / unit / week · Backlog <strong>₹1.00</strong> / unit / week.</li>
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
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <button
              type="button"
              onClick={() => { setMode('solo'); setSelectedRole(null); }}
              style={{
                padding: '1.25rem',
                border: `2px solid ${mode === 'solo' ? '#2f6f9f' : 'rgba(28,45,74,0.2)'}`,
                borderRadius: '10px',
                background: mode === 'solo' ? '#f0f7ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                🎮 Solo Play
              </div>
              <div style={{ fontSize: '13px', color: '#5a6578', lineHeight: 1.5 }}>
                You control one role. The other 3 tiers are managed by AI ghost players.
                Great for learning the concepts.
              </div>
            </button>

            <button
              type="button"
              onClick={() => { setMode('full'); setSelectedRole(null); }}
              style={{
                padding: '1.25rem',
                border: `2px solid ${mode === 'full' ? '#2f6f9f' : 'rgba(28,45,74,0.2)'}`,
                borderRadius: '10px',
                background: mode === 'full' ? '#f0f7ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                🎯 Full Control
              </div>
              <div style={{ fontSize: '13px', color: '#5a6578', lineHeight: 1.5 }}>
                You control all 4 roles manually. Best for demos and understanding
                the full chain.
              </div>
            </button>
          </div>
        </div>

        {/* Role selection — only shown in solo mode */}
        {mode === 'solo' && (
          <div className="ma-welcome-card">
            <h2>Pick your role</h2>
            <p style={{ fontSize: '13px', color: '#5a6578', marginTop: '0.5rem', marginBottom: '1rem' }}>
              The other 3 roles will be played by AI. You'll only see your own tier's information
              — just like a real supply chain.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
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
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      width: '28px', height: '28px',
                      borderRadius: '50%',
                      background: role.color,
                      color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, flexShrink: 0
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

        {/* Start button */}
        <div className="ma-welcome-actions">
          <button
            type="button"
            className="ma-btn-start"
            onClick={handleStart}
            disabled={!mode || (mode === 'solo' && !selectedRole)}
            style={{
              opacity: (!mode || (mode === 'solo' && !selectedRole)) ? 0.4 : 1,
              cursor: (!mode || (mode === 'solo' && !selectedRole)) ? 'not-allowed' : 'pointer'
            }}
          >
            {mode === 'solo' && selectedRole
              ? `Play as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} →`
              : mode === 'full'
                ? 'Start full game →'
                : 'Select a mode to start'}
          </button>
        </div>
      </div>
    </div>
  );
}