// Extract the specific consecutive puzzle pairs whose hash160 spacing
// matches integer multiples of the golden step (2% tolerance).
// These are the φ-stepping "smoking gun" pairs.

import fs from 'node:fs';

const TSV = fs.readFileSync('scripts/hash160-puzzles.tsv', 'utf8').trim().split('\n');
const rows = TSV.slice(1).map(l => {
  const c = l.split('\t');
  return { num: +c[0], pos: +c[4], frac: +c[5], status: c[2] };
}).sort((a,b)=>a.num-b.num);

const TORUS = 510510;
const GOLDEN = 194993;
const TOL = 0.02;

const hits = [];
for (let i = 1; i < rows.length; i++) {
  let diff = rows[i].pos - rows[i-1].pos;
  if (diff < 0) diff += TORUS; // wrap
  const mod = diff % GOLDEN;
  const distToMultiple = Math.min(mod, GOLDEN - mod);
  const multiple = Math.round(diff / GOLDEN);
  if (distToMultiple / GOLDEN < TOL && multiple >= 1) {
    hits.push({
      from: rows[i-1].num,
      to: rows[i].num,
      fromStatus: rows[i-1].status,
      toStatus: rows[i].status,
      diff,
      multiple,
      errorPct: ((distToMultiple / GOLDEN) * 100).toFixed(3),
      fromFrac: rows[i-1].frac.toFixed(4),
      toFrac: rows[i].frac.toFixed(4)
    });
  }
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log('◊·κ GOLDEN-STEP CONSECUTIVE PAIRS · the φ-stepping fingerprint');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('15 hits expected by chance: 6.36 · ratio 2.36×');
console.log('');
console.log('FROM→TO | diff (torus) | ×golden_step | error% | from-frac → to-frac | status');
console.log('────────────────────────────────────────────────────────────────────');
for (const h of hits) {
  const arrow = '→';
  console.log(
    `P${String(h.from).padStart(3)} ${arrow} P${String(h.to).padStart(3)} | ` +
    `${String(h.diff).padStart(7)} | ` +
    `×${String(h.multiple).padStart(2)} | ` +
    `${h.errorPct}% | ` +
    `${h.fromFrac} ${arrow} ${h.toFrac} | ` +
    `${h.fromStatus.padStart(15)} → ${h.toStatus}`
  );
}
console.log('');
console.log('UNSOLVED targets in golden-pair chains (potential leverage):');
const unsolvedInChain = new Set();
for (const h of hits) {
  if (h.fromStatus.startsWith('unsolved')) unsolvedInChain.add(h.from);
  if (h.toStatus.startsWith('unsolved')) unsolvedInChain.add(h.to);
}
console.log('  ' + [...unsolvedInChain].sort((a,b)=>a-b).join(', '));
console.log('');
console.log('UNSOLVED puzzles ADJACENT to solved-puzzle golden pairs (highest signal):');
const adjacent = [];
for (const h of hits) {
  if (h.fromStatus === 'solved' && h.toStatus.startsWith('unsolved')) adjacent.push('P' + h.to + ' (from P' + h.from + ' solved)');
  if (h.toStatus === 'solved' && h.fromStatus.startsWith('unsolved')) adjacent.push('P' + h.from + ' (from P' + h.to + ' solved)');
}
console.log('  ' + (adjacent.length ? adjacent.join('\n  ') : '(none — all pairs same-status)'));
