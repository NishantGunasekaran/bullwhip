import { useState, useEffect, useRef } from 'react';
import { useGame } from './useGame';
import { TIERS } from './gameState';
import { getDemandForRound } from './demandCurve';
import { WelcomeScreen } from './WelcomeScreen';
import { GameOverScreen } from './GameOverScreen';
import { MultiplayerLobby } from './MultiplayerLobby';
import { BullwhipChart } from './BullwhipChart';
import { ghostOrder } from './ghostPlayer';
import {
  submitOrder,
  getOrdersForRound,
  saveGameState,
  updateSession,
  subscribeToOrders,
  subscribeToSession,
  subscribeToGameRounds,
} from './sessionService';
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

const LETTER = { retailer: 'R', wholesaler: 'W', distributor: 'D', factory: 'F' };

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

const ALL_ROLES = ['retailer', 'wholesaler', 'distributor', 'factory'];
const LEADER_ROLE = 'retailer';

function App() {
  const [gameConfig, setGameConfig] = useState(null);
  const [multiplayerState, setMultiplayerState] = useState('lobby');
  const [submittedRoles, setSubmittedRoles] = useState([]);
  const [myOrderSubmitted, setMyOrderSubmitted] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const advancingRef = useRef(false);

  const playerRole = gameConfig?.playerRole ?? null;
  const isMultiplayer = gameConfig?.mode === 'multiplayer';
  const isSolo = gameConfig?.mode === 'solo';
  const session = gameConfig?.session;
  const player = gameConfig?.player;
  const isInstructor = isMultiplayer && !playerRole;
  const ghostRoles = gameConfig?.ghostRoles || [];

  const {
    game,
    gameRef,
    setOrder,
    submitRound,
    advanceWithOrders,
    loadExternalState,
    resetGame,
    totalSystemCost
  } = useGame(isSolo ? playerRole : null);

  // Keep refs for values used inside subscription callbacks
  // This prevents stale closure bugs
  const playerRoleRef = useRef(playerRole);
  playerRoleRef.current = playerRole;
  const isInstructorRef = useRef(isInstructor);
  isInstructorRef.current = isInstructor;
  const ghostRolesRef = useRef(ghostRoles);
  ghostRolesRef.current = ghostRoles;

  // ── Auto-submit ghost orders each round ────────────────────
  useEffect(() => {
    if (!isMultiplayer || !session || multiplayerState !== 'playing') return;
    if (ghostRoles.length === 0) return;
    if (game.phase === 'gameover') return; // stop after round 20

    const amIResponsibleForGhosts = playerRole === LEADER_ROLE || isInstructor;
    if (!amIResponsibleForGhosts) return;

    const currentRound = game.round;

    const autoSubmitGhosts = async () => {
      for (const role of ghostRoles) {
        const tier = game.tiers[role];
        if (!tier) continue;
        const qty = ghostOrder(tier);
        try {
          await submitOrder(session.id, currentRound, role, qty);
        } catch {
          // Already submitted for this round — ignore
        }
      }
    };

    autoSubmitGhosts();
  }, [game.round, isMultiplayer, multiplayerState]);

  // ── Multiplayer subscriptions ──────────────────────────────
  // Subscribe once and use refs internally to avoid stale closures
  useEffect(() => {
    if (!isMultiplayer || !session || multiplayerState !== 'playing') return;

    const sessionId = session.id;

    // When orders come in, check if all 4 submitted → advance round
    const orderSub = subscribeToOrders(sessionId, async () => {
      const currentRound = gameRef.current.round;

      // Stop processing if game is already over
      if (gameRef.current.phase === 'gameover') return;

      const orders = await getOrdersForRound(sessionId, currentRound);
      const roles = orders.map(o => o.role);
      setSubmittedRoles([...roles]);

      const allSubmitted = ALL_ROLES.every(r => roles.includes(r));
      if (!allSubmitted) return;
      if (advancingRef.current) return;

      const currentPlayerRole = playerRoleRef.current;
      const currentIsInstructor = isInstructorRef.current;
      const amILeader = currentPlayerRole === LEADER_ROLE || currentIsInstructor;
      if (!amILeader) return;

      advancingRef.current = true;

      try {
        const ordersMap = {};
        orders.forEach(o => { ordersMap[o.role] = o.order_qty; });

        // Advance the round — synchronous now, always returns newState
        const newState = advanceWithOrders(ordersMap);

        if (newState) {
          await saveGameState(sessionId, newState.round, newState);
          await updateSession(sessionId, {
            round: newState.round,
            status: newState.phase === 'gameover' ? 'finished' : 'playing'
          });
        } else {
          console.error('advanceWithOrders returned undefined');
          advancingRef.current = false;
        }
      } catch (err) {
        console.error('Error advancing round:', err);
        advancingRef.current = false;
      }
    });

    // When new game state is saved, non-leader players sync it
    const roundSub = subscribeToGameRounds(sessionId, (payload) => {
      const newState = payload.new?.game_state;
      if (!newState) return;

      const currentPlayerRole = playerRoleRef.current;

      // Non-leader players load state from DB
      if (currentPlayerRole !== LEADER_ROLE) {
        loadExternalState(newState);
      }

      // Reset round UI for everyone
      setSubmittedRoles([]);
      setMyOrderSubmitted(false);
      setStatusMsg('');
      advancingRef.current = false;

      // Show game over message
      if (newState.phase === 'gameover') {
        setStatusMsg('Game over!');
      }
    });

    // Watch for session status changes
    const sessionSub = subscribeToSession(sessionId, (payload) => {
      if (payload.new?.status === 'finished') {
        setStatusMsg('Game over!');
      }
    });

    return () => {
      orderSub.unsubscribe();
      roundSub.unsubscribe();
      sessionSub.unsubscribe();
    };
  }, [isMultiplayer, session?.id, multiplayerState]);

  const handleReset = () => {
    resetGame();
    setGameConfig(null);
    setMultiplayerState('lobby');
    setSubmittedRoles([]);
    setMyOrderSubmitted(false);
    advancingRef.current = false;
  };

  // ── Welcome screen ─────────────────────────────────────────
  if (!gameConfig) {
    return (
      <WelcomeScreen onStart={(config) => {
        setGameConfig(config);
        if (config.mode === 'multiplayer') setMultiplayerState('lobby');
      }} />
    );
  }

  // ── Multiplayer lobby ──────────────────────────────────────
  if (isMultiplayer && multiplayerState === 'lobby') {
    return (
      <MultiplayerLobby
        session={session}
        player={player}
        onGameStart={({ ghostRoles: gr }) => {
          setGameConfig(prev => ({ ...prev, ghostRoles: gr }));
          setMultiplayerState('playing');
        }}
        onJoinAsPlayer={(newPlayer) => {
          setGameConfig(prev => ({
            ...prev,
            player: newPlayer,
            playerRole: newPlayer.role,
          }));
        }}
      />
    );
  }

  // ── Game over screen ───────────────────────────────────────
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

  // ── Handle multiplayer order submission ────────────────────
  const handleMultiplayerSubmit = async () => {
    if (myOrderSubmitted) return;
    if (!playerRole || !session) return;

    const orderQty = game.pendingOrders[playerRole] ?? 0;
    setMyOrderSubmitted(true);
    setStatusMsg(`Order of ${orderQty} submitted! Waiting for others...`);

    try {
      await submitOrder(session.id, game.round, playerRole, orderQty);
    } catch (err) {
      console.error('Submit order error:', err);
      setMyOrderSubmitted(false);
      setStatusMsg('Failed to submit. Please try again.');
    }
  };

  return (
    <div className="ma-play">
      <header className="ma-topbar">
        <div className="ma-brand">
          <span className="ma-logo">Beer Game</span>
          <span className="ma-tagline">
            {isSolo
              ? `Solo · Playing as ${playerRole}`
              : isMultiplayer
                ? `Multiplayer · ${playerRole || 'Instructor'} · ${session?.code}`
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
              🤖 AI managing other tiers.
            </span>
          )}
        </p>

        {/* Multiplayer status banner */}
        {isMultiplayer && (
          <div style={{
            background: submittedRoles.length === 4
              ? '#f0fdf4'
              : myOrderSubmitted ? '#fffbeb' : '#f0f9ff',
            border: `1px solid ${submittedRoles.length === 4
              ? '#86efac'
              : myOrderSubmitted ? '#fde68a' : '#bae6fd'}`,
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div>
              {statusMsg || (myOrderSubmitted
                ? '⏳ Waiting for other players...'
                : '📋 Enter your order and submit')}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ALL_ROLES.map(role => (
                <span
                  key={role}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: submittedRoles.includes(role) ? '#dcfce7' : '#f3f4f6',
                    color: submittedRoles.includes(role) ? '#166534' : '#6b7280',
                    textTransform: 'capitalize'
                  }}
                >
                  {submittedRoles.includes(role) ? '✅' : '⏳'} {role}
                  {ghostRoles.includes(role) ? ' 🤖' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="ma-chain">
          {TIERS.map((tierName, idx) => {
            const tier = game.tiers[tierName];
            const isGhostSolo = isSolo && tierName !== playerRole;
            const isGhostMulti = isMultiplayer && ghostRoles.includes(tierName);
            const isMyRole = isMultiplayer && tierName === playerRole;
            const isOtherHumanRole = isMultiplayer && !isMyRole && !isGhostMulti && !isInstructor;
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

            const roleSubmitted = submittedRoles.includes(tierName);
            const isDimmed = isGhostSolo || isGhostMulti || isOtherHumanRole;

            const showOrderInput =
              (!isSolo && !isMultiplayer) ||
              (isSolo && !isGhostSolo) ||
              (isMultiplayer && isMyRole);

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
                    opacity: isDimmed ? 0.7 : 1,
                    outline: (isMyRole || (isSolo && tierName === playerRole))
                      ? `2px solid ${ROLE_COLOR[tierName]}`
                      : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <div className="ma-echelon-head">
                    <span
                      className="ma-letter"
                      style={
                        (isMyRole || (isSolo && tierName === playerRole))
                          ? { background: ROLE_COLOR[tierName] }
                          : {}
                      }
                    >
                      {LETTER[tierName]}
                    </span>
                    <div>
                      <div className="ma-echelon-title" style={{ textTransform: 'capitalize' }}>
                        {tierName}
                        {(isGhostSolo || isGhostMulti) && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--ma-muted)', fontWeight: 400 }}>
                            🤖 AI
                          </span>
                        )}
                        {isMyRole && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: ROLE_COLOR[tierName], fontWeight: 600 }}>
                            ← You
                          </span>
                        )}
                        {isMultiplayer && roleSubmitted && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--ma-ok)', fontWeight: 600 }}>
                            ✅
                          </span>
                        )}
                      </div>
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
                            <span className={`ma-stock-inline-val ${tier.backlog > 0 ? 'ma-stock-inline-val--bad' : 'ma-stock-inline-val--ok'}`}>
                              {tier.backlog}
                            </span>
                          </div>
                        </div>

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
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderTop: '1px solid rgba(28,45,74,0.12)',
                              paddingTop: '2px',
                              fontWeight: 700,
                              color: 'var(--ma-text)'
                            }}>
                              <span>= Now</span>
                              <strong>{tier.inventory}</strong>
                            </div>
                          </div>
                        )}
                      </div>

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

                    {/* Order input — human players only */}
                    {showOrderInput && (
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
                          disabled={isMultiplayer && myOrderSubmitted}
                          value={game.pendingOrders[tierName] ?? ''}
                          onChange={(e) => setOrder(tierName, e.target.value)}
                        />
                        <p className="ma-order-foot">
                          {isMultiplayer && myOrderSubmitted
                            ? '✅ Submitted — waiting for others'
                            : 'Leave blank to auto-order.'}
                        </p>
                      </div>
                    )}

                    {/* Ghost AI badge */}
                    {(isGhostSolo || isGhostMulti) && (
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
                        <span style={{ fontSize: '11px' }}>Order-up-to policy (target: 12)</span>
                      </div>
                    )}

                    {/* Other human player badge */}
                    {isOtherHumanRole && (
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
                        👤 Managed by another player
                        {roleSubmitted && (
                          <span style={{ color: 'var(--ma-ok)' }}> · ✅ Submitted</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom submit button */}
      {isMultiplayer ? (
        <button
          type="button"
          className="ma-btn-week"
          onClick={handleMultiplayerSubmit}
          disabled={myOrderSubmitted || !playerRole}
          style={{
            opacity: myOrderSubmitted || !playerRole ? 0.5 : 1,
            cursor: myOrderSubmitted || !playerRole ? 'not-allowed' : 'pointer'
          }}
        >
          {!playerRole
            ? `👀 Instructor view — Week ${displayRound}`
            : myOrderSubmitted
              ? `⏳ Waiting for others... (${submittedRoles.length}/4 submitted)`
              : `Submit my order — Week ${displayRound}`}
        </button>
      ) : (
        <button type="button" className="ma-btn-week" onClick={submitRound}>
          Complete week {displayRound}
        </button>
      )}

      {game.round > 2 && (
        <div className="ma-chart-wrap">
          <BullwhipChart game={game} />
        </div>
      )}
    </div>
  );
}

export default App;