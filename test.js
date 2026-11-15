/* Run with:  node test.js
   Checks Branch & Bound against brute force on thousands of random cases. */
const S = require('./solver.js');

function brute(items, budget, avoidHigh) {
  const n = items.length;
  let best = -1;
  for (let m = 0; m < (1 << n); m++) {
    let c = 0, v = 0, ok = true;
    for (let i = 0; i < n && ok; i++) {
      let lock = items[i].lock;
      if (avoidHigh && items[i].risk === 'High' && lock !== 'must') lock = 'exclude';
      const taken = (m >> i) & 1;
      if (lock === 'must' && !taken) ok = false;
      if (lock === 'exclude' && taken) ok = false;
      if (taken) { c += items[i].cost; v += items[i].profit; }
    }
    if (ok && c <= budget && v > best) best = v;
  }
  return best;
}

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const risks = ['Low', 'Medium', 'High'], locks = ['auto', 'auto', 'auto', 'auto', 'must', 'exclude'];
let fails = 0, runs = 3000, skipped = 0;

for (let t = 0; t < runs; t++) {
  const n = rnd(1, 12);
  const items = Array.from({ length: n }, () => ({
    cost: rnd(1, 30), profit: rnd(0, 80), risk: risks[rnd(0, 2)], lock: locks[rnd(0, locks.length - 1)]
  }));
  const budget = rnd(1, 120), avoidHigh = Math.random() < 0.3;
  const expect = brute(items, budget, avoidHigh);
  const r = S.solve(items, budget, { avoidHigh });

  if (expect < 0) {                       // no feasible answer: solver must say so
    if (r.ok) { fails++; console.log('Expected infeasible', { items, budget }); }
    skipped++; continue;
  }
  const cv = S.curve(items, budget, { avoidHigh });
  const okAll = r.ok && r.best === expect && r.cost <= budget && cv[budget] === expect;
  if (!okAll) { fails++; console.log('MISMATCH', { items, budget, avoidHigh, expect, got: r.best, dp: cv[budget] }); }
}
console.log(fails === 0
  ? `PASS: ${runs} random cases (${skipped} infeasible) - Branch & Bound == brute force == DP`
  : `FAIL: ${fails} problems`);
process.exit(fails ? 1 : 0);
