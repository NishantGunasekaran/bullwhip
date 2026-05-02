import { useState, useCallback } from 'react';
import { createInitialGameState, TIERS } from './gameState';
import { advanceRound } from './roundEngine';
import { getDemandForRound } from './demandCurve';
import { fillGhostOrders } from './ghostPlayer';

export function useGame(playerRole = null) {
  const [game, setGame] = useState(createInitialGameState);

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
      const demand = getDemandForRound(prev.round);

      let orders;
      if (playerRole) {
        // Solo mode: fill ghost orders for all non-player tiers
        orders = fillGhostOrders(prev, playerRole, prev.pendingOrders);
      } else {
        // Full manual mode: fill missing orders with heuristic
        orders = fillMissingOrders(prev);
      }

      return advanceRound(prev, orders, demand);
    });
  }, [playerRole]);

  const resetGame = useCallback(() => {
    setGame(createInitialGameState());
  }, []);

  const totalSystemCost = TIERS.reduce(
    (sum, t) => sum + game.tiers[t].totalCost, 0
  );

  return { game, setOrder, submitRound, resetGame, totalSystemCost };
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