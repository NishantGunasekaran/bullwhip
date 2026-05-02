/**
 * Ghost player AI — uses a simple order-up-to policy.
 * Mimics how a real manager would order: top up to target
 * accounting for inventory, backlog, and what's already in the pipeline.
 */

const TARGET_STOCK = 12;

/**
 * Calculate ghost order for a tier.
 * @param {object} tier - the tier state object
 * @returns {number} order quantity
 */
export function ghostOrder(tier) {
  // Net stock position = on hand - backlog + what's already in transit
  const inPipeline = (tier.incomingShipments || []).reduce((a, b) => a + b, 0);
  const netStock = tier.inventory - tier.backlog + inPipeline;

  // Order enough to bring net stock back to target, plus cover last demand
  const lastDemand = tier.incomingOrdersThisRound || tier.lastOrderPlaced || 4;
  const orderQty = Math.max(0, TARGET_STOCK - netStock + lastDemand);

  return orderQty;
}

/**
 * Fill in orders for all ghost-controlled tiers.
 * @param {object} game - full game state
 * @param {string} playerRole - the human player's role (their order comes from UI)
 * @param {object} pendingOrders - orders already entered by human player
 * @returns {object} complete orders for all tiers
 */
export function fillGhostOrders(game, playerRole, pendingOrders) {
  const orders = {};

  for (const tierName of Object.keys(game.tiers)) {
    if (tierName === playerRole) {
      // Human player's order — use what they entered or fallback to ghost
      const humanOrder = pendingOrders[tierName];
      orders[tierName] = humanOrder !== undefined
        ? humanOrder
        : ghostOrder(game.tiers[tierName]);
    } else {
      // Ghost player — auto-calculate
      orders[tierName] = ghostOrder(game.tiers[tierName]);
    }
  }

  return orders;
}