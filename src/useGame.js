import { useState, useCallback } from 'react';
import { createInitialGameState, TIERS } from './gameState';
import { advanceRound } from './roundEngine';
import { getDemandForRound } from './demandCurve';

export function useGame() {
  const [game, setGame] = useState(createInitialGameState);

  // Called when a player types their order quantity
  const setOrder = useCallback((tierName, qty) => {
    setGame(prev => ({
      ...prev,
      pendingOrders: { ...prev.pendingOrders, [tierName]: Number(qty) }
    }));
  }, []);

  // Called when all players hit "Submit round"
  const submitRound = useCallback(() => {
    setGame(prev => {
      // Fill any missing orders with a simple heuristic
      const orders = fillMissingOrders(prev);
      const demand = getDemandForRound(prev.round);
      return advanceRound(prev, orders, demand);
    });
  }, []);

  const resetGame = useCallback(() => {
    setGame(createInitialGameState());
  }, []);

  // Derived values useful for the UI
  const totalSystemCost = TIERS.reduce(
    (sum, t) => sum + game.tiers[t].totalCost, 0
  );

  return { game, setOrder, submitRound, resetGame, totalSystemCost };
}

// If a tier didn't submit an order, use "order-up-to" heuristic:
// order enough to bring inventory back to a target level
function fillMissingOrders(game) {
  const TARGET_INVENTORY = 12;
  return Object.fromEntries(
    TIERS.map(t => {
      const tier = game.tiers[t];
      const pending = game.pendingOrders[t];
      if (pending !== undefined) return [t, pending];
      // Auto-order: cover backlog + bring inventory toward target
      const autoQty = Math.max(0,
        TARGET_INVENTORY - tier.inventory + tier.backlog
      );
      return [t, autoQty];
    })
  );
}