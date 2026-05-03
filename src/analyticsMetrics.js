import { TIERS } from './gameState';

function std(arr) {
  if (!arr || arr.length === 0) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function max(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.max(...arr);
}

export function totalSystemCostFromGame(game) {
  return TIERS.reduce((sum, t) => sum + (game.tiers[t]?.totalCost || 0), 0);
}

/** Mirrors Analytics.jsx tierMetrics + headline stats for CSV export */
export function computeAnalyticsExport(game) {
  const rounds = game.round;
  const totalCost = totalSystemCostFromGame(game);

  const tierRows = TIERS.map(t => {
    const tier = game.tiers[t];
    const orders = tier.orderHistory || [];
    const inv = tier.inventoryHistory || [];
    const bl = tier.backlogHistory || [];
    return {
      tier: t,
      totalCost: Math.round(tier.totalCost || 0),
      pctOfSystem:
        totalCost > 0 ? Math.round(((tier.totalCost || 0) / totalCost) * 100) : 0,
      avgInventory: Math.round(mean(inv)),
      peakInventory: max(inv),
      avgBacklog: Number(mean(bl).toFixed(1)),
      peakBacklog: max(bl),
      weeksWithBacklog: bl.filter(v => v > 0).length,
      avgOrder: Number(mean(orders).toFixed(1)),
      peakOrder: max(orders),
      orderVariability: Number(std(orders).toFixed(2)),
    };
  });

  const demandStd = std(game.demandHistory);
  const factoryStd = std(game.tiers.factory.orderHistory);
  const amplification =
    demandStd > 0 ? Number((factoryStd / demandStd).toFixed(2)) : null;

  const totalBacklogPerRound = Array.from({ length: rounds }, (_, i) =>
    TIERS.reduce((sum, t) => sum + (game.tiers[t].backlogHistory[i] || 0), 0)
  );
  const peakBacklogRound = totalBacklogPerRound.indexOf(max(totalBacklogPerRound)) + 1;
  const peakSystemBacklog = max(totalBacklogPerRound);

  const demandJumpRound =
    game.demandHistory.findIndex((d, i) => i > 0 && d > game.demandHistory[i - 1]) + 1;

  return {
    totalCost: Math.round(totalCost),
    amplification,
    peakBacklogRound,
    peakSystemBacklog,
    demandJumpRound: demandJumpRound || null,
    tierRows,
  };
}

export function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function tierCsvHeaderSuffix(t) {
  const L = t === 'factory' ? 'Factory' : t.charAt(0).toUpperCase() + t.slice(1);
  return [`${L} Stock`, `${L} Backlog`, `${L} Order`,
    `${L} Demand`, `${L} Delivery`, `${L} Shipment`, `${L} Cost`];
}

/**
 * Weekly simulation table plus ANALYTICS SUMMARY block (same metrics as the Analytics UI).
 * @param {object} meta - tournamentCode / teamNumber / sessionId add a header block; omit for solo exports.
 */
export function buildSessionCsvWithAnalytics(game, meta = {}) {
  const {
    tournamentCode,
    teamNumber,
    teamLabel,
    sessionId,
    includeAnalytics = true,
  } = meta;

  const rows = [];
  if (tournamentCode != null && tournamentCode !== '') {
    rows.push(['Tournament code', csvEscape(tournamentCode)].join(','));
    rows.push(['Team', csvEscape(teamNumber ?? '')].join(','));
    rows.push(['Team label', csvEscape(teamLabel ?? '')].join(','));
    rows.push(['Session id', csvEscape(sessionId ?? '')].join(','));
    rows.push('');
  }

  const nRounds = game.round;
  const tierCols = TIERS.flatMap(tierCsvHeaderSuffix);
  rows.push(['Round', 'Customer Demand', ...tierCols, 'Total System Cost'].join(','));

  for (let i = 0; i < nRounds; i++) {
    const totalCostThisRound = TIERS.reduce(
      (sum, t) => sum + (game.tiers[t].costHistory[i] || 0), 0
    );
    const row = [
      i + 1,
      game.demandHistory[i] || 0,
      ...TIERS.flatMap(t => [
        game.tiers[t].inventoryHistory[i] || 0,
        game.tiers[t].backlogHistory[i] || 0,
        game.tiers[t].orderHistory[i] || 0,
        game.tiers[t].demandHistory[i] || 0,
        game.tiers[t].deliveryHistory[i] || 0,
        game.tiers[t].shipmentHistory[i] || 0,
        (game.tiers[t].costHistory[i] || 0).toFixed(2),
      ]),
      totalCostThisRound.toFixed(2),
    ];
    rows.push(row.join(','));
  }

  if (includeAnalytics) {
    rows.push('');
    rows.push('ANALYTICS SUMMARY');
    const a = computeAnalyticsExport(game);
    rows.push(['Metric', 'Value'].join(','));
    rows.push(['Total system cost (Rs)', a.totalCost].join(','));
    rows.push([
      'Bullwhip amplification (factory order sigma / demand sigma)',
      a.amplification != null ? `${a.amplification}x` : 'N/A',
    ].join(','));
    rows.push(['Peak system backlog week', a.peakBacklogRound].join(','));
    rows.push(['Peak system backlog (units)', a.peakSystemBacklog].join(','));
    rows.push(['First demand jump week', a.demandJumpRound ?? ''].join(','));
    rows.push('');
    rows.push(
      [
        'Tier',
        'Total cost',
        'Pct of system',
        'Avg inventory',
        'Peak inventory',
        'Avg backlog',
        'Peak backlog',
        'Weeks with backlog',
        'Avg order',
        'Peak order',
        'Order sigma',
      ].join(',')
    );
    for (const tr of a.tierRows) {
      rows.push(
        [
          tr.tier,
          tr.totalCost,
          tr.pctOfSystem,
          tr.avgInventory,
          tr.peakInventory,
          tr.avgBacklog,
          tr.peakBacklog,
          tr.weeksWithBacklog,
          tr.avgOrder,
          tr.peakOrder,
          tr.orderVariability,
        ].join(',')
      );
    }
  }

  return rows.join('\n');
}
