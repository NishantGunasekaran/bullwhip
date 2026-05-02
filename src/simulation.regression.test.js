import { describe, it, expect } from 'vitest';
import { createInitialGameState, TIERS, TOTAL_ROUNDS } from './gameState';
import { advanceRound } from './roundEngine';

const STEADY_4 = Object.fromEntries(TIERS.map(t => [t, 4]));

function runRounds(state, rounds, demandFn, ordersFn) {
  let g = state;
  for (let r = 0; r < rounds; r++) {
    g = advanceRound(g, ordersFn(r, g), demandFn(r));
  }
  return g;
}

function totalSystemCost(game) {
  return TIERS.reduce((s, t) => s + game.tiers[t].totalCost, 0);
}

/** Compact snapshot for golden regression (stable ordering). */
function snapshotCore(game) {
  return {
    round: game.round,
    phase: game.phase,
    demandHistory: game.demandHistory,
    tiers: Object.fromEntries(
      TIERS.map(t => {
        const x = game.tiers[t];
        return [
          t,
          {
            inventory: x.inventory,
            backlog: x.backlog,
            totalCost: x.totalCost,
            incomingShipments: x.incomingShipments,
            incomingOrderQueue: x.incomingOrderQueue ?? null,
            orderHistory: x.orderHistory,
            inventoryHistory: x.inventoryHistory,
            backlogHistory: x.backlogHistory,
          },
        ];
      })
    ),
  };
}

describe('beer game simulation regression', () => {
  it('round 1: smooth start — steady 4 demand and orders keeps inventory ~12', () => {
    const initial = createInitialGameState();
    const next = advanceRound(initial, STEADY_4, 4);

    expect(next.round).toBe(1);
    expect(next.phase).toBe('ordering');
    expect(next.demandHistory).toEqual([4]);

    for (const t of TIERS) {
      expect(next.tiers[t].inventory).toBe(12);
      expect(next.tiers[t].backlog).toBe(0);
      expect(next.tiers[t].orderHistory).toEqual([4]);
      expect(next.tiers[t].totalCost).toBe(6);
      expect(next.tiers[t].incomingShipments).toEqual([4, 4]);
      expect(next.tiers[t].lastOrderReceived).toBe(4);
    }

    expect(next.tiers.retailer.incomingOrdersThisRound).toBe(4);
    expect(next.tiers.wholesaler.incomingOrderQueue).toEqual([4, 4]);
  });

  it('20 rounds steady: completes at full smooth-start cost', () => {
    const final = runRounds(
      createInitialGameState(),
      TOTAL_ROUNDS,
      () => 4,
      () => STEADY_4
    );

    expect(final.phase).toBe('gameover');
    expect(final.round).toBe(TOTAL_ROUNDS);
    expect(final.demandHistory.every(d => d === 4)).toBe(true);

    expect(totalSystemCost(final)).toBe(480);
  });

  it('golden: first 3 rounds steady 4/4 (catch unintended engine changes)', () => {
    const g3 = runRounds(createInitialGameState(), 3, () => 4, () => STEADY_4);
    expect(snapshotCore(g3)).toMatchSnapshot();
  });

  it('demand step to 8 after week 4 increases total cost vs steady 4 demand', () => {
    const steady = runRounds(
      createInitialGameState(),
      TOTAL_ROUNDS,
      () => 4,
      () => STEADY_4
    );
    const steadyCost = totalSystemCost(steady);

    const jumped = runRounds(
      createInitialGameState(),
      TOTAL_ROUNDS,
      (r) => (r < 4 ? 4 : 8),
      () => STEADY_4
    );

    expect(jumped.phase).toBe('gameover');
    expect(totalSystemCost(jumped)).toBeGreaterThan(steadyCost);
  });
});
