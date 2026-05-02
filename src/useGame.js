import { useState, useCallback } from 'react';
import { createInitialGameState, TIERS } from './gameState';
import { advanceRound } from './roundEngine';
import { getDemandForRound } from './demandCurve';

export function useGame() {
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
      const orders = fillMissingOrders(prev);
      const demand = getDemandForRound(prev.round);
      return advanceRound(prev, orders, demand);
    });
  }, []);

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
  // If target-based auto is 0 (flush stock), still use baseline 4 so the chain ships; typed 0 is explicit via pending.
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