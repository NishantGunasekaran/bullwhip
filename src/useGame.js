import { useState, useCallback, useRef, useMemo } from 'react';
import { createInitialGameState, TIERS } from './gameState';
import { advanceRound } from './roundEngine';
import { getDemandForRound } from './demandCurve';
import { fillGhostOrders } from './ghostPlayer';

/**
 * @param {string|null} playerRole - solo human role, or null
 * @param {object|null} simOptions - tournament / session simulation options
 * @param {string} [simOptions.demandProfile]
 * @param {number} [simOptions.demandSeed]
 * @param {string} [simOptions.aiStyle]
 */
export function useGame(playerRole = null, simOptions = null) {
  const demandProfile = simOptions?.demandProfile ?? 'classic';
  const demandSeed = Number.isFinite(simOptions?.demandSeed) ? simOptions.demandSeed : 0;
  const aiStyle = simOptions?.aiStyle ?? 'standard';

  const demandCtx = useMemo(
    () => ({ profile: demandProfile, seed: demandSeed }),
    [demandProfile, demandSeed]
  );

  const [game, setGame] = useState(createInitialGameState);

  const gameRef = useRef(game);
  gameRef.current = game;

  const setOrder = useCallback((tierName, qty) => {
    const numQty = Number(qty);
    const validQty = isNaN(numQty) ? 0 : Math.max(0, numQty);
    setGame(prev => ({
      ...prev,
      pendingOrders: { ...prev.pendingOrders, [tierName]: validQty }
    }));
  }, []);

  const submitRound = useCallback(() => {
    setGame(prev => {
      const demand = getDemandForRound(prev.round, demandCtx);
      let orders;
      if (playerRole) {
        orders = fillGhostOrders(prev, playerRole, prev.pendingOrders, aiStyle);
      } else {
        orders = fillMissingOrders(prev);
      }
      return advanceRound(prev, orders, demand);
    });
  }, [playerRole, demandCtx, aiStyle]);

  const advanceWithOrders = useCallback((ordersMap) => {
    const currentGame = gameRef.current;
    const demand = getDemandForRound(currentGame.round, demandCtx);
    const newState = advanceRound(currentGame, ordersMap, demand);
    setGame(newState);
    return newState;
  }, [demandCtx]);

  const loadExternalState = useCallback((externalState) => {
    setGame({
      ...externalState,
      pendingOrders: {},
    });
  }, []);

  const resetGame = useCallback(() => {
    setGame(createInitialGameState());
  }, []);

  const totalSystemCost = TIERS.reduce(
    (sum, t) => sum + game.tiers[t].totalCost, 0
  );

  return {
    game,
    gameRef,
    setOrder,
    submitRound,
    advanceWithOrders,
    loadExternalState,
    resetGame,
    totalSystemCost,
    demandContext: demandCtx,
    aiStyle,
  };
}

function fillMissingOrders(game) {
  const TARGET_INVENTORY = 12;
  const STEADY_ORDER = 4;
  return Object.fromEntries(
    TIERS.map(t => {
      const tier = game.tiers[t];
      const pending = game.pendingOrders[t];
      if (pending !== undefined) return [t, pending];
      const computed = Math.max(0, TARGET_INVENTORY - tier.inventory + tier.backlog);
      const autoQty = computed || STEADY_ORDER;
      return [t, autoQty];
    })
  );
}
