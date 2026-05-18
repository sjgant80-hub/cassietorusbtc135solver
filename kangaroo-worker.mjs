// ◊·κ=1 — BIG CASSIE kangaroo worker
// Pollard's Kangaroo for BTC Puzzle #135 (134-bit range)
// φ-ratio jump strategy with proper range-scaled distances

import elliptic from 'elliptic';
import BN from 'bn.js';
import { randomBytes } from 'crypto';

const { ec: EC } = elliptic;
const ec = new EC('secp256k1');
const n = ec.curve.n;
const G = ec.curve.g;

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = ec.keyFromPublic(TARGET_PUBKEY, 'hex').getPublic();

// 135-bit range: priv in [2^134, 2^135 - 1]
const RANGE_LOW  = new BN('4000000000000000000000000000000000', 16);  // 2^134
const RANGE_HIGH = new BN('7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16); // 2^135 - 1
const RANGE_SIZE = RANGE_HIGH.sub(RANGE_LOW).addn(1);                // 2^134
const RANGE_HALF = RANGE_SIZE.shrn(1);
const RANGE_QTR  = RANGE_SIZE.shrn(2);

// ═══ JUMP TABLE ═══
// For Pollard's Kangaroo on a W-bit range, optimal mean jump ≈ √W ≈ 2^(W/2).
// Range = 2^134, so mean jump ≈ 2^67.
// Standard: JUMPS[j] = 2^(j + base), with base chosen so the mean ≈ 2^67.
// Mean of geometric series {2^base, ..., 2^(base+31)} ≈ 2^(base+31) / 32 = 2^(base+26).
// Set base+26 = 67 → base = 41.
// Result: jumps from 2^41 (~2T) to 2^72, mean ≈ 2^67. ◊·κ=1
const NUM_JUMPS = 32;
const JUMP_MASK = NUM_JUMPS - 1;
const TWO = new BN(2);
const JUMPS = [];
for (let j = 0; j < NUM_JUMPS; j++) {
  JUMPS.push(TWO.pow(new BN(j + 41)));
}

// Pre-compute jump points: JUMP_POINTS[j] = JUMPS[j] · G
// These are computed once at startup (takes a few seconds for large scalars).
const JUMP_POINTS = JUMPS.map(d => G.mul(d));

// ═══ DISTINGUISHED POINTS ═══
// DP_BITS leading zero bits in x-coordinate → ~1 in 2^DP_BITS points is a DP.
// 22 bits → ~1 in 4M steps. Good balance of storage vs. detection rate.
const DP_BITS       = parseInt(process.env.DP_BITS || '22', 10);
const DP_FULL_BYTES = DP_BITS >> 3;
const DP_REM_BITS   = DP_BITS & 7;
const DP_REM_MASK   = DP_REM_BITS > 0 ? (0xFF << (8 - DP_REM_BITS)) & 0xFF : 0;

function isDP(xBytes) {
  for (let i = 0; i < DP_FULL_BYTES; i++) if (xBytes[i] !== 0) return false;
  if (DP_REM_BITS > 0 && (xBytes[DP_FULL_BYTES] & DP_REM_MASK) !== 0) return false;
  return true;
}

function randBN(maxBN) {
  const len = maxBN.byteLength();
  let r;
  do { r = new BN(randomBytes(len)); } while (r.gte(maxBN));
  return r;
}

function getXBytes(point) {
  return point.getX().toArray('be', 32);
}

// ═══ KANGAROO FACTORY ═══
// Tame: starts at known scalar in [rangeLow + rangeQtr, rangeLow + 3*rangeQtr]
// Wild: starts at targetPoint + random offset, distance tracked in accum
function newTame() {
  const startPriv = RANGE_LOW.add(RANGE_QTR).add(randBN(RANGE_HALF));
  const point = G.mul(startPriv);
  return { type: 'tame', point, log: startPriv, xb: getXBytes(point) };
}

function newWild() {
  const offset = randBN(RANGE_SIZE);
  const point = targetPoint.add(G.mul(offset));
  return { type: 'wild', point, accum: offset, xb: getXBytes(point) };
}

// ═══ WALKER POOL ═══
const NUM_WALKS = parseInt(process.env.WALKS_PER_WORKER || '8', 10);
const walkers = [];
for (let i = 0; i < NUM_WALKS; i++) {
  walkers.push(i % 2 === 0 ? newTame() : newWild());
}

let totalJumps = 0;
let dpCount    = 0;
let lastReport = Date.now();
const REPORT_MS = 5000;

function step(k) {
  const j = k.xb[31] & JUMP_MASK;
  k.point = k.point.add(JUMP_POINTS[j]);
  if (k.type === 'tame') k.log   = k.log.add(JUMPS[j]);
  else                   k.accum = k.accum.add(JUMPS[j]);
  k.xb = getXBytes(k.point);
  totalJumps++;
}

function emitDP(k) {
  dpCount++;
  const xHex = Buffer.from(k.xb).toString('hex');
  const dist = (k.type === 'tame' ? k.log : k.accum).umod(n).toString(16, 64);
  process.send({ kind: 'dp', type: k.type, x: xHex, dist });
}

function maybeReport() {
  const now = Date.now();
  if (now - lastReport >= REPORT_MS) {
    process.send({ kind: 'stat', jumps: totalJumps, dps: dpCount });
    totalJumps = 0; dpCount = 0; lastReport = now;
  }
}

process.send({ kind: 'ready', pid: process.pid, walks: walkers.length });

async function run() {
  while (true) {
    for (let iter = 0; iter < 200; iter++) {
      for (const k of walkers) {
        step(k);
        if (isDP(k.xb)) emitDP(k);
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
