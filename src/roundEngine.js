import { HOLDING_COST, BACKLOG_COST, LEAD_TIME, TIERS } from './gameState';

/**
 * Run one complete round.
 * Takes the current state + player orders, returns the NEW state.
 * Pure function — same inputs always give same output.
 *
 * @param {object} state   - current game state
 * @param {object} orders  - { retailer: 6, distributor: 8, ... }
 * @param {number} demand  - end-customer demand this round
 * @returns {object}       - next game state
 */
export function advanceRound(state, orders, demand) {
  // Deep-copy so we never mutate React state directly
  const next = deepCopy(state);
  next.round += 1;
  next.demandHistory.push(demand);

  // Step 1: Process shipments and fill downstream orders
  // Tiers are processed downstream → upstream
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];

    // Receive the shipment that was in transit (arrives this round)
    const arriving = tier.incomingShipments.shift();
    tier.incomingShipments.push(0); // pad pipeline
    tier.inventory += arriving;
    tier.lastOrderReceived = arriving;

    // How much does downstream need?
    // Retailer serves real customer demand; others serve the tier below
    const demandOnTier = (i === 0)
      ? demand
      : orders[TIERS[i - 1]]; // the order the tier below placed

    // Fill as much as possible; rest becomes backlog
    const totalObligation = demandOnTier + tier.backlog;
    const shipped = Math.min(tier.inventory, totalObligation);
    tier.inventory    -= shipped;
    tier.backlog       = totalObligation - shipped; // unfilled portion

    // Cost this round
    tier.totalCost += (tier.inventory * HOLDING_COST)
                    + (tier.backlog   * BACKLOG_COST);
    tier.inventoryHistory.push(tier.inventory);
  });

  // Step 2: Each tier places its order upstream
  // Manufacturer has no upstream — it just "produces"
  TIERS.forEach((tierName, i) => {
    const tier = next.tiers[tierName];
    const qty  = orders[tierName] ?? 0;

    tier.lastOrderPlaced = qty;
    tier.orderHistory.push(qty);

    // Shipment goes into the upstream tier's pipeline
    if (i < TIERS.length - 1) {
      const supplier = next.tiers[TIERS[i + 1]];
      // Supplier ships min(order, what they can fulfil)
      const canShip = Math.min(qty, supplier.inventory);
      supplier.inventory -= canShip;
      // Goes into pipeline at index LEAD_TIME - 1
      tier.incomingShipments[LEAD_TIME - 1] += canShip;
    } else {
      // Manufacturer produces instantly (no supplier upstream)
      tier.incomingShipments[LEAD_TIME - 1] += qty;
    }
  });

  next.phase = (next.round >= 20) ? 'gameover' : 'ordering';
  next.pendingOrders = {}; // clear for next round
  
  return next;
}

// Simple deep copy — works fine for plain objects/arrays
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}