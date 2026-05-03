import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useGame } from './useGame';
import { TIERS, TOTAL_ROUNDS } from './gameState';
import { getDemandForRound, hashStringToSeed } from './demandCurve';
import { labelForAiStyle, labelForDemandProfile } from './demandProfilesMeta';
import { WelcomeScreen } from './WelcomeScreen';
import { GameOverScreen } from './GameOverScreen';
import { MultiplayerLobby } from './MultiplayerLobby';
import { TournamentLobby } from './TournamentLobby';
import { BullwhipChart } from './BullwhipChart';
import { ghostOrder } from './ghostPlayer';
import { runAllAutoSessions } from './autoPlay';
import {
  submitOrder,
  getOrdersForRound,
  saveGameState,
  updateSession,
  getTournamentSessions,
  subscribeToOrders,
  subscribeToSession,
  subscribeToGameRounds,
  subscribeToTournamentSessions,
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
  const [autoRunning, setAutoRunning] = useState(false);

  // Bug 2 fix: track actual team rounds from DB for instructor view
  const [teamProgress, setTeamProgress] = useState([]);

  const advancingRef = useRef(false);
  const tournamentAutoRunStartedRef = useRef(false);

  const playerRole = gameConfig?.playerRole ?? null;
  const isMultiplayer = gameConfig?.mode === 'multiplayer';
  const isTournament = gameConfig?.mode === 'tournament';
  const isMultiplayerOrTournament = isMultiplayer || isTournament;
  const isSolo = gameConfig?.mode === 'solo';
  const session = gameConfig?.session;
  const isInstructor = isMultiplayerOrTournament && !playerRole;
  const ghostRoles = gameConfig?.ghostRoles ?? [];
  const ghostRolesKey = ghostRoles.join(',');

  const tournamentSimOptions = useMemo(() => {
    const t = gameConfig?.tournament;
    if (!t?.id) return null;
    return {
      demandProfile: t.demand_profile ?? t.demandProfile ?? 'classic',
      demandSeed: hashStringToSeed(String(t.id)),
      aiStyle: t.ai_style ?? t.aiStyle ?? 'standard',
    };
  }, [
    gameConfig?.tournament?.id,
    gameConfig?.tournament?.demand_profile,
    gameConfig?.tournament?.demandProfile,
    gameConfig?.tournament?.ai_style,
    gameConfig?.tournament?.aiStyle,
  ]);

  const soloSimOptions = useMemo(() => {
    if (!isSolo || !gameConfig) return null;
    const seed =
      typeof gameConfig.demandSeed === 'number' && Number.isFinite(gameConfig.demandSeed)
        ? gameConfig.demandSeed
        : hashStringToSeed(
            `${gameConfig.playerName ?? ''}|${gameConfig.playerRole ?? ''}|solo`
          );
    return {
      demandProfile: gameConfig.demandProfile ?? gameConfig.demand_profile ?? 'classic',
      demandSeed: seed,
      aiStyle: gameConfig.aiStyle ?? gameConfig.ai_style ?? 'standard',
    };
  }, [
    isSolo,
    gameConfig?.demandProfile,
    gameConfig?.demand_profile,
    gameConfig?.demandSeed,
    gameConfig?.aiStyle,
    gameConfig?.ai_style,
    gameConfig?.playerName,
    gameConfig?.playerRole,
  ]);

  const simOptions = isTournament ? tournamentSimOptions : soloSimOptions;

  const {
    game,
    gameRef,
    setOrder,
    submitRound,
    advanceWithOrders,
    loadExternalState,
    resetGame,
    totalSystemCost,
    demandContext,
    aiStyle,
  } = useGame(isSolo ? playerRole : null, simOptions);

  const playerRoleRef = useRef(playerRole);
  const isInstructorRef = useRef(isInstructor);
  useLayoutEffect(() => {
    playerRoleRef.current = playerRole;
  }, [playerRole]);
  useLayoutEffect(() => {
    isInstructorRef.current = isInstructor;
  }, [isInstructor]);

  // ── Load and track real team progress for instructor ────────
  useEffect(() => {
    // Only after the tournament actually starts — avoids duplicate Realtime channels
    // with TournamentLobby while the instructor is still on the setup screen.
    if (!isTournament || !isInstructor || !gameConfig?.tournament || multiplayerState !== 'playing') return;

    const loadProgress = async () => {
      const sessions = await getTournamentSessions(gameConfig.tournament.id);
      setTeamProgress(sessions.map(s => ({
        id: s.id,
        teamNumber: s.team_number,
        round: s.round || 0,
        status: s.status,
      })));
    };

    loadProgress();

    const sub = subscribeToTournamentSessions(gameConfig.tournament.id, () => {
      loadProgress();
    });

    const interval = setInterval(loadProgress, 5000);

    return () => {
      sub.unsubscribe();
      clearInterval(interval);
    };
  }, [isTournament, isInstructor, gameConfig?.tournament?.id, multiplayerState]);

  // ── Auto-run all-AI sessions ─────────────────────────────────
  useEffect(() => {
    if (!isTournament || !isInstructor || multiplayerState !== 'playing') return;
    if (tournamentAutoRunStartedRef.current) return;

    const allSessions = gameConfig?.allSessions || [];
    const sessionGhostRoles = gameConfig?.sessionGhostRoles || {};

    const hasAllAI = allSessions.some(s => (sessionGhostRoles[s.id] || []).length === 4);
    if (!hasAllAI) return;

    tournamentAutoRunStartedRef.current = true;
    queueMicrotask(() => setAutoRunning(true));
    const t = gameConfig?.tournament;
    const runOpts = t?.id
      ? {
          demandContext: {
            profile: t.demand_profile ?? t.demandProfile ?? 'classic',
            seed: hashStringToSeed(String(t.id)),
          },
          aiStyle: t.ai_style ?? t.aiStyle ?? 'standard',
        }
      : {};

    runAllAutoSessions(allSessions, sessionGhostRoles, runOpts)
      .then(() => setAutoRunning(false))
      .catch(err => {
        console.error('Auto-run error:', err);
        setAutoRunning(false);
      });
  }, [isTournament, isInstructor, multiplayerState, gameConfig?.allSessions, gameConfig?.sessionGhostRoles]);

  // ── Ghost auto-submit ────────────────────────────────────────
  useEffect(() => {
    if (!isMultiplayerOrTournament || !session || multiplayerState !== 'playing') return;
    if (ghostRoles.length === 0) return;
    if (game.phase === 'gameover') return;

    const amIResponsible = playerRole === LEADER_ROLE || isInstructor;
    if (!amIResponsible) return;

    const currentRound = game.round;
    const autoSubmitGhosts = async () => {
      for (const role of ghostRoles) {
        const tier = game.tiers[role];
        if (!tier) continue;
        const qty = ghostOrder(tier, aiStyle);
        try {
          await submitOrder(session.id, currentRound, role, qty);
        } catch { /* already submitted */ }
      }
    };
    autoSubmitGhosts();
  }, [
    game.round,
    game.phase,
    ghostRolesKey,
    session?.id,
    playerRole,
    isInstructor,
    isMultiplayerOrTournament,
    multiplayerState,
    aiStyle,
  ]);

  // ── Multiplayer subscriptions ────────────────────────────────
  useEffect(() => {
    if (!isMultiplayerOrTournament || !session || multiplayerState !== 'playing') return;
    const sessionId = session.id;

    const orderSub = subscribeToOrders(sessionId, async () => {
      const currentRound = gameRef.current.round;
      if (gameRef.current.phase === 'gameover') return;

      const orders = await getOrdersForRound(sessionId, currentRound);
      const roles = orders.map(o => o.role);
      setSubmittedRoles([...roles]);

      if (!ALL_ROLES.every(r => roles.includes(r))) return;
      if (advancingRef.current) return;

      const amILeader = playerRoleRef.current === LEADER_ROLE || isInstructorRef.current;
      if (!amILeader) return;

      advancingRef.current = true;
      try {
        const ordersMap = {};
        orders.forEach(o => { ordersMap[o.role] = o.order_qty; });
        const newState = advanceWithOrders(ordersMap);
        if (newState) {
          await saveGameState(sessionId, newState.round, newState);
          await updateSession(sessionId, {
            round: newState.round,
            status: newState.phase === 'gameover' ? 'finished' : 'playing'
          });
        } else {
          advancingRef.current = false;
        }
      } catch (err) {
        console.error('Advance error:', err);
        advancingRef.current = false;
      }
    });

    const roundSub = subscribeToGameRounds(sessionId, payload => {
      const newState = payload.new?.game_state;
      if (!newState) return;
      if (playerRoleRef.current !== LEADER_ROLE) loadExternalState(newState);
      setSubmittedRoles([]);
      setMyOrderSubmitted(false);
      setStatusMsg('');
      advancingRef.current = false;
      if (newState.phase === 'gameover') setStatusMsg('Game over!');
    });

    const sessionSub = subscribeToSession(sessionId, payload => {
      if (payload.new?.status === 'finished') setStatusMsg('Game over!');
    });

    return () => {
      orderSub.unsubscribe();
      roundSub.unsubscribe();
      sessionSub.unsubscribe();
    };
  }, [isMultiplayerOrTournament, session?.id, multiplayerState]);

  const handleReset = () => {
    resetGame();
    setGameConfig(null);
    setMultiplayerState('lobby');
    setSubmittedRoles([]);
    setMyOrderSubmitted(false);
    setAutoRunning(false);
    setTeamProgress([]);
    advancingRef.current = false;
    tournamentAutoRunStartedRef.current = false;
  };

  // ── Welcome ──────────────────────────────────────────────────
  if (!gameConfig) {
    return (
      <WelcomeScreen onStart={config => {
        setGameConfig(config);
        if (config.mode === 'multiplayer') setMultiplayerState('lobby');
        if (config.mode === 'tournament') setMultiplayerState('lobby');
      }} />
    );
  }

  // ── Tournament lobby ─────────────────────────────────────────
  if (isTournament && multiplayerState === 'lobby') {
    const tid = gameConfig.tournament?.id;
    if (tid == null || tid === '') {
      return (
        <div className="ma-welcome ma-shell-enter" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Tournament data is missing. Please go back and try again.
          </p>
          <button type="button" className="ma-btn-start" onClick={handleReset}>
            Back to menu
          </button>
        </div>
      );
    }
    return (
      <TournamentLobby
        key={String(tid)}
        tournament={gameConfig.tournament}
        session={gameConfig.session}
        player={gameConfig.player}
        isCreator={gameConfig.isCreator}
        onGameStart={({ ghostRoles: gr, allSessions, sessionGhostRoles, homeSession }) => {
          setGameConfig(prev => ({
            ...prev,
            ghostRoles: gr,
            allSessions: allSessions || prev.sessions || [],
            sessionGhostRoles: sessionGhostRoles || {},
            session: homeSession || prev.session,
          }));
          setMultiplayerState('playing');
        }}
      />
    );
  }

  // ── Multiplayer lobby ────────────────────────────────────────
  if (isMultiplayer && multiplayerState === 'lobby') {
    return (
      <MultiplayerLobby
        session={gameConfig.session}
        player={gameConfig.player}
        isCreator={gameConfig.isCreator}
        onGameStart={({ ghostRoles: gr }) => {
          setGameConfig(prev => ({ ...prev, ghostRoles: gr }));
          setMultiplayerState('playing');
        }}
        onJoinAsPlayer={newPlayer => {
          setGameConfig(prev => ({
            ...prev,
            player: newPlayer,
            playerRole: newPlayer.role,
          }));
        }}
      />
    );
  }

  // ── Game over ────────────────────────────────────────────────
  if (game.phase === 'gameover') {
    return (
      <GameOverScreen
        game={game}
        resetGame={handleReset}
        totalSystemCost={totalSystemCost}
        playerRole={playerRole}
        tournament={isTournament ? gameConfig.tournament : null}
        mySessionId={isTournament ? gameConfig.session?.id : null}
      />
    );
  }

  const displayRound = Math.min(game.round + 1, TOTAL_ROUNDS);
  const lastDemand = game.round > 0 ? game.demandHistory[game.round - 1] : null;
  const nextDemand = getDemandForRound(
    game.round + 1,
    demandContext ?? { profile: 'classic', seed: 0 }
  );

  // ── Bug 1 fix: instructor sees team progress dashboard ───────
  if (isTournament && isInstructor && multiplayerState === 'playing') {
    const allDone =
      teamProgress.length > 0 && teamProgress.every(t => t.status === 'finished');

    return (
      <div className="ma-play ma-shell-enter">
        <header className="ma-topbar">
          <div className="ma-brand">
            <span className="ma-logo">Beer Game</span>
            <span className="ma-tagline">
              Tournament · {gameConfig.tournament?.code} · Instructor view
            </span>
          </div>
        </header>

        <div style={{ maxWidth: '680px', margin: '2rem auto', padding: '0 1.5rem' }}>

          {/* Status */}
          <div style={{
            background: autoRunning ? '#fffbeb' : allDone ? '#f0fdf4' : '#f0f7ff',
            border: `1px solid ${autoRunning ? '#fde68a' : allDone ? '#86efac' : '#bae6fd'}`,
            borderRadius: '10px', padding: '1rem 1.25rem',
            marginBottom: '1.5rem', fontSize: '14px',
            color: autoRunning ? '#78350f' : allDone ? '#065f46' : '#0369a1'
          }}>
            {autoRunning
              ? '⚡ AI teams auto-playing through all 20 rounds...'
              : allDone
                ? '✅ All teams finished! Click any team to see their results.'
                : `⏳ ${teamProgress.filter(t => t.status === 'playing').length} team(s) in progress...`}
          </div>

          {/* Bug 2 fix: real round progress from DB */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {teamProgress.map(team => {
              const displayRound = Math.min(team.round ?? 0, TOTAL_ROUNDS);
              const pct = Math.min(100, Math.round((displayRound / TOTAL_ROUNDS) * 100));
              return (
                <div
                  key={team.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '0.75rem'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      Team {team.teamNumber}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {team.status === 'finished'
                        ? `✅ Finished · Week ${TOTAL_ROUNDS}`
                        : team.status === 'playing'
                          ? `Week ${displayRound} / ${TOTAL_ROUNDS}`
                          : '⏸️ Not started'}
                    </div>
                  </div>

                  {/* Real progress bar based on actual round */}
                  <div style={{
                    background: '#f3f4f6', borderRadius: '4px',
                    height: '10px', overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: team.status === 'finished' ? '#059669' : '#2f6f9f',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginTop: '4px', fontSize: '11px', color: '#9ca3af'
                  }}>
                    <span>Start</span>
                    <span>{pct}% complete</span>
                    <span>Week {TOTAL_ROUNDS}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              width: '100%', padding: '12px',
              fontSize: '14px', fontWeight: 600,
              background: 'white', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer'
            }}
          >
            End tournament
          </button>
        </div>
      </div>
    );
  }

  // ── Multiplayer submit ───────────────────────────────────────
  const handleMultiplayerSubmit = async () => {
    if (myOrderSubmitted || !playerRole || !session) return;
    const orderQty = game.pendingOrders[playerRole] ?? 0;
    setMyOrderSubmitted(true);
    setStatusMsg(`Order of ${orderQty} submitted! Waiting for others...`);
    try {
      await submitOrder(session.id, game.round, playerRole, orderQty);
    } catch (err) {
      console.error('Submit error:', err);
      setMyOrderSubmitted(false);
      setStatusMsg('Failed to submit. Please try again.');
    }
  };

  // Bug 3 fix: tournament players only see their own card
  const tiersToRender = (isTournament && playerRole) ? [playerRole] : TIERS;
  const isSingleCard = tiersToRender.length === 1;

  return (
    <div className="ma-play ma-shell-enter">
      <header className="ma-topbar">
        <div className="ma-brand">
          <span className="ma-logo">Beer Game</span>
          <span className="ma-tagline">
            {isSolo
              ? `Solo · Playing as ${playerRole}`
              : isTournament
                ? `Tournament · Team ${gameConfig.session?.team_number} · ${playerRole}`
                : isMultiplayer
                  ? `Multiplayer · ${playerRole || 'Instructor'} · ${session?.code}`
                  : 'Full control mode'}
          </span>
        </div>
        <div className="ma-week-pill">
          Week {displayRound} <span>/ {TOTAL_ROUNDS}</span>
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
              🤖 AI managing other tiers ({labelForAiStyle(gameConfig?.aiStyle ?? gameConfig?.ai_style ?? 'standard')}
              ). Demand: {labelForDemandProfile(
                gameConfig?.demandProfile ?? gameConfig?.demand_profile ?? 'classic'
              )}.
            </span>
          )}
          {isTournament && playerRole && (
            <span style={{ color: 'var(--ma-amber)', marginLeft: '8px' }}>
              🎭 You are playing <strong style={{ textTransform: 'capitalize' }}>
                {playerRole}
              </strong> — Team {gameConfig.session?.team_number}.
            </span>
          )}
        </p>

        {/* Status banner */}
        {isMultiplayerOrTournament && (
          <div style={{
            background: submittedRoles.length === 4 ? '#f0fdf4'
              : myOrderSubmitted ? '#fffbeb' : '#f0f9ff',
            border: `1px solid ${submittedRoles.length === 4 ? '#86efac'
              : myOrderSubmitted ? '#fde68a' : '#bae6fd'}`,
            borderRadius: '8px', padding: '0.75rem 1rem',
            marginBottom: '1rem', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div>
              {statusMsg || (myOrderSubmitted
                ? '⏳ Waiting for other players...'
                : '📋 Enter your order and submit')}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {ALL_ROLES.map(role => (
                <span key={role} style={{
                  padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                  fontWeight: 600,
                  background: submittedRoles.includes(role) ? '#dcfce7' : '#f3f4f6',
                  color: submittedRoles.includes(role) ? '#166534' : '#6b7280',
                  textTransform: 'capitalize'
                }}>
                  {submittedRoles.includes(role) ? '✅' : '⏳'} {role}
                  {ghostRoles.includes(role) ? ' 🤖' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bug 3 fix: constrain single card width */}
        <div
          className="ma-chain"
          style={isSingleCard ? {
            maxWidth: '460px',
            margin: '0 auto',
            display: 'block',
          } : {}}
        >
          {tiersToRender.map((tierName, idx) => {
            const tier = game.tiers[tierName];
            const isGhostSolo = isSolo && tierName !== playerRole;
            const isGhostMulti = isMultiplayerOrTournament && ghostRoles.includes(tierName);
            const isMyRole = isMultiplayerOrTournament && tierName === playerRole;
            const isOtherHumanRole = isMultiplayer && !isMyRole && !isGhostMulti && !isInstructor;
            const [truckNextWeek, truckWeekAfter] = tier.incomingShipments || [0, 0];

            const customerOrderThisWeek =
              tierName === 'retailer'
                ? (game.round > 0 ? game.demandHistory[game.round - 1] : 0)
                : (tier.incomingOrdersThisRound ?? 0);

            const outgoingOrderLabel =
              tierName === 'factory' ? 'Last to production' : `Last to ${ORDER_TO[tierName]}`;

            const prevInventory =
              game.round > 0 ? (tier.inventoryHistory[game.round - 2] ?? 12) : 12;

            const roleSubmitted = submittedRoles.includes(tierName);
            const isDimmed = isGhostSolo || isGhostMulti || isOtherHumanRole;

            const showOrderInput =
              (!isSolo && !isMultiplayerOrTournament) ||
              (isSolo && !isGhostSolo) ||
              (isMultiplayerOrTournament && isMyRole);

            return (
              <div className="ma-chain-seg" key={tierName}>
                {!isSingleCard && idx > 0 && (
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
                      ? `2px solid ${ROLE_COLOR[tierName]}` : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <div className="ma-echelon-head">
                    <span
                      className="ma-letter"
                      style={(isMyRole || (isSolo && tierName === playerRole))
                        ? { background: ROLE_COLOR[tierName] } : {}}
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
                        {isMultiplayerOrTournament && roleSubmitted && (
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
                      <div
                        key={`in-${tierName}-${game.round}`}
                        className="ma-board-card ma-board-card--order-in ma-board-card--motion-in"
                      >
                        <div className="ma-board-card-cap">
                          <span className="ma-board-card-cap-icon" aria-hidden>📥</span>
                          <span>Customer order</span>
                        </div>
                        <div className="ma-board-card-val">{customerOrderThisWeek}</div>
                        <div className="ma-board-card-hint">
                          {tierName === 'retailer'
                            ? 'Market demand · this week'
                            : `From ${SHIP_TO[tierName]} · this week`}
                        </div>
                      </div>

                      <div
                        key={`out-${tierName}-${game.round}`}
                        className="ma-board-card ma-board-card--order-out ma-board-card--motion-out"
                      >
                        <div className="ma-board-card-cap">
                          <span className="ma-board-card-cap-icon" aria-hidden>📤</span>
                          <span>Outgoing order</span>
                        </div>
                        <div className="ma-board-card-val">{tier.lastOrderPlaced}</div>
                        <div className="ma-board-card-hint">{outgoingOrderLabel}</div>
                      </div>

                      <div
                        key={`stock-${tierName}-${game.round}`}
                        className="ma-board-card ma-board-card--stock ma-board-card--motion-stock"
                      >
                        <div className="ma-board-card-cap">
                          <span className="ma-board-card-cap-icon" aria-hidden>📦</span>
                          <span>Current stock</span>
                        </div>
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
                            marginTop: '0.6rem', fontSize: '11px',
                            color: 'var(--ma-muted)', lineHeight: 1.7,
                            borderTop: '1px solid rgba(28,45,74,0.1)', paddingTop: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Prev stock</span><strong>{prevInventory}</strong>
                            </div>
                            <div className="ma-stock-flow-row ma-stock-flow-row--in">
                              <span>
                                <span className="ma-stock-flow-ico" aria-hidden>⬇️</span>
                                + Received
                              </span>
                              <strong>+{tier.lastOrderReceived}</strong>
                            </div>
                            <div className="ma-stock-flow-row ma-stock-flow-row--out">
                              <span>
                                <span className="ma-stock-flow-ico" aria-hidden>⬆️</span>
                                − Shipped
                              </span>
                              <strong>−{tier.shipmentHistory?.[game.round - 1] ?? 0}</strong>
                            </div>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              borderTop: '1px solid rgba(28,45,74,0.12)',
                              paddingTop: '2px', fontWeight: 700, color: 'var(--ma-text)'
                            }}>
                              <span>= Now</span><strong>{tier.inventory}</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        key={`del-${tierName}-${game.round}`}
                        className="ma-board-card ma-board-card--delivery ma-board-card--motion-deliver"
                      >
                        <div className="ma-board-card-cap">
                          <span className="ma-board-card-cap-icon" aria-hidden>🚚</span>
                          <span>Incoming delivery</span>
                        </div>
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

                    {showOrderInput && (
                      <div className="ma-board-card ma-board-card--place-order ma-order-zone">
                        <div className="ma-board-card-cap">
                          <span className="ma-board-card-cap-icon" aria-hidden>📝</span>
                          <span>Order</span>
                        </div>
                        <label className="ma-order-label" htmlFor={`order-${tierName}`}>
                          Units to order → {ORDER_TO[tierName]}
                        </label>
                        <input
                          id={`order-${tierName}`}
                          className="ma-input"
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={isMultiplayerOrTournament && myOrderSubmitted}
                          value={game.pendingOrders[tierName] ?? ''}
                          onChange={e => setOrder(tierName, e.target.value)}
                        />
                        <p className="ma-order-foot">
                          {isMultiplayerOrTournament && myOrderSubmitted
                            ? '✅ Submitted — waiting for others'
                            : 'Leave blank to auto-order.'}
                        </p>
                      </div>
                    )}

                    {(isGhostSolo || isGhostMulti) && (
                      <div style={{
                        background: 'rgba(28,45,74,0.04)',
                        border: '1px dashed rgba(28,45,74,0.2)',
                        borderRadius: '8px', padding: '0.75rem',
                        fontSize: '12px', color: 'var(--ma-muted)',
                        textAlign: 'center', marginTop: '0.5rem'
                      }}>
                        🤖 AI ordering automatically
                        <br />
                        <span style={{ fontSize: '11px' }}>Order-up-to policy (target: 12)</span>
                      </div>
                    )}

                    {isOtherHumanRole && (
                      <div style={{
                        background: 'rgba(28,45,74,0.04)',
                        border: '1px dashed rgba(28,45,74,0.2)',
                        borderRadius: '8px', padding: '0.75rem',
                        fontSize: '12px', color: 'var(--ma-muted)',
                        textAlign: 'center', marginTop: '0.5rem'
                      }}>
                        👤 Managed by another player
                        {roleSubmitted && <span style={{ color: 'var(--ma-ok)' }}> · ✅ Submitted</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit button */}
      {isMultiplayerOrTournament ? (
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
            ? `👀 Instructor — Week ${displayRound}`
            : myOrderSubmitted
              ? `⏳ Waiting... (${submittedRoles.length}/4 submitted)`
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