// ─── Demand scenarios ─────────────────────────────────────────
// Each scenario is a function: (round) => demandQty

const SCENARIOS = {
  // Classic Beer Game: flat then sudden step-up
  classic: (round) => round < 5 ? 4 : 8,

  // Seasonal spike — peaks at round 10
  seasonal: (round) => 4 + Math.round(4 * Math.sin((round / 20) * Math.PI)),

  // Flash sale shock — sudden spike then drops
  flashSale: (round) => {
    if (round >= 7 && round <= 9) return 16;
    return 4;
  },

  // Random noise around a mean
  noisy: (round) => Math.round(6 + (Math.random() * 4 - 2)),
};

// Active scenario — change this to switch modes
let activeScenario = 'classic';

export function setScenario(name) {
  activeScenario = name;
}

export function getDemandForRound(round) {
  return SCENARIOS[activeScenario](round);
}