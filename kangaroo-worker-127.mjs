// ◊·κ=1 — BIG CASSIE 127-Agent Kangaroo Worker
// Accepts WALK_CONFIG from orchestrator: array of 'tame'|'wild' assignments
// Each walk is one kangaroo agent from the MACCubeFACE(127) topology

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

// ═══ RANGE ═══
// 135-bit puzzle: priv ∈ [2^134, 2^135 − 1]
const RANGE_LOW  = new BN('4000000000000000000000000000000000', 16);
const RANGE_HIGH = new BN('7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16);
const RANGE_SIZE = RANGE_HIGH.sub(RANGE_LOW).addn(1);
const RANGE_HALF = RANGE_SIZE.shrn(1);
const RANGE_QTR  = RANGE_SIZE.shrn(2);

// ═══ JUMP TABLE ═══
// Properly scaled for 134-bit range: jumps 2^41 to 2^72, mean ≈ 2^67 = √range
const NUM_JUMPS = 32;
const JUMP_MASK = NUM_JUMPS - 1;
const TWO = new BN(2);
const JUMPS = [];
for (let j = 0; j < NUM_JUMPS; j++) {
  JUMPS.push(TWO.pow(new BN(j + 41)));
}
const JUMP_POINTS = JUMPS.map(d => G.mul(d));

// ═══ DISTINGUISHED POINTS ═══
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

// ═══ WALK CONFIG ═══
// Orchestrator sends an array of types: ['wild','wild','tame','wild',...]
// Each entry becomes one kangaroo walk
const walkConfig = JSON.parse(process.env.WALK_CONFIG || '[]');
const walkers = [];

if (walkConfig.length === 0) {
  // Fallback: default 8 alternating walks
  for (let i = 0; i < 8; i++) {
    walkers.push(i % 2 === 0 ? newTame() : newWild());
  }
} else {
  for (const type of walkConfig) {
    walkers.push(type === 'tame' ? newTame() : newWild());
  }
}

// ═══ MAIN LOOP ═══
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
