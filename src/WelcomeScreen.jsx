export function WelcomeScreen({ onStart }) {
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
        swings in orders upstream. You'll manage a 4-tier supply chain and 
        see the bullwhip effect emerge from your decisions.
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
          <li>Each round, decide how many units to order from your supplier</li>
          <li>Orders take <strong>2 rounds</strong> to arrive (lead time)</li>
          <li>You pay ₹0.50 per unit in inventory (holding cost)</li>
          <li>You pay ₹1.00 per unit of unfulfilled orders (backlog penalty)</li>
          <li>Goal: Minimize total system cost across all 4 tiers</li>
        </ol>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {['Retailer', 'Distributor', 'Wholesaler', 'Manufacturer'].map(tier => (
          <div key={tier} style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem' }}>
              {tier}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {tier === 'Retailer' && 'Serves customers'}
              {tier === 'Distributor' && 'Supplies retailer'}
              {tier === 'Wholesaler' && 'Supplies distributor'}
              {tier === 'Manufacturer' && 'Produces goods'}
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