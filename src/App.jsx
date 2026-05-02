import { useState } from 'react';
import { useGame } from './useGame';
import { TIERS } from './gameState';
import { WelcomeScreen } from './WelcomeScreen';
import { GameOverScreen } from './GameOverScreen';
import { BullwhipChart } from './BullwhipChart';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const { game, setOrder, submitRound, resetGame, totalSystemCost } = useGame();

  const handleReset = () => {
    resetGame();
    setGameStarted(false);
  };

  if (!gameStarted) {
    return <WelcomeScreen onStart={() => setGameStarted(true)} />;
  }

  if (game.phase === 'gameover') {
    return <GameOverScreen game={game} resetGame={handleReset} totalSystemCost={totalSystemCost} />;
  }

  // Current round is 1-indexed for display: game.round rounds are completed,
  // so the player is now working on round game.round + 1.
  const displayRound = game.round + 1;
  const lastDemand = game.round > 0 ? game.demandHistory[game.round - 1] : null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Bullwhip Supply Chain Game</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '14px' }}>
        Retailer → Wholesaler → Distributor → Factory. Two-week shipment and order-information pipelines.
        Minimize total system cost.
      </p>

      <div style={{
        display: 'flex',
        gap: '2rem',
        marginBottom: '2rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Round</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>{displayRound} / 20</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Last Round Demand</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>
            {lastDemand !== null ? lastDemand : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total System Cost</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>
            ₹{Math.round(totalSystemCost)}
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {TIERS.map(tierName => {
          const tier = game.tiers[tierName];
          return (
            <div
              key={tierName}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.25rem',
                background: 'white'
              }}
            >
              <h3 style={{
                marginTop: 0,
                textTransform: 'capitalize',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                {tierName}
              </h3>

              <div style={{ marginBottom: '1rem', fontSize: '13px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem'
                }}>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '11px' }}>Inventory</div>
                    <div style={{ fontWeight: '600', fontSize: '18px' }}>{tier.inventory}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '11px' }}>Backlog</div>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '18px',
                      color: tier.backlog > 0 ? '#ef4444' : '#10b981'
                    }}>
                      {tier.backlog}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '11px' }}>Arriving Next</div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{tier.incomingShipments[0]}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', fontSize: '11px' }}>Cost</div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>₹{Math.round(tier.totalCost)}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#6b7280', fontSize: '11px' }}>
                      {tierName === 'retailer' ? 'Customer demand (last round)' : 'Orders from downstream (last round)'}
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>
                      {game.round === 0 ? '—' : tier.incomingOrdersThisRound}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Order quantity:
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Enter order"
                  value={game.pendingOrders[tierName] ?? ''}
                  onChange={(e) => setOrder(tierName, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={submitRound}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: '2rem'
        }}
      >
        Submit Round {displayRound}
      </button>

      {game.round > 2 && <BullwhipChart game={game} />}
    </div>
  );
}

export default App;