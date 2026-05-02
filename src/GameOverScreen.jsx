import { BullwhipChart } from './BullwhipChart';
import { TIERS } from './gameState';

function tierCsvLabel(t) {
  return t === 'factory' ? 'Factory' : t.charAt(0).toUpperCase() + t.slice(1);
}

const BAR_COLORS = ['#b54a3f', '#9a7b2c', '#2a6f62', '#4a6fa5'];

export function GameOverScreen({ game, resetGame, totalSystemCost }) {
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

    rows.push('');
    rows.push('SUMMARY');
    rows.push(`Total System Cost,₹${Math.round(totalSystemCost)}`);
    rows.push(`Bullwhip Amplification Ratio,${amplificationRatio}x`);
    rows.push(`Highest Cost Tier,${highestCostTier.tier} (₹${Math.round(highestCostTier.cost)})`);
    TIERS.forEach(t => {
      rows.push(`${t} Total Cost,₹${Math.round(game.tiers[t].totalCost)}`);
    });

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
    <div className="ma-over">
      <header className="ma-topbar">
        <div className="ma-brand">
          <span className="ma-logo">Beer Game</span>
          <span className="ma-tagline">Session complete</span>
        </div>
        <div className="ma-week-pill">
          20 <span>/ 20 weeks</span>
        </div>
        <div className="ma-topbar-stats">
          <div className="ma-topbar-stat ma-topbar-stat--cost">
            <label>Total system cost</label>
            <strong>₹{Math.round(totalSystemCost)}</strong>
          </div>
        </div>
      </header>

      <div className="ma-over-body">
        <div className="ma-over-hero">
          <h1>Run complete</h1>
          <div className="ma-over-cost">₹{Math.round(totalSystemCost)}</div>
          <p className="ma-over-sub">Total system cost · 20 rounds</p>
        </div>

        <div className="ma-summary-grid">
          <div className="ma-summary-card">
            <label>Highest cost</label>
            <div className="big" style={{ textTransform: 'capitalize' }}>{highestCostTier.tier}</div>
            <div className="big" style={{ color: 'var(--ma-bad)', marginTop: '0.25rem' }}>
              ₹{Math.round(highestCostTier.cost)}
            </div>
          </div>

          <div className="ma-summary-card">
            <label>Amplification</label>
            <div className="big" style={{ color: 'var(--ma-amber)' }}>{amplificationRatio}×</div>
            <div className="hint">Factory orders vs customer demand variance</div>
          </div>

          <div className="ma-summary-card">
            <label>Rounds</label>
            <div className="big">20</div>
          </div>
        </div>

        <div className="ma-panel">
          <h2>Cost by tier</h2>
          {tierCosts.map((item, idx) => {
            const pct = Math.round((item.cost / totalSystemCost) * 100);
            return (
              <div key={item.tier} className="ma-cost-row">
                <div className="ma-cost-row-head">
                  <span style={{ textTransform: 'capitalize' }}>{idx + 1}. {item.tier}</span>
                  <span>₹{Math.round(item.cost)} ({pct}%)</span>
                </div>
                <div className="ma-cost-bar">
                  <div
                    className="ma-cost-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: BAR_COLORS[idx % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="ma-chart-wrap">
          <BullwhipChart game={game} />
        </div>

        <div className="ma-insight">
          <h3>Takeaways</h3>
          <ul>
            <li>
              About <strong>{amplificationRatio}×</strong> amplification: customer demand variability
              vs factory order variability.
            </li>
            <li>
              <strong style={{ textTransform: 'capitalize' }}>{highestCostTier.tier}</strong> had the
              highest cost (₹{Math.round(highestCostTier.cost)})
              {highestCostTier.tier === 'factory'
                ? ' — common when upstream absorbs volatility.'
                : ' — often from ordering swings or slow adjustment.'}
            </li>
            <li>
              Mitigations: share demand visibility, shorten lead times, avoid panic ordering, smaller
              frequent orders.
            </li>
          </ul>
        </div>

        <div className="ma-actions">
          <button type="button" className="ma-btn-ghost" onClick={exportToCSV}>
            Export CSV
          </button>
          <button type="button" className="ma-btn-week" onClick={resetGame}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
