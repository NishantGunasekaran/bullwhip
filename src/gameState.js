/** Downstream → upstream: retailer faces customers, factory brews. */
export const TIERS = ['retailer', 'wholesaler', 'distributor', 'factory'];

export const SHIPMENT_LEAD_TIME = 2;
export const ORDER_LEAD_TIME = 2;
export const HOLDING_COST = 0.5;
export const BACKLOG_COST = 1.0;
export const TOTAL_ROUNDS = 20;

/**
 * Smooth / classic beer-game start: 4 units in each shipment slot and in each order-info slot
 * so early rounds stay near steady state (inventory ~12 when demand and orders stay at 4).
 */
const SMOOTH_PIPELINE = 4;

export function createTierState(name) {
  const tier = {
    name,
    inventory: 12,
    backlog: 0,
    incomingShipments: [SMOOTH_PIPELINE, SMOOTH_PIPELINE],
    incomingOrdersThisRound: 0,
    lastOrderPlaced: SMOOTH_PIPELINE,
    lastOrderReceived: 0,
    totalCost: 0,
    orderHistory: [],
    inventoryHistory: [],
    backlogHistory: [],
    demandHistory: [],
    deliveryHistory: [],
    shipmentHistory: [],
    costHistory: [],
  };

  if (name !== 'retailer') {
    tier.incomingOrderQueue = [SMOOTH_PIPELINE, SMOOTH_PIPELINE];
  }

  return tier;
}

export function createInitialGameState() {
  return {
    round: 0,
    tiers: Object.fromEntries(TIERS.map(t => [t, createTierState(t)])),
    demandHistory: [],
    pendingOrders: {},
    phase: 'ordering',
  };
}
