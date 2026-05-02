import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STROKES = {
  Demand: '#94a3a8',
  Retailer: '#4a6fa5',
  Wholesaler: '#2a6f62',
  Distributor: '#9a7b2c',
  Factory: '#b54a3f',
};

export function BullwhipChart({ game }) {
  const chartData = [];

  for (let i = 0; i < game.round; i++) {
    chartData.push({
      round: i + 1,
      Demand: game.demandHistory[i] || 0,
      Retailer: game.tiers.retailer.orderHistory[i] || 0,
      Wholesaler: game.tiers.wholesaler.orderHistory[i] || 0,
      Distributor: game.tiers.distributor.orderHistory[i] || 0,
      Factory: game.tiers.factory.orderHistory[i] || 0,
    });
  }

  if (chartData.length === 0) return null;

  return (
    <div className="ma-chart-card">
      <h2>Orders vs demand</h2>
      <p className="ma-chart-lede">
        Variability often grows toward the factory even when retail demand is smoother.
      </p>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(28, 45, 74, 0.08)" vertical={false} />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 11, fill: 'var(--ma-muted)' }}
            axisLine={{ stroke: 'rgba(28, 45, 74, 0.2)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--ma-muted)' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--ma-panel)',
              border: '1px solid rgba(28, 45, 74, 0.15)',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 14px rgba(28, 45, 74, 0.12)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="line" />

          <Line type="monotone" dataKey="Demand" stroke={STROKES.Demand} strokeWidth={2} strokeDasharray="6 4" dot={false} />
          <Line type="monotone" dataKey="Retailer" stroke={STROKES.Retailer} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Wholesaler" stroke={STROKES.Wholesaler} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Distributor" stroke={STROKES.Distributor} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Factory" stroke={STROKES.Factory} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="ma-chart-note">
        <strong>Reading this:</strong> dashed line is customer demand; solid lines are weekly orders
        at each echelon. Spreading lines = bullwhip.
      </div>
    </div>
  );
}
