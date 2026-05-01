// ─── Constants ───────────────────────────────────────────────
export const TIERS = ['retailer', 'distributor', 'wholesaler', 'manufacturer'];

export const LEAD_TIME = 2;  // rounds before a shipment arrives
export const HOLDING_COST = 0.5;  // ₹ per unit per round held
export const BACKLOG_COST = 1.0;  // ₹ per unit per round unfilled
export const TOTAL_ROUNDS = 20;

// ─── One tier's state for a single round ─────────────────────
// (This is exactly one row in your mental PostgreSQL table)
export function createTierState(name) {
  return {
    name,
    inventory:    100,   // units on hand right now
    backlog:       0,   // unfilled orders owed to downstream
    incomingShipments: [0, 0], // pipeline: [arrives next round, round after]
    lastOrderPlaced:  4,   // what this tier ordered last round
    lastOrderReceived: 0,  // what came in from upstream this round
    totalCost:         0,  // accumulated ₹ cost
    orderHistory:      [],  // array of orders placed each round
    inventoryHistory:  [],  // for the chart
  };
}

// ─── Full game state ─────────────────────────────────────────
export function createInitialGameState() {
  return {
    round:       0,
    tiers:       Object.fromEntries(TIERS.map(t => [t, createTierState(t)])),
    demandHistory: [],    // actual end-customer demand each round
    pendingOrders: {},    // orders placed this round, waiting to submit
    phase:       'ordering', // 'ordering' | 'results' | 'gameover'
  };
}