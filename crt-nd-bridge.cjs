// ═══════════════════════════════════════════════════════════════════
//  crt-nd-bridge.cjs · v20.2-MACCubeFACE127D
//  Chinese Remainder Theorem helpers · nD ↔ 1D projection
//
//  The 7-spine torus is BOTH:
//    · a circle with 510510 positions (1D view)
//    · a product cube Z/2 × Z/3 × Z/5 × Z/7 × Z/11 × Z/13 × Z/17 (nD view)
//
//  This module bridges between them.
// ═══════════════════════════════════════════════════════════════════

const SPINE = [2, 3, 5, 7, 11, 13, 17];
const FOLD = SPINE.reduce((a, b) => a * b, 1); // 510510

// ─── modular inverse via extended Euclidean ────────────────────────
function modInverse(a, m) {
  let [g, x] = extGcd(a, m);
  if (g !== 1) throw new Error(`no inverse: gcd(${a},${m})=${g}`);
  return ((x % m) + m) % m;
}
function extGcd(a, b) {
  if (b === 0) return [a, 1, 0];
  const [g, x, y] = extGcd(b, a % b);
  return [g, y, x - Math.floor(a / b) * y];
}

// ─── CRT reconstruction: residues → 1D position ───────────────────
function crtTo1D(residues, primes = SPINE) {
  // residues = [r_p1, r_p2, ...] aligned with primes
  // Returns the unique x in [0, product(primes)) such that x % p_i = r_i
  const M = primes.reduce((a, b) => a * b, 1);
  let x = 0;
  for (let i = 0; i < primes.length; i++) {
    const p = primes[i];
    const r = residues[i];
    const Mi = M / p;
    const yi = modInverse(Mi % p, p);
    x = (x + r * Mi * yi) % M;
  }
  return ((x % M) + M) % M;
}

// ─── 1D → nD projection ───────────────────────────────────────────
function project1DtoND(x, primes = SPINE) {
  return primes.map(p => x % p);
}

// ─── face = subset of primes · enumerate all 127 non-empty subsets ─
function enumerateFaces(primes = SPINE) {
  const faces = [];
  const n = primes.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(primes[i]);
    }
    faces.push({
      key: subset.join(','),
      primes: subset,
      fold: subset.reduce((a, b) => a * b, 1),
      dim: subset.length,
      mask,
    });
  }
  return faces;
}

// ─── project a 1D position onto a specific face ───────────────────
function projectTo1DOnFace(x, face) {
  // Return the position in the face's sub-torus
  return face.primes.reduce((acc, p, i) => {
    // CRT reconstruction within the face
    return acc;
  }, x % face.fold);
}

// Simpler/correct: face position is just x mod (product of face's primes)
function faceFold(x, face) {
  return x % face.fold;
}

// ─── face residue vector for x ────────────────────────────────────
function faceResidues(x, face) {
  return face.primes.map(p => x % p);
}

// ─── tests ─────────────────────────────────────────────────────────
if (require.main === module) {
  console.log('◊·κ=1 · crt-nd-bridge · v20.2');
  console.log('  spine: [' + SPINE.join(', ') + ']');
  console.log('  fold:  ' + FOLD);
  console.log();

  // Roundtrip test
  const samples = [0, 1, 268318, 498617, 38019, 510509];
  console.log('  Roundtrip test (1D → nD → 1D):');
  for (const x of samples) {
    const nd = project1DtoND(x);
    const back = crtTo1D(nd);
    const ok = back === x ? '✓' : '✗';
    console.log(`    ${ok} ${x} → [${nd.join(',')}] → ${back}`);
  }

  // Face enumeration
  const faces = enumerateFaces();
  console.log();
  console.log('  Face enumeration:');
  console.log('    total faces: ' + faces.length + ' (expected 127)');
  const byDim = {};
  for (const f of faces) byDim[f.dim] = (byDim[f.dim] || 0) + 1;
  for (const [dim, count] of Object.entries(byDim).sort((a,b)=>a[0]-b[0])) {
    console.log(`    k=${dim}: ${count} faces (C(7,${dim})=${binomial(7, parseInt(dim))})`);
  }

  // Stripe positions on the lattice
  console.log();
  console.log('  STRIPE positions in nD view:');
  for (const [name, pos] of [['A · HALF', 268318], ['B · CEILING', 498617], ['C · FLOOR', 38019]]) {
    const nd = project1DtoND(pos);
    console.log(`    Stripe ${name} (torus ${pos}): [${nd.join(',')}]`);
  }
}

function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

module.exports = {
  SPINE, FOLD,
  crtTo1D, project1DtoND,
  enumerateFaces, faceFold, faceResidues,
  modInverse,
};
