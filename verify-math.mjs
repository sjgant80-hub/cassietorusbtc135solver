import { Point } from '@noble/secp256k1';
import { randomBytes } from 'crypto';

const G = Point.BASE;
const CURVE_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m) => { fail++; console.log(`  ✗ ${m}`); };

function mod(a, m) { const r = a % m; return r < 0n ? r + m : r; }

function randBigInt(max) {
  const hexLen = max.toString(16).length;
  const byteLen = (hexLen + 1) >> 1;
  let r;
  do { r = BigInt('0x' + Buffer.from(randomBytes(byteLen)).toString('hex')); }
  while (r >= max);
  return r;
}

console.log('◊·κ=1  EC math verification (noble-secp256k1)\n');

// 1. Pubkey round-trip
const Q = Point.fromHex(TARGET_PUBKEY);
Q.toHex() === TARGET_PUBKEY
  ? ok('target pubkey round-trip')
  : bad('target pubkey round-trip');

// 2. Generator order: (n−1)·G + G == identity
G.multiply(CURVE_N - 1n).add(G).equals(Point.ZERO)
  ? ok('(n-1)·G + G is identity')
  : bad('(n-1)·G + G is NOT identity');

// 3. Walk additivity: k·G + s·G == (k+s)·G
const RANGE_LOW = 0x4000000000000000000000000000000000n;
const RANGE_SZ  = 0x4000000000000000000000000000000000n;
let walkOk = true;
for (let trial = 0; trial < 5; trial++) {
  const k = RANGE_LOW + randBigInt(RANGE_SZ);
  const s = BigInt(Math.max(1, Math.round(Math.pow(2, trial * 1.618))));
  const lhs = G.multiply(k).add(G.multiply(s));
  const rhs = G.multiply(k + s);
  if (!lhs.equals(rhs)) { walkOk = false; break; }
}
walkOk ? ok('walk additivity over 5 trials')
       : bad('walk additivity FAILED');

// 4. Negation: P + (−P) == identity
const k4 = 1n + randBigInt(CURVE_N - 2n);
const P4 = G.multiply(k4);
P4.add(P4.negate()).equals(Point.ZERO)
  ? ok('point + negate(point) is identity')
  : bad('point negation mismatch');

// 5. Synthetic kangaroo collision recovery
{
  const priv = 0xdeadbeefcafef00ddeadbeefcafef00dn;
  const Qp   = G.multiply(priv);
  const L = priv + 12345n;
  const W = 12345n;
  const recovered = mod(L - W, CURVE_N);
  recovered === priv && G.multiply(recovered).equals(Qp)
    ? ok('synthetic recovery: priv = L − W')
    : bad('synthetic recovery FAILED');
}

// 6. Negation-case recovery: priv = −L − W
{
  const priv = 0xdeadbeefcafef00ddeadbeefcafef00dn;
  const Qp   = G.multiply(priv);
  const L = mod(-priv - 7777n, CURVE_N);
  const W = 7777n;
  const recovered = mod(-L - W, CURVE_N);
  recovered === priv && G.multiply(recovered).equals(Qp)
    ? ok('negation-case recovery: priv = −L − W')
    : bad('negation-case recovery FAILED');
}

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
