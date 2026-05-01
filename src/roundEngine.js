import { HOLDING_COST, BACKLOG_COST, LEAD_TIME, TIERS } from './gameState';

export function advanceRound(state, orders, demand) {
  const next = deepCopy(state);
  next.round += 1;
  next.demandHistory.push(demand);

  // Step 1: Receive shipments and fill downstream demand
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];

    // 1a. Receive shipment that's arriving this round
    const arriving = tier.incomingShipments.shift() || 0;
    tier.incomingShipments.push(0); // keep array length = 2
    tier.inventory += arriving;
    tier.lastOrderReceived = arriving;

    // 1b. Figure out how much downstream needs from me
    const demandOnMe = (i === 0) ? demand : (orders[TIERS[i - 1]] || 0);

    // 1c. Try to fill orders (current demand + any backlog)
    const totalNeed = demandOnMe + tier.backlog;
    const canDeliver = Math.min(tier.inventory, totalNeed);
    tier.inventory -= canDeliver;
    tier.backlog = totalNeed - canDeliver;

    // 1d. Calculate costs
    tier.totalCost += (tier.inventory * HOLDING_COST) + (tier.backlog * BACKLOG_COST);
    tier.inventoryHistory.push(tier.inventory);
  });

  // Step 2: Each tier places their order, supplier prepares shipment
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];
    const myOrder = orders[tierName] || 0;

    tier.lastOrderPlaced = myOrder;
    tier.orderHistory.push(myOrder);

    // Now: who fulfills my order?
    if (i === TIERS.length - 1) {
      // I'm the manufacturer - I produce whatever I ordered (unlimited capacity)
      tier.incomingShipments[LEAD_TIME - 1] += myOrder;
    } else {
      // I order from the tier above me (my supplier)
      const mySupplier = next.tiers[TIERS[i + 1]];
      
      // Supplier ships what they can (limited by their inventory)
      const theyCanShip = Math.min(myOrder, mySupplier.inventory);
      mySupplier.inventory -= theyCanShip;
      
      // That shipment goes into MY pipeline (arrives in LEAD_TIME rounds)
      tier.incomingShipments[LEAD_TIME - 1] += theyCanShip;
    }
  });

  next.phase = (next.round >= 20) ? 'gameover' : 'ordering';
  next.pendingOrders = {};
  
  return next;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}