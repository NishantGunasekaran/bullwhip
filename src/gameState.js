/** Downstream → upstream: retailer faces customers, factory brews. */
export const TIERS = ['retailer', 'wholesaler', 'distributor', 'factory'];

export const SHIPMENT_LEAD_TIME = 2;
export const ORDER_LEAD_TIME = 2;
export const HOLDING_COST = 0.5;
export const BACKLOG_COST = 1.0;
export const TOTAL_ROUNDS = 20;

/** Steady-state pipeline: 4 units/week in transit (typical beer-game init). */
const INITIAL_PIPELINE = 4;

export function createTierState(name) {
  const tier = {
    name,
    inventory: 12,
    backlog: 0,
    incomingShipments: [INITIAL_PIPELINE, INITIAL_PIPELINE],
    incomingOrdersThisRound: 0,
    lastOrderPlaced: INITIAL_PIPELINE,
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
    tier.incomingOrderQueue = [INITIAL_PIPELINE, INITIAL_PIPELINE];
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
