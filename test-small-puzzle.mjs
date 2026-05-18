// ◊·κ=1 — End-to-end Kangaroo verification on Puzzle #30
// Known answer: private key = 0x3D94CD64
// 30-bit range: [2^29, 2^30 - 1] — should solve in < 1 second

import elliptic from 'elliptic';
import BN from 'bn.js';
import { randomBytes } from 'crypto';

const { ec: EC } = elliptic;
const ec = new EC('secp256k1');
const n = ec.curve.n;
const G = ec.curve.g;

// Puzzle #30 — known solution
const KNOWN_KEY = new BN('3D94CD64', 16);
const targetPoint = G.mul(KNOWN_KEY);  // compute pubkey from known key
const TARGET_HEX = targetPoint.encode('hex', true);

const RANGE_LOW  = new BN(1).shln(29);   // 2^29
const RANGE_HIGH = new BN(1).shln(30).subn(1);  // 2^30 - 1
const RANGE_SIZE = RANGE_HIGH.sub(RANGE_LOW).addn(1);
const RANGE_HALF = RANGE_SIZE.shrn(1);
const RANGE_QTR  = RANGE_SIZE.shrn(2);

// Jump table: for 30-bit range, mean jump ≈ 2^15
// base = 0 (jumps from 2^0 to 2^31 — we only need small ones)
// Actually: optimal mean ≈ √(2^29) = 2^14.5
// Use jumps 2^j for j=0..15, mean ≈ 2^15/16 = 2^11 — close enough
const NUM_JUMPS = 16;
const JUMP_MASK = NUM_JUMPS - 1;
const TWO = new BN(2);
const JUMPS = [];
for (let j = 0; j < NUM_JUMPS; j++) {
  JUMPS.push(TWO.pow(new BN(j)));
}
const JUMP_POINTS = JUMPS.map(d => G.mul(d));

// No DP method for small test — just store all points
const dpMap = new Map(); // x_hex → { type, dist }

function randBN(maxBN) {
  const len = maxBN.byteLength();
  let r;
  do { r = new BN(randomBytes(Math.max(len, 4))); r = r.umod(maxBN); } while (r.isZero());
  return r;
}

function getXHex(point) {
  return point.getX().toString(16, 64);
}

function newTame() {
  const startPriv = RANGE_LOW.add(RANGE_QTR).add(randBN(RANGE_HALF));
  const point = G.mul(startPriv);
  return { type: 'tame', point, log: startPriv, xh: getXHex(point) };
}

function newWild() {
  const offset = randBN(RANGE_SIZE);
  const point = targetPoint.add(G.mul(offset));
  return { type: 'wild', point, accum: offset, xh: getXHex(point) };
}

// 8 walkers (4 tame, 4 wild)
const walkers = [];
for (let i = 0; i < 8; i++) {
  walkers.push(i % 2 === 0 ? newTame() : newWild());
}

let steps = 0;
let solved = false;
let foundKey = null;
const t0 = Date.now();

// Use DP with 10-bit threshold for this small test
const DP_BITS = 10;

function isDP(xh) {
  // Check first DP_BITS/4 hex chars are '0'
  const hexChars = Math.floor(DP_BITS / 4);
  for (let i = 0; i < hexChars; i++) if (xh[i] !== '0') return false;
  return true;
}

while (!solved && steps < 5_000_000) {
  for (const k of walkers) {
    const j = parseInt(k.xh.slice(-1), 16) & JUMP_MASK;
    k.point = k.point.add(JUMP_POINTS[j]);
    if (k.type === 'tame') k.log   = k.log.add(JUMPS[j]);
    else                   k.accum = k.accum.add(JUMPS[j]);
    k.xh = getXHex(k.point);
    steps++;

    if (isDP(k.xh)) {
      const existing = dpMap.get(k.xh);
      if (existing && existing.type !== k.type) {
        // Collision! Recover key.
        const tame = existing.type === 'tame' ? existing : { dist: k.type === 'tame' ? k.log : k.accum };
        const wild = existing.type === 'wild' ? existing : { dist: k.type === 'wild' ? k.accum : k.log };
        const tameObj = existing.type === 'tame' ? existing : k;
        const wildObj = existing.type === 'wild' ? existing : k;
        const tameLog = new BN(tameObj.type === 'tame' ? (tameObj.dist || tameObj.log) : (tameObj.dist || tameObj.accum), 16);
        const wildAcc = new BN(wildObj.type === 'wild' ? (wildObj.dist || wildObj.accum) : (wildObj.dist || wildObj.log), 16);

        const tDist = k.type === 'tame' ? k.log : new BN(existing.dist, 16);
        const wDist = k.type === 'wild' ? k.accum : new BN(existing.dist, 16);

        const candidates = [
          tDist.sub(wDist).umod(n),
          tDist.neg().sub(wDist).umod(n),
        ];
        for (const cand of candidates) {
          if (cand.isZero()) continue;
          try {
            const test = G.mul(cand);
            if (test.eq(targetPoint)) {
              foundKey = cand;
              solved = true;
              break;
            }
          } catch {}
        }
      }
      if (!solved) {
        dpMap.set(k.xh, {
          type: k.type,
          dist: (k.type === 'tame' ? k.log : k.accum).toString(16),
        });
      }
    }
    if (solved) break;
  }
}

const elapsed = Date.now() - t0;
console.log('◊·κ=1 — Puzzle #30 Kangaroo End-to-End Test');
console.log('─'.repeat(45));
console.log(`target pubkey: ${TARGET_HEX}`);
console.log(`known key:     0x${KNOWN_KEY.toString(16)}`);

if (solved && foundKey) {
  const match = foundKey.eq(KNOWN_KEY);
  console.log(`found key:     0x${foundKey.toString(16)}`);
  console.log(`match:         ${match ? '✓ CORRECT' : '✗ MISMATCH'}`);
  console.log(`steps:         ${steps.toLocaleString()}`);
  console.log(`DPs stored:    ${dpMap.size}`);
  console.log(`time:          ${elapsed}ms`);
  console.log(`rate:          ${Math.round(steps / (elapsed / 1000)).toLocaleString()} steps/s`);
  if (match) {
    console.log('\n✓ Kangaroo algorithm verified end-to-end.');
    console.log('  Jump → DP → Collision → Recovery pipeline: WORKING');
    process.exit(0);
  } else {
    console.log('\n✗ Key mismatch — recovery logic has a bug.');
    process.exit(1);
  }
} else {
  console.log(`FAILED — no collision after ${steps.toLocaleString()} steps (${elapsed}ms)`);
  console.log(`DPs stored: ${dpMap.size}`);
  process.exit(1);
}
