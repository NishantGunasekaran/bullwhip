import { useState } from 'react';
import { useGame } from './useGame';
import { TIERS } from './gameState';
import { getDemandForRound } from './demandCurve';
import { WelcomeScreen } from './WelcomeScreen';
import { GameOverScreen } from './GameOverScreen';
import { BullwhipChart } from './BullwhipChart';
import './App.css';

const SHIP_TO = {
  retailer: 'customers',
  wholesaler: 'retailer',
  distributor: 'wholesaler',
  factory: 'distributor',
};

const ORDER_TO = {
  retailer: 'wholesaler',
  wholesaler: 'distributor',
  distributor: 'factory',
  factory: 'production',
};

const LETTER = {
  retailer: 'R',
  wholesaler: 'W',
  distributor: 'D',
  factory: 'F',
};

const ROLE_BLURB = {
  retailer: 'Serves market demand',
  wholesaler: 'Supplies retailer',
  distributor: 'Supplies wholesaler',
  factory: 'Production & lead time',
};

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const { game, setOrder, submitRound, resetGame, totalSystemCost } = useGame();

  const handleReset = () => {
    resetGame();
    setGameStarted(false);
  };

  if (!gameStarted) {
    return <WelcomeScreen onStart={() => setGameStarted(true)} />;
  }

  if (game.phase === 'gameover') {
    return <GameOverScreen game={game} resetGame={handleReset} totalSystemCost={totalSystemCost} />;
  }

  const displayRound = game.round + 1;
  const lastDemand = game.round > 0 ? game.demandHistory[game.round - 1] : null;

  return (
    <div className="ma-play">
      <header className="ma-topbar">
        <div className="ma-brand">
          <span className="ma-logo">Beer Game</span>
          <span className="ma-tagline">Supply chain · inspired by classic board flow</span>
        </div>
        <div className="ma-week-pill">
          Week {displayRound} <span>/ 20</span>
        </div>
        <div className="ma-topbar-stats">
          <div className="ma-topbar-stat">
            <label>Market demand (last)</label>
            <strong>{lastDemand !== null ? lastDemand : '—'}</strong>
          </div>
          <div className="ma-topbar-stat ma-topbar-stat--cost">
            <label>System cost</label>
            <strong>₹{Math.round(totalSystemCost)}</strong>
          </div>
        </div>
      </header>

      <div className="ma-board">
        <p className="ma-help">
          <strong>Flow:</strong> each week you <strong>receive</strong> (trucks), see <strong>orders</strong> from your customer,
          <strong> ship</strong> what you can, then <strong>place your order</strong> upstream — similar to the
          letters-and-trucks flow described in professional beer games such as{' '}
          <a href="https://beergame.masystem.se/play" target="_blank" rel="noopener noreferrer">MA-system&apos;s version</a>.
        </p>

        <div className="ma-chain">
          {TIERS.map((tierName, idx) => {
            const tier = game.tiers[tierName];
            const [truckThisWeek, truckNextWeek] = tier.incomingShipments || [0, 0];
            const customerOrderThisWeek =
              tierName === 'retailer'
                ? getDemandForRound(game.round)
                : (tier.incomingOrderQueue?.[0] ?? 0);
            const outgoingOrderLabel =
              tierName === 'factory' ? 'Last to production' : `Last to ${ORDER_TO[tierName]}`;

            return (
              <div className="ma-chain-seg" key={tierName}>
                {idx > 0 && (
                  <div className="ma-flow" aria-hidden="true">
                    <span className="ma-flow-arrow">→</span>
                    <span className="ma-flow-label">Goods</span>
                  </div>
                )}
                <div className="ma-echelon">
                  <div className="ma-echelon-head">
                    <span className="ma-letter">{LETTER[tierName]}</span>
                    <div>
                      <div className="ma-echelon-title">{tierName}</div>
                      <div className="ma-echelon-role">{ROLE_BLURB[tierName]}</div>
                    </div>
                  </div>
                  <div className="ma-echelon-body">
                    <div className="ma-board-cards">
                      <div className="ma-board-card ma-board-card--order-in">
                        <div className="ma-board-card-cap">Customer order</div>
                        <div className="ma-board-card-val">{customerOrderThisWeek}</div>
                        <div className="ma-board-card-hint">
                          {tierName === 'retailer'
                            ? 'Market demand · this week'
                            : `From ${SHIP_TO[tierName]} · this week`}
                        </div>
                      </div>

                      <div className="ma-board-card ma-board-card--order-out">
                        <div className="ma-board-card-cap">Outgoing order</div>
                        <div className="ma-board-card-val">{tier.lastOrderPlaced}</div>
                        <div className="ma-board-card-hint">{outgoingOrderLabel}</div>
                      </div>

                      <div className="ma-board-card ma-board-card--stock">
                        <div className="ma-board-card-cap">Current stock</div>
                        <div className="ma-stock-inline">
                          <div>
                            <span className="ma-stock-inline-label">On hand</span>
                            <span className="ma-stock-inline-val">{tier.inventory}</span>
                          </div>
                          <div>
                            <span className="ma-stock-inline-label">Backorder</span>
                            <span
                              className={`ma-stock-inline-val ${tier.backlog > 0 ? 'ma-stock-inline-val--bad' : 'ma-stock-inline-val--ok'}`}
                            >
                              {tier.backlog}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ma-board-card ma-board-card--delivery">
                        <div className="ma-board-card-cap">Incoming delivery</div>
                        <div className="ma-delivery-row">
                          <div className="ma-delivery-slot">
                            <span className="ma-delivery-slot-label">This week</span>
                            <span className="ma-delivery-slot-val">{truckThisWeek}</span>
                          </div>
                          <div className="ma-delivery-slot">
                            <span className="ma-delivery-slot-label">In 2 weeks</span>
                            <span className="ma-delivery-slot-val">{truckNextWeek}</span>
                          </div>
                        </div>
                        <div className="ma-board-card-hint">Goods in transit to you</div>
                      </div>
                    </div>

                    <div className="ma-cost-foot">
                      Your cumulative cost: <strong>₹{Math.round(tier.totalCost)}</strong>
                    </div>

                    <div className="ma-board-card ma-board-card--place-order ma-order-zone">
                      <div className="ma-board-card-cap">Order</div>
                      <label className="ma-order-label" htmlFor={`order-${tierName}`}>
                        Units to order → {ORDER_TO[tierName]}
                      </label>
                      <input
                        id={`order-${tierName}`}
                        className="ma-input"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={game.pendingOrders[tierName] ?? ''}
                        onChange={(e) => setOrder(tierName, e.target.value)}
                      />
                      <p className="ma-order-foot">
                        Leave blank to use the game&apos;s steady default for this role.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button type="button" className="ma-btn-week" onClick={submitRound}>
        Complete week {displayRound}
      </button>

      {game.round > 2 && (
        <div className="ma-chart-wrap">
          <BullwhipChart game={game} />
        </div>
      )}
    </div>
  );
}

export default App;
