import { useGame } from './useGame';
import { TIERS } from './gameState';
import './App.css';

function App() {
  const { game, setOrder, submitRound, resetGame, totalSystemCost } = useGame();

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Bullwhip Supply Chain Game</h1>
      {/* Debug info - remove this later */}
      <div style={{ background: '#fff3cd', padding: '1rem', marginBottom: '1rem', fontSize: '12px', fontFamily: 'monospace' }}>
        <div><strong>Debug - Pending Orders:</strong> {JSON.stringify(game.pendingOrders)}</div>
        <div><strong>Last Orders Placed:</strong></div>
        {TIERS.map(t => (
          <div key={t}>{t}: {game.tiers[t].lastOrderPlaced} | Pipeline: [{game.tiers[t].incomingShipments.join(', ')}]</div>
        ))}
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        padding: '1rem',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div>
          <strong>Round:</strong> {game.round} / 20
        </div>
        <div>
          <strong>Total System Cost:</strong> ₹{Math.round(totalSystemCost)}
        </div>
        <div>
          <strong>Phase:</strong> {game.phase}
        </div>
      </div>

      {game.phase === 'gameover' ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Game Over!</h2>
          <p style={{ fontSize: '24px', margin: '1rem 0' }}>
            Total System Cost: ₹{Math.round(totalSystemCost)}
          </p>
          <button 
            onClick={resetGame}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {TIERS.map(tierName => {
              const tier = game.tiers[tierName];
              return (
                <div 
                  key={tierName}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: 'white'
                  }}
                >
                  <h3 style={{ 
                    marginTop: 0, 
                    textTransform: 'capitalize',
                    color: '#333'
                  }}>
                    {tierName}
                  </h3>
                  
                  <div style={{ marginBottom: '0.75rem', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}>
                      <span>Inventory:</span>
                      <strong>{tier.inventory}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}>
                      <span>Backlog:</span>
                      <strong style={{ color: tier.backlog > 0 ? '#e00' : '#333' }}>
                        {tier.backlog}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}>
                      <span>Incoming:</span>
                      <strong>{tier.incomingShipments[0]}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.25rem 0' }}>
                      <span>Cost:</span>
                      <strong>₹{Math.round(tier.totalCost)}</strong>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
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
                        padding: '8px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
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
              fontSize: '18px',
              fontWeight: '600',
              background: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Submit Round {game.round + 1}
          </button>
        </>
      )}
    </div>
  );
}

export default App;