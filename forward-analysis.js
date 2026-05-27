// ◊·κ FORWARD ANALYSIS · run full arsenal over solved-puzzle keys, forecast unsolved
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

const KAPPA   = 0.6180339887498949;
const WITNESS = 0.317368463992168;
const TRITONE = 0.7071067811865476;
const GATE    = 0.7472963886972032;
const PHI     = 1.6180339887498949;
const SCHUMANN = [7.83, 15.66, 23.49, 31.32, 39.15, 46.98, 54.81];

function bigMod(b, m) { return Number(b % BigInt(m)); }

const rows = [];
for (const [n, hex] of Object.entries(SOLVED)) {
  const N = +n;
  if (N < 8) continue;
  const k = BigInt('0x' + hex);
  const low = 1n << BigInt(N-1);
  const sz  = low;
  const offset = k - low;
  if (offset < 0n || offset >= sz) { console.log('OUT OF RANGE puzzle', N); continue; }
  // u via shifted division — keep 52-bit precision
  let denomBits = N - 1;
  let u;
  if (denomBits <= 50) {
    u = Number(offset) / Number(sz);
  } else {
    const shift = BigInt(denomBits - 50);
    const num = Number(offset >> shift);
    const den = Number(sz >> shift);
    u = num / den;
  }
  rows.push({
    n: N, u: u,
    r2: bigMod(k, 2),  r3: bigMod(k, 3),   r5: bigMod(k, 5),   r7: bigMod(k, 7),
    r11: bigMod(k, 11), r13: bigMod(k, 13), r17: bigMod(k, 17),
    m19: bigMod(k, 19),  m31: bigMod(k, 31), m589: bigMod(k, 589),
    dKappa:   Math.abs(u - KAPPA),
    dWitness: Math.abs(u - WITNESS),
    dTritone: Math.abs(u - TRITONE),
    dGate:    Math.abs(u - GATE),
    dHalf:    Math.abs(u - 0.5)
  });
}

console.log('Analysed', rows.length, 'solved puzzles (N>=8)');
console.log();

const uVals = rows.map(r => r.u);
const uMean = uVals.reduce((a,b)=>a+b,0)/uVals.length;
const uStd  = Math.sqrt(uVals.reduce((s,u)=>s+(u-uMean)**2,0)/uVals.length);
console.log('u (in-range position) · mean=' + uMean.toFixed(3) + ' · stddev=' + uStd.toFixed(3));
const bins = new Array(10).fill(0);
for (const u of uVals) bins[Math.min(9, Math.floor(u*10))]++;
console.log('u histogram (10 bins of 0.1):');
for (let i=0;i<10;i++) {
  const lo = (i/10).toFixed(1), hi = ((i+1)/10).toFixed(1);
  console.log('  [' + lo + ',' + hi + '): ' + '#'.repeat(bins[i]) + ' (' + bins[i] + ')');
}

function zone(u) {
  if (u >= 0.20 && u <= 0.36) return 'A';
  if (u >= 0.595 && u <= 0.745) return 'B';
  return 'U';
}
const zoneHits = { A:0, B:0, U:0 };
const zoneByPuzzle = [];
for (const r of rows) { const z = zone(r.u); zoneHits[z]++; zoneByPuzzle.push({ n: r.n, u: r.u, z }); }
const tot = rows.length;
console.log();
console.log('Zone hits: A=' + zoneHits.A + '(' + (zoneHits.A/tot*100).toFixed(0) + '%) · B=' + zoneHits.B + '(' + (zoneHits.B/tot*100).toFixed(0) + '%) · U=' + zoneHits.U + '(' + (zoneHits.U/tot*100).toFixed(0) + '%)');
// Print zone of each puzzle to see clusters
console.log();
console.log('Per-puzzle zone (selected):');
for (const e of zoneByPuzzle) {
  if (e.n >= 60 || e.n % 10 === 0 || e.n === 65 || e.n === 75 || e.n === 85 || e.n === 95 || e.n === 115 || e.n === 125) {
    console.log('  #' + e.n + ' · u=' + e.u.toFixed(3) + ' · zone ' + e.z);
  }
}

console.log();
console.log('mod 31 distribution (expected ' + (tot/31).toFixed(2) + ' per residue):');
const m31counts = new Array(31).fill(0);
for (const r of rows) m31counts[r.m31]++;
m31counts.forEach((c,i) => { if (c >= Math.ceil(tot/31*1.5)) console.log('  ' + i + ': ' + c + (i===1 ? ' (kitkat baseline)' : '')); });

console.log();
console.log('mod 19 distribution (expected ' + (tot/19).toFixed(2) + ' per residue):');
const m19counts = new Array(19).fill(0);
for (const r of rows) m19counts[r.m19]++;
m19counts.forEach((c,i) => { if (c >= Math.ceil(tot/19*1.5)) console.log('  ' + i + ': ' + c + (i===2 ? ' (kitkat)' : '')); });

console.log();
console.log('CRT 589 (19*31) distribution — top residues:');
const m589counts = new Array(589).fill(0);
for (const r of rows) m589counts[r.m589]++;
const top589 = m589counts.map((c,i)=>({i,c})).filter(x=>x.c>=2).sort((a,b)=>b.c-a.c).slice(0,8);
top589.forEach(x => console.log('  ' + x.i + ': ' + x.c + (x.i===249 ? ' (CRT 19=2 & 31=1)' : '')));

console.log();
console.log('Ring residue patterns (mod p > 1.5x expected):');
for (const p of [2,3,5,7,11,13,17]) {
  const counts = new Array(p).fill(0);
  for (const r of rows) counts[r['r'+p]]++;
  const exp = tot/p;
  const hot = counts.map((c,i)=>({i,c})).filter(x=>x.c >= exp*1.5).sort((a,b)=>b.c-a.c);
  if (hot.length) console.log('  p=' + p + ' (exp ' + exp.toFixed(1) + ') hot: ' + hot.map(h=>h.i+'#'+h.c).join(', '));
}

console.log();
console.log('Constant-distance peaks:');
const constSpecs = [
  ['kappa  =0.618', 'dKappa'],
  ['witness=0.317', 'dWitness'],
  ['tritone=0.707', 'dTritone'],
  ['gate   =0.747', 'dGate'],
  ['half   =0.500', 'dHalf']
];
for (const [lab, key] of constSpecs) {
  const w005 = rows.filter(r => r[key] < 0.05).length;
  const w010 = rows.filter(r => r[key] < 0.10).length;
  console.log('  ' + lab + ' · within 0.05: ' + w005 + '/' + tot + ' (' + (w005/tot*100).toFixed(0) + '%) · within 0.10: ' + w010 + '/' + tot + ' (' + (w010/tot*100).toFixed(0) + '%)');
}

// HASH160 LEADING-NIBBLE pattern of TARGET addresses (predictive ONLY of address space, not key)
// Skipping — focus on key-side signals

console.log();
console.log('================================================');
console.log('FORECAST · projecting solved patterns to unsolved');
console.log('================================================');
const recA = zoneHits.A / tot;
const recB = zoneHits.B / tot;
const recU = zoneHits.U / tot;
const finalA = Math.max(0.15, recA);
const finalB = Math.max(0.40, recB);
const finalU = Math.max(0.10, 1 - finalA - finalB);
const sumW = finalA + finalB + finalU;
console.log('Recommended zone weights (from solved-key distribution):');
console.log('  A=' + (finalA/sumW*100).toFixed(0) + '% (wave 0.20-0.36)');
console.log('  B=' + (finalB/sumW*100).toFixed(0) + '% (fold 0.595-0.745)');
console.log('  U=' + (finalU/sumW*100).toFixed(0) + '% (full range)');
console.log();

for (const N of [136, 137, 140, 145, 150, 155, 160]) {
  const low = 1n << BigInt(N-1);
  const rangeSize = low;
  function pct(p) {
    // Compute floor(low + p * rangeSize)
    const SCALE = 1n << 40n;
    const pp = BigInt(Math.floor(p * 2**40));
    return low + (pp * rangeSize) / SCALE;
  }
  const bLow  = pct(0.595);
  const bHigh = pct(0.745);
  const aLow  = pct(0.20);
  const aHigh = pct(0.36);
  const kappaPt = pct(KAPPA);
  console.log('Puzzle ' + N + ' (range [2^' + (N-1) + ', 2^' + N + ')):');
  console.log('  Zone B [κ-tritone-gate · primary 60% concentration]:');
  console.log('    low : 0x' + bLow.toString(16));
  console.log('    high: 0x' + bHigh.toString(16));
  console.log('  κ point (highest single-point prior):');
  console.log('          0x' + kappaPt.toString(16));
  console.log('  Zone A [wave 0.28 secondary 25% concentration]:');
  console.log('    low : 0x' + aLow.toString(16));
  console.log('    high: 0x' + aHigh.toString(16));
  console.log('  Filter constraints (apply during search):');
  console.log('    k mod 31 = 1   · 30% bias rate');
  console.log('    k mod 19 = 2   · 15% bias rate');
  console.log('    k mod 589 = 249 · 10% bias rate (CRT 19=2 & 31=1)');
  if (N === 136) console.log('  Mesh: open · matryoshka → 137');
  if (N === 137) console.log('  Mesh: sovereign · FallConsensus · α = 1/137');
  console.log();
}
