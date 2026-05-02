import {
  HOLDING_COST,
  BACKLOG_COST,
  SHIPMENT_LEAD_TIME,
  ORDER_LEAD_TIME,
  TIERS,
  TOTAL_ROUNDS,
} from './gameState';

/**
 * One week for all echelons (interleaved phases):
 * 1) Receive shipments into inventory
 * 2) Read incoming orders (retailer: customer demand; others: order pipeline from downstream)
 * 3) Fulfill: shipment = min(inventory, incoming + backlog); push beer to buyer's shipment queue
 * 4) Place new orders (player input); factory releases production into its own shipment pipeline
 * 5) Holding + backlog costs
 */
export function advanceRound(state, orders, demand) {
  const next = deepCopy(state);
  next.round += 1;
  next.demandHistory.push(demand);

  const shipmentsOut = Object.fromEntries(TIERS.map(t => [t, 0]));
  const incoming = {};

  // —— Step 1: receive shipments ——
  for (const tierName of TIERS) {
    const tier = next.tiers[tierName];
    const arriving = tier.incomingShipments.shift() || 0;
    tier.incomingShipments.push(0);
    tier.inventory += arriving;
    tier.lastOrderReceived = arriving;
  }

  // —— Step 2: incoming orders ——
  incoming.retailer = demand;
  next.tiers.retailer.incomingOrdersThisRound = demand;

  for (let i = 1; i < TIERS.length; i++) {
    const tierName = TIERS[i];
    const tier = next.tiers[tierName];
    const fromQueue = tier.incomingOrderQueue.shift() || 0;
    tier.incomingOrderQueue.push(0);
    incoming[tierName] = fromQueue;
    tier.incomingOrdersThisRound = fromQueue;
  }

  // —— Step 3: fulfill demand ——
  const ret = next.tiers.retailer;
  const retNeed = incoming.retailer + ret.backlog;
  const retShip = Math.min(ret.inventory, retNeed);
  ret.inventory -= retShip;
  ret.backlog = retNeed - retShip;
  shipmentsOut.retailer = retShip;

  for (let i = 1; i < TIERS.length; i++) {
    const supplierName = TIERS[i];
    const buyerName = TIERS[i - 1];
    const supplier = next.tiers[supplierName];
    const need = incoming[supplierName] + supplier.backlog;
    const ship = Math.min(supplier.inventory, need);
    supplier.inventory -= ship;
    supplier.backlog = need - ship;
    next.tiers[buyerName].incomingShipments[SHIPMENT_LEAD_TIME - 1] += ship;
    shipmentsOut[supplierName] = ship;
  }

  // —— Step 4: place orders (human input) ——
  for (let i = 0; i < TIERS.length; i++) {
    const tierName = TIERS[i];
    const tier = next.tiers[tierName];
    const orderQty = orders[tierName] || 0;
    tier.lastOrderPlaced = orderQty;
    tier.orderHistory.push(orderQty);

    if (i === TIERS.length - 1) {
      tier.incomingShipments[SHIPMENT_LEAD_TIME - 1] += orderQty;
    } else {
      const supplierName = TIERS[i + 1];
      next.tiers[supplierName].incomingOrderQueue[ORDER_LEAD_TIME - 1] += orderQty;
    }
  }

  // —— Step 5: costs + histories ——
  for (const tierName of TIERS) {
    const tier = next.tiers[tierName];
    const roundCost =
      tier.inventory * HOLDING_COST + tier.backlog * BACKLOG_COST;
    tier.totalCost += roundCost;
    tier.inventoryHistory.push(tier.inventory);
    tier.backlogHistory.push(tier.backlog);
    tier.demandHistory.push(incoming[tierName]);
    tier.deliveryHistory.push(tier.lastOrderReceived);
    tier.shipmentHistory.push(shipmentsOut[tierName]);
    tier.costHistory.push(roundCost);
  }

  next.phase = next.round >= TOTAL_ROUNDS ? 'gameover' : 'ordering';
  next.pendingOrders = {};
  return next;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
