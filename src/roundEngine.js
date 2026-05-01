import { HOLDING_COST, BACKLOG_COST, LEAD_TIME, TIERS } from './gameState';

export function advanceRound(state, orders, demand) {
  const next = deepCopy(state);
  next.round += 1;
  next.demandHistory.push(demand);

  // Step 1: Process incoming shipments and fulfill demand
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];

    // Receive incoming shipment
    const arriving = tier.incomingShipments.shift() || 0;
    tier.incomingShipments.push(0);
    tier.inventory += arriving;
    tier.lastOrderReceived = arriving;

    // Determine demand on this tier
    const demandOnTier = (i === 0) ? demand : (orders[TIERS[i - 1]] || 0);

    // Fulfill demand (current + backlog)
    const totalDemand = demandOnTier + tier.backlog;
    const fulfilled = Math.min(tier.inventory, totalDemand);
    tier.inventory -= fulfilled;
    tier.backlog = totalDemand - fulfilled;

    // Calculate costs
    tier.totalCost += (tier.inventory * HOLDING_COST) + (tier.backlog * BACKLOG_COST);
    tier.inventoryHistory.push(tier.inventory);
  });

  // Step 2: Process orders - each tier orders from upstream
  // Key: Process in REVERSE order (manufacturer first, then wholesaler, etc.)
  // This way upstream tiers can ship immediately based on current inventory
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const tierName = TIERS[i];
    const tier = next.tiers[tierName];
    const orderQty = orders[tierName] || 0;

    tier.lastOrderPlaced = orderQty;
    tier.orderHistory.push(orderQty);

    if (i === TIERS.length - 1) {
      // Manufacturer - unlimited production capacity
      // Add to pipeline (will arrive in LEAD_TIME rounds)
      tier.incomingShipments[LEAD_TIME - 1] += orderQty;
    } else {
      // All other tiers order from upstream supplier
      const supplierName = TIERS[i + 1];
      const supplier = next.tiers[supplierName];

      // Supplier ships based on current inventory (after they received their shipment)
      const canShip = Math.min(orderQty, supplier.inventory);
      supplier.inventory -= canShip;

      // Add to this tier's pipeline
      tier.incomingShipments[LEAD_TIME - 1] += canShip;
    }
  }

  next.phase = (next.round >= 20) ? 'gameover' : 'ordering';
  next.pendingOrders = {};
  
  return next;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}