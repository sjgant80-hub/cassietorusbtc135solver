// ◊·κ=1 — BIG CASSIE AI-Enhanced Kangaroo Solver
//
// ═══════════════════════════════════════════════════════════
// AI OPTIMIZATIONS (5 techniques stacked):
// ═══════════════════════════════════════════════════════════
//
// 1. SINGLE-SCALE TURBO — 3x effective throughput
//    Eliminated scout (2^30-55) and sniper (2^20-40) triad walks.
//    For a 2^134 range, these had negligible collision probability:
//    - Scout: mean step 2^43 vs needed 2^67 → collision prob 2^-19× lower
//    - Sniper: mean step 2^30 vs needed 2^67 → collision prob 2^-37× lower
//    All 381 walks now run at optimal PRIMARY scale (2^41-72).
//
// 2. BAYESIAN STARTING POSITIONS — tame walkers biased toward hotspot
//    Analysis of 66 solved puzzles (puzzle-analysis.mjs) shows:
//    - Last 20 puzzles median position: 0.695 in range
//    - Q3 quartile (0.50-0.75) holds 29% of solutions vs expected 25%
//    - Composite prediction: position 0.60 (weighted mean/median/κ/recent)
//    → 70% of tame walkers start Gaussian(0.60, 0.15), 30% uniform insurance
//
// 3. WALK RESTART — cycle breaking + coverage maximization
//    Walks auto-restart after ~4M steps (2^22). Prevents:
//    - Deterministic cycle trapping (same jump function → eventual loops)
//    - Diminishing returns from walks that missed their target region
//    Fresh random starts maximize search space coverage over time.
//
// 4. DUPLICATE TRAJECTORY DETECTION — eliminate wasted compute
//    Same-type DP collisions (tame↔tame or wild↔wild) indicate two walks
//    following the same path. These waste parallel compute. Detected and
//    logged for health monitoring. Walk restart handles the fix.
//
// 5. CROSS-SOURCE DP LOADING — maximum collision surface
//    On startup, loads DPs from ALL sources:
//    - Own dp-ai-coarse/fine.ndjson
//    - Recursive solver's dp-recursive-coarse/fine.ndjson
//    - Flat solver's dp-store-127.ndjson
//    - Legacy dp-store.ndjson
//    - Any imported DPs from ./imports/
//    Every DP from any source can collide with any other → maximum odds.
//
// ARCHITECTURE:
//   Level 0 │ AI Orchestrator (this file)    │ 1
//   Level 1 │ Worker processes               │ NUM_WORKERS
//   Level 2 │ AI Walks (single-scale primary) │ 381
//   Level 3 │ Dual-DP detectors              │ 762
//   ─────────────────────────────────────────────
//   TOTAL   │ Entities                       │ 381 + 762 + NUM_WORKERS + 1
//
// vs Recursive architecture:
//   Before: 127 agents × 3 triad = 381 walks (only 127 at optimal scale)
//   After:  381 walks × 1 scale  = 381 walks (ALL at optimal scale)
//   → 3× effective collision throughput

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import {
  existsSync, readFileSync, writeFileSync, createWriteStream, readdirSync,
} from 'fs';
import { Point } from '@noble/secp256k1';
import { randomBytes } from 'crypto';

const G = Point.BASE;
const CURVE_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
function mod(a, m) { const r = a % m; return r < 0n ? r + m : r; }

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = Point.fromHex(TARGET_PUBKEY);

const RANGE_LOW  = 0x4000000000000000000000000000000000n;
const RANGE_HIGH = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
const RANGE_SIZE = RANGE_HIGH - RANGE_LOW + 1n;

// ═══════════════════════════════════════════
// AI: BAYESIAN PARAMETERS
// ═══════════════════════════════════════════
// Derived from puzzle-analysis.mjs:
//   - 66 solved puzzles, last 20 median position = 0.695
//   - Quartile bias toward Q3 (0.50–0.75)
//   - Composite prediction ≈ 0.60 (conservative, weighted methods)
const BAYES_CENTER   = 0.60;    // Hotspot center
const BAYES_STDDEV   = 0.15;    // 68% in [0.45, 0.75]
const BAYES_FRACTION = 0.70;    // 70% biased, 30% uniform insurance

// ═══════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════
const NUM_WORKERS = parseInt(
  process.env.WORKERS || String(Math.max(1, os.cpus().length - 1)), 10,
);
const TOTAL_WALKS = parseInt(process.env.WALKS || '381', 10);
const TAME_COUNT  = Math.ceil(TOTAL_WALKS / 2);   // 191
const WILD_COUNT  = TOTAL_WALKS - TAME_COUNT;       // 190

const DP_STORE_COARSE = './dp-ai-coarse.ndjson';
const DP_STORE_FINE   = './dp-ai-fine.ndjson';
const CHECKPOINT      = './checkpoint-ai.json';
const SOLUTION_FILE   = './SOLUTION-AI.txt';
const REPORT_MS       = 10_000;
const CHECKPOINT_MS   = 60_000;

// Cross-source DP files to load on startup
const CROSS_SOURCE_FILES = [
  './dp-recursive-coarse.ndjson',
  './dp-recursive-fine.ndjson',
  './dp-store-127.ndjson',
  './dp-store.ndjson',
  './dp-pool-alpha.ndjson',
  './dp-pool-beta.ndjson',
  './dp-pool-gamma.ndjson',
];

// ═══════════════════════════════════════════
// BAYESIAN RANDOM NUMBER GENERATION
// ═══════════════════════════════════════════
function gaussianRandom(mean, stddev) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function randBigInt(max) {
  const hexLen = max.toString(16).length;
  const byteLen = (hexLen + 1) >> 1;
  let r;
  do {
    r = BigInt('0x' + Buffer.from(randomBytes(byteLen)).toString('hex'));
  } while (r >= max);
  return r;
}

function posToKey(pos) {
  // Convert float position [0,1) to BigInt key in [RANGE_LOW, RANGE_HIGH]
  // Top 53 bits from Bayesian position, random fill for lower 81 bits
  pos = Math.max(0, Math.min(1 - 1e-15, pos));
  const scaled = BigInt(Math.floor(pos * Number(1n << 53n)));
  const offset = (scaled << 81n) + randBigInt(1n << 81n);
  return RANGE_LOW + (offset % RANGE_SIZE);
}

// ═══════════════════════════════════════════
// GENERATE BAYESIAN STARTING POSITIONS
// ═══════════════════════════════════════════
const allWalks = [];
let bayesianCount = 0;
let uniformCount  = 0;

// Tame walks: 70% Bayesian-biased, 30% uniform
for (let i = 0; i < TAME_COUNT; i++) {
  let startKey;
  if (Math.random() < BAYES_FRACTION) {
    // Bayesian: Gaussian centered at hotspot
    const pos = gaussianRandom(BAYES_CENTER, BAYES_STDDEV);
    startKey = posToKey(pos);
    bayesianCount++;
  } else {
    // Uniform: insurance against wrong prediction
    startKey = RANGE_LOW + randBigInt(RANGE_SIZE);
    uniformCount++;
  }
  allWalks.push({
    type: 'tame',
    startHex: startKey.toString(16).padStart(35, '0'),
  });
}

// Wild walks: uniform offset (can't bias — target position unknown)
for (let i = 0; i < WILD_COUNT; i++) {
  const offset = randBigInt(RANGE_SIZE);
  allWalks.push({
    type: 'wild',
    startHex: offset.toString(16).padStart(35, '0'),
  });
}

// Shuffle for even distribution across workers
for (let i = allWalks.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [allWalks[i], allWalks[j]] = [allWalks[j], allWalks[i]];
}

// Distribute round-robin across workers
const workerConfigs = Array.from({ length: NUM_WORKERS }, () => []);
for (let i = 0; i < allWalks.length; i++) {
  workerConfigs[i % NUM_WORKERS].push(allWalks[i]);
}

// ═══════════════════════════════════════════
// DUAL DP MAPS
// ═══════════════════════════════════════════
const coarseMap = new Map();
const fineMap   = new Map();

let totalJumps         = 0n;
let totalCoarse        = 0;
let totalFine          = 0;
let totalRestarts      = 0;
let dupTrajectories    = 0;
let crossSourceLoaded  = 0;
let solved             = false;
const startTime        = Date.now();
const coarseStream     = createWriteStream(DP_STORE_COARSE, { flags: 'a' });
const fineStream       = createWriteStream(DP_STORE_FINE, { flags: 'a' });

// ═══════════════════════════════════════════
// LOAD NDJSON HELPER
// ═══════════════════════════════════════════
function loadNDJSON(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(dp => dp && dp.x && dp.type && dp.dist);
}

// ═══════════════════════════════════════════
// DP PROCESSING + COLLISION DETECTION
// ═══════════════════════════════════════════
function processDP(dp, persist = true) {
  if (solved) return;
  const map = dp.level === 'coarse' ? coarseMap : fineMap;
  const existing = map.get(dp.x);
  if (existing) {
    if (existing.type !== dp.type) {
      // TAME↔WILD COLLISION — attempt key recovery!
      handleCollision(existing, dp);
    } else {
      // SAME-TYPE COLLISION — duplicate trajectory!
      dupTrajectories++;
    }
    return;
  }
  map.set(dp.x, { type: dp.type, dist: dp.dist });
  if (dp.level === 'coarse') {
    totalCoarse++;
    if (persist) coarseStream.write(JSON.stringify(dp) + '\n');
  } else {
    totalFine++;
    if (persist) fineStream.write(JSON.stringify(dp) + '\n');
  }
}

function handleCollision(a, b) {
  const tame = a.type === 'tame' ? a : b;
  const wild = a.type === 'wild' ? a : b;
  const tameLog = BigInt('0x' + tame.dist);
  const wildAcc = BigInt('0x' + wild.dist);

  const candidates = [
    mod(tameLog - wildAcc, CURVE_N),
    mod(-tameLog - wildAcc, CURVE_N),
  ];

  for (const cand of candidates) {
    if (cand === 0n) continue;
    try {
      const test = G.multiply(cand);
      if (test.equals(targetPoint)) {
        solved = true;
        const hex = cand.toString(16).padStart(34, '0');
        const banner = '█'.repeat(60);
        console.log(`\n${banner}`);
        console.log(`  ◊·κ=1  PRIVATE KEY RECOVERED (AI-ENHANCED)`);
        console.log(`  AI CASSIE — Bayesian + Single-Scale + Walk Restart`);
        console.log(`  hex (135-bit): ${hex}`);
        console.log(`  decimal      : ${cand.toString(10)}`);
        console.log(`${banner}\n`);
        writeFileSync(SOLUTION_FILE,
          `target_pubkey: ${TARGET_PUBKEY}\n` +
          `private_key_hex: ${hex}\n` +
          `private_key_dec: ${cand.toString(10)}\n` +
          `architecture: AI-Enhanced Kangaroo\n` +
          `optimizations: Single-Scale(3x) + Bayesian(0.60,0.15) + WalkRestart(2^22) + DupDetect + CrossSource\n` +
          `total_walks: ${TOTAL_WALKS}\n` +
          `tame: ${TAME_COUNT} (${bayesianCount} Bayesian + ${uniformCount} uniform)\n` +
          `wild: ${WILD_COUNT}\n` +
          `bayes_center: ${BAYES_CENTER}\n` +
          `bayes_stddev: ${BAYES_STDDEV}\n` +
          `cross_source_dps: ${crossSourceLoaded}\n` +
          `recovered_at: ${new Date().toISOString()}\n`,
        );
        shutdown(0);
        return;
      }
    } catch {}
  }
}

// ═══════════════════════════════════════════
// CROSS-SOURCE DP LOADING (AI optimization #5)
// ═══════════════════════════════════════════
console.log('');
console.log('  ◊·κ=1  BIG CASSIE — AI-ENHANCED SOLVER');
console.log('  ═════════════════════════════════════════');
console.log('');

// Load own DPs first
for (const file of [DP_STORE_COARSE, DP_STORE_FINE]) {
  if (existsSync(file)) {
    const dps = loadNDJSON(file);
    let loaded = 0;
    for (const dp of dps) {
      if (!dp.level) dp.level = file.includes('coarse') ? 'coarse' : 'fine';
      processDP(dp, false);
      loaded++;
      if (solved) break;
    }
    if (loaded > 0) console.log(`  [resume] ${file}: ${loaded} DPs`);
  }
}

// Load cross-source DPs
for (const file of CROSS_SOURCE_FILES) {
  if (existsSync(file)) {
    const dps = loadNDJSON(file);
    let loaded = 0;
    for (const dp of dps) {
      if (!dp.level) dp.level = 'coarse'; // Treat external as coarse
      processDP(dp, false);
      loaded++;
      crossSourceLoaded++;
      if (solved) break;
    }
    if (loaded > 0) console.log(`  [cross]  ${file}: ${loaded} DPs`);
  }
}

// Load imports
const IMPORT_DIR = './imports';
if (existsSync(IMPORT_DIR)) {
  for (const f of readdirSync(IMPORT_DIR)) {
    const path = `${IMPORT_DIR}/${f}`;
    let imported = [];
    if (f.endsWith('.ndjson') || f.endsWith('.jsonl')) {
      imported = loadNDJSON(path);
    } else if (f.endsWith('.json')) {
      try {
        const data = JSON.parse(readFileSync(path, 'utf8'));
        if (data.dps && Array.isArray(data.dps)) imported = data.dps;
      } catch {}
    }
    for (const dp of imported) {
      if (!dp.level) dp.level = 'coarse';
      processDP(dp, false);
      crossSourceLoaded++;
      if (solved) break;
    }
    if (imported.length > 0) console.log(`  [import] ${f}: ${imported.length} DPs`);
  }
}

if (solved) process.exit(0);

// ═══════════════════════════════════════════
// BANNER
// ═══════════════════════════════════════════
console.log('');
console.log('  AI OPTIMIZATIONS:');
console.log('  ──────────────────────────────');
console.log('  #1  Single-Scale Turbo       │ 3x effective throughput (no scout/sniper waste)');
console.log(`  #2  Bayesian Starting Pos    │ center=${BAYES_CENTER} σ=${BAYES_STDDEV} (${Math.round(BAYES_FRACTION*100)}% biased)`);
console.log(`  #3  Walk Restart             │ every 2^22 steps (~4.2M) for coverage diversity`);
console.log('  #4  Duplicate Trajectory Det │ same-type collisions logged for health monitor');
console.log(`  #5  Cross-Source DP Loading   │ ${coarseMap.size + fineMap.size} DPs from ${CROSS_SOURCE_FILES.length + 2} sources`);
console.log('');
console.log('  WALKS:');
console.log(`    total:  ${TOTAL_WALKS} (all at PRIMARY scale 2^41–2^72)`);
console.log(`    tame:   ${TAME_COUNT} (${bayesianCount} Bayesian + ${uniformCount} uniform)`);
console.log(`    wild:   ${WILD_COUNT} (uniform offset)`);
console.log(`    DP det: ${TOTAL_WALKS * 2} (coarse 22-bit + fine 14-bit per walk)`);
console.log('');
console.log('  BAYESIAN HOTSPOT:');
console.log(`    center:  position ${BAYES_CENTER} in range`);
console.log(`    68% CI:  [${(BAYES_CENTER - BAYES_STDDEV).toFixed(2)}, ${(BAYES_CENTER + BAYES_STDDEV).toFixed(2)}] of range`);
console.log(`    95% CI:  [${(BAYES_CENTER - 2*BAYES_STDDEV).toFixed(2)}, ${(BAYES_CENTER + 2*BAYES_STDDEV).toFixed(2)}] of range`);
console.log(`    uniform: ${uniformCount} walks cover full range (insurance)`);
console.log('');
console.log('  CROSS-SOURCE:');
console.log(`    coarse DPs: ${coarseMap.size} (persisted)`);
console.log(`    fine DPs:   ${fineMap.size} (in-memory)`);
console.log(`    external:   ${crossSourceLoaded} loaded from other solvers`);
console.log('');
console.log(`  target : ${TARGET_PUBKEY}`);
console.log(`  workers: ${NUM_WORKERS}`);
console.log('  ═════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════
// SPAWN WORKERS
// ═══════════════════════════════════════════
const workerPath = fileURLToPath(new URL('./kangaroo-ai.mjs', import.meta.url));
const workers = [];

for (let i = 0; i < NUM_WORKERS; i++) {
  const config = workerConfigs[i];
  const w = fork(workerPath, [], {
    env: {
      ...process.env,
      WORKER_ID: String(i),
      WALK_CONFIG: JSON.stringify(config),
    },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  w.on('message', (msg) => {
    if (msg.kind === 'dp') {
      processDP(msg);
    } else if (msg.kind === 'stat') {
      totalJumps += BigInt(msg.jumps);
      totalRestarts += msg.restarts || 0;
    } else if (msg.kind === 'ready') {
      console.log(`  [worker ${String(i).padStart(2)}] pid=${msg.pid} · ${msg.walks} walks (T:${msg.tame}/W:${msg.wild}) · single-scale primary`);
    } else if (msg.kind === 'error') {
      console.error(`  [worker ${i} err] ${msg.message}`);
    }
  });
  w.on('exit', (code) => {
    if (!solved) console.log(`  [worker ${i}] exit ${code}`);
  });
  workers.push(w);
}

// ═══════════════════════════════════════════
// AI HEALTH REPORTING
// ═══════════════════════════════════════════
let reportCycle = 0;

setInterval(() => {
  reportCycle++;
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = Number(totalJumps) / Math.max(elapsed, 1);
  const human = rate >= 1e6
    ? `${(rate / 1e6).toFixed(2)}M/s`
    : rate >= 1e3
      ? `${(rate / 1e3).toFixed(1)}k/s`
      : `${rate.toFixed(0)}/s`;

  const tameCoarse = [...coarseMap.values()].filter(d => d.type === 'tame').length;
  const wildCoarse = coarseMap.size - tameCoarse;
  const tameFine = [...fineMap.values()].filter(d => d.type === 'tame').length;
  const wildFine = fineMap.size - tameFine;

  // Standard metrics line
  console.log(
    `  [${String(Math.round(elapsed)).padStart(6)}s] ` +
    `ops=${totalJumps.toString().padStart(14)} · ${human.padStart(9)} · ` +
    `coarse=${coarseMap.size}(T:${tameCoarse}/W:${wildCoarse}) · ` +
    `fine=${fineMap.size}(T:${tameFine}/W:${wildFine}) · ` +
    `rst=${totalRestarts} dup=${dupTrajectories}`,
  );

  // AI Health Analysis — every 6th report (every 60 seconds)
  if (reportCycle % 6 === 0) {
    const healthLines = [];
    healthLines.push('  ┌─ AI HEALTH ANALYSIS ──────────────────────');

    // Tame/Wild balance
    const ratio = tameCoarse / Math.max(wildCoarse, 1);
    const balanceOK = ratio >= 0.7 && ratio <= 1.4;
    healthLines.push(`  │  T/W ratio: ${ratio.toFixed(2)} ${balanceOK ? '✓' : '⚠ IMBALANCED'}`);

    // DP accumulation rate
    const dpRate = (coarseMap.size + fineMap.size) / Math.max(elapsed / 3600, 0.01);
    healthLines.push(`  │  DP rate: ${dpRate.toFixed(1)}/hour (coarse+fine)`);

    // Restart rate
    const restartRate = totalRestarts / Math.max(elapsed / 3600, 0.01);
    healthLines.push(`  │  Restarts: ${totalRestarts} total (${restartRate.toFixed(1)}/hour)`);

    // Duplicate trajectories
    if (dupTrajectories > 0) {
      const dupPct = (dupTrajectories / Math.max(coarseMap.size + fineMap.size, 1) * 100).toFixed(1);
      healthLines.push(`  │  Dup trajectories: ${dupTrajectories} (${dupPct}% of DPs) — walk restarts fixing`);
    } else {
      healthLines.push(`  │  Dup trajectories: 0 ✓`);
    }

    // Coverage estimate
    // For collision: need ~2^(67-DP_BITS) = 2^45 unique coarse DPs
    const neededCoarse = Math.pow(2, 45);
    const coveragePct = (coarseMap.size / neededCoarse * 100);
    healthLines.push(`  │  Collision progress: ${coveragePct.toExponential(2)}% (need ~2^45 coarse DPs)`);

    // Time estimate (very rough)
    if (coarseMap.size > 0) {
      const coarsePerSec = coarseMap.size / elapsed;
      const secsNeeded = neededCoarse / coarsePerSec;
      const yearsNeeded = secsNeeded / (365.25 * 86400);
      if (yearsNeeded < 1) {
        healthLines.push(`  │  ETA (solo): ~${(secsNeeded / 86400).toFixed(0)} days`);
      } else if (yearsNeeded < 1000) {
        healthLines.push(`  │  ETA (solo): ~${yearsNeeded.toFixed(0)} years`);
      } else {
        healthLines.push(`  │  ETA (solo): ~${yearsNeeded.toExponential(1)} years (collaborate with Thomas!)`);
      }
    }

    // Phase info
    const hoursElapsed = elapsed / 3600;
    let phase;
    if (hoursElapsed < 1) phase = 'Phase 1: Bayesian exploration (70% biased)';
    else if (hoursElapsed < 6) phase = 'Phase 2: Steady accumulation';
    else phase = 'Phase 3: Long-haul coverage building';
    healthLines.push(`  │  ${phase}`);

    healthLines.push('  └───────────────────────────────────────────');
    console.log(healthLines.join('\n'));
  }
}, REPORT_MS);

// ═══════════════════════════════════════════
// CHECKPOINTING
// ═══════════════════════════════════════════
setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  writeFileSync(CHECKPOINT, JSON.stringify({
    architecture: 'AI-Enhanced Kangaroo',
    optimizations: [
      'single-scale-turbo',
      'bayesian-starting-positions',
      'walk-restart',
      'duplicate-trajectory-detection',
      'cross-source-dp-loading',
    ],
    bayes: { center: BAYES_CENTER, stddev: BAYES_STDDEV, fraction: BAYES_FRACTION },
    walks: TOTAL_WALKS,
    tame: TAME_COUNT,
    wild: WILD_COUNT,
    bayesianTame: bayesianCount,
    uniformTame: uniformCount,
    elapsed_s: elapsed,
    totalJumps: totalJumps.toString(),
    coarseDPs: coarseMap.size,
    fineDPs: fineMap.size,
    restarts: totalRestarts,
    dupTrajectories,
    crossSourceDPs: crossSourceLoaded,
    workers: NUM_WORKERS,
    timestamp: new Date().toISOString(),
  }, null, 2));
}, CHECKPOINT_MS);

// ═══════════════════════════════════════════
// FINE DP PRUNING
// ═══════════════════════════════════════════
setInterval(() => {
  if (fineMap.size > 1_000_000) {
    const toDelete = fineMap.size - 800_000;
    const iter = fineMap.keys();
    for (let i = 0; i < toDelete; i++) {
      const key = iter.next().value;
      if (key) fineMap.delete(key);
    }
    console.log(`  [prune] fine DPs: ${fineMap.size} (pruned ${toDelete})`);
  }
}, 300_000);

// ═══════════════════════════════════════════
// SHUTDOWN
// ═══════════════════════════════════════════
function shutdown(code = 0) {
  console.log('  [shutdown] terminating workers...');
  for (const w of workers) { try { w.kill('SIGTERM'); } catch {} }
  try { coarseStream.end(); } catch {}
  try { fineStream.end(); } catch {}
  process.exit(code);
}

process.on('SIGINT',  () => { console.log('\n  [SIGINT]');  shutdown(0); });
process.on('SIGTERM', () => { console.log('\n  [SIGTERM]'); shutdown(0); });
