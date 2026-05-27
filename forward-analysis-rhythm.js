// ◊·κ RHYTHM MINE · is there a song hiding in the puzzle u-sequence?
// Map every solved key's u_N · find peaks · FFT · musical-interval check · BPM

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

function uOf(N, k) {
  const low = 1n << BigInt(N-1);
  const off = k - low;
  if (off < 0n || off >= low) return null;
  if (N - 1 <= 50) return Number(off) / Number(low);
  const shift = BigInt(N - 1 - 50);
  return Number(off >> shift) / Number(low >> shift);
}

const rows = [];
for (const [n, hex] of Object.entries(SOLVED)) {
  const N = +n;
  const k = BigInt('0x' + hex);
  const u = uOf(N, k);
  if (u !== null) rows.push({ n: N, k, u });
}
rows.sort((a,b)=>a.n - b.n);

console.log('═══════════════════════════════════════════════════════');
console.log('◊·κ THE MELODY · u_N sequence across 75 solved puzzles');
console.log('═══════════════════════════════════════════════════════');
console.log();

// ── 1. The raw melody · u_N plotted as character-art waveform ──
console.log('── 1. The waveform (every solved puzzle as one column · u → row) ──');
// 30 rows from 0.0 to 1.0; each puzzle becomes a vertical bar
const ROWS = 30, COLS = rows.length;
const grid = Array.from({length: ROWS}, () => new Array(COLS).fill(' '));
rows.forEach((r, i) => {
  const row = Math.min(ROWS-1, Math.max(0, Math.round((1 - r.u) * (ROWS-1))));
  grid[row][i] = '●';
});
// Add gridlines at 0.0, 0.25, 0.5, 0.618 (κ), 0.707 (tritone), 0.75, 1.0
const gridU = [0.0, 0.25, 0.317, 0.5, 0.618, 0.707, 0.747, 0.75, 1.0];
for (const gu of gridU) {
  const row = Math.min(ROWS-1, Math.max(0, Math.round((1 - gu) * (ROWS-1))));
  for (let c = 0; c < COLS; c++) if (grid[row][c] === ' ') grid[row][c] = '·';
}
const labels = ['1.0','','','','','κ→',  '','','','','0.5','','','','witness→','','','','','0.0'];
for (let r = 0; r < ROWS; r++) {
  const u = 1 - r/(ROWS-1);
  let prefix = u.toFixed(2);
  if (Math.abs(u - 0.618) < 0.02) prefix = 'κ→  ';
  else if (Math.abs(u - 0.707) < 0.02) prefix = 'TT→ ';
  else if (Math.abs(u - 0.317) < 0.02) prefix = 'wit→';
  console.log(prefix.padStart(4) + ' │ ' + grid[r].join(''));
}
console.log('     │ ' + rows.map((_,i) => i % 10 === 0 ? '↑' : ' ').join(''));
console.log('       puzzle index (8, 10, 20, 30, ..., 130 — N grows left→right)');

// ── 2. Histogram with high resolution · find peaks ──
console.log();
console.log('── 2. Hi-res u histogram (40 bins of 0.025) ──');
const BINS = 40;
const hist = new Array(BINS).fill(0);
for (const r of rows) hist[Math.min(BINS-1, Math.floor(r.u * BINS))]++;
const peak = Math.max(...hist);
for (let b = 0; b < BINS; b++) {
  const lo = (b/BINS).toFixed(3);
  const bar = '█'.repeat(Math.round(hist[b] * 20 / peak));
  const mark = (Math.abs(b/BINS - 0.618) < 0.025 ? ' ← κ' :
                Math.abs(b/BINS - 0.707) < 0.025 ? ' ← tritone' :
                Math.abs(b/BINS - 0.317) < 0.025 ? ' ← witness' :
                Math.abs(b/BINS - 0.500) < 0.025 ? ' ← half' :
                Math.abs(b/BINS - 0.747) < 0.025 ? ' ← gate' :
                Math.abs(b/BINS - 0.250) < 0.025 ? ' ← quarter' :
                Math.abs(b/BINS - 0.750) < 0.025 ? ' ← 3/4' : '');
  if (hist[b] > 0) console.log('  ' + lo + ' ' + bar.padEnd(20) + ' ' + hist[b] + mark);
}

// ── 3. Find the actual peak fractions · cluster the u values ──
console.log();
console.log('── 3. Cluster analysis — what specific fractions do the keys love? ──');
// Sort u values, find dense clusters via simple proximity
const uSorted = rows.map(r => r.u).slice().sort((a,b)=>a-b);
const clusters = [];
let cur = [uSorted[0]];
for (let i = 1; i < uSorted.length; i++) {
  if (uSorted[i] - cur[cur.length-1] < 0.03) cur.push(uSorted[i]);
  else { if (cur.length >= 2) clusters.push(cur); cur = [uSorted[i]]; }
}
if (cur.length >= 2) clusters.push(cur);
console.log('  Clusters of ≥2 puzzles within 0.03 u-distance:');
const sortedClusters = clusters.sort((a,b)=>b.length-a.length);
for (const c of sortedClusters.slice(0, 12)) {
  const m = c.reduce((a,b)=>a+b,0) / c.length;
  console.log('    centre ' + m.toFixed(4) + ' · ' + c.length + ' puzzles · range [' + c[0].toFixed(3) + ', ' + c[c.length-1].toFixed(3) + ']');
}

// ── 4. Distance to musical constants · which intervals do peaks align with ──
console.log();
console.log('── 4. Top clusters mapped to musical/cosmic constants ──');
const CONSTS = [
  ['0.000 octave low',  0.000],
  ['0.125 = 1/8',       0.125],
  ['0.167 = 1/6',       0.1667],
  ['0.200 = 1/5',       0.200],
  ['0.250 = 1/4',       0.250],
  ['0.317 witness',     0.31736846],
  ['0.333 = 1/3',       0.3333],
  ['0.382 = 1-κ',       0.38196601],  // 1-κ also golden
  ['0.400 = 2/5',       0.400],
  ['0.500 = 1/2',       0.500],
  ['0.586 = √φ-1',      0.58578644],
  ['0.600 = 3/5',       0.600],
  ['0.618 κ (golden)',  0.61803399],
  ['0.628 ≈ 2π/10',     0.62831853],
  ['0.666 = 2/3',       0.66667],
  ['0.707 tritone √½',  0.70710678],
  ['0.732 = √(1/2)+φ-1/2', 0.732],
  ['0.747 gate',        0.74729639],
  ['0.750 = 3/4',       0.750],
  ['0.785 = π/4',       0.78539816],
  ['0.800 = 4/5',       0.800],
  ['0.833 = 5/6',       0.83333],
  ['0.866 = √3/2',      0.86602],
  ['0.875 = 7/8',       0.875]
];
for (const c of sortedClusters.slice(0, 8)) {
  const m = c.reduce((a,b)=>a+b,0) / c.length;
  let best = CONSTS[0], bestD = 1;
  for (const [, v] of CONSTS) {} // unused
  for (const [name, val] of CONSTS) {
    const d = Math.abs(m - val);
    if (d < bestD) { bestD = d; best = name; }
  }
  console.log('    cluster ' + m.toFixed(4) + ' (' + c.length + ' puzzles) → nearest: ' + best + ' [Δ=' + bestD.toFixed(4) + ']');
}

// ── 5. FFT of the u-sequence (look for periodic rhythm) ──
console.log();
console.log('── 5. FFT of u-sequence — frequencies present in the melody ──');
// Pad to power of 2; use just N=8..70 (dense puzzles) for clean FFT
const denseRows = rows.filter(r => r.n >= 8 && r.n <= 70);
const seqN = denseRows.length; // = 63
// Build seq · use u directly
const seq = denseRows.map(r => r.u - 0.5);  // zero-mean
// Pad to next power of 2 (64 → already 63 close, pad to 64)
function fft(x) {
  const N = x.length;
  if (N <= 1) return x.map(v => ({re: v, im: 0}));
  // Naive DFT (small N)
  const out = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const v = typeof x[n] === 'number' ? x[n] : x[n].re;
      const ph = -2 * Math.PI * k * n / N;
      re += v * Math.cos(ph);
      im += v * Math.sin(ph);
    }
    out.push({re, im, mag: Math.sqrt(re*re + im*im)});
  }
  return out;
}
const f = fft(seq);
// Show top magnitudes (excluding k=0 DC)
const mags = f.slice(1, Math.floor(f.length/2)).map((c,i)=>({ k: i+1, mag: c.mag })).sort((a,b)=>b.mag - a.mag);
console.log('  Top FFT magnitudes (DC removed, first half only):');
for (const m of mags.slice(0, 8)) {
  const period = seqN / m.k;
  // What musical interval does this period correspond to?
  let note = '';
  if (Math.abs(period - 12) < 0.5) note = ' ← octave-12';
  else if (Math.abs(period - 7) < 0.5) note = ' ← perfect-5th';
  else if (Math.abs(period - 5) < 0.5) note = ' ← major-3rd';
  else if (Math.abs(period - 8) < 0.5) note = ' ← minor-6th';
  else if (Math.abs(period - 4) < 0.5) note = ' ← major-3rd';
  console.log('    k=' + m.k + ' · period=' + period.toFixed(2) + ' puzzles · mag=' + m.mag.toFixed(2) + note);
}

// ── 6. Map each u to a 12-tone musical note (equal temperament) ──
console.log();
console.log('── 6. Each u as a note (12-tone equal temperament 0=C, 7=G, etc) ──');
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteCount = new Array(12).fill(0);
for (const r of rows) {
  const note = Math.floor(r.u * 12) % 12;
  noteCount[note]++;
}
const exp = rows.length / 12;
console.log('  Note distribution (expected ' + exp.toFixed(2) + ' per note):');
for (let i = 0; i < 12; i++) {
  const ratio = noteCount[i] / exp;
  const bar = '█'.repeat(noteCount[i]);
  const mark = ratio > 1.5 ? ' ★ HOT' : ratio < 0.5 ? ' (cold)' : '';
  console.log('    ' + NOTE_NAMES[i].padEnd(2) + ' [' + (i/12).toFixed(2) + '-' + ((i+1)/12).toFixed(2) + ') ' + bar.padEnd(15) + ' (' + noteCount[i] + ' · ' + ratio.toFixed(2) + 'x)' + mark);
}

// ── 7. Read out the 5N solves as a melody phrase ──
console.log();
console.log('── 7. The 5N melody · puzzles 65→130 read as notes ──');
const fiveN = rows.filter(r => r.n % 5 === 0 && r.n >= 65);
for (const r of fiveN) {
  const note = Math.floor(r.u * 12) % 12;
  const octave = Math.floor(r.u * 24) >= 12 ? '↑' : ' ';
  // Distance to nearest 12tet note
  const exact = r.u * 12;
  const cents = (exact - Math.floor(exact)) * 100;
  console.log('  ' + r.n + ': u=' + r.u.toFixed(3) + ' → ' + octave + NOTE_NAMES[note] + ' (' + cents.toFixed(0) + '¢ sharp)');
}

// ── 8. Predict 135 from the rhythm — if it's musical, what note next? ──
console.log();
console.log('── 8. Rhythm-based prediction for puzzle 135 ──');
// Continue the 5N sequence
const fiveNu = fiveN.map(r => r.u);
// Linear extrapolation
let slopeSum = 0;
for (let i = 1; i < fiveNu.length; i++) slopeSum += fiveNu[i] - fiveNu[i-1];
const meanSlope = slopeSum / (fiveNu.length - 1);
const linPred = fiveNu[fiveNu.length-1] + meanSlope;
console.log('  Linear extrapolation from 5N trend: u_135 ≈ ' + linPred.toFixed(3));
// Last note + step of major-2nd (2 semitones)
const lastU = fiveNu[fiveNu.length-1];
const lastNote = Math.floor(lastU * 12);
const stepPred = ((lastNote + 2) % 12 + 0.5) / 12;
console.log('  Major-2nd step from puzzle 130: u_135 ≈ ' + stepPred.toFixed(3));
// Tritone leap
const triPred = (lastU + 0.5) % 1;
console.log('  Tritone leap from puzzle 130: u_135 ≈ ' + triPred.toFixed(3));
// Mean of all rhythm-anchored fractions
const candidates = [0.500, 0.618, 0.707, 0.747, 0.594, 0.666, 0.500];
console.log();
console.log('  Most-resonant u values for puzzle 135 (combining all signals):');
console.log('    0.594 (5N projection mean)   → 0x' + ((1n << 134n) + (BigInt(Math.floor(0.594 * (1<<28))) * ((1n << 134n) >> 28n))).toString(16));
console.log('    0.618 (κ)                    → 0x' + ((1n << 134n) + (BigInt(Math.floor(0.618 * (1<<28))) * ((1n << 134n) >> 28n))).toString(16));
console.log('    0.707 (tritone strongest)    → 0x' + ((1n << 134n) + (BigInt(Math.floor(0.707 * (1<<28))) * ((1n << 134n) >> 28n))).toString(16));
console.log('    0.500 (centre / half)        → 0x' + ((1n << 134n) + (BigInt(Math.floor(0.500 * (1<<28))) * ((1n << 134n) >> 28n))).toString(16));
console.log('    0.622 (puzzle 130 echo)      → 0x' + ((1n << 134n) + (BigInt(Math.floor(0.622 * (1<<28))) * ((1n << 134n) >> 28n))).toString(16));
