import { BullwhipChart } from './BullwhipChart';
import { TIERS } from './gameState';

function tierCsvLabel(t) {
  return t === 'factory' ? 'Factory' : t.charAt(0).toUpperCase() + t.slice(1);
}

export function GameOverScreen({ game, resetGame, totalSystemCost }) {
  // Calculate insights
  const tierCosts = TIERS.map(t => ({
    tier: t,
    cost: game.tiers[t].totalCost
  })).sort((a, b) => b.cost - a.cost);

  const highestCostTier = tierCosts[0];

  const calculateVariability = (orders) => {
    if (!orders || orders.length === 0) return 0;
    const mean = orders.reduce((a, b) => a + b, 0) / orders.length;
    const variance = orders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / orders.length;
    return Math.sqrt(variance);
  };

  const demandVariability = calculateVariability(game.demandHistory);
  const factoryVariability = calculateVariability(game.tiers.factory.orderHistory);
  const amplificationRatio = demandVariability > 0
    ? (factoryVariability / demandVariability).toFixed(2)
    : 'N/A';

  // Export function
  const exportToCSV = () => {
    const rounds = game.round;
    const rows = [];

    const tierCols = TIERS.flatMap(t => {
      const L = tierCsvLabel(t);
      return [
        `${L} Stock`, `${L} Backlog`, `${L} Order`,
        `${L} Demand`, `${L} Delivery`, `${L} Shipment`, `${L} Cost`,
      ];
    });
    rows.push(['Round', 'Customer Demand', ...tierCols, 'Total System Cost'].join(','));

    // Data rows
    for (let i = 0; i < rounds; i++) {
      const totalCostThisRound = TIERS.reduce(
        (sum, t) => sum + (game.tiers[t].costHistory[i] || 0), 0
      );

      const row = [
        i + 1,
        game.demandHistory[i] || 0,
        ...TIERS.flatMap(t => [
          game.tiers[t].inventoryHistory[i] || 0,
          game.tiers[t].backlogHistory[i] || 0,
          game.tiers[t].orderHistory[i] || 0,
          game.tiers[t].demandHistory[i] || 0,
          game.tiers[t].deliveryHistory[i] || 0,
          game.tiers[t].shipmentHistory[i] || 0,
          (game.tiers[t].costHistory[i] || 0).toFixed(2),
        ]),
        totalCostThisRound.toFixed(2)
      ];

      rows.push(row.join(','));
    }

    // Add summary rows at the bottom
    rows.push('');
    rows.push('SUMMARY');
    rows.push(`Total System Cost,₹${Math.round(totalSystemCost)}`);
    rows.push(`Bullwhip Amplification Ratio,${amplificationRatio}x`);
    rows.push(`Highest Cost Tier,${highestCostTier.tier} (₹${Math.round(highestCostTier.cost)})`);
    TIERS.forEach(t => {
      rows.push(`${t} Total Cost,₹${Math.round(game.tiers[t].totalCost)}`);
    });

    // Create and download file
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bullwhip_session_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '1rem' }}>
          Simulation Complete!
        </h1>
        <div style={{ fontSize: '48px', fontWeight: '700', color: '#ef4444', marginBottom: '0.5rem' }}>
          ₹{Math.round(totalSystemCost)}
        </div>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>
          Total System Cost across all 20 rounds
        </div>
      </div>

      {/* Summary Cards */}
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
          <div style={{ fontSize: '22px', fontWeight: '600', textTransform: 'capitalize' }}>
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
            Factory vs customer variance
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

      {/* Tier Cost Breakdown */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '3rem'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1.25rem', marginTop: 0 }}>
          Cost Breakdown by Tier
        </h2>
        {tierCosts.map((item, idx) => {
          const pct = Math.round((item.cost / totalSystemCost) * 100);
          return (
            <div key={item.tier} style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '14px'
              }}>
                <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>
                  {idx + 1}. {item.tier}
                </span>
                <span style={{ fontWeight: '600' }}>
                  ₹{Math.round(item.cost)} ({pct}%)
                </span>
              </div>
              <div style={{
                background: '#f3f4f6',
                borderRadius: '4px',
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : idx === 2 ? '#3b82f6' : '#10b981',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bullwhip Chart */}
      <BullwhipChart game={game} />

      {/* Key Insights */}
      <div style={{
        background: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '12px',
        padding: '2rem',
        marginTop: '2rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>
          💡 Key Insights
        </h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', fontSize: '14px', margin: 0 }}>
          <li>
            The <strong>{amplificationRatio}x amplification</strong> shows how customer demand 
            swings created {Number(amplificationRatio) > 3 ? 'massive' : 'significant'} order 
            volatility at the factory level
          </li>
          <li>
            <strong style={{ textTransform: 'capitalize' }}>{highestCostTier.tier}</strong> bore 
            the highest cost (₹{Math.round(highestCostTier.cost)}) — 
            {highestCostTier.tier === 'factory'
              ? ' typical in bullwhip scenarios where upstream absorbs most volatility'
              : ' possibly from over-ordering or slow reaction to demand changes'
            }
          </li>
          <li>
            To reduce the bullwhip: share demand data across tiers, reduce lead times, 
            avoid panic ordering, and use smaller more frequent orders
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={exportToCSV}
          style={{
            flex: 1,
            padding: '16px',
            fontSize: '15px',
            fontWeight: '600',
            background: 'white',
            color: '#374151',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          📥 Export Data (CSV)
        </button>

        <button
          onClick={resetGame}
          style={{
            flex: 1,
            padding: '16px',
            fontSize: '15px',
            fontWeight: '600',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}