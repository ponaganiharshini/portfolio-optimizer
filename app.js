/* =====================================================================
   app.js  -  UI logic for the Portfolio Optimizer
   ===================================================================== */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CATS = ['Technology', 'Infrastructure', 'Marketing', 'People', 'Research', 'Operations'];
const RISKS = ['Low', 'Medium', 'High'];
const CAT_COLOR = {
  Technology: '#5aa9ff', Infrastructure: '#f5a623', Marketing: '#e86bb5',
  People: '#2fd27a', Research: '#9b7bff', Operations: '#35c9c9'
};

let projects = [];
let uid = 1;
let last = null;                       // last solved result (for export)
const anim = { timer: null, shown: 0, layout: null };

const money = v => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ($('#unit').value || '');
const P = (name, cat, risk, cost, profit, lock = 'auto') => ({ id: uid++, name, cat, risk, cost, profit, lock });

/* ------------------------- Presets (real-life uses) ------------------------- */
const PRESETS = {
  company: { budget: 50, unit: 'L', list: [
    ['Solar Power Plant', 'Infrastructure', 'Low', 20, 40], ['AI Research Lab', 'Research', 'High', 15, 35],
    ['New Warehouse', 'Operations', 'Low', 10, 18], ['Mobile App Launch', 'Technology', 'Medium', 8, 22],
    ['Employee Training', 'People', 'Low', 5, 9], ['Cloud Migration', 'Technology', 'Medium', 12, 25],
    ['Brand Campaign', 'Marketing', 'Medium', 9, 16]] },
  startup: { budget: 30, unit: 'L', list: [
    ['MVP Development', 'Technology', 'Medium', 10, 30], ['Digital Marketing', 'Marketing', 'Medium', 6, 14],
    ['Hire 2 Engineers', 'People', 'Low', 9, 18], ['Cloud Credits', 'Technology', 'Low', 3, 5],
    ['Trade Show Booth', 'Marketing', 'High', 7, 10], ['Office Setup', 'Operations', 'Low', 5, 6],
    ['Patent Filing', 'Research', 'Low', 4, 7]] },
  college: { budget: 60, unit: 'K', list: [
    ['Hackathon', 'Technology', 'Low', 15, 30], ['Cultural Night', 'People', 'Medium', 20, 34],
    ['Guest Lecture Series', 'Research', 'Low', 8, 16], ['Sports Meet', 'Operations', 'Low', 12, 17],
    ['Social Media Promotion', 'Marketing', 'Low', 5, 12], ['Robotics Workshop', 'Technology', 'Medium', 14, 26],
    ['Food Stalls', 'Operations', 'Medium', 10, 15]] },
  farm: { budget: 40, unit: 'K', list: [
    ['Drip Irrigation', 'Infrastructure', 'Low', 12, 26], ['Hybrid Seeds', 'Research', 'Medium', 6, 14],
    ['Cold Storage Rental', 'Operations', 'Low', 9, 15], ['Tractor Repair', 'Infrastructure', 'Low', 7, 10],
    ['Organic Fertilizer', 'Operations', 'Low', 5, 9], ['Extra Labour', 'People', 'Low', 8, 13],
    ['Exotic Crop Trial', 'Research', 'High', 10, 24]] },
  ngo: { budget: 100, unit: 'K', list: [
    ['School Supplies Drive', 'People', 'Low', 25, 55], ['Free Health Camp', 'People', 'Low', 30, 70],
    ['Clean Water Pumps', 'Infrastructure', 'Medium', 40, 95], ['Awareness Campaign', 'Marketing', 'Low', 15, 25],
    ['Skill Training Centre', 'Research', 'Medium', 35, 75], ['Volunteer Travel', 'Operations', 'Low', 12, 14],
    ['Tree Plantation', 'Operations', 'Low', 18, 32]] }
};

function loadPreset(key) {
  stopAnim();
  if (key === 'random') {
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota'];
    projects = names.map(nm => {
      const c = 5 + Math.floor(Math.random() * 25);
      return P('Project ' + nm, CATS[Math.floor(Math.random() * CATS.length)], RISKS[Math.floor(Math.random() * 3)],
        c, Math.round(c * (1 + Math.random() * 2.2)));
    });
    $('#budget').value = Math.round(projects.reduce((s, p) => s + p.cost, 0) * 0.45);
    $('#unit').value = 'L';
  } else {
    const pr = PRESETS[key];
    projects = pr.list.map(a => P(...a));
    $('#budget').value = pr.budget;
    $('#unit').value = pr.unit;
  }
  $('#avoidHigh').checked = false;
  renderTable(); hideResults(); save();
}

/* ------------------------------ Input table ------------------------------ */
function opts(arr, sel) { return arr.map(v => `<option ${v === sel ? 'selected' : ''}>${v}</option>`).join(''); }

function renderTable() {
  $('#tbl tbody').innerHTML = projects.map((p, i) => `
    <tr data-id="${p.id}">
      <td>${i + 1}</td>
      <td><input data-f="name" value="${esc(p.name)}" aria-label="Project name"></td>
      <td><select data-f="cat">${opts(CATS, p.cat)}</select></td>
      <td><select data-f="risk">${opts(RISKS, p.risk)}</select></td>
      <td><input data-f="cost" type="number" min="1" step="1" value="${p.cost}"></td>
      <td><input data-f="profit" type="number" min="0" step="1" value="${p.profit}"></td>
      <td><select data-f="lock">
        <option value="auto" ${p.lock === 'auto' ? 'selected' : ''}>Auto</option>
        <option value="must" ${p.lock === 'must' ? 'selected' : ''}>Must</option>
        <option value="exclude" ${p.lock === 'exclude' ? 'selected' : ''}>Skip</option></select></td>
      <td><button class="del" data-del="${p.id}" title="Delete">✕</button></td>
    </tr>`).join('');
}

$('#tbl').addEventListener('input', e => {
  const f = e.target.dataset.f; if (!f) return;
  const p = projects.find(x => x.id === +e.target.closest('tr').dataset.id); if (!p) return;
  p[f] = (f === 'cost' || f === 'profit') ? +e.target.value : e.target.value;
  save();
});
$('#tbl').addEventListener('click', e => {
  const id = e.target.dataset.del; if (!id) return;
  projects = projects.filter(p => p.id !== +id); renderTable(); save();
});
$('#btnAdd').onclick = () => { projects.push(P('Project ' + (projects.length + 1), 'Technology', 'Medium', 10, 20)); renderTable(); save(); };
$('#btnClear').onclick = () => { projects = []; renderTable(); hideResults(); save(); };
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => loadPreset(b.dataset.preset));
['#budget', '#unit', '#avoidHigh'].forEach(s => $(s).addEventListener('input', save));

/* ------------------------------ Persistence ------------------------------ */
function save() {
  try { localStorage.setItem('pf_v2', JSON.stringify({ b: $('#budget').value, u: $('#unit').value, a: $('#avoidHigh').checked, p: projects })); } catch (e) { }
}
function restore() {
  try {
    const s = JSON.parse(localStorage.getItem('pf_v2') || 'null');
    if (s && Array.isArray(s.p) && s.p.length) {
      projects = s.p; uid = Math.max(...projects.map(p => p.id || 0)) + 1;
      $('#budget').value = s.b; $('#unit').value = s.u || ''; $('#avoidHigh').checked = !!s.a;
      renderTable(); return;
    }
  } catch (e) { }
  loadPreset('company');
}

/* ------------------------------ Solve + render ------------------------------ */
function hideResults() { $('#results').hidden = true; $('#msg').textContent = ''; last = null; stopAnim(); }
const say = t => { $('#msg').textContent = t; };

function solveNow() {
  say('');
  const budget = Math.floor(+$('#budget').value);
  if (!(budget > 0)) return say('Please enter a budget greater than 0.');
  if (!projects.length) return say('Add at least one project.');
  if (projects.length > 30) return say('Please use 30 projects or fewer.');
  for (const p of projects) {
    if (!p.name.trim()) return say('Every project needs a name.');
    if (!Number.isInteger(p.cost) || p.cost < 1) return say(`"${p.name}": cost must be a whole number of at least 1.`);
    if (!Number.isInteger(p.profit) || p.profit < 0) return say(`"${p.name}": return must be a whole number, 0 or more.`);
  }
  const items = projects.map(p => ({ ...p }));
  const o = { avoidHigh: $('#avoidHigh').checked };
  const r = Solver.solve(items, budget, o);
  if (!r.ok) return say(r.error);

  const maxB = Math.ceil(budget * 1.8);
  const cv = Solver.curve(items, maxB, o);
  last = { items, budget, r, cv, o, strat: Solver.strategies(items, budget, o), verified: cv[budget] === r.best };
  last.advice = Solver.advisor(cv, budget);

  $('#results').hidden = false;
  renderResult(); renderCharts(); renderCompare(); renderAdvice(); renderTreeInfo();
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (r.aborted) say('Search was very large, so it stopped early. Try fewer projects.');
}
$('#btnSolve').onclick = solveNow;
document.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') solveNow(); });

const riskScore = (items, set) => {
  let w = 0, c = 0; set.forEach(i => { w += (RISKS.indexOf(items[i].risk) + 1) * items[i].cost; c += items[i].cost; });
  return c ? w / c : 0;
};
const riskLabel = s => s === 0 ? 'None' : s < 1.67 ? 'Low' : s < 2.34 ? 'Medium' : 'High';

function renderResult() {
  const { items, budget, r, verified } = last;
  const roi = r.cost ? ((r.best - r.cost) / r.cost * 100).toFixed(1) : '0.0';
  const rs = riskLabel(riskScore(items, r.chosen));
  const cats = new Set([...r.chosen].map(i => items[i].cat)).size;
  $('#kpis').innerHTML = [
    [money(r.best), 'Maximum expected return'], [money(r.cost), 'Total invested'],
    [money(budget - r.cost), 'Budget left unused'], [roi + '%', 'Net profit on investment (ROI)'],
    [`${r.chosen.size} of ${items.length}`, 'Projects selected'], [rs, 'Portfolio risk (cost-weighted)'],
    [cats, 'Categories covered'],
    [verified ? '✔ Verified' : '✘ Mismatch', 'Cross-checked with Dynamic Programming']
  ].map(([b, s], i) => `<div class="kpi"><b ${i === 7 ? `style="color:var(--${verified ? 'c-ok' : 'c-bad'})"` : ''}>${b}</b><span>${s}</span></div>`).join('');
  const pct = Math.min(100, r.cost / budget * 100);
  $('#meterFill').style.width = pct + '%';
  $('#meterTxt').textContent = `${pct.toFixed(1)}% of the budget is used.`;

  const order = items.map((_, i) => i).sort((a, b) =>
    (r.chosen.has(b) - r.chosen.has(a)) || (items[b].profit / items[b].cost - items[a].profit / items[a].cost));
  $('#resTbl tbody').innerHTML = order.map(i => {
    const it = items[i], on = r.chosen.has(i);
    const note = it.lock === 'must' ? ' 🔒' : it.lock === 'exclude' ? ' 🚫' : (!on && $('#avoidHigh').checked && it.risk === 'High' ? ' ⚠' : '');
    return `<tr class="${on ? 'pick' : ''}"><td><span class="tag ${on ? 't-ok' : 't-no'}">${on ? 'INVEST' : 'SKIP'}</span></td>
      <td>${esc(it.name)}${note}</td><td>${it.cat}</td><td class="t-${it.risk.toLowerCase()}">${it.risk}</td>
      <td>${money(it.cost)}</td><td>${money(it.profit)}</td><td>${(it.profit / it.cost).toFixed(2)}</td></tr>`;
  }).join('');
}

/* ------------------------------ Charts (hand-drawn SVG) ------------------------------ */
function renderCharts() {
  const { items, r } = last;

  // Donut: invested money by category
  const sums = {}; r.chosen.forEach(i => { sums[items[i].cat] = (sums[items[i].cat] || 0) + items[i].cost; });
  const entries = Object.entries(sums), total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) { $('#donut').innerHTML = '<p class="hint">Nothing selected.</p>'; }
  else {
    const R = 60, C = 2 * Math.PI * R; let off = 0;
    const arcs = entries.map(([c, v]) => {
      const len = v / total * C;
      const s = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${CAT_COLOR[c] || '#888'}" stroke-width="28"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${c}: ${money(v)}</title></circle>`;
      off += len; return s;
    }).join('');
    const leg = entries.map(([c, v], i) => `<g transform="translate(200 ${30 + i * 22})"><rect width="12" height="12" rx="3" fill="${CAT_COLOR[c] || '#888'}"/>
      <text x="18" y="10" class="t-main">${c} · ${(v / total * 100).toFixed(0)}%</text></g>`).join('');
    $('#donut').innerHTML = `<svg viewBox="0 0 360 ${Math.max(180, 50 + entries.length * 22)}" width="100%">${arcs}
      <text x="90" y="88" text-anchor="middle" class="t-main" style="font-size:15px;font-weight:700">${money(total)}</text>
      <text x="90" y="104" text-anchor="middle">invested</text>${leg}</svg>`;
  }

  // Bars: cost vs return for every project
  const rows = items.map((it, i) => ({ it, i })).sort((a, b) => b.it.profit - a.it.profit);
  const maxV = Math.max(...items.map(i => Math.max(i.cost, i.profit)), 1), H = 30, W = 380;
  const bars = rows.map(({ it, i }, k) => {
    const y = 8 + k * (H + 8), on = r.chosen.has(i);
    return `<g opacity="${on ? 1 : .45}"><text x="0" y="${y + 10}" class="t-main">${esc(it.name.slice(0, 26))}${on ? ' ✔' : ''}</text>
      <rect x="0" y="${y + 14}" width="${it.cost / maxV * W}" height="7" rx="3" fill="var(--c-prune)"><title>Cost ${money(it.cost)}</title></rect>
      <rect x="0" y="${y + 22}" width="${it.profit / maxV * W}" height="7" rx="3" fill="var(--c-ok)"><title>Return ${money(it.profit)}</title></rect></g>`;
  }).join('');
  $('#bars').innerHTML = `<svg viewBox="0 0 ${W + 10} ${rows.length * (H + 8) + 30}" width="100%">${bars}
    <g transform="translate(0 ${rows.length * (H + 8) + 12})"><rect width="10" height="10" fill="var(--c-prune)" rx="2"/><text x="14" y="9">cost</text>
    <rect x="70" width="10" height="10" fill="var(--c-ok)" rx="2"/><text x="84" y="9">return</text><text x="150" y="9">(faded = skipped)</text></g></svg>`;
}

function renderCompare() {
  const { items, r, strat } = last;
  const all = [{ name: '⭐ Branch & Bound (optimal)', r: { best: r.best, cost: r.cost } }, ...strat];
  $('#cmpTbl').innerHTML = `<thead><tr><th>Strategy</th><th>Total return</th><th>Money spent</th><th>Compared to optimal</th></tr></thead><tbody>` +
    all.map((s, k) => {
      const gap = r.best - s.r.best;
      return `<tr><td>${s.name}</td><td>${money(s.r.best)}</td><td>${money(s.r.cost)}</td>
        <td>${k === 0 ? '<span class="tag t-ok">BEST</span>' : gap === 0 ? '<span class="tag t-ok">Same</span>' : `<span class="tag t-no">−${money(gap)} (${(gap / r.best * 100).toFixed(1)}% less)</span>`}</td></tr>`;
    }).join('') + '</tbody>';
  const bestG = Math.max(...strat.map(s => s.r.best));
  $('#cmpNote').textContent = r.best > bestG
    ? `Branch & Bound earns ${money(r.best - bestG)} more than the best simple rule. Thinking greedily leaves money on the table.`
    : 'For this data a simple rule happens to match the optimum, but only Branch & Bound can guarantee it.';
}

function renderAdvice() {
  const a = last.advice, b = last.budget, out = [];
  if (a.extra) out.push(`<div class="good">💡 <b>Spend ${money(a.extra.add)} more</b> (budget ${money(a.extra.budget)}) and the return rises by <b>${money(a.extra.gain)}</b>.</div>`);
  else out.push(`<div>✅ More money would not improve the return within ${money(Math.ceil(b * 1.8))}. Your options are already exhausted.</div>`);
  if (a.save) out.push(`<div class="warn">✂ You could <b>cut the budget by ${money(a.save.cut)}</b> (to ${money(a.save.budget)}) and still earn the same ${money(a.current)}.</div>`);
  else out.push(`<div>🎯 Your budget is tight: any cut would reduce the return.</div>`);
  $('#advice').innerHTML = out.join('');

  // what-if line chart
  const cv = last.cv, maxB = cv.length - 1, W = Math.max(640, maxB * 5), H = 230, pad = 42;
  const maxY = Math.max(1, ...cv.filter(v => v !== null));
  const X = v => pad + v / maxB * (W - pad - 16), Y = v => H - pad - v / maxY * (H - pad - 22);
  let d = '', started = false;
  cv.forEach((v, i) => { if (v === null) return; d += (started ? 'L' : 'M') + X(i) + ' ' + Y(v); started = true; });
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = maxY * k / 4; g += `<line x1="${pad}" x2="${W - 16}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="4" y="${Y(v) + 4}">${Math.round(v)}</text>`; }
  for (let k = 0; k <= 6; k++) { const v = Math.round(maxB * k / 6); g += `<text x="${X(v) - 8}" y="${H - pad + 16}">${v}</text>`; }
  $('#curve').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${g}
    <path d="${d}" fill="none" stroke="var(--acc)" stroke-width="2.5"/>
    <circle cx="${X(b)}" cy="${Y(cv[b])}" r="6" fill="var(--c-bad)"/>
    <text x="${X(b) + 9}" y="${Y(cv[b]) - 9}" class="t-main">Budget ${b} → return ${cv[b]}</text>
    <text x="${W / 2 - 40}" y="${H - 6}">Budget</text></svg>`;
}

/* ------------------------------ Search-tree animation ------------------------------ */
function renderTreeInfo() {
  stopAnim();
  const { r } = last, s = r.stats;
  const saved = Math.max(0, (1 - s.total / r.fullTree) * 100);
  $('#effKpis').innerHTML = [
    [r.fullTree.toLocaleString(), 'Nodes in brute force'], [s.total.toLocaleString(), 'Nodes Branch & Bound visited'],
    [saved.toFixed(1) + '%', 'Search work saved'], [s.pruned, 'Branches cut by bound'], [s.infeasible, 'Branches over budget']
  ].map(([b, t]) => `<div class="kpi"><b>${b}</b><span>${t}</span></div>`).join('');
  layoutTree(); anim.shown = 1; drawTree();
  $('#aLog').textContent = 'Press Play to watch the algorithm search.';
  $('#treeNote').textContent = 'The number inside each circle is the return collected so far. Hover a circle for details.' +
    (r.stats.total > r.nodes.length ? ` Showing the first ${r.nodes.length} of ${r.stats.total.toLocaleString()} nodes.` : '');
}

function layoutTree() {
  const nodes = last.r.nodes, GX = 46, GY = 62, top = 28;
  let leaf = 0;
  (function place(n) {
    if (!n.children.length) n.x = 30 + leaf++ * GX;
    else { n.children.forEach(place); n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2; }
    n.y = top + n.level * GY;
  })(nodes[0]);
  const maxL = Math.max(...nodes.map(n => n.level));
  anim.layout = { W: Math.max(620, leaf * GX + 60), H: top + (maxL + 1) * GY };
}

function drawTree() {
  const { r, items } = last, nodes = r.nodes, done = anim.shown >= nodes.length;
  const col = n => done && n.onBest ? 'var(--c-ok)' : n.status === 'pruned' ? 'var(--c-prune)' : n.status === 'infeasible' ? 'var(--c-bad)' : 'var(--c-explore)';
  let out = '';
  for (let i = 0; i < anim.shown; i++) {
    const n = nodes[i]; if (!n.parent) continue;
    const best = done && n.onBest;
    out += `<line x1="${n.parent.x}" y1="${n.parent.y}" x2="${n.x}" y2="${n.y}" stroke="${best ? 'var(--c-ok)' : 'var(--mut)'}"
      stroke-width="${best ? 3 : 1.2}" ${n.edge === 'skip' ? 'stroke-dasharray="4 3"' : ''} opacity="${best ? 1 : .6}"/>`;
  }
  for (let i = 0; i < anim.shown; i++) {
    const n = nodes[i], cur = i === anim.shown - 1 && !done;
    const tip = `${n.item >= 0 ? (n.edge === 'take' ? 'Take ' : 'Skip ') + items[n.item].name + ' | ' : 'Start | '}return ${n.profit} | cost ${n.weight}` +
      (n.bound !== null ? ` | bound ${n.bound.toFixed(1)}` : '') + ` | ${n.status}`;
    out += `<g><title>${esc(tip)}</title><circle cx="${n.x}" cy="${n.y}" r="${cur ? 18 : 15}" fill="${col(n)}" fill-opacity=".9"
      ${cur ? 'stroke="var(--txt)" stroke-width="3"' : ''}/><text x="${n.x}" y="${n.y + 4}" text-anchor="middle" style="fill:#06122a;font-weight:700">${n.profit}</text></g>`;
  }
  const { W, H } = anim.layout;
  $('#tree').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out}</svg>`;
  logStep();
}

function logStep() {
  if (anim.shown < 1 || !last) return;
  const { r, items } = last, n = r.nodes[anim.shown - 1];
  const act = n.item < 0 ? 'Start at the root (nothing chosen yet)' : `${n.edge === 'take' ? 'TAKE' : 'SKIP'} "${items[n.item].name}"`;
  const res = n.status === 'infeasible' ? `cost ${n.weight} is over budget → drop this branch`
    : n.status === 'pruned' ? `bound ${n.bound.toFixed(1)} cannot beat the best so far → PRUNE`
      : `return ${n.profit}, cost ${n.weight}${n.bound !== null ? `, bound ${n.bound.toFixed(1)}` : ''} → keep exploring`;
  const fin = anim.shown >= r.nodes.length ? `\nDone. Optimal return = ${r.best}. The green path shows the winning choices.` : '';
  $('#aLog').textContent = `Step ${anim.shown}/${r.nodes.length}: ${act}: ${res}${fin}`;
}

function stopAnim() { clearInterval(anim.timer); anim.timer = null; const b = $('#aPlay'); if (b) b.textContent = '▶ Play'; }
function stepAnim() {
  if (!last) return;
  if (anim.shown < last.r.nodes.length) { anim.shown++; drawTree(); } else stopAnim();
}
$('#aPlay').onclick = () => {
  if (!last) return;
  if (anim.timer) return stopAnim();
  if (anim.shown >= last.r.nodes.length) anim.shown = 1;
  $('#aPlay').textContent = '⏸ Pause';
  anim.timer = setInterval(stepAnim, 1100 - $('#aSpeed').value * 100);
};
$('#aSpeed').oninput = () => { if (anim.timer) { clearInterval(anim.timer); anim.timer = setInterval(stepAnim, 1100 - $('#aSpeed').value * 100); } };
$('#aStep').onclick = () => { stopAnim(); stepAnim(); };
$('#aAll').onclick = () => { if (!last) return; stopAnim(); anim.shown = last.r.nodes.length; drawTree(); };
$('#aReset').onclick = () => { if (!last) return; stopAnim(); anim.shown = 1; drawTree(); $('#aLog').textContent = 'Reset. Press Play.'; };

/* ------------------------------ Export / import ------------------------------ */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csvCell = v => '"' + String(v).replace(/"/g, '""') + '"';

function summaryText() {
  const { items, budget, r } = last;
  const lines = [...r.chosen].map(i => `  - ${items[i].name} (cost ${money(items[i].cost)}, return ${money(items[i].profit)})`);
  return `Best portfolio for budget ${money(budget)}\nInvest in:\n${lines.join('\n')}\n\nTotal invested: ${money(r.cost)}\nMaximum return: ${money(r.best)}\nSearch work saved by Branch & Bound: ${Math.max(0, (1 - r.stats.total / r.fullTree) * 100).toFixed(1)}%`;
}
$('#btnCopy').onclick = async () => {
  if (!last) return;
  try { await navigator.clipboard.writeText(summaryText()); say('Summary copied to clipboard ✔'); } catch (e) { say('Could not copy. Select the table and copy manually.'); }
};
$('#btnCsv').onclick = () => {
  if (!last) return;
  const { items, budget, r } = last;
  let c = 'Decision,Project,Category,Risk,Cost,Return,Return per 1\n';
  items.forEach((it, i) => { c += [r.chosen.has(i) ? 'INVEST' : 'SKIP', csvCell(it.name), it.cat, it.risk, it.cost, it.profit, (it.profit / it.cost).toFixed(2)].join(',') + '\n'; });
  c += `\nBudget,${budget}\nTotal invested,${r.cost}\nMaximum return,${r.best}\n`;
  download('best_portfolio.csv', c, 'text/csv');
};
$('#btnJson').onclick = () => {
  download('portfolio_project.json', JSON.stringify({ budget: +$('#budget').value, unit: $('#unit').value, avoidHigh: $('#avoidHigh').checked, projects }, null, 2), 'application/json');
};
$('#btnPrint').onclick = () => window.print();

$('#btnImport').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      if (f.name.toLowerCase().endsWith('.json')) {
        const d = JSON.parse(rd.result);
        projects = d.projects.map(p => P(String(p.name), CATS.includes(p.cat) ? p.cat : 'Operations', RISKS.includes(p.risk) ? p.risk : 'Medium', Math.round(+p.cost), Math.round(+p.profit), p.lock || 'auto'));
        if (d.budget) $('#budget').value = d.budget;
        if (d.unit !== undefined) $('#unit').value = d.unit;
      } else {      // CSV: name,category,risk,cost,return   (first line may be a header)
        const rows = rd.result.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
          .map(l => l.split(',').map(x => x.replace(/^"|"$/g, '').trim()));
        const data = isNaN(+rows[0][rows[0].length - 1]) ? rows.slice(1) : rows;
        projects = data.map(c => c.length >= 5
          ? P(c[0], CATS.includes(c[1]) ? c[1] : 'Operations', RISKS.includes(c[2]) ? c[2] : 'Medium', Math.round(+c[3]), Math.round(+c[4]))
          : P(c[0], 'Operations', 'Medium', Math.round(+c[1]), Math.round(+c[2])));
      }
      renderTable(); hideResults(); save(); say('Imported ' + projects.length + ' projects ✔');
    } catch (err) { say('Could not read that file. Check the format (see README).'); }
    e.target.value = '';
  };
  rd.readAsText(f);
};

/* ------------------------------ Theme + help ------------------------------ */
function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('pf_theme', t); } catch (e) { } }
$('#btnTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
$('#btnHelp').onclick = () => $('#help').showModal();
$('#helpClose').onclick = () => $('#help').close();
try { const t = localStorage.getItem('pf_theme'); if (t) setTheme(t); } catch (e) { }

restore();
