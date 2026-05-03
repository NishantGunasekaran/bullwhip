/**
 * Ghost player AI — order-up-to variants for instructor / multiplayer ghosts.
 */

const BASE_TARGET = 12;
const STEADY_FALLBACK = 4;

/** Style tweaks — interpret as behavioral bias vs baseline anchoring (Sterman / Beer Game). */
const AI_STYLES = {
  standard: { targetMult: 1, backlogWeight: 1, smooth: false, backlogPanic: 0 },
  cautious: { targetMult: 0.82, backlogWeight: 0.85, smooth: false, backlogPanic: 0 },
  aggressive: { targetMult: 1.18, backlogWeight: 1.12, smooth: false, backlogPanic: 0 },
  smoothed: { targetMult: 1, backlogWeight: 1, smooth: true, backlogPanic: 0 },
  reactive: { targetMult: 1.05, backlogWeight: 1, smooth: false, backlogPanic: 0.55 },
};

function styleConfig(style) {
  return AI_STYLES[style] || AI_STYLES.standard;
}

/**
 * Calculate ghost order for a tier.
 * @param {object} tier - the tier state object
 * @param {string} [style='standard'] — AI_STYLES key
 */
export function ghostOrder(tier, style = 'standard') {
  const cfg = styleConfig(style);
  const TARGET = Math.max(4, Math.round(BASE_TARGET * cfg.targetMult));

  const inPipeline = (tier.incomingShipments || []).reduce((a, b) => a + b, 0);
  const netStock = tier.inventory - tier.backlog + inPipeline;

  let lastDemand = tier.incomingOrdersThisRound ?? tier.lastOrderPlaced ?? STEADY_FALLBACK;

  if (cfg.smooth && tier.orderHistory?.length >= 2) {
    const oh = tier.orderHistory;
    lastDemand = (oh[oh.length - 1] + oh[oh.length - 2]) / 2;
  }

  let orderQty = Math.max(0, TARGET - netStock + lastDemand * cfg.backlogWeight);

  if (cfg.backlogPanic > 0 && tier.backlog > 0) {
    orderQty += tier.backlog * cfg.backlogPanic;
  }

  return Math.max(0, Math.round(orderQty));
}

/**
 * Fill in orders for all ghost-controlled tiers.
 */
export function fillGhostOrders(game, playerRole, pendingOrders, aiStyle = 'standard') {
  const orders = {};

  for (const tierName of Object.keys(game.tiers)) {
    if (tierName === playerRole) {
      const humanOrder = pendingOrders[tierName];
      orders[tierName] = humanOrder !== undefined
        ? humanOrder
        : ghostOrder(game.tiers[tierName], aiStyle);
    } else {
      orders[tierName] = ghostOrder(game.tiers[tierName], aiStyle);
    }
  }

  return orders;
}
