import { BullwhipChart } from './BullwhipChart';

const TIERS = ['retailer', 'wholesaler', 'distributor', 'factory'];

function std(arr) {
  if (!arr || arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function max(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.max(...arr);
}

const TIER_COLOR = {
  retailer:    '#4a6fa5',
  wholesaler:  '#2a6f62',
  distributor: '#9a7b2c',
  factory:     '#b54a3f',
};

export function Analytics({ game, totalSystemCost }) {
  const rounds = game.round;

  // ── Per-tier metrics ───────────────────────────────────────
  const tierMetrics = TIERS.map(t => {
    const tier = game.tiers[t];
    const orders = tier.orderHistory || [];
    const inv = tier.inventoryHistory || [];
    const bl = tier.backlogHistory || [];
    const cost = tier.costHistory || [];

    return {
      name: t,
      totalCost: Math.round(tier.totalCost),
      pctOfSystem: totalSystemCost > 0
        ? Math.round((tier.totalCost / totalSystemCost) * 100)
        : 0,
      avgInventory: Math.round(mean(inv)),
      peakInventory: max(inv),
      avgBacklog: mean(bl).toFixed(1),
      peakBacklog: max(bl),
      weeksWithBacklog: bl.filter(v => v > 0).length,
      avgOrder: mean(orders).toFixed(1),
      peakOrder: max(orders),
      orderVariability: std(orders).toFixed(2),
    };
  });

  // ── Bullwhip amplification ──────────────────────────────────
  const demandStd = std(game.demandHistory);
  const factoryStd = std(game.tiers.factory.orderHistory);
  const amplification = demandStd > 0
    ? (factoryStd / demandStd).toFixed(2)
    : 'N/A';

  // ── Key moments ─────────────────────────────────────────────
  const totalBacklogPerRound = Array.from({ length: rounds }, (_, i) =>
    TIERS.reduce((sum, t) => sum + (game.tiers[t].backlogHistory[i] || 0), 0)
  );
  const totalInvPerRound = Array.from({ length: rounds }, (_, i) =>
    TIERS.reduce((sum, t) => sum + (game.tiers[t].inventoryHistory[i] || 0), 0)
  );
  const totalOrderPerRound = Array.from({ length: rounds }, (_, i) =>
    TIERS.reduce((sum, t) => sum + (game.tiers[t].orderHistory[i] || 0), 0)
  );

  const peakBacklogRound = totalBacklogPerRound.indexOf(max(totalBacklogPerRound)) + 1;
  const peakInvRound = totalInvPerRound.indexOf(max(totalInvPerRound)) + 1;
  const demandJumpRound = game.demandHistory.findIndex(
    (d, i) => i > 0 && d > game.demandHistory[i - 1]
  ) + 1;

  // ── Section styles ──────────────────────────────────────────
  const sectionStyle = {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  };

  const labelStyle = {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
    marginBottom: '4px',
  };

  return (
    <div>

      {/* ── 1. Summary Cards ───────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ ...sectionStyle, textAlign: 'center', padding: '1.25rem' }}>
          <div style={labelStyle}>Total System Cost</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>
            ₹{totalSystemCost.toLocaleString()}
          </div>
        </div>

        <div style={{ ...sectionStyle, textAlign: 'center', padding: '1.25rem' }}>
          <div style={labelStyle}>Bullwhip Amplification</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
            {amplification}×
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            Factory vs demand variance
          </div>
        </div>

        <div style={{ ...sectionStyle, textAlign: 'center', padding: '1.25rem' }}>
          <div style={labelStyle}>Peak Backlog Round</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#7c3aed' }}>
            Week {peakBacklogRound}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {max(totalBacklogPerRound)} units system backlog
          </div>
        </div>

        <div style={{ ...sectionStyle, textAlign: 'center', padding: '1.25rem' }}>
          <div style={labelStyle}>Demand Jump</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0369a1' }}>
            Week {demandJumpRound || '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            When customer demand increased
          </div>
        </div>
      </div>

      {/* ── 2. Tier-by-tier performance ─────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1.25rem', marginTop: 0 }}>
          Performance by tier
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Tier
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Total Cost
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  % of System
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Avg Inventory
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Peak Backlog
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Weeks w/ Backlog
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Avg Order
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  Order Variability
                </th>
              </tr>
            </thead>
            <tbody>
              {tierMetrics.map((m, idx) => (
                <tr
                  key={m.name}
                  style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}
                >
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: TIER_COLOR[m.name], display: 'inline-block'
                      }} />
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                        {m.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>
                    ₹{m.totalCost.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <div style={{
                        width: '60px', height: '6px', background: '#f3f4f6',
                        borderRadius: '3px', overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${m.pctOfSystem}%`, height: '100%',
                          background: TIER_COLOR[m.name], borderRadius: '3px'
                        }} />
                      </div>
                      <span>{m.pctOfSystem}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                    {m.avgInventory}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: m.peakBacklog > 0 ? '#dc2626' : '#6b7280' }}>
                    {m.peakBacklog}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: m.weeksWithBacklog > 5 ? '#dc2626' : m.weeksWithBacklog > 0 ? '#f59e0b' : '#059669' }}>
                    {m.weeksWithBacklog} / {rounds}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                    {m.avgOrder}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: Number(m.orderVariability) > 5 ? '#dc2626' : '#374151' }}>
                    σ {m.orderVariability}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '0.75rem', marginBottom: 0 }}>
          σ = order variability (standard deviation). Higher = more bullwhip amplification.
        </p>
      </div>

      {/* ── 3. The chart ────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.25rem', marginTop: 0 }}>
          Orders vs demand — the bullwhip shape
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '1rem' }}>
          The wider the spread between lines, the stronger the bullwhip effect.
        </p>
        <BullwhipChart game={game} />
      </div>

      {/* ── 4. Round-by-round table ─────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1.25rem', marginTop: 0 }}>
          Round-by-round data
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  Week
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  Demand
                </th>
                {TIERS.map(t => (
                  <th
                    key={t}
                    colSpan={3}
                    style={{
                      padding: '8px 10px', textAlign: 'center',
                      fontWeight: 600, color: TIER_COLOR[t],
                      borderBottom: '1px solid #e5e7eb',
                      borderLeft: '2px solid #e5e7eb',
                      textTransform: 'capitalize'
                    }}
                  >
                    {t}
                  </th>
                ))}
              </tr>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '4px 10px', borderBottom: '2px solid #e5e7eb' }} />
                <th style={{ padding: '4px 10px', borderBottom: '2px solid #e5e7eb' }} />
                {TIERS.map(t => (
                  ['Stock', 'Backlog', 'Order'].map(col => (
                    <th
                      key={`${t}-${col}`}
                      style={{
                        padding: '4px 10px', textAlign: 'right',
                        fontSize: '10px', color: '#6b7280',
                        borderBottom: '2px solid #e5e7eb',
                        borderLeft: col === 'Stock' ? '2px solid #e5e7eb' : 'none'
                      }}
                    >
                      {col}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rounds }, (_, i) => {
                const isEven = i % 2 === 0;
                const demand = game.demandHistory[i] || 0;
                const prevDemand = game.demandHistory[i - 1] || 0;
                const demandJumped = i > 0 && demand > prevDemand;

                return (
                  <tr key={i} style={{ background: isEven ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                      {i + 1}
                    </td>
                    <td style={{
                      padding: '6px 10px', textAlign: 'center',
                      borderBottom: '1px solid #f3f4f6',
                      fontWeight: demandJumped ? 700 : 400,
                      color: demandJumped ? '#dc2626' : '#374151'
                    }}>
                      {demand}
                      {demandJumped && ' ↑'}
                    </td>
                    {TIERS.map(t => {
                      const tier = game.tiers[t];
                      const inv = tier.inventoryHistory[i] ?? '—';
                      const bl = tier.backlogHistory[i] ?? '—';
                      const ord = tier.orderHistory[i] ?? '—';
                      return (
                        <>
                          <td key={`${t}-inv`} style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', borderLeft: '2px solid #e5e7eb' }}>
                            {inv}
                          </td>
                          <td key={`${t}-bl`} style={{
                            padding: '6px 10px', textAlign: 'right',
                            borderBottom: '1px solid #f3f4f6',
                            color: bl > 0 ? '#dc2626' : '#374151',
                            fontWeight: bl > 0 ? 600 : 400
                          }}>
                            {bl}
                          </td>
                          <td key={`${t}-ord`} style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                            {ord}
                          </td>
                        </>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '0.75rem', marginBottom: 0 }}>
          Red demand values = demand increased that week. Red backlog = unfulfilled orders.
        </p>
      </div>

      {/* ── 5. Key insights ─────────────────────────────────── */}
      <div style={{
        ...sectionStyle,
        background: '#fffbeb',
        border: '1px solid #fde68a'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem', marginTop: 0 }}>
          💡 What happened and why
        </h2>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.9, fontSize: '14px', margin: 0 }}>
          <li>
            Customer demand changed at <strong>Week {demandJumpRound}</strong>.
            Even though the change was modest, each upstream tier amplified their ordering
            response — creating the bullwhip.
          </li>
          <li>
            Order variability at the factory was <strong>{amplification}×</strong> greater
            than customer demand variability. Anything above 1× is a bullwhip. Above 2× is significant.
          </li>
          <li>
            <strong style={{ textTransform: 'capitalize' }}>
              {tierMetrics.sort((a, b) => b.totalCost - a.totalCost)[0].name}
            </strong>
            {' '}paid the most ({tierMetrics.sort((a, b) => b.totalCost - a.totalCost)[0].pctOfSystem}% of total cost).{' '}
            {tierMetrics.sort((a, b) => b.peakBacklog - a.peakBacklog)[0].peakBacklog > 0
              ? `Peak backlog was ${tierMetrics.sort((a, b) => b.peakBacklog - a.peakBacklog)[0].peakBacklog} units.`
              : 'Costs were mainly from holding excess inventory.'}
          </li>
          <li>
            To reduce the bullwhip: share demand data across tiers, avoid panic ordering,
            use smaller and more frequent replenishments, and reduce lead times.
          </li>
        </ul>
      </div>
    </div>
  );
}