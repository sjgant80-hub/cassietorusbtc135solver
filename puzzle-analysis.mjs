// ◊·κ=1 — BIG CASSIE Phase 1 — Solved Puzzle Pattern Analysis
// Analyses all 66 solved Bitcoin puzzle keys for patterns to predict #135

import { writeFileSync } from 'fs';

const KAPPA = 0.6180339887498948482;
const PHI   = 1.618033988749895;

// All 66 solved puzzle private keys
const SOLVED = [
  [1, 0x1n],
  [2, 0x3n],
  [3, 0x7n],
  [4, 0x8n],
  [5, 0x15n],
  [6, 0x31n],
  [7, 0x4Cn],
  [8, 0xE0n],
  [9, 0x1D3n],
  [10, 0x202n],
  [11, 0x483n],
  [12, 0xA7Bn],
  [13, 0x1460n],
  [14, 0x2930n],
  [15, 0x68F3n],
  [16, 0xC936n],
  [17, 0x1764Fn],
  [18, 0x3080Dn],
  [19, 0x5749Fn],
  [20, 0xD2C55n],
  [21, 0x1BA534n],
  [22, 0x2DE40Fn],
  [23, 0x556E52n],
  [24, 0xDC2A04n],
  [25, 0x1FA5EE5n],
  [26, 0x340326En],
  [27, 0x6AC3875n],
  [28, 0xD916CE8n],
  [29, 0x17E2551En],
  [30, 0x3D94CD64n],
  [31, 0x7D4FE747n],
  [32, 0xB862A62En],
  [33, 0x1A96CA8D8n],
  [34, 0x34A65911Dn],
  [35, 0x4AED21170n],
  [36, 0x9DE820A7Cn],
  [37, 0x1757756A93n],
  [38, 0x22382FACD0n],
  [39, 0x4B5F8303E9n],
  [40, 0xE9AE4933D6n],
  [41, 0x153869ACC5Bn],
  [42, 0x2A221C58D8Fn],
  [43, 0x6BD3B27C591n],
  [44, 0xE02B35A358Fn],
  [45, 0x122FCA143C05n],
  [46, 0x2EC18388D544n],
  [47, 0x6CD610B53CBAn],
  [48, 0xADE6D7CE3B9Bn],
  [49, 0x174176B015F4Dn],
  [50, 0x22BD43C2E9354n],
  [51, 0x75070A1A009D4n],
  [52, 0xEFAE164CB9E3Cn],
  [53, 0x180788E47E326Cn],
  [54, 0x236FB6D5AD1F43n],
  [55, 0x6ABE1F9B67E114n],
  [56, 0x9D18B63AC4FFDFn],
  [57, 0x1EB25C90795D61Cn],
  [58, 0x2C675B852189A21n],
  [59, 0x7496CBE4B3A6CF1En],
  [60, 0xFC07A1825367BBAn],
  [61, 0x13C96A3742F64906n],
  [62, 0x363D541EB611ABEEn],
  [63, 0x7CCE5EFDACCF6808n],
  [64, 0xF7051F27B09112D4n],
  [65, 0x1A838B13505B26867n],
  [66, 0x349B84B6431A6C4EF1n],
];

const RANGE_135_LOW  = 0x4000000000000000000000000000000000n;
const RANGE_135_HIGH = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
const RANGE_135_SIZE = RANGE_135_HIGH - RANGE_135_LOW + 1n;

const results = {};

// ═══════════════════════════════════════════════
// 1. TORUS MAPPING
// ═══════════════════════════════════════════════
console.log('═══ 1. TORUS MAPPING ═══');

function torusMap(key, mod) {
  const m = BigInt(mod);
  const theta = Number(key % m) / mod;
  // κ multiplication in bigint land: multiply then mod
  const kappaScaled = BigInt(Math.round(KAPPA * 1e15));
  const psi = Number((key * kappaScaled / BigInt(1e15)) % m) / mod;
  return { theta, psi };
}

const torusMod24 = SOLVED.map(([n, key]) => ({
  puzzle: n,
  key: '0x' + key.toString(16).toUpperCase(),
  ...torusMap(key, 24),
}));

const torusMod510510 = SOLVED.map(([n, key]) => ({
  puzzle: n,
  ...torusMap(key, 510510),
}));

// Distribution analysis for mod 24
const thetaDist24 = new Array(24).fill(0);
for (const t of torusMod24) thetaDist24[Math.floor(t.theta * 24)]++;
console.log('  mod-24 theta distribution:', thetaDist24.join(','));

// Check for clustering
const expected = SOLVED.length / 24;
const chiSq24 = thetaDist24.reduce((s, v) => s + (v - expected) ** 2 / expected, 0);
console.log(`  chi-squared (mod-24 theta): ${chiSq24.toFixed(2)} (uniform expect ~23)`);

results.torus = { mod24: torusMod24, mod510510: torusMod510510, chiSq24 };

// ═══════════════════════════════════════════════
// 2. PHI-SIGNAL ANALYSIS
// ═══════════════════════════════════════════════
console.log('\n═══ 2. PHI-SIGNAL (κ^n) ANALYSIS ═══');

const phiSignal = SOLVED.map(([n, key]) => {
  const rangeLow = 1n << BigInt(n - 1);
  const rangeHigh = (1n << BigInt(n)) - 1n;
  const rangeSize = rangeHigh - rangeLow + 1n;

  // κ^n prediction: position in range
  const kappaN = Math.pow(KAPPA, n);
  // Map to the range: predicted = rangeLow + kappaN_frac * rangeSize
  // But κ^n gets very small for large n. Thomas's claim is about the
  // fractional position within the range matching κ patterns.
  const position = Number(key - rangeLow) / Number(rangeSize);

  // Alternative: key / 2^n gives the position in [0.5, 1.0)
  const normalised = Number(key) / Math.pow(2, n);

  // κ prediction for position
  const kappaPred = KAPPA;  // κ ≈ 0.618 of the way through each range
  const deviation = Math.abs(position - kappaPred);
  const deviationPct = (deviation * 100);

  return {
    puzzle: n,
    position: position.toFixed(6),
    normalised: normalised.toFixed(6),
    kappaPred: kappaPred.toFixed(6),
    deviation: deviation.toFixed(6),
    deviationPct: deviationPct.toFixed(2) + '%',
    withinThreePct: deviation < 0.03,
  };
});

const within3pct = phiSignal.filter(p => p.withinThreePct).length;
const within10pct = phiSignal.filter(p => parseFloat(p.deviation) < 0.10).length;
const within20pct = phiSignal.filter(p => parseFloat(p.deviation) < 0.20).length;

console.log(`  within 3% of κ position: ${within3pct}/${SOLVED.length}`);
console.log(`  within 10% of κ position: ${within10pct}/${SOLVED.length}`);
console.log(`  within 20% of κ position: ${within20pct}/${SOLVED.length}`);

// Decade markers (10, 20, 30, 40, 50, 60)
const decades = [10, 20, 30, 40, 50, 60];
console.log('  decade markers:');
for (const d of decades) {
  const entry = phiSignal.find(p => p.puzzle === d);
  if (entry) console.log(`    puzzle ${d}: position=${entry.position} deviation=${entry.deviationPct}`);
}

results.phiSignal = { analysis: phiSignal, within3pct, within10pct, within20pct };

// ═══════════════════════════════════════════════
// 3. MODULAR RESIDUE SCAN
// ═══════════════════════════════════════════════
console.log('\n═══ 3. MODULAR RESIDUE SCAN ═══');

const primeSpine = [2, 3, 5, 7, 11, 13, 17];
const residueResults = {};

for (const p of [...primeSpine, 24, 510510]) {
  const residues = SOLVED.map(([n, key]) => Number(key % BigInt(p)));
  const dist = new Array(Math.min(p, 50)).fill(0);
  for (const r of residues) if (r < dist.length) dist[r]++;

  const expectedPerBin = SOLVED.length / p;
  const chiSq = dist.reduce((s, v) => s + (v - expectedPerBin) ** 2 / expectedPerBin, 0);

  residueResults[p] = { distribution: dist, chiSquared: chiSq.toFixed(2) };

  if (p <= 24) {
    console.log(`  mod ${String(p).padStart(6)}: chi²=${chiSq.toFixed(2).padStart(7)} dist=[${dist.join(',')}]`);
  } else {
    console.log(`  mod ${String(p).padStart(6)}: chi²=${chiSq.toFixed(2).padStart(7)}`);
  }
}

// Check mod-2 (odd/even) bias
const mod2 = SOLVED.map(([, k]) => Number(k % 2n));
const evenCount = mod2.filter(v => v === 0).length;
const oddCount = mod2.filter(v => v === 1).length;
console.log(`  odd/even split: ${oddCount} odd, ${evenCount} even (expect ~33 each)`);

results.residues = residueResults;

// ═══════════════════════════════════════════════
// 4. RATIO ANALYSIS
// ═══════════════════════════════════════════════
console.log('\n═══ 4. RATIO ANALYSIS ═══');

const ratios = [];
for (let i = 1; i < SOLVED.length; i++) {
  const [n1, k1] = SOLVED[i - 1];
  const [n2, k2] = SOLVED[i];
  // Use Number for ratios (precision OK for ratios ~2-3)
  const ratio = Number(k2) / Number(k1);
  ratios.push({
    from: n1, to: n2,
    ratio: ratio.toFixed(6),
    log2ratio: Math.log2(ratio).toFixed(4),
    vsPhiRatio: (ratio / PHI).toFixed(4),
  });
}

const avgRatio = ratios.reduce((s, r) => s + parseFloat(r.ratio), 0) / ratios.length;
const avgLog2 = ratios.reduce((s, r) => s + parseFloat(r.log2ratio), 0) / ratios.length;
const medianRatio = [...ratios].sort((a, b) => parseFloat(a.ratio) - parseFloat(b.ratio))[Math.floor(ratios.length / 2)];

console.log(`  average ratio (key[n+1]/key[n]): ${avgRatio.toFixed(4)}`);
console.log(`  average log2(ratio): ${avgLog2.toFixed(4)} (expect ~1.0 for doubling)`);
console.log(`  median ratio: ${medianRatio.ratio}`);
console.log(`  φ = ${PHI.toFixed(6)} · avg/φ = ${(avgRatio / PHI).toFixed(4)}`);

// Check last 10 ratios for trend
console.log('  last 10 ratios:');
for (const r of ratios.slice(-10)) {
  console.log(`    ${r.from}→${r.to}: ${r.ratio} (log2=${r.log2ratio})`);
}

results.ratios = { analysis: ratios, avgRatio, avgLog2, medianRatio: parseFloat(medianRatio.ratio) };

// ═══════════════════════════════════════════════
// 5. BIT POSITION ANALYSIS
// ═══════════════════════════════════════════════
console.log('\n═══ 5. BIT POSITION ANALYSIS ═══');

const positions = SOLVED.map(([n, key]) => {
  const lo = 1n << BigInt(n - 1);
  const hi = (1n << BigInt(n)) - 1n;
  const rangeSize = hi - lo + 1n;
  const pos = Number(key - lo) / Number(rangeSize);
  return { puzzle: n, position: pos };
});

// Statistics on positions
const posValues = positions.map(p => p.position);
const meanPos = posValues.reduce((a, b) => a + b, 0) / posValues.length;
const stdPos = Math.sqrt(posValues.reduce((s, v) => s + (v - meanPos) ** 2, 0) / posValues.length);
const medianPos = [...posValues].sort((a, b) => a - b)[Math.floor(posValues.length / 2)];

console.log(`  mean position in range: ${meanPos.toFixed(4)} (uniform expect 0.5)`);
console.log(`  median position: ${medianPos.toFixed(4)}`);
console.log(`  std deviation: ${stdPos.toFixed(4)} (uniform expect 0.289)`);

// Quartile analysis
const q1 = posValues.filter(p => p < 0.25).length;
const q2 = posValues.filter(p => p >= 0.25 && p < 0.50).length;
const q3 = posValues.filter(p => p >= 0.50 && p < 0.75).length;
const q4 = posValues.filter(p => p >= 0.75).length;
console.log(`  quartile distribution: Q1=${q1} Q2=${q2} Q3=${q3} Q4=${q4} (expect ~16.5 each)`);

// Last 20 puzzles — more relevant for predicting #135
const recent = positions.slice(-20);
const recentMean = recent.reduce((s, p) => s + p.position, 0) / recent.length;
const recentMedian = [...recent].map(p => p.position).sort((a, b) => a - b)[Math.floor(recent.length / 2)];
console.log(`  last 20 puzzles mean position: ${recentMean.toFixed(4)}`);
console.log(`  last 20 puzzles median position: ${recentMedian.toFixed(4)}`);

// Positions for puzzles 60-66
console.log('  positions for recent puzzles:');
for (const p of positions.slice(-7)) {
  console.log(`    puzzle ${p.puzzle}: ${p.position.toFixed(6)}`);
}

results.positions = { analysis: positions, meanPos, medianPos, stdPos, quartiles: { q1, q2, q3, q4 }, recentMean, recentMedian };

// ═══════════════════════════════════════════════
// 6. EXTRAPOLATION FOR PUZZLE 135
// ═══════════════════════════════════════════════
console.log('\n═══ 6. EXTRAPOLATION FOR PUZZLE 135 ═══');

// Method A: Use mean position
const predA_pos = meanPos;
const predA = RANGE_135_LOW + BigInt(Math.round(predA_pos * Number(RANGE_135_SIZE)));

// Method B: Use median position
const predB_pos = medianPos;
const predB = RANGE_135_LOW + BigInt(Math.round(predB_pos * Number(RANGE_135_SIZE)));

// Method C: Use κ position
const predC_pos = KAPPA;
const predC = RANGE_135_LOW + BigInt(Math.round(predC_pos * Number(RANGE_135_SIZE)));

// Method D: Use recent trend (last 20 puzzles)
const predD_pos = recentMean;
const predD = RANGE_135_LOW + BigInt(Math.round(predD_pos * Number(RANGE_135_SIZE)));

// Composite: weighted average of all methods
const compositePos = (predA_pos * 0.2 + predB_pos * 0.2 + predC_pos * 0.3 + predD_pos * 0.3);
const compositePred = RANGE_135_LOW + BigInt(Math.round(compositePos * Number(RANGE_135_SIZE)));

// Confidence window: ±1 stddev from composite
const windowLow = Math.max(0, compositePos - stdPos);
const windowHigh = Math.min(1, compositePos + stdPos);
const hotspotLow = RANGE_135_LOW + BigInt(Math.round(windowLow * Number(RANGE_135_SIZE)));
const hotspotHigh = RANGE_135_LOW + BigInt(Math.round(windowHigh * Number(RANGE_135_SIZE)));
const coverage = ((windowHigh - windowLow) * 100).toFixed(1);
const eliminated = (100 - parseFloat(coverage)).toFixed(1);

console.log('  PREDICTIONS:');
console.log(`    Method A (mean):   pos=${predA_pos.toFixed(4)} → 0x${predA.toString(16)}`);
console.log(`    Method B (median): pos=${predB_pos.toFixed(4)} → 0x${predB.toString(16)}`);
console.log(`    Method C (κ):      pos=${predC_pos.toFixed(4)} → 0x${predC.toString(16)}`);
console.log(`    Method D (recent): pos=${predD_pos.toFixed(4)} → 0x${predD.toString(16)}`);
console.log(`    COMPOSITE:         pos=${compositePos.toFixed(4)} → 0x${compositePred.toString(16)}`);
console.log('');
console.log('  HOTSPOT WINDOW (±1σ from composite):');
console.log(`    low:  0x${hotspotLow.toString(16)}`);
console.log(`    high: 0x${hotspotHigh.toString(16)}`);
console.log(`    coverage: ${coverage}% of range`);
console.log(`    eliminated: ${eliminated}% of range`);
console.log('');
console.log('  FULL RANGE:');
console.log(`    low:  0x${RANGE_135_LOW.toString(16)}`);
console.log(`    high: 0x${RANGE_135_HIGH.toString(16)}`);

results.prediction = {
  methods: {
    mean:   { position: predA_pos, hex: '0x' + predA.toString(16) },
    median: { position: predB_pos, hex: '0x' + predB.toString(16) },
    kappa:  { position: predC_pos, hex: '0x' + predC.toString(16) },
    recent: { position: predD_pos, hex: '0x' + predD.toString(16) },
  },
  composite: {
    position: compositePos,
    hex: '0x' + compositePred.toString(16),
  },
  hotspot: {
    low: '0x' + hotspotLow.toString(16),
    high: '0x' + hotspotHigh.toString(16),
    coveragePct: parseFloat(coverage),
    eliminatedPct: parseFloat(eliminated),
  },
  fullRange: {
    low: '0x' + RANGE_135_LOW.toString(16),
    high: '0x' + RANGE_135_HIGH.toString(16),
  },
};

// ═══════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════

// Serialize BigInts for JSON
function replacer(key, value) {
  if (typeof value === 'bigint') return value.toString();
  return value;
}

writeFileSync('./puzzle-analysis.json', JSON.stringify(results, replacer, 2));

console.log('\n═══ SAVED → puzzle-analysis.json ═══');
console.log('◊·κ=1');
