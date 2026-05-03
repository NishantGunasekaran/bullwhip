// ─── Demand scenarios ─────────────────────────────────────────
// Each scenario is a function: (roundIndex0Based, seed) => demandQty
// Seed makes "noisy" patterns deterministic so all tournament clients stay in sync.

function unitNoise(seed, round) {
  const x = Math.sin(seed * 12.9898 + round * 78.233 + seed * 0.001) * 43758.5453123;
  return x - Math.floor(x);
}

const SCENARIOS = {
  /** Weeks 1–4 steady at 4; week 5+ jumps to 8 (MIT Beer Game style). */
  classic: (round, _seed) => (round < 4 ? 4 : 8),

  /** Flat demand — bullwhip driven mainly by policy, not demand swings. */
  steady: (round, _seed) => 4,

  /** Smooth seasonal swing around ~4–7 units. */
  seasonal: (round, _seed) => {
    const x = 5 + 3 * Math.sin((round / 20) * 2 * Math.PI);
    return Math.max(0, Math.round(x));
  },

  /** Short promotional spike (rounds 6–8, 0-based). */
  promotional: (round, _seed) => ((round >= 6 && round <= 8) ? 14 : 4),

  /** Gradual adoption / ramp. */
  ramp: (round, _seed) => Math.min(14, 4 + Math.floor(round / 2)),

  /** Occasional bulk-customer weeks. */
  lumpy: (round, _seed) => ((round % 8 === 5 || round % 8 === 6) ? 11 : 4),

  /** Deterministic "forecast error" — same seed ⇒ same path for every player. */
  noisy: (round, seed) => {
    const base = 5 + Math.floor(unitNoise(seed + 17, round) * 6); // ~5–10
    return Math.max(0, base);
  },
};

const DEFAULT_PROFILE = 'classic';

/**
 * @param {number} round - 0-based week index (current or upcoming, per caller)
 * @param {object} [ctx]
 * @param {string} [ctx.profile] - key in SCENARIOS
 * @param {number} [ctx.seed] - integer; used for noisy (and future stochastic scenarios)
 */
export function getDemandForRound(round, ctx = {}) {
  const profile = ctx.profile && SCENARIOS[ctx.profile] ? ctx.profile : DEFAULT_PROFILE;
  const seed = Number.isFinite(ctx.seed) ? ctx.seed : 0;
  const fn = SCENARIOS[profile];
  return Math.max(0, Math.round(fn(round, seed)));
}

/** Stable seed from tournament UUID string so all teams share identical noisy demand. */
export function hashStringToSeed(str) {
  let h = 5381;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
  }
  return Math.abs(h) % 214748000 + 1;
}
