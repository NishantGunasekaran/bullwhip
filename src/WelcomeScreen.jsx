export function WelcomeScreen({ onStart }) {
  const tiers = [
    { name: 'Retailer', letter: 'R', blurb: 'End-customer demand' },
    { name: 'Wholesaler', letter: 'W', blurb: 'Supplies retailer' },
    { name: 'Distributor', letter: 'D', blurb: 'Supplies wholesaler' },
    { name: 'Factory', letter: 'F', blurb: 'Production & lead time' },
  ];

  return (
    <div className="ma-welcome">
      <header className="ma-welcome-hero">
        <h1>Beer Game</h1>
        <p>
          Board-style flow from retailer to factory — see how small demand changes become large
          order swings upstream (bullwhip). Layout inspired by classic hosted games such as{' '}
          <a
            href="https://beergame.masystem.se/play"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#a8c8ff' }}
          >
            MA-system&apos;s Beer Game
          </a>
          .
        </p>
      </header>

      <div className="ma-welcome-body">
        <div className="ma-welcome-card">
          <h2>How it works</h2>
          <ol>
            <li>Each week: receive goods, read customer orders, ship, then order upstream.</li>
            <li>Separate <strong>transport</strong> and <strong>order</strong> delays (two weeks each).</li>
            <li>Holding <strong>₹0.50</strong> / unit / week · Backlog <strong>₹1.00</strong> / unit / week.</li>
            <li>Smooth start: stock <strong>12</strong>, <strong>4</strong> in each shipment and order pipeline slot.</li>
            <li>Goal: <strong>lowest total system cost</strong> over 20 weeks.</li>
          </ol>
        </div>

        <div className="ma-welcome-grid">
          {tiers.map(tier => (
            <div key={tier.name} className="ma-welcome-chip">
              <strong>
                <span className="ma-letter" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.75rem', display: 'inline-flex', marginRight: '0.35rem', verticalAlign: 'middle' }}>{tier.letter}</span>
                {tier.name}
              </strong>
              <span>{tier.blurb}</span>
            </div>
          ))}
        </div>

        <div className="ma-welcome-actions">
          <button type="button" className="ma-btn-start" onClick={onStart}>
            Start new game
          </button>
        </div>
      </div>
    </div>
  );
}
