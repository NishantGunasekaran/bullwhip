/**
 * UI metadata + teaching notes. Academic references are starting points for learners.
 * (Links are stable public pages; not affiliated.)
 */

export const DEMAND_PROFILE_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic step-up',
    short:
      'Steady demand, then a one-time jump — the original MIT Beer Game shock.',
    bullwhipNote:
      'Small downstream changes become exaggerated upstream when each tier orders with delay (information distortion).',
    learnMoreUrl: 'https://mitsloan.mit.edu/teaching-learning-library/beer-game',
    learnMoreLabel: 'MIT Sloan · Beer Game',
  },
  {
    id: 'steady',
    label: 'Steady / stable',
    short: 'Constant customer orders every week.',
    bullwhipNote:
      'With perfectly flat demand, bullwhip comes mostly from ordering rules and lead times, not from demand swings.',
    learnMoreUrl: 'https://hbr.org/1997/05/information-distortion-in-a-supply-chain-the-bullwhip-effect',
    learnMoreLabel: 'Lee et al. · HBR (bullwhip)',
  },
  {
    id: 'seasonal',
    label: 'Seasonal cycle',
    short: 'Smooth sine-wave demand over the 20 weeks (like recurring retail seasons).',
    bullwhipNote:
      'Periodic demand forces tiers to anticipate peaks; forecasting error and batching amplify variability upstream.',
    learnMoreUrl: 'https://en.wikipedia.org/wiki/Bullwhip_effect',
    learnMoreLabel: 'Wikipedia · Bullwhip effect',
  },
  {
    id: 'promotional',
    label: 'Promotion spike',
    short: 'Short burst of high demand mid-simulation (promo / media event).',
    bullwhipNote:
      'Sudden spikes mimic promotion distortion — Lee et al. describe how demand signal processing inflates orders upstream.',
    learnMoreUrl: 'https://hbr.org/1997/05/information-distortion-in-a-supply-chain-the-bullwhip-effect',
    learnMoreLabel: 'Lee et al. · Information distortion',
  },
  {
    id: 'ramp',
    label: 'Market ramp',
    short: 'Demand rises gradually (growth / adoption curve).',
    bullwhipNote:
      'Gradual shifts still cause lagged over-correction when safety stock and pipeline orders compound.',
    learnMoreUrl: 'https://www.systemdynamics.org/',
    learnMoreLabel: 'System Dynamics Society',
  },
  {
    id: 'lumpy',
    label: 'Lumpy / batch-like',
    short: 'Mostly calm with occasional “bulk” customer weeks.',
    bullwhipNote:
      'Batching and irregular orders are a classic driver of variance amplification (Forrester / industrial dynamics).',
    learnMoreUrl: 'https://en.wikipedia.org/wiki/Industrial_dynamics',
    learnMoreLabel: 'Industrial dynamics (Forrester)',
  },
  {
    id: 'noisy',
    label: 'Noisy forecast',
    short: 'Pseudo-random week-to-week demand (same tournament always sees the same sequence).',
    bullwhipNote:
      'Acts like forecast error and signal noise — one of the four major bullwhip causes in Lee et al. (1997).',
    learnMoreUrl: 'https://hbr.org/1997/05/information-distortion-in-a-supply-chain-the-bullwhip-effect',
    learnMoreLabel: 'Lee et al. · Four causes',
  },
];

export const AI_STYLE_OPTIONS = [
  {
    id: 'standard',
    label: 'Standard ops',
    short: 'Order-up-to toward a normal target (baseline AI).',
    bullwhipNote:
      'Baseline anchoring behavior — compare to more aggressive or cautious policies.',
  },
  {
    id: 'cautious',
    label: 'Cautious / lean',
    short: 'Lower inventory target and dampened reaction to backlog.',
    bullwhipNote:
      'Tries to hold less stock — can reduce holding cost but may starve downstream under volatility.',
  },
  {
    id: 'aggressive',
    label: 'Aggressive stocking',
    short: 'Higher target inventory and stronger reaction to backlog.',
    bullwhipNote:
      'Mimics panic replenishment — tends to amplify order swings upstream (Sterman-type behavior).',
    learnMoreUrl: 'https://ocw.mit.edu/courses/15-097-prediction-machine-learning-and-statistics-spring-2012/',
    learnMoreLabel: 'MIT OCW · Decision-making under uncertainty',
  },
  {
    id: 'smoothed',
    label: 'Smoothed ordering',
    short: 'Uses a rolling average of recent orders to damp sharp reactions.',
    bullwhipNote:
      'Similar in spirit to smoothing policies that reduce variance amplification when shared across tiers.',
  },
  {
    id: 'reactive',
    label: 'Reactive / nervous',
    short: 'Overweights backlog when placing orders.',
    bullwhipNote:
      'Strong local reactions to local signals worsen oscillation — linked to behavioral bullwhip (Sterman).',
    learnMoreUrl: 'https://books.google.com/books/about/Business_Dynamics.html?id=APdxAAAAMAAJ',
    learnMoreLabel: 'Sterman · Business Dynamics',
  },
];

const demandOptionById = new Map(DEMAND_PROFILE_OPTIONS.map(o => [o.id, o]));
const aiOptionById = new Map(AI_STYLE_OPTIONS.map(o => [o.id, o]));

/** Single lookup for demand profile UI row (avoids repeated .find in render). */
export function getDemandProfileOption(id) {
  return demandOptionById.get(id);
}

/** Single lookup for AI style UI row. */
export function getAiStyleOption(id) {
  return aiOptionById.get(id);
}

export function labelForDemandProfile(id) {
  return getDemandProfileOption(id)?.label ?? id;
}

export function labelForAiStyle(id) {
  return getAiStyleOption(id)?.label ?? id;
}
