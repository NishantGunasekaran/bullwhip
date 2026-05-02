import { BullwhipChart } from './BullwhipChart';
import { TIERS } from './gameState';

export function GameOverScreen({ game, resetGame, totalSystemCost }) {
  // Calculate insights
  const tierCosts = TIERS.map(t => ({
    tier: t,
    cost: game.tiers[t].totalCost
  })).sort((a, b) => b.cost - a.cost);

  const highestCostTier = tierCosts[0];
  
  // Calculate order variability (standard deviation)
  const calculateVariability = (orders) => {
    const mean = orders.reduce((a, b) => a + b, 0) / orders.length;
    const variance = orders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / orders.length;
    return Math.sqrt(variance);
  };

  const demandVariability = calculateVariability(game.demandHistory);
  const mfgVariability = calculateVariability(game.tiers.manufacturer.orderHistory);
  const amplificationRatio = (mfgVariability / demandVariability).toFixed(2);

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '1rem' }}>
          Simulation Complete
        </h1>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: '700',
          color: '#ef4444',
          marginBottom: '0.5rem'
        }}>
          ₹{Math.round(totalSystemCost)}
        </div>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>
          Total System Cost
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '3rem'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0.5rem' }}>
            Highest Cost Tier
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', textTransform: 'capitalize' }}>
            {highestCostTier.tier}
          </div>
          <div style={{ fontSize: '18px', color: '#ef4444', marginTop: '0.25rem' }}>
            ₹{Math.round(highestCostTier.cost)}
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0.5rem' }}>
            Bullwhip Amplification
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#f59e0b' }}>
            {amplificationRatio}x
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>
            Manufacturer variance vs demand
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '0.5rem' }}>
            Total Rounds
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600' }}>
            20
          </div>
        </div>
      </div>

      <BullwhipChart game={game} />

      <div style={{
        background: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '12px',
        padding: '2rem',
        marginTop: '3rem'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1rem' }}>
          💡 Key Insights
        </h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', fontSize: '14px' }}>
          <li>
            The <strong>{amplificationRatio}x amplification</strong> shows how a small change in customer 
            demand created {amplificationRatio > 3 ? 'massive' : 'significant'} order swings upstream
          </li>
          <li>
            {highestCostTier.tier === 'manufacturer' 
              ? 'The manufacturer bore the highest cost — typical in bullwhip scenarios where upstream faces the most volatility'
              : `The ${highestCostTier.tier} had unexpected high costs — possibly from aggressive safety stock or poor forecasting`
            }
          </li>
          <li>
            To reduce the bullwhip: Share demand information across tiers, reduce lead times, 
            avoid overreacting to short-term fluctuations, and use smaller, more frequent orders
          </li>
        </ul>
      </div>

      <button
        onClick={resetGame}
        style={{
          width: '100%',
          marginTop: '2rem',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Play Again
      </button>
    </div>
  );
}