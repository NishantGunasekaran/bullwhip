import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BullwhipChart({ game }) {
  const chartData = [];
  
  for (let i = 0; i < game.round; i++) {
    chartData.push({
      round: i + 1,
      Demand: game.demandHistory[i] || 0,
      Retailer: game.tiers.retailer.orderHistory[i] || 0,
      Distributor: game.tiers.distributor.orderHistory[i] || 0,
      Wholesaler: game.tiers.wholesaler.orderHistory[i] || 0,
      Manufacturer: game.tiers.manufacturer.orderHistory[i] || 0,
    });
  }

  if (chartData.length === 0) return null;

  return (
    <div style={{ 
      marginTop: '3rem', 
      padding: '2rem',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ 
        fontSize: '20px', 
        marginBottom: '0.5rem',
        fontWeight: '600'
      }}>
        The Bullwhip Effect in Action
      </h2>
      <p style={{ 
        fontSize: '14px', 
        color: '#6b7280',
        marginBottom: '2rem'
      }}>
        Notice how order variability increases as you move upstream in the supply chain
      </p>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="round" 
            label={{ value: 'Round', position: 'insideBottom', offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            label={{ value: 'Units Ordered', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '13px' }}
            iconType="line"
          />
          
          <Line 
            type="monotone" 
            dataKey="Demand" 
            stroke="#9ca3af" 
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={false}
          />
          
          <Line 
            type="monotone" 
            dataKey="Retailer" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            dot={false}
          />
          
          <Line 
            type="monotone" 
            dataKey="Distributor" 
            stroke="#10b981" 
            strokeWidth={2.5}
            dot={false}
          />
          
          <Line 
            type="monotone" 
            dataKey="Wholesaler" 
            stroke="#f59e0b" 
            strokeWidth={2.5}
            dot={false}
          />
          
          <Line 
            type="monotone" 
            dataKey="Manufacturer" 
            stroke="#ef4444" 
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f9fafb',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#374151'
      }}>
        <strong>What's happening:</strong> Customer demand (dashed gray line) shows a small, 
        stable pattern. But as each tier tries to protect against stockouts, they order 
        slightly more than needed. This safety buffer compounds upstream, creating the 
        "bullwhip" — massive order swings at the manufacturer level despite steady customer demand.
      </div>
    </div>
  );
}