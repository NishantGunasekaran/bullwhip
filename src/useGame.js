import { useState, useCallback, useRef } from 'react';
import { createInitialGameState, TIERS } from './gameState';
import { advanceRound } from './roundEngine';
import { getDemandForRound } from './demandCurve';
import { fillGhostOrders } from './ghostPlayer';

export function useGame(playerRole = null) {
  const [game, setGame] = useState(createInitialGameState);

  // Keep a ref that always has the latest game state
  // This avoids stale closure issues in subscriptions
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
      const demand = getDemandForRound(prev.round);
      let orders;
      if (playerRole) {
        orders = fillGhostOrders(prev, playerRole, prev.pendingOrders);
      } else {
        orders = fillMissingOrders(prev);
      }
      return advanceRound(prev, orders, demand);
    });
  }, [playerRole]);

  // Multiplayer: advance with specific orders from all players
  // Takes current state from ref to avoid stale closures
  // Returns the new state synchronously so it can be saved to Supabase
  const advanceWithOrders = useCallback((ordersMap) => {
    const currentGame = gameRef.current;
    const demand = getDemandForRound(currentGame.round);
    const newState = advanceRound(currentGame, ordersMap, demand);
    setGame(newState);
    return newState; // now synchronous — always returns the new state
  }, []);

  // Multiplayer: load state received from Supabase
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
    totalSystemCost
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