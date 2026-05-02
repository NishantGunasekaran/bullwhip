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

const ROLE_COLOR = {
  retailer: '#4a6fa5',
  wholesaler: '#2a6f62',
  distributor: '#9a7b2c',
  factory: '#b54a3f',
};

const ROLE_BLURB = {
  retailer: 'Serves market demand',
  wholesaler: 'Supplies retailer',
  distributor: 'Supplies wholesaler',
  factory: 'Production & lead time',
};

function App() {
  const [gameConfig, setGameConfig] = useState(null); // { mode, playerRole }
  const playerRole = gameConfig?.playerRole ?? null;
  const { game, setOrder, submitRound, resetGame, totalSystemCost } = useGame(playerRole);

  const handleReset = () => {
    resetGame();
    setGameConfig(null);
  };

  // Welcome screen
  if (!gameConfig) {
    return <WelcomeScreen onStart={(config) => setGameConfig(config)} />;
  }

  // Game over screen
  if (game.phase === 'gameover') {
    return (
      <GameOverScreen
        game={game}
        resetGame={handleReset}
        totalSystemCost={totalSystemCost}
        playerRole={playerRole}
      />
    );
  }

  const displayRound = game.round + 1;
  const lastDemand = game.round > 0 ? game.demandHistory[game.round - 1] : null;
  const nextDemand = getDemandForRound(game.round + 1);
  const isSolo = gameConfig.mode === 'solo';

  // In solo mode, decide which tiers to show
  // Always show all tiers but mark ghost ones as read-only
  const tiersToShow = TIERS;

  return (
    <div className="ma-play">
      <header className="ma-topbar">
        <div className="ma-brand">
          <span className="ma-logo">Beer Game</span>
          <span className="ma-tagline">
            {isSolo
              ? `Solo · Playing as ${playerRole}`
              : 'Full control mode'}
          </span>
        </div>
        <div className="ma-week-pill">
          Week {displayRound} <span>/ 20</span>
        </div>
        <div className="ma-topbar-stats">
          <div className="ma-topbar-stat">
            <label>Market demand (last week)</label>
            <strong>{lastDemand !== null ? lastDemand : '—'}</strong>
          </div>
          <div className="ma-topbar-stat">
            <label>Next week demand</label>
            <strong style={{ color: 'var(--ma-amber)' }}>{nextDemand}</strong>
          </div>
          <div className="ma-topbar-stat ma-topbar-stat--cost">
            <label>System cost</label>
            <strong>₹{Math.round(totalSystemCost)}</strong>
          </div>
        </div>
      </header>

      <div className="ma-board">
        <p className="ma-help">
          <strong>Flow:</strong> each week you <strong>receive</strong> goods, see{' '}
          <strong>orders</strong> from your customer, <strong>ship</strong> what you can,
          then <strong>place your order</strong> upstream.
          {isSolo && (
            <span style={{ color: 'var(--ma-amber)', marginLeft: '8px' }}>
              🤖 Ghost players are managing the other tiers automatically.
            </span>
          )}
        </p>

        <div className="ma-chain">
          {tiersToShow.map((tierName, idx) => {
            const tier = game.tiers[tierName];
            const isGhost = isSolo && tierName !== playerRole;
            const [truckNextWeek, truckWeekAfter] = tier.incomingShipments || [0, 0];

            const customerOrderThisWeek =
              tierName === 'retailer'
                ? (game.round > 0 ? game.demandHistory[game.round - 1] : 0)
                : (tier.incomingOrdersThisRound ?? 0);

            const outgoingOrderLabel =
              tierName === 'factory'
                ? 'Last to production'
                : `Last to ${ORDER_TO[tierName]}`;

            const prevInventory =
              game.round > 0
                ? (tier.inventoryHistory[game.round - 2] ?? 12)
                : 12;

            return (
              <div className="ma-chain-seg" key={tierName}>
                {idx > 0 && (
                  <div className="ma-flow" aria-hidden="true">
                    <span className="ma-flow-arrow">→</span>
                    <span className="ma-flow-label">Goods</span>
                  </div>
                )}

                <div
                  className="ma-echelon"
                  style={{
                    opacity: isGhost ? 0.75 : 1,
                    outline: !isGhost && isSolo
                      ? `2px solid ${ROLE_COLOR[tierName]}`
                      : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <div className="ma-echelon-head">
                    <span
                      className="ma-letter"
                      style={
                        !isGhost && isSolo
                          ? { background: ROLE_COLOR[tierName] }
                          : {}
                      }
                    >
                      {LETTER[tierName]}
                    </span>
                    <div>
                      <div className="ma-echelon-title" style={{ textTransform: 'capitalize' }}>
                        {tierName}
                        {isGhost && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            color: 'var(--ma-muted)',
                            fontWeight: 400
                          }}>
                            🤖 AI
                          </span>
                        )}
                        {!isGhost && isSolo && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '11px',
                            color: ROLE_COLOR[tierName],
                            fontWeight: 600
                          }}>
                            ← You
                          </span>
                        )}
                      </div>
                      <div className="ma-echelon-role">{ROLE_BLURB[tierName]}</div>
                    </div>
                  </div>

                  <div className="ma-echelon-body">
                    <div className="ma-board-cards">

                      {/* Customer order */}
                      <div className="ma-board-card ma-board-card--order-in">
                        <div className="ma-board-card-cap">Customer order</div>
                        <div className="ma-board-card-val">{customerOrderThisWeek}</div>
                        <div className="ma-board-card-hint">
                          {tierName === 'retailer'
                            ? 'Market demand · this week'
                            : `From ${SHIP_TO[tierName]} · this week`}
                        </div>
                      </div>

                      {/* Outgoing order */}
                      <div className="ma-board-card ma-board-card--order-out">
                        <div className="ma-board-card-cap">Outgoing order</div>
                        <div className="ma-board-card-val">{tier.lastOrderPlaced}</div>
                        <div className="ma-board-card-hint">{outgoingOrderLabel}</div>
                      </div>

                      {/* Current stock */}
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
                              className={`ma-stock-inline-val ${
                                tier.backlog > 0
                                  ? 'ma-stock-inline-val--bad'
                                  : 'ma-stock-inline-val--ok'
                              }`}
                            >
                              {tier.backlog}
                            </span>
                          </div>
                        </div>

                        {/* Stock working */}
                        {game.round > 0 && (
                          <div style={{
                            marginTop: '0.6rem',
                            fontSize: '11px',
                            color: 'var(--ma-muted)',
                            lineHeight: 1.7,
                            borderTop: '1px solid rgba(28,45,74,0.1)',
                            paddingTop: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Prev stock</span>
                              <strong>{prevInventory}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ma-ok)' }}>
                              <span>+ Received</span>
                              <strong>+{tier.lastOrderReceived}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ma-bad)' }}>
                              <span>− Shipped</span>
                              <strong>−{tier.shipmentHistory?.[game.round - 1] ?? 0}</strong>
                            </div>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              borderTop: '1px solid rgba(28,45,74,0.12)',
                              paddingTop: '2px', fontWeight: 700,
                              color: 'var(--ma-text)'
                            }}>
                              <span>= Now</span>
                              <strong>{tier.inventory}</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Incoming deliveries */}
                      <div className="ma-board-card ma-board-card--delivery">
                        <div className="ma-board-card-cap">Incoming delivery</div>
                        <div className="ma-delivery-row">
                          <div className="ma-delivery-slot">
                            <span className="ma-delivery-slot-label">Next week</span>
                            <span className="ma-delivery-slot-val">{truckNextWeek}</span>
                          </div>
                          <div className="ma-delivery-slot">
                            <span className="ma-delivery-slot-label">Week after</span>
                            <span className="ma-delivery-slot-val">{truckWeekAfter}</span>
                          </div>
                        </div>
                        <div className="ma-board-card-hint">Goods in transit to you</div>
                      </div>
                    </div>

                    <div className="ma-cost-foot">
                      Cumulative cost: <strong>₹{Math.round(tier.totalCost)}</strong>
                    </div>

                    {/* Order input — only for human player */}
                    {!isGhost && (
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
                          Leave blank to auto-order.
                        </p>
                      </div>
                    )}

                    {/* Ghost player info box */}
                    {isGhost && (
                      <div style={{
                        background: 'rgba(28,45,74,0.04)',
                        border: '1px dashed rgba(28,45,74,0.2)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '12px',
                        color: 'var(--ma-muted)',
                        textAlign: 'center',
                        marginTop: '0.5rem'
                      }}>
                        🤖 AI ordering automatically
                        <br />
                        <span style={{ fontSize: '11px' }}>
                          Uses order-up-to policy (target stock: 12)
                        </span>
                      </div>
                    )}
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