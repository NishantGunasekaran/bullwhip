// ─── Demand scenarios ─────────────────────────────────────────
// Each scenario is a function: (round) => demandQty

const SCENARIOS = {
  /** Weeks 1–4 (0-based rounds 0–3): 4 units; week 5+: 8 units. */
  classic:   (round) => round < 4 ? 4 : 8,
  seasonal:  (round) => 4 + Math.round(4 * Math.sin((round / 20) * Math.PI)),
  flashSale: (round) => (round >= 7 && round <= 9) ? 16 : 4,
  noisy:     (round) => Math.round(6 + (Math.random() * 4 - 2)),
};

let activeScenario = 'classic';

export function setScenario(name) {
  activeScenario = name;
}

export function getDemandForRound(round) {
  return SCENARIOS[activeScenario](round);
}