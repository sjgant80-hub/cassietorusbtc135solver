#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  forward-analysis-adaptive.js · v20.2 · bit-bucketed CRT validator
//
//  Tests extended primes against the 75-key corpus, bucketed by puzzle
//  bit-length (P50-P79, P80-P109, P110-P135). Reports per-bucket which
//  residues hold the puzzle-creator's structural fingerprint at the
//  scale relevant to puzzle 135.
//
//  Output: validated-primes.json
//  Read by: CASSIE master · walker-config.json · controller
//
//  Discipline: keep only residues with >2.0x overrep AND >=4 data points.
//  Discard noise. The validator is a sceptic by construction.
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');

// ─── corpus ────────────────────────────────────────────────────────
// 75 solved keys from forward-analysis.js · v19 corpus
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

// ─── primes under test ─────────────────────────────────────────────
// v20.1 anchor (always present in cosmology · we test them anyway to confirm signal)
const ANCHOR = [2, 3, 5, 7, 11, 13, 17];
// v20.2 extension candidates
const EXTENDED_1 = [19, 23, 29, 31, 37, 41, 43, 47];
// v20.2 reserve (test if E1 doesn't reach 6+ faces)
const EXTENDED_2 = [53, 59, 61, 67, 71];
const ALL_PRIMES = [...ANCHOR, ...EXTENDED_1, ...EXTENDED_2];

// ─── buckets ───────────────────────────────────────────────────────
// keys partitioned by bit-length puzzle index
const BUCKETS = {
  early:  { name: 'early (P8-P49)',    range: [8, 49],   keys: [] },
  bucket1: { name: 'P50-P79',          range: [50, 79],  keys: [] },
  bucket2: { name: 'P80-P109',         range: [80, 109], keys: [] },
  bucket3: { name: 'P110-P135 (P135-relevant)', range: [110, 135], keys: [] },
};

for (const [n, hex] of Object.entries(SOLVED)) {
  const N = parseInt(n, 10);
  const k = BigInt('0x' + hex);
  for (const [bucketKey, bucket] of Object.entries(BUCKETS)) {
    if (N >= bucket.range[0] && N <= bucket.range[1]) {
      bucket.keys.push({ n: N, k });
      break;
    }
  }
}

// ─── analysis ──────────────────────────────────────────────────────
function bigMod(b, m) { return Number(b % BigInt(m)); }

function analyseBucketPrime(bucket, prime) {
  // count residue distribution for this prime within the bucket
  const counts = new Array(prime).fill(0);
  for (const { k } of bucket.keys) {
    counts[bigMod(k, prime)]++;
  }
  const n = bucket.keys.length;
  const expected = n / prime; // uniform expectation
  // hottest residues
  const ranked = counts
    .map((count, residue) => ({
      residue, count,
      overrep: expected > 0 ? count / expected : 0,
    }))
    .sort((a, b) => b.overrep - a.overrep);
  return { n, expected, ranked };
}

// ─── validation gate ───────────────────────────────────────────────
// Keep residues with >2.0× overrep AND >=4 data points
function passesGate(item) {
  return item.overrep > 2.0 && item.count >= 4;
}

// ─── run ───────────────────────────────────────────────────────────
const report = {
  generated_at: new Date().toISOString(),
  corpus_size: Object.keys(SOLVED).length,
  buckets: {},
  cosmology: 'v20.2 ADAPTIVE SPINE',
  doctrine: 'STRIPE-SEARCH-SPEC.md',
};

console.log('◊·κ=1 · v20.2 adaptive prime validation · running\n');

for (const [bucketKey, bucket] of Object.entries(BUCKETS)) {
  if (bucket.keys.length === 0) {
    console.log(`  ⊘ ${bucket.name}: 0 keys · skipped`);
    continue;
  }
  console.log(`◊ ${bucket.name} · ${bucket.keys.length} keys`);

  report.buckets[bucketKey] = {
    name: bucket.name,
    range: bucket.range,
    sample_size: bucket.keys.length,
    puzzle_indices: bucket.keys.map(x => x.n),
    primes: {},
    validated_conditions: [],
  };

  for (const prime of ALL_PRIMES) {
    const { ranked, expected } = analyseBucketPrime(bucket, prime);
    const top = ranked[0];
    const passed = passesGate(top);

    report.buckets[bucketKey].primes[prime] = {
      top_residue: top.residue,
      top_count: top.count,
      top_overrep: parseFloat(top.overrep.toFixed(3)),
      expected: parseFloat(expected.toFixed(3)),
      passes_gate: passed,
      tier: ANCHOR.includes(prime) ? 'anchor' :
            EXTENDED_1.includes(prime) ? 'extended_1' : 'extended_2',
    };

    if (passed) {
      report.buckets[bucketKey].validated_conditions.push({
        prime,
        residue: top.residue,
        overrep: parseFloat(top.overrep.toFixed(3)),
        count: top.count,
        confidence: top.overrep > 4.0 && top.count >= 6 ? 'STRONG' :
                    top.overrep > 2.5 && top.count >= 5 ? 'MODERATE' : 'WEAK',
        tier: report.buckets[bucketKey].primes[prime].tier,
      });
      console.log(`   ✓ mod ${prime} = ${top.residue}  (${top.count}/${bucket.keys.length} · ${top.overrep.toFixed(2)}×)  [${report.buckets[bucketKey].primes[prime].tier}]`);
    }
  }
  console.log(`   validated conditions: ${report.buckets[bucketKey].validated_conditions.length}\n`);
}

// ─── summary ───────────────────────────────────────────────────────
console.log('◊ summary · bucket3 (P110-P135) is the P135-relevant set\n');
if (report.buckets.bucket3) {
  const b3 = report.buckets.bucket3;
  const product = b3.validated_conditions
    .map(c => c.prime)
    .reduce((a, b) => a * b, 1);
  const product_bits = Math.log2(product);
  console.log(`  bucket3 validated CRT conditions: ${b3.validated_conditions.length}`);
  console.log(`  primes used: ${b3.validated_conditions.map(c => c.prime).join(', ')}`);
  console.log(`  CRT product: ${product} ≈ 2^${product_bits.toFixed(1)} bits`);
  console.log(`  hypothetical reduction: 2^134 → 2^${(134 - product_bits).toFixed(1)}`);
  console.log();
}

// ─── meta-cosmology ────────────────────────────────────────────────
report.meta = {
  v20_1_spine: ANCHOR,
  v20_2_extension_1: EXTENDED_1,
  v20_2_extension_2: EXTENDED_2,
  gate_overrep_threshold: 2.0,
  gate_count_threshold: 4,
  fold: 510510,
  phi: 1.6180339887498949,
  kappa: 0.6180339887498949,
};

fs.writeFileSync('validated-primes.json', JSON.stringify(report, null, 2));
console.log('◊·κ=1 · written validated-primes.json');
console.log('   read by: cassie-torus-v2.html · cassie-anthropic/walker-config.json · controller');
