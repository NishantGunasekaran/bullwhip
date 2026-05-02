export function WelcomeScreen({ onStart }) {
  const tiers = [
    { name: 'Retailer', blurb: 'Faces end-customer demand' },
    { name: 'Wholesaler', blurb: 'Supplies the retailer' },
    { name: 'Distributor', blurb: 'Supplies the wholesaler' },
    { name: 'Factory', blurb: 'Supplies the distributor; production has lead time' },
  ];

  return (
    <div style={{
      maxWidth: '800px',
      margin: '3rem auto',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '1rem' }}>
        The Bullwhip Effect Simulation
      </h1>

      <p style={{ fontSize: '16px', color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
        Experience how small fluctuations in retail demand can create massive
        swings in orders upstream. You&apos;ll manage a 4-echelon chain (retailer → wholesaler →
        distributor → factory) with separate <strong>2-week shipment</strong> and{' '}
        <strong>2-week order-information</strong> delays.
      </p>

      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        textAlign: 'left'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '1rem' }}>How to Play</h2>
        <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Each week: receive shipments, read orders from your customer (retailer uses market demand; others use delayed downstream orders), fulfill what you can, then place a new order upstream.</li>
          <li>Shipments and order signals each use a <strong>2-week pipeline</strong> (two queue slots).</li>
          <li>Holding cost <strong>₹0.50</strong> per unit in inventory per week; backlog cost <strong>₹1.00</strong> per unit of unfilled demand per week.</li>
          <li>Starting inventory <strong>12</strong> per echelon (pipelines seeded for steady flow).</li>
          <li>Goal: minimize total system cost over 20 weeks.</li>
        </ol>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {tiers.map(tier => (
          <div key={tier.name} style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {tier.name}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {tier.blurb}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        style={{
          padding: '16px 48px',
          fontSize: '18px',
          fontWeight: '600',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,112,243,0.3)'
        }}
      >
        Start Simulation
      </button>
    </div>
  );
}