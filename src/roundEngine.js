import { HOLDING_COST, BACKLOG_COST, LEAD_TIME, TIERS } from './gameState';

export function advanceRound(state, orders, demand) {
  const next = deepCopy(state);
  next.round += 1;
  next.demandHistory.push(demand);

  // Step 1: Receive shipments and fulfill LAST round's demand
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];

    // Receive incoming shipment
    const arriving = tier.incomingShipments.shift() || 0;
    tier.incomingShipments.push(0);
    tier.inventory += arriving;
    tier.lastOrderReceived = arriving;

    // Demand on this tier = PREVIOUS round's order from downstream
    // (Retailer serves actual customer demand, others serve last round's order)
    const demandOnTier = (i === 0) 
      ? demand 
      : next.tiers[TIERS[i - 1]].lastOrderPlaced;

    // Fulfill demand (current demand + existing backlog)
    const totalDemand = demandOnTier + tier.backlog;
    const fulfilled = Math.min(tier.inventory, totalDemand);
    tier.inventory -= fulfilled;
    tier.backlog = totalDemand - fulfilled;

    // Calculate costs
    tier.totalCost += (tier.inventory * HOLDING_COST) + (tier.backlog * BACKLOG_COST);
    tier.inventoryHistory.push(tier.inventory);
  });

  // Step 2: Place THIS round's orders and prepare shipments
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];
    const orderQty = orders[tierName] || 0;

    tier.lastOrderPlaced = orderQty;
    tier.orderHistory.push(orderQty);

    if (i === TIERS.length - 1) {
      // Manufacturer - unlimited production capacity
      tier.incomingShipments[LEAD_TIME - 1] += orderQty;
    } else {
      // Order from upstream supplier
      const supplier = next.tiers[TIERS[i + 1]];
      
      // Supplier ships what they can from current inventory
      const canShip = Math.min(orderQty, supplier.inventory);
      supplier.inventory -= canShip;
      
      // Shipment enters pipeline (arrives in LEAD_TIME rounds)
      tier.incomingShipments[LEAD_TIME - 1] += canShip;
    }
  });

  next.phase = (next.round >= 20) ? 'gameover' : 'ordering';
  next.pendingOrders = {};
  
  return next;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}