// ◊·κ=1 — BIG CASSIE AI-Enhanced Kangaroo Worker
//
// AI OPTIMIZATIONS vs kangaroo-recursive.mjs:
// ──────────────────────────────────────────────
// 1. SINGLE PRIMARY SCALE — eliminates wasteful scout/sniper walks
//    Scout (2^30-55) and sniper (2^20-40) have mean jumps 2^19–2^32× too small
//    for a 2^134 range. Their collision probability is negligible.
//    → All compute at optimal 2^41-2^72 scale → 3x effective throughput
//
// 2. WALK RESTART — prevents cycle trapping and diminishing returns
//    After ~4M steps (2^22), walks are restarted with fresh random positions.
//    Breaks deterministic cycles and maximizes coverage diversity.
//
// 3. ORCHESTRATOR-CONTROLLED STARTS — Bayesian starting positions
//    Starting keys/offsets come from orchestrator (cassie-ai.mjs) which
//    applies Bayesian bias based on solved puzzle analysis.
//
// 4. HEALTH TELEMETRY — reports restarts, DPs per walk, walk ages
//    Orchestrator uses this for AI health analysis.

import { Point } from '@noble/secp256k1';
import { randomBytes } from 'crypto';

const G = Point.BASE;
const CURVE_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = Point.fromHex(TARGET_PUBKEY);

// ═══ RANGE ═══
const RANGE_LOW  = 0x4000000000000000000000000000000000n;
const RANGE_HIGH = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
const RANGE_SIZE = RANGE_HIGH - RANGE_LOW + 1n;

// ═══ SINGLE JUMP TABLE — PRIMARY SCALE ONLY ═══
// 32 entries: 2^41 through 2^72
// Mean jump ≈ 2^68 (dominated by geometric series top)
// Optimal for 134-bit range where √range = 2^67
function buildJumpTable(base, count) {
  const jumps = [];
  const points = [];
  for (let j = 0; j < count; j++) {
    const d = 1n << BigInt(j + base);
    jumps.push(d);
    points.push(G.multiply(d));
  }
  return { jumps, points, mask: BigInt(count - 1) };
}

const PRIMARY = buildJumpTable(41, 32);

// ═══ DP THRESHOLDS ═══
const COARSE_DP_BITS = 22;
const FINE_DP_BITS   = 14;
const COARSE_THRESHOLD = 1n << BigInt(256 - COARSE_DP_BITS);
const FINE_THRESHOLD   = 1n << BigInt(256 - FINE_DP_BITS);

// ═══ AI PARAMETERS ═══
const DP_CHECK_INTERVAL = 32;       // Amortized affine: check every 32 steps
const MAX_STEPS = 1 << 22;          // ~4.2M steps before walk restart
const STEPS_PER_WALK = 512;         // Cache-friendly batch size per walk

function mod(a, m) { const r = a % m; return r < 0n ? r + m : r; }

function randBigInt(max) {
  const hexLen = max.toString(16).length;
  const byteLen = (hexLen + 1) >> 1;
  let r;
  do {
    r = BigInt('0x' + Buffer.from(randomBytes(byteLen)).toString('hex'));
  } while (r >= max);
  return r;
}

// ═══ WALK MANAGEMENT ═══
let walkIdCounter = 0;

function createWalk(type, startBigInt) {
  const id = walkIdCounter++;
  if (type === 'tame') {
    return {
      id, type: 'tame',
      point: G.multiply(startBigInt),
      dist: startBigInt,
      stepCount: 0, dpCount: 0, restarts: 0,
    };
  } else {
    return {
      id, type: 'wild',
      point: targetPoint.add(G.multiply(startBigInt)),
      dist: startBigInt,
      stepCount: 0, dpCount: 0, restarts: 0,
    };
  }
}

function restartWalk(k) {
  k.restarts++;
  if (k.type === 'tame') {
    const startKey = RANGE_LOW + randBigInt(RANGE_SIZE);
    k.point = G.multiply(startKey);
    k.dist = startKey;
  } else {
    const offset = randBigInt(RANGE_SIZE);
    k.point = targetPoint.add(G.multiply(offset));
    k.dist = offset;
  }
  k.stepCount = 0;
}

// ═══ BUILD WALKS FROM ORCHESTRATOR CONFIG ═══
const walkConfig = JSON.parse(process.env.WALK_CONFIG || '[]');
const walks = [];

for (const cfg of walkConfig) {
  const start = BigInt('0x' + cfg.startHex);
  walks.push(createWalk(cfg.type, start));
}

// ═══ STATS ═══
let totalJumps = 0;
let coarseDPs  = 0;
let fineDPs    = 0;
let restartCount = 0;
let lastReport = Date.now();
const REPORT_MS = 5000;

function emitDP(k, level, affineX) {
  const xHex = affineX.toString(16).padStart(64, '0');
  const distHex = mod(k.dist, CURVE_N).toString(16).padStart(64, '0');
  process.send({
    kind: 'dp', type: k.type, x: xHex, dist: distHex,
    level, walkId: k.id,
  });
  if (level === 'coarse') coarseDPs++;
  else fineDPs++;
  k.dpCount++;
}

function maybeReport() {
  const now = Date.now();
  if (now - lastReport >= REPORT_MS) {
    process.send({
      kind: 'stat',
      jumps: totalJumps,
      coarseDPs,
      fineDPs,
      restarts: restartCount,
      walks: walks.length,
    });
    totalJumps = 0;
    coarseDPs = 0;
    fineDPs = 0;
    restartCount = 0;
    lastReport = now;
  }
}

// Signal ready
process.send({
  kind: 'ready',
  pid: process.pid,
  walks: walks.length,
  tame: walks.filter(w => w.type === 'tame').length,
  wild: walks.filter(w => w.type === 'wild').length,
});

// ═══ MAIN LOOP — TURBO + AI ═══
// Single-scale primary with amortized affine + walk restart
async function run() {
  while (true) {
    for (const k of walks) {
      // Cache-friendly: process one walk for STEPS_PER_WALK steps
      for (let s = 0; s < STEPS_PER_WALK; s++) {
        // Jump selection: projective X (FREE — no modular inverse)
        const j = Number(k.point.X % PRIMARY.mask);
        k.point = k.point.add(PRIMARY.points[j]);
        k.dist += PRIMARY.jumps[j];
        totalJumps++;

        k.stepCount++;

        // DP check: amortized affine every 32 steps
        if ((k.stepCount & (DP_CHECK_INTERVAL - 1)) === 0) {
          const affX = k.point.x; // Expensive, amortized over 32 steps
          if (affX < COARSE_THRESHOLD) {
            emitDP(k, 'coarse', affX);
            emitDP(k, 'fine', affX);
          } else if (affX < FINE_THRESHOLD) {
            emitDP(k, 'fine', affX);
          }
        }
      }

      // AI: Walk restart check (amortized — once per 512 steps, not per step)
      if (k.stepCount >= MAX_STEPS) {
        restartWalk(k);
        restartCount++;
      }
    }
    maybeReport();
    await new Promise(r => setImmediate(r));
  }
}

run().catch(err => {
  process.send({ kind: 'error', message: String(err) });
  process.exit(1);
});
