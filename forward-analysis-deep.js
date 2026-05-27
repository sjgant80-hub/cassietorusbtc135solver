// ◊·κ DEEP MINING · pull every signal we can from solved keys + unsolved addresses
//                    specifically tuned to predict puzzle 135

const SOLVED = {
  1:'1',2:'3',3:'7',4:'8',5:'15',6:'31',7:'4c',8:'e0',9:'1d3',10:'202',
  11:'483',12:'a7b',13:'1460',14:'2930',15:'68f3',16:'c936',17:'1764f',18:'3080d',19:'5749f',20:'d2c55',
  21:'1ba534',22:'2de40f',23:'556e52',24:'dc2a04',25:'1fa5ee5',26:'340326e',27:'6ac3875',28:'d916ce8',29:'17e2551e',30:'3d94cd64',
  31:'7d4fe747',32:'b862a62e',33:'1a96ca8d8',34:'34a65911d',35:'4aed21170',36:'9de820a7c',37:'1757756a93',38:'22382facd0',39:'4b5f8303e9',40:'e9ae4933d6',
  41:'153869acc5b',42:'2a221c58d8f',43:'6bd3b27c591',44:'e02b35a358f',45:'122fca143c05',46:'2ec18388d544',47:'6cd610b53cba',48:'ade6d7ce3b9b',49:'174176b015f4d',50:'22bd43c2e9354',
  51:'75070a1a009d4',52:'efae164cb9e3c',53:'180788e47e326c',54:'236fb6d5ad1f43',55:'6abe1f9b67e114',56:'9d18b63ac4ffdf',57:'1eb25c90795d61c',58:'2c675b852189a21',59:'7496cbb87cab44f',60:'fc07a1825367bbe',
  61:'13c96a3742f64906',62:'363d541eb611abee',63:'7cce5efdaccf6808',64:'f7051f27b09112d4',65:'1a838b13505b26867',66:'2832ed74f2b5e35ee',67:'730fc235c1942c1ae',68:'bebb3940cd0fc1491',69:'101d83275fb2bc7e0c',70:'349b84b6431a6c4ef1',
  75:'4c5ce114686a1336e07',80:'ea1a5c66dcc11b5ad180',85:'11720c4f018d51b8cebba8',90:'2ce00bb2136a445c71e85bf',95:'527a792b183c7f64a0e8b1f4',
  100:'af55fc59c335c8ec67ed24826',105:'16f14fc2054cd87ee6396b33df3',110:'35c0d7234df7deb0f20cf7062444',115:'60f4d11574f5deee49961d9609ac6',120:'b10f22572c497a836ea187f2e1fc23',
  125:'1c533b6bb7f0804e09960225e44877ac',130:'33e7665705359f04f28b88cf897c603c9'
};

// Unsolved addresses (132-150 + 155, 160)
const UNSOLVED_ADDRS = {
  131:'16zRPnT8znwq42q7XeMkZUhb1bKqgRogyy',
  132:'1KrU4dHE5WrW8rhWDsTRjR21r8t3dsrS3R',
  133:'17uDfp5r4n441xkgLFmhNoSW1KWp6xVLDU',
  134:'13A3JrvXmvg5w9XGvyyR4JEJqiLz8ZySY3',
  135:'16RGFo6hjq9ym6Pj7N5H7L1NR1rVPJyw2v',
  136:'1UDHPdovvR985NrWSkdWQDEQ1xuRiTALq',
  137:'15nf31J46iLuK1ZkTnqHo7WgN5cARFK3RA',
  138:'1Ab4vzG6wEQBDNQM1B2bvUz4fqXXdFk2WT',
  139:'1Fz63c775VV9fNyj25d9Xfw3YHE6sKCxbt',
  140:'1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo',
  145:'19GpszRNUej5yYqxXoLnbZWKew3KdVLkXg',
  150:'1MUJSJYtGPVGkBCTqGspnxyHahpt5Te8jy',
  155:'1AoeP37TmHdFh8uN72fu9AqgtLrUwcv2wJ',
  160:'1NBC8uXJy1GiJ6drkiZa1WuKn51ps7EPTv'
};

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58dec(s) {
  let bi = 0n;
  for (const c of s) { const i = ALPHABET.indexOf(c); if (i<0) throw Error('bad '+c); bi = bi*58n+BigInt(i); }
  let lead = 0; for (const c of s) { if (c==='1') lead++; else break; }
  let hex = bi.toString(16); if (hex.length%2) hex = '0'+hex;
  hex = '00'.repeat(lead) + hex; return hex;
}
function addrToHash160(a) { return b58dec(a).slice(2, 42); }

console.log('═══════════════════════════════════════════════════════════════');
console.log('◊·κ DEEP MINING · clues for puzzle 135');
console.log('═══════════════════════════════════════════════════════════════');

// ── Build solved-key rows with raw bits ──
function uOf(N, k) {
  const low = 1n << BigInt(N-1);
  const sz = low;
  const off = k - low;
  if (off < 0n || off >= sz) return null;
  const denomBits = N - 1;
  if (denomBits <= 50) return Number(off) / Number(sz);
  const shift = BigInt(denomBits - 50);
  return Number(off >> shift) / Number(sz >> shift);
}
const rows = [];
for (const [n, hex] of Object.entries(SOLVED)) {
  const N = +n; if (N < 8) continue;
  const k = BigInt('0x' + hex);
  rows.push({ n: N, k, u: uOf(N, k), hex });
}
rows.sort((a,b) => a.n - b.n);

// ────────────────────────────────────────────────────────
// SIGNAL 1 · u-sequence trajectory toward 135
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 1 · trajectory toward 135 (last 10 solves) ──');
const tail = rows.slice(-10);
for (const r of tail) console.log('  puzzle ' + r.n + ' · u=' + r.u.toFixed(4));
const tailU = tail.map(r => r.u);
const tailMean = tailU.reduce((a,b)=>a+b,0) / tailU.length;
console.log('  trailing-10 mean u: ' + tailMean.toFixed(3));
// Diff with neighbours
const diffs = []; for (let i = 1; i < tail.length; i++) diffs.push(tail[i].u - tail[i-1].u);
console.log('  trailing differences: ' + diffs.map(d=>d.toFixed(2)).join(', '));
console.log('  mean Δu: ' + (diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(3));

// ────────────────────────────────────────────────────────
// SIGNAL 2 · bit-position bias in offset-from-range
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 2 · bit-position bias in offset-from-range_low ──');
// For each solved puzzle N, compute offset = k - 2^(N-1)
// then look at bit i (counting from LSB) — fraction of keys with bit set
const MAX_BIT = 100;
const bitOneCount = new Array(MAX_BIT).fill(0);
const bitTotal   = new Array(MAX_BIT).fill(0);
for (const r of rows) {
  const off = r.k - (1n << BigInt(r.n - 1));
  for (let i = 0; i < r.n - 1; i++) {
    if (i >= MAX_BIT) break;
    bitTotal[i]++;
    if (((off >> BigInt(i)) & 1n) === 1n) bitOneCount[i]++;
  }
}
// Report bits with >1.4x or <0.6x deviation
const biased = [];
for (let i = 0; i < MAX_BIT; i++) {
  if (bitTotal[i] < 20) continue;  // need enough samples
  const frac = bitOneCount[i] / bitTotal[i];
  if (frac > 0.65 || frac < 0.35) biased.push({i, frac, n: bitTotal[i]});
}
console.log('  Bit positions with strong bias (>65% or <35% set across N=' + bitTotal[0] + ' samples):');
if (biased.length === 0) console.log('    none — bits look uniform (no obvious RNG seed pattern)');
else for (const b of biased.slice(0, 12)) console.log('    bit ' + b.i + ': ' + (b.frac*100).toFixed(1) + '% one (n=' + b.n + ')');

// ────────────────────────────────────────────────────────
// SIGNAL 3 · last-nibble distribution
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 3 · last hex nibble of solved keys ──');
const nibCount = new Array(16).fill(0);
for (const r of rows) {
  const lastNib = Number(r.k & 0xFn);
  nibCount[lastNib]++;
}
const expNib = rows.length / 16;
const hotNibs = nibCount.map((c,i)=>({i,c})).filter(x=>x.c >= expNib*1.5).sort((a,b)=>b.c-a.c);
console.log('  Expected per nibble: ' + expNib.toFixed(2));
hotNibs.forEach(h => console.log('    nibble 0x' + h.i.toString(16) + ': ' + h.c));
if (hotNibs.length === 0) console.log('    no strong last-nibble bias');

// ────────────────────────────────────────────────────────
// SIGNAL 4 · target-address hash160 leading nibble distribution
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 4 · hash160 leading-nibble across all puzzle addresses ──');
const allAddrs = Object.entries(UNSOLVED_ADDRS).concat(
  Object.entries(SOLVED).filter(([n])=>+n>=70).map(([n,_])=>{
    // We don't have addresses for some solved · skip
    return null;
  }).filter(x=>x)
);
const leadingNibCount = new Array(16).fill(0);
for (const [, addr] of Object.entries(UNSOLVED_ADDRS)) {
  const h = addrToHash160(addr);
  const nib = parseInt(h[0], 16);
  leadingNibCount[nib]++;
}
const unsolvedN = Object.keys(UNSOLVED_ADDRS).length;
console.log('  Across ' + unsolvedN + ' unsolved puzzle addresses · hash160 leading nibble:');
for (let i = 0; i < 16; i++) {
  if (leadingNibCount[i] > 0) console.log('    0x' + i.toString(16) + ': ' + leadingNibCount[i]);
}

// ────────────────────────────────────────────────────────
// SIGNAL 5 · puzzle 135 address specifically · what makes it unique
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 5 · puzzle 135 address fingerprint ──');
const h135 = addrToHash160('16RGFo6hjq9ym6Pj7N5H7L1NR1rVPJyw2v');
console.log('  hash160: ' + h135);
console.log('  leading nibble: ' + h135[0]);
console.log('  trailing nibble: ' + h135[h135.length-1]);
console.log('  byte sum mod 256: ' + (parseInt(h135.match(/../g).reduce((s,b)=>s+parseInt(b,16),0)) % 256));
// Bits mod our spine primes
const h135bi = BigInt('0x' + h135);
for (const p of [2,3,5,7,11,13,17,19,31,127,257]) {
  console.log('    h160 mod ' + p + ' = ' + Number(h135bi % BigInt(p)));
}
// First bytes of 135 hash160 in [0,1)
const h135u = parseInt(h135.slice(0,12), 16) / Math.pow(2, 48);
console.log('  h160 normalised (top 48 bits / 2^48): ' + h135u.toFixed(6));
console.log('  distance to κ:       ' + Math.abs(h135u - 0.618).toFixed(4));
console.log('  distance to tritone: ' + Math.abs(h135u - 0.7071).toFixed(4));
console.log('  distance to witness: ' + Math.abs(h135u - 0.3174).toFixed(4));

// ────────────────────────────────────────────────────────
// SIGNAL 6 · puzzle 130 trajectory + extrapolation
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 6 · last 5 solves projected forward to 135 ──');
// Look at u for N = 110, 115, 120, 125, 130 (the 5N solves)
const fiveN = rows.filter(r => r.n === 110 || r.n === 115 || r.n === 120 || r.n === 125 || r.n === 130);
fiveN.forEach(r => console.log('  ' + r.n + ': u=' + r.u.toFixed(4)));
const fnU = fiveN.map(r=>r.u);
const fnMean = fnU.reduce((a,b)=>a+b,0) / fnU.length;
console.log('  mean: ' + fnMean.toFixed(3));
const fnStd = Math.sqrt(fnU.reduce((s,u)=>s+(u-fnMean)**2,0) / fnU.length);
console.log('  stddev: ' + fnStd.toFixed(3));
console.log('  → if 135 follows the same distribution, expect u_135 ∈ ['
  + Math.max(0, fnMean - fnStd).toFixed(2) + ', '
  + Math.min(1, fnMean + fnStd).toFixed(2) + '] with 68% confidence');

// ────────────────────────────────────────────────────────
// SIGNAL 7 · expected key range for 135 from this constrained prediction
// ────────────────────────────────────────────────────────
const low135 = 1n << 134n;
const sz135  = low135;
function pct135(p) {
  const SCALE = 1n << 40n;
  const pp = BigInt(Math.floor(p * Math.pow(2, 40)));
  return low135 + (pp * sz135) / SCALE;
}
console.log();
console.log('── SIGNAL 7 · CONSTRAINED 68% confidence range for puzzle 135 key ──');
const lo = Math.max(0, fnMean - fnStd);
const hi = Math.min(1, fnMean + fnStd);
console.log('  Lower: 0x' + pct135(lo).toString(16));
console.log('  Upper: 0x' + pct135(hi).toString(16));
console.log('  Width: 2^' + Math.log2((hi-lo) * Number(sz135)).toFixed(1) + ' keys (vs 2^134 full range)');
console.log('  Reduction: ' + (1/(hi-lo)).toFixed(1) + 'x smaller search space than uniform');

// ────────────────────────────────────────────────────────
// SIGNAL 8 · autocorrelation in u sequence (lag 1, 2, 3)
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 8 · u-sequence autocorrelation (looking for RNG fingerprint) ──');
const uSeq = rows.map(r => r.u);
function autocorr(seq, lag) {
  const mean = seq.reduce((a,b)=>a+b,0) / seq.length;
  let num = 0, den = 0;
  for (let i = 0; i < seq.length - lag; i++) num += (seq[i] - mean) * (seq[i+lag] - mean);
  for (let i = 0; i < seq.length; i++) den += (seq[i] - mean) ** 2;
  return num / den;
}
for (let lag = 1; lag <= 6; lag++) {
  const r = autocorr(uSeq, lag);
  const sig = Math.abs(r) > 0.2 ? ' *** signal' : '';
  console.log('  lag ' + lag + ': r=' + r.toFixed(3) + sig);
}

// ────────────────────────────────────────────────────────
// SIGNAL 9 · κ-fold residue of solved keys (k mod 510510 / 510510 in u-space)
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 9 · keys mod primorial-7 (510510) → torus position ──');
const FOLD = 510510n;
const torusBins = new Array(20).fill(0);  // 20 bins across [0, 510510)
for (const r of rows) {
  const tp = Number(r.k % FOLD);
  torusBins[Math.floor(tp / 510510 * 20)]++;
}
console.log('  20-bin histogram of (k mod 510510):');
for (let i = 0; i < 20; i++) {
  const lo = Math.floor(i * 510510 / 20);
  const bar = '#'.repeat(torusBins[i]);
  if (torusBins[i] > 0) console.log('    [' + lo.toString().padStart(6) + ', +' + (510510/20|0) + ') ' + bar + ' (' + torusBins[i] + ')');
}
const expBin = rows.length / 20;
const hotTorus = torusBins.map((c,i)=>({i,c})).filter(x=>x.c >= expBin*1.5).sort((a,b)=>b.c-a.c);
if (hotTorus.length) {
  console.log('  Hot torus regions (>1.5x expected ' + expBin.toFixed(2) + '):');
  hotTorus.forEach(h => console.log('    bin ' + h.i + ' [' + Math.floor(h.i*510510/20) + '-' + Math.floor((h.i+1)*510510/20) + '): ' + h.c));
}

// ────────────────────────────────────────────────────────
// SIGNAL 10 · spine-prime residue patterns — does k tend to hit specific residues mod 7 primes
// ────────────────────────────────────────────────────────
console.log();
console.log('── SIGNAL 10 · combined spine residue fingerprint ──');
for (const p of [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47]) {
  const counts = new Array(p).fill(0);
  for (const r of rows) counts[Number(r.k % BigInt(p))]++;
  const exp = rows.length / p;
  const hot = counts.map((c,i)=>({i,c})).filter(x=>x.c >= exp*1.8).sort((a,b)=>b.c-a.c);
  if (hot.length > 0) {
    console.log('  mod ' + p + ' (exp ' + exp.toFixed(2) + '): ' + hot.slice(0,3).map(h=>h.i+':'+h.c).join('  '));
  }
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
console.log('ACTIONABLE for puzzle 135:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  1. Use the 68% confidence range from Signal 7 as Layer B primary');
console.log('  2. Apply re-derived mod filters: 31=13, 19=0, CRT=478');
console.log('  3. Watch for autocorrelation signal (Signal 8) — if any lag shows |r|>0.2 the RNG is biased');
console.log('  4. Spine-prime hottest residues (Signal 10) — add to walker spawn filter');
