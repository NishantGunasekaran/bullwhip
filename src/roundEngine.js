import { HOLDING_COST, BACKLOG_COST, LEAD_TIME, TIERS } from './gameState';

/**
 * Run one complete round.
 */
export function advanceRound(state, orders, demand) {
  const next = deepCopy(state);
  next.round += 1;
  next.demandHistory.push(demand);

  // Step 1: Receive shipments and fill orders (downstream to upstream)
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];

    // Receive shipment arriving this round
    const arriving = tier.incomingShipments.shift() || 0;
    tier.incomingShipments.push(0);
    tier.inventory += arriving;
    tier.lastOrderReceived = arriving;

    // Demand on this tier
    const demandOnTier = (i === 0) ? demand : orders[TIERS[i - 1]];

    // Fill orders
    const totalObligation = demandOnTier + tier.backlog;
    const shipped = Math.min(tier.inventory, totalObligation);
    tier.inventory -= shipped;
    tier.backlog = totalObligation - shipped;

    // Calculate costs
    tier.totalCost += (tier.inventory * HOLDING_COST) + (tier.backlog * BACKLOG_COST);
    tier.inventoryHistory.push(tier.inventory);
  });

  // Step 2: Place orders upstream (downstream to upstream)
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];
    const qty = orders[tierName] ?? 0;

    tier.lastOrderPlaced = qty;
    tier.orderHistory.push(qty);

    if (i < TIERS.length - 1) {
      // Order from supplier (next tier up)
      const supplier = next.tiers[TIERS[i + 1]];
      const canShip = Math.min(qty, supplier.inventory);
      supplier.inventory -= canShip;
      tier.incomingShipments[LEAD_TIME - 1] += canShip;
    } else {
      // Manufacturer produces unlimited
      tier.inventory += qty;  // Instant production
    }
  });

  next.phase = (next.round >= 20) ? 'gameover' : 'ordering';
  next.pendingOrders = {};
  
  return next;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}