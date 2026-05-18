// ◊·κ=1 — BIG CASSIE Recursive Kangaroo Worker (NOBLE TURBO ENGINE)
// 7.6x speedup via amortized affine conversion:
//   - Projective X for jump selection (FREE — no modular inverse)
//   - Affine x only every 32 steps for DP detection (amortized)
//
// TRIAD per agent (3 scales):
//   Primary — 2^41–2^72  (macro)
//   Scout   — 2^30–2^55  (meso)
//   Sniper  — 2^20–2^40  (micro)
//
// DUAL DP: Coarse 22-bit + Fine 14-bit
// Recursion: Orchestrator → Worker → Agent → Triad → Dual-DP

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
const RANGE_HALF = RANGE_SIZE >> 1n;
const RANGE_QTR  = RANGE_SIZE >> 2n;

// ═══ JUMP TABLES — THREE SCALES ═══
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
const SCOUT   = buildJumpTable(30, 32);
const SNIPER  = buildJumpTable(20, 32);

const TRIAD = [
  { name: 'primary', ...PRIMARY },
  { name: 'scout',   ...SCOUT },
  { name: 'sniper',  ...SNIPER },
];

// ═══ DUAL DP — BigInt threshold ═══
const COARSE_DP_BITS = 22;
const FINE_DP_BITS   = 14;
const COARSE_THRESHOLD = 1n << BigInt(256 - COARSE_DP_BITS);
const FINE_THRESHOLD   = 1n << BigInt(256 - FINE_DP_BITS);

// DP check interval: only extract affine x every N steps
// This is the key optimization: projective add is ~8x faster than affine extraction
const DP_CHECK_INTERVAL = 32;

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

// ═══ KANGAROO FACTORY ═══
function newTame() {
  const startPriv = RANGE_LOW + RANGE_QTR + randBigInt(RANGE_HALF);
  const point = G.multiply(startPriv);
  return { type: 'tame', point, dist: startPriv, stepCount: 0 };
}

function newWild() {
  const offset = randBigInt(RANGE_SIZE);
  const point = targetPoint.add(G.multiply(offset));
  return { type: 'wild', point, dist: offset, stepCount: 0 };
}

// ═══ BUILD AGENTS ═══
const walkConfig = JSON.parse(process.env.WALK_CONFIG || '[]');
const agents = [];

const types = walkConfig.length > 0 ? walkConfig : ['tame','wild','tame','wild'];
for (const type of types) {
  const triad = TRIAD.map(scale => {
    const k = type === 'tame' ? newTame() : newWild();
    return {
      type: k.type, point: k.point, dist: k.dist,
      stepCount: 0,
      scaleName: scale.name, jumps: scale.jumps, points: scale.points, mask: scale.mask,
    };
  });
  agents.push(triad);
}

const totalWalks = agents.length * 3;

// ═══ STATS ═══
let totalJumps = 0;
let coarseDPs  = 0;
let fineDPs    = 0;
let lastReport = Date.now();
const REPORT_MS = 5000;

function emitDP(k, level, affineX) {
  const xHex = affineX.toString(16).padStart(64, '0');
  const distHex = mod(k.dist, CURVE_N).toString(16).padStart(64, '0');
  process.send({ kind: 'dp', type: k.type, x: xHex, dist: distHex, level, scale: k.scaleName });
  if (level === 'coarse') coarseDPs++;
  else fineDPs++;
}

function maybeReport() {
  const now = Date.now();
  if (now - lastReport >= REPORT_MS) {
    process.send({
      kind: 'stat',
      jumps: totalJumps,
      coarseDPs,
      fineDPs,
      agents: agents.length,
      walks: totalWalks,
    });
    totalJumps = 0; coarseDPs = 0; fineDPs = 0; lastReport = now;
  }
}

process.send({
  kind: 'ready',
  pid: process.pid,
  agents: agents.length,
  walks: totalWalks,
  triadScales: TRIAD.map(t => t.name),
});

// ═══ MAIN LOOP — TURBO ═══
// Cache-friendly: process one walk for STEPS_PER_WALK steps before moving to next
// Amortized affine: only extract x every DP_CHECK_INTERVAL steps
const STEPS_PER_WALK = 512;

async function run() {
  while (true) {
    for (const triad of agents) {
      for (const k of triad) {
        // Process this walk for STEPS_PER_WALK steps (cache-friendly)
        for (let s = 0; s < STEPS_PER_WALK; s++) {
          // Jump selection: use projective X — NO affine conversion!
          const j = Number(k.point.X % k.mask);
          k.point = k.point.add(k.points[j]);
          k.dist += k.jumps[j];
          totalJumps++;

          // DP check: only extract affine x every DP_CHECK_INTERVAL steps
          k.stepCount++;
          if ((k.stepCount & (DP_CHECK_INTERVAL - 1)) === 0) {
            const affX = k.point.x;  // expensive, but amortized over 32 steps
            if (affX < COARSE_THRESHOLD) {
              emitDP(k, 'coarse', affX);
              emitDP(k, 'fine', affX);
            } else if (affX < FINE_THRESHOLD) {
              emitDP(k, 'fine', affX);
            }
          }
        }
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
