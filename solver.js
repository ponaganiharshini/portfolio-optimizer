/* =====================================================================
   solver.js  -  Knapsack with Branch & Bound (pure logic, no DOM)
   Works in the browser (window.Solver) and in Node (require) for tests.
   ===================================================================== */
(function (root) {
  'use strict';

  const NODE_CAP = 500;        // max tree nodes we keep for drawing
  const WORK_CAP = 4000000;    // safety stop for extreme inputs

  /* Split items into: forced (must), free (auto), dropped (exclude) */
  function prepare(items, budget, opts) {
    opts = opts || {};
    const forced = [], free = [];
    let fCost = 0, fProfit = 0;
    items.forEach((it, i) => {
      let lock = it.lock || 'auto';
      if (opts.avoidHigh && it.risk === 'High' && lock !== 'must') lock = 'exclude';
      if (lock === 'must') { forced.push(i); fCost += it.cost; fProfit += it.profit; }
      else if (lock === 'auto') free.push(i);
    });
    return { forced, free, fCost, fProfit, remaining: budget - fCost };
  }

  const ratio = it => it.profit / it.cost;

  /* ---------------- Branch & Bound (the main algorithm) ---------------- */
  function solve(items, budget, opts) {
    const p = prepare(items, budget, opts);
    if (p.remaining < 0) {
      return { ok: false, error: 'The "Must include" projects cost more than the budget.' };
    }
    // Step 1: sort free items by profit/cost, best first
    const order = p.free.slice().sort((a, b) => ratio(items[b]) - ratio(items[a]));
    const n = order.length;
    const B = p.remaining;

    // Upper bound = greedy fill + FRACTION of the next item (fractional knapsack)
    function bound(level, profit, weight) {
      let b = profit, w = weight;
      for (let j = level; j < n; j++) {
        const it = items[order[j]];
        if (w + it.cost <= B) { w += it.cost; b += it.profit; }
        else { b += (B - w) * ratio(it); break; }
      }
      return b;
    }

    let best = 0, bestPick = [], bestNode = null, aborted = false;
    const stats = { total: 0, pruned: 0, infeasible: 0 };
    const nodes = [];

    function visit(level, profit, weight, pick, parent, edge, itemIdx) {
      if (aborted) return;
      stats.total++;
      if (stats.total > WORK_CAP) { aborted = true; return; }
      const node = {
        id: nodes.length, level, profit: profit + p.fProfit, weight: weight + p.fCost,
        edge, item: itemIdx, parent: null, children: [], status: 'explored', bound: null, kept: false
      };
      if (nodes.length < NODE_CAP && (parent === null || parent.kept)) {
        node.kept = true; node.parent = parent; nodes.push(node);
        if (parent) parent.children.push(node);
      }
      if (weight > B) { node.status = 'infeasible'; stats.infeasible++; return; }
      if (profit > best) { best = profit; bestPick = pick.slice(); bestNode = node; }
      if (level === n) return;
      const ub = bound(level, profit, weight);
      node.bound = ub + p.fProfit;
      if (ub <= best) { node.status = 'pruned'; stats.pruned++; return; }
      const it = items[order[level]];
      pick.push(order[level]);
      visit(level + 1, profit + it.profit, weight + it.cost, pick, node, 'take', order[level]);
      pick.pop();
      visit(level + 1, profit, weight, pick, node, 'skip', order[level]);
    }
    visit(0, 0, 0, [], null, '', -1);
    for (let nd = bestNode; nd; nd = nd.parent) nd.onBest = true;

    const chosen = new Set(p.forced.concat(bestPick));
    let cost = 0, profit = 0;
    chosen.forEach(i => { cost += items[i].cost; profit += items[i].profit; });

    return {
      ok: true, best: profit, cost, chosen, nodes, stats, aborted,
      freeCount: n, fullTree: Math.pow(2, n + 1) - 1, forced: p.forced
    };
  }

  /* ---------------- Simple strategies to compare against ---------------- */
  function greedy(items, budget, opts, cmp) {
    const p = prepare(items, budget, opts);
    if (p.remaining < 0) return null;
    const order = p.free.slice().sort((a, b) => cmp(items[a], items[b]));
    let w = 0;
    const chosen = new Set(p.forced);
    order.forEach(i => { if (w + items[i].cost <= p.remaining) { w += items[i].cost; chosen.add(i); } });
    let cost = 0, profit = 0;
    chosen.forEach(i => { cost += items[i].cost; profit += items[i].profit; });
    return { best: profit, cost, chosen };
  }
  function strategies(items, budget, opts) {
    return [
      { name: 'Best return-per-cost (greedy)', r: greedy(items, budget, opts, (a, b) => ratio(b) - ratio(a)) },
      { name: 'Highest return first',          r: greedy(items, budget, opts, (a, b) => b.profit - a.profit) },
      { name: 'Cheapest first',                r: greedy(items, budget, opts, (a, b) => a.cost - b.cost) }
    ];
  }

  /* ---------------- DP curve: best return for EVERY budget 0..maxB ----------------
     Used for (1) verifying B&B, (2) the what-if chart, (3) the budget advisor. */
  function curve(items, maxB, opts) {
    const p = prepare(items, maxB, opts);
    const out = new Array(maxB + 1).fill(null);
    const room = Math.max(0, maxB - p.fCost);
    const dp = new Array(room + 1).fill(0);
    p.free.forEach(i => {
      const c = items[i].cost, v = items[i].profit;
      for (let b = room; b >= c; b--) if (dp[b - c] + v > dp[b]) dp[b] = dp[b - c] + v;
    });
    for (let b = p.fCost; b <= maxB; b++) out[b] = p.fProfit + dp[b - p.fCost];
    return out;
  }

  /* Budget advisor: how much more / less money changes the answer? */
  function advisor(cv, budget) {
    const cur = cv[budget];
    let moreAt = -1, lessAt = -1;
    for (let b = budget + 1; b < cv.length; b++) if (cv[b] > cur) { moreAt = b; break; }
    for (let b = 0; b <= budget; b++) if (cv[b] === cur) { lessAt = b; break; }
    return {
      current: cur,
      extra: moreAt > 0 ? { budget: moreAt, add: moreAt - budget, gain: cv[moreAt] - cur } : null,
      save:  lessAt >= 0 && lessAt < budget ? { budget: lessAt, cut: budget - lessAt } : null
    };
  }

  const api = { solve, strategies, curve, advisor, prepare };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Solver = api;
})(typeof window !== 'undefined' ? window : globalThis);
