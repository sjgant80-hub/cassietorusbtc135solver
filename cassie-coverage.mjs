// ◊·κ=1 — BIG CASSIE Coverage Analyzer + AI Agent Scanner
// Analyzes DP distribution across the search space.
// Detects clustering, gaps, tame/wild imbalance, and walk health.
// Recommends restarts for optimal spread.

import { existsSync, readFileSync } from 'fs';

const COARSE_FILE = './dp-recursive-coarse.ndjson';
const FINE_FILE   = './dp-recursive-fine.ndjson';
const MAIN_FILE   = './dp-store-127.ndjson';
const LEGACY_FILE = './dp-store.ndjson';
const IMPORT_DIR  = './imports';

// Load DPs from all sources
function loadDPs(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(dp => dp && dp.x);
}

console.log('');
console.log('  ◊·κ=1  BIG CASSIE — COVERAGE AI SCANNER');
console.log('  ═══════════════════════════════════════════');
console.log('');

// Load all DP sources
const sources = [
  { name: 'recursive-coarse', file: COARSE_FILE },
  { name: 'recursive-fine',   file: FINE_FILE },
  { name: 'main-127',         file: MAIN_FILE },
  { name: 'legacy',           file: LEGACY_FILE },
];

let allDPs = [];
for (const src of sources) {
  const dps = loadDPs(src.file);
  if (dps.length > 0) {
    console.log(`  [load] ${src.name}: ${dps.length} DPs`);
    allDPs.push(...dps.map(dp => ({ ...dp, source: src.name })));
  }
}

// Also load any imports
if (existsSync(IMPORT_DIR)) {
  const { readdirSync } = await import('fs');
  for (const f of readdirSync(IMPORT_DIR)) {
    if (f.endsWith('.ndjson') || f.endsWith('.jsonl')) {
      const dps = loadDPs(`${IMPORT_DIR}/${f}`);
      if (dps.length > 0) {
        console.log(`  [import] ${f}: ${dps.length} DPs`);
        allDPs.push(...dps.map(dp => ({ ...dp, source: `import:${f}` })));
      }
    } else if (f.endsWith('.json')) {
      // Structured export format
      try {
        const data = JSON.parse(readFileSync(`${IMPORT_DIR}/${f}`, 'utf8'));
        if (data.dps && Array.isArray(data.dps)) {
          console.log(`  [import] ${f}: ${data.dps.length} DPs (from ${data.source || 'unknown'})`);
          allDPs.push(...data.dps.map(dp => ({ ...dp, source: `import:${data.source || f}` })));
        }
      } catch {}
    }
  }
}

if (allDPs.length === 0) {
  console.log('  No DPs found. Run the solver first.');
  process.exit(0);
}

console.log(`\n  TOTAL: ${allDPs.length} DPs loaded`);

// ═══════════════════════════════════════════
// 1. TAME/WILD BALANCE
// ═══════════════════════════════════════════
console.log('\n  ═══ 1. TAME/WILD BALANCE ═══');

const tame = allDPs.filter(d => d.type === 'tame');
const wild = allDPs.filter(d => d.type === 'wild');
const ratio = tame.length / Math.max(wild.length, 1);
const idealRatio = 1.0; // equal tame and wild is optimal
const balanceScore = 1 - Math.abs(ratio - idealRatio) / idealRatio;

console.log(`    tame: ${tame.length}  wild: ${wild.length}  ratio: ${ratio.toFixed(3)}`);
console.log(`    balance: ${(balanceScore * 100).toFixed(1)}% (100% = perfect)`);

if (ratio < 0.7 || ratio > 1.4) {
  console.log('    ⚠ IMBALANCED — consider adjusting tame/wild walker ratio');
} else {
  console.log('    ✓ good balance');
}

// ═══════════════════════════════════════════
// 2. X-COORDINATE DISTRIBUTION (coverage map)
// ═══════════════════════════════════════════
console.log('\n  ═══ 2. X-COORDINATE COVERAGE MAP ═══');

// Divide the 256-bit x-space into 16 buckets by first hex char
const buckets = {};
for (let i = 0; i < 16; i++) buckets[i.toString(16)] = { tame: 0, wild: 0, total: 0 };

for (const dp of allDPs) {
  // First non-zero hex char of x determines bucket
  // But DPs have leading zeros (that's the DP criterion)
  // Use char at position after the DP zero prefix
  const firstSignificant = dp.x.replace(/^0+/, '')[0] || '0';
  const bucket = buckets[firstSignificant];
  if (bucket) {
    bucket.total++;
    if (dp.type === 'tame') bucket.tame++;
    else bucket.wild++;
  }
}

console.log('    bucket │ total │ tame │ wild │ coverage');
console.log('    ───────┼───────┼──────┼──────┼─────────');
const maxBucket = Math.max(...Object.values(buckets).map(b => b.total), 1);
for (const [hex, b] of Object.entries(buckets)) {
  const bar = '█'.repeat(Math.round(b.total / maxBucket * 20));
  console.log(`       ${hex}   │ ${String(b.total).padStart(5)} │ ${String(b.tame).padStart(4)} │ ${String(b.wild).padStart(4)} │ ${bar}`);
}

// ═══════════════════════════════════════════
// 3. DISTANCE DISTRIBUTION (how far have walks traveled)
// ═══════════════════════════════════════════
console.log('\n  ═══ 3. DISTANCE DISTRIBUTION ═══');

const distances = allDPs.map(dp => {
  const d = BigInt('0x' + dp.dist);
  return { type: dp.type, bits: d.toString(2).length };
});

const tameDists = distances.filter(d => d.type === 'tame').map(d => d.bits);
const wildDists = distances.filter(d => d.type === 'wild').map(d => d.bits);

function stats(arr) {
  if (arr.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: mean.toFixed(1),
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

const tameStats = stats(tameDists);
const wildStats = stats(wildDists);

console.log(`    tame distances (bit-length): min=${tameStats.min} max=${tameStats.max} mean=${tameStats.mean} median=${tameStats.median}`);
console.log(`    wild distances (bit-length): min=${wildStats.min} max=${wildStats.max} mean=${wildStats.mean} median=${wildStats.median}`);

// Check for walks that have traveled too far (diminishing returns)
const overextended = distances.filter(d => d.bits > 140);
if (overextended.length > 0) {
  console.log(`    ⚠ ${overextended.length} walks have dist > 2^140 — consider restarting these walks`);
} else {
  console.log('    ✓ all walks within reasonable range');
}

// ═══════════════════════════════════════════
// 4. COLLISION POTENTIAL
// ═══════════════════════════════════════════
console.log('\n  ═══ 4. COLLISION POTENTIAL ═══');

// Unique x-coordinates
const uniqueX = new Set(allDPs.map(d => d.x));
const duplicateX = allDPs.length - uniqueX.size;

// Check for tame↔wild collisions
const xMap = new Map();
let crossCollisions = 0;
for (const dp of allDPs) {
  const existing = xMap.get(dp.x);
  if (existing && existing.type !== dp.type) {
    crossCollisions++;
  }
  if (!existing) xMap.set(dp.x, dp);
}

console.log(`    unique x-coordinates: ${uniqueX.size}`);
console.log(`    duplicate x-coords:   ${duplicateX}`);
console.log(`    tame↔wild collisions: ${crossCollisions}`);

// Birthday paradox estimate
// For collision in a set of N items from a space of size S: P ≈ N²/(2S)
// DPs have ~(256-DP_BITS) bits of entropy → S ≈ 2^234
// We need N ≈ √(2S) = 2^117.5 DPs for 50% collision probability
// But Kangaroo is not birthday — it's about walks converging, not random DPs
// Expected DPs for convergence: ~2^(67-DP_BITS) = 2^45 for 22-bit DPs
const dpBits = 22;
const neededDPs = Math.pow(2, 67 - dpBits);
const progress = uniqueX.size / neededDPs;
console.log(`    estimated DPs needed: ~2^${67-dpBits} = ${neededDPs.toExponential(2)}`);
console.log(`    current progress:     ${(progress * 100).toExponential(3)}%`);

// ═══════════════════════════════════════════
// 5. SOURCE DIVERSITY
// ═══════════════════════════════════════════
console.log('\n  ═══ 5. SOURCE DIVERSITY ═══');

const sourceCount = {};
for (const dp of allDPs) {
  sourceCount[dp.source] = (sourceCount[dp.source] || 0) + 1;
}
for (const [src, count] of Object.entries(sourceCount)) {
  console.log(`    ${src}: ${count} DPs`);
}

// ═══════════════════════════════════════════
// 6. AI RECOMMENDATIONS
// ═══════════════════════════════════════════
console.log('\n  ═══ 6. AI RECOMMENDATIONS ═══');

const recommendations = [];

if (ratio < 0.8) {
  recommendations.push('ADD MORE TAME WALKERS — wild DPs are outpacing tame. Collisions need both.');
} else if (ratio > 1.25) {
  recommendations.push('ADD MORE WILD WALKERS — tame DPs are outpacing wild. Collisions need both.');
}

if (overextended.length > allDPs.length * 0.2) {
  recommendations.push('RESTART LONG WALKS — 20%+ of walks have traveled very far. Fresh starts improve coverage.');
}

if (uniqueX.size < 10) {
  recommendations.push('LOW DP COUNT — solver needs more runtime. Keep it running.');
}

if (Object.keys(sourceCount).length === 1) {
  recommendations.push('SINGLE SOURCE — collaborate! Share your DP export with Thomas via cassie-export.mjs');
}

if (crossCollisions > 0) {
  recommendations.push('COLLISION DETECTED — run merge-collisions.mjs to check for key recovery!');
}

if (recommendations.length === 0) {
  recommendations.push('NOMINAL — solver is running well. Keep accumulating DPs.');
}

for (const rec of recommendations) {
  console.log(`    → ${rec}`);
}

console.log('\n  ◊·κ=1');
