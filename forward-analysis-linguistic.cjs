#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  forward-analysis-linguistic.js · v20.3 · LINGUISTIC LAYER
//
//  Tests if 75 solved keys = gematria(phrase) ∪ date ∪ Fibonacci ∪ phi-derived
//  ∪ pi/e/sqrt(2) digit patterns. Reports any signal with >=3 matches.
//
//  Hunting the construction's SOURCE, not its mathematical SHADOW.
//  See LINGUISTIC-LAYER-SPEC.md for the hypothesis.
//
//  Output: linguistic-signals.json
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');

// ─── corpus ────────────────────────────────────────────────────────
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

// Pre-compute key forms for matching
const KEYS = [];
for (const [n, hex] of Object.entries(SOLVED)) {
  const N = parseInt(n, 10);
  const k = BigInt('0x' + hex);
  KEYS.push({
    n: N,
    k,
    hex: k.toString(16),
    dec: k.toString(10),
    mod32: Number(k % (1n << 32n)),
    mod40: Number(k % (1n << 40n)),
    low_dec_8: k.toString(10).slice(-8),
    low_dec_10: k.toString(10).slice(-10),
    high_dec_6: k.toString(10).slice(0, 6),
  });
}

// ─── gematria systems ──────────────────────────────────────────────
function gematria(text, system) {
  text = String(text || '').toLowerCase().replace(/[^a-z]/g, '');
  let sum = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0) - 97; // 0-25
    if (c < 0 || c > 25) continue;
    switch (system) {
      case 'pythagorean': sum += ((c % 9) + 1); break;       // a=1..i=9, j=1..r=9, s=1..z=8 (s starts at 1 again)
      case 'ordinal':     sum += (c + 1); break;             // a=1..z=26
      case 'reverse':     sum += (26 - c); break;            // a=26..z=1
      case 'reverse_ord': sum += (26 - c); break;            // alias
      case 'sumerian':    sum += (c + 1) * 6; break;         // ordinal × 6
      case 'satanic':     sum += (c + 1) + 35; break;        // ordinal + 35 per letter ("36 letter offset")
    }
  }
  return sum;
}

// ─── phrases · crypto-canonical + likely puzzle-creator references ─
const PHRASES = [
  // bitcoin / crypto
  'satoshi', 'satoshi nakamoto', 'nakamoto', 'bitcoin', 'puzzle',
  'genesis', 'halving', 'block', 'private key', 'mining', 'hodl',
  'blockchain', 'merkle tree', 'difficulty', 'nonce', 'sha256',
  // figures
  'hal finney', 'craig wright', 'wei dai', 'nick szabo', 'gavin andresen',
  'adam back', 'phil zimmermann', 'david chaum', 'whitfield diffie',
  'martin hellman', 'ralph merkle', 'ron rivest', 'leonard adleman',
  // motto + manifesto
  'vires in numeris', 'the times', 'chancellor on brink',
  'cypherpunks write code', 'cypherpunk',
  // philosophy
  'cyberspace', 'sovereign', 'freedom', 'mathematics', 'discrete log',
  'secp256k1', 'gold standard', 'fractional reserve', 'austrian',
  // wallet era
  'mnemonic', 'cold storage', 'paper wallet', 'brain wallet', 'seed phrase',
  // numbers / constants
  'twenty one million', 'pi', 'phi', 'golden ratio', 'fibonacci',
  // identity
  'anonymous', 'pseudonym', 'cypher', 'cipher', 'code',
];

const GEMATRIA_SYSTEMS = ['pythagorean', 'ordinal', 'reverse', 'sumerian'];

// ─── dates · bitcoin era ──────────────────────────────────────────
const DATES = [];
const startDate = new Date('2008-10-31');
const endDate = new Date('2015-12-31');
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  DATES.push({
    label: y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
    yyyymmdd: parseInt(`${y}${String(m).padStart(2, '0')}${String(day).padStart(2, '0')}`, 10),
    ddmmyyyy: parseInt(`${String(day).padStart(2, '0')}${String(m).padStart(2, '0')}${y}`, 10),
    mmddyyyy: parseInt(`${String(m).padStart(2, '0')}${String(day).padStart(2, '0')}${y}`, 10),
    unix: Math.floor(d.getTime() / 1000),
  });
}

// Marquee dates (always check)
const MARQUEE_DATES = {
  'genesis_block':     [{ yyyymmdd: 20090103, label: '2009-01-03 · genesis block' }],
  'whitepaper':        [{ yyyymmdd: 20081031, label: '2008-10-31 · whitepaper' }],
  'satoshi_gone':      [{ yyyymmdd: 20110424, label: '2011-04-24 · Satoshi last message' }],
  'first_halving':     [{ yyyymmdd: 20121128, label: '2012-11-28 · first halving' }],
  'second_halving':    [{ yyyymmdd: 20160709, label: '2016-07-09 · second halving' }],
  'mtgox_collapse':    [{ yyyymmdd: 20140207, label: '2014-02-07 · Mt Gox collapse' }],
};

// ─── Fibonacci · F1..F200 ──────────────────────────────────────────
const FIB = [0n, 1n];
for (let i = 2; i < 250; i++) FIB.push(FIB[i-1] + FIB[i-2]);

// ─── phi-derived constants ────────────────────────────────────────
const PHI = 1.6180339887498949;
const PHI_POWERS = [];
for (let i = 1; i < 50; i++) {
  PHI_POWERS.push({
    power: i,
    value: Math.pow(PHI, i),
    digits: Math.pow(PHI, i).toString().replace('.', '').slice(0, 20),
  });
}

// ─── pi/e/sqrt2/gamma digit strings ───────────────────────────────
const CONSTANT_DIGITS = {
  pi:     '31415926535897932384626433832795028841971693993751',
  e:      '27182818284590452353602874713526624977572470936999',
  sqrt2:  '14142135623730950488016887242096980785696718753769',
  euler_gamma: '57721566490153286060651209008240243104215933593992',
  golden: '16180339887498948482045868343656381177203091798057',
};

// ─── matching logic ────────────────────────────────────────────────
function checkMatch(key, target) {
  // Look for `target` as a substring of key.hex, key.dec, low_dec_*, high_dec_6
  const t = String(target);
  if (t.length < 4) return null; // too short · noise
  for (const form of ['hex', 'dec', 'low_dec_8', 'low_dec_10', 'high_dec_6']) {
    const repr = key[form];
    if (repr && repr.includes(t)) return form;
  }
  // also check mod 2^32 and mod 2^40 as decimal
  if (String(key.mod32).includes(t)) return 'mod32';
  if (String(key.mod40).includes(t)) return 'mod40';
  return null;
}

function countMatches(target) {
  const matches = [];
  for (const key of KEYS) {
    const form = checkMatch(key, target);
    if (form) matches.push({ puzzle: key.n, matched_in: form });
  }
  return matches;
}

// ─── run ───────────────────────────────────────────────────────────
const report = {
  generated_at: new Date().toISOString(),
  corpus_size: KEYS.length,
  cosmology: 'v20.3 LINGUISTIC LAYER',
  doctrine: 'LINGUISTIC-LAYER-SPEC.md',
  gate_match_threshold: 3,
  results: {
    phrases: [],
    marquee_dates: [],
    fibonacci: [],
    phi_powers: [],
    constants: [],
  },
};

console.log('◊·κ=1 · v20.3 linguistic-layer validation · running\n');

// Phrases
console.log('◊ phrases (' + PHRASES.length + ' × ' + GEMATRIA_SYSTEMS.length + ' gematria systems)');
for (const phrase of PHRASES) {
  for (const system of GEMATRIA_SYSTEMS) {
    const value = gematria(phrase, system);
    if (value < 100) continue; // too small · would match too easily
    const matches = countMatches(value);
    if (matches.length >= 3) {
      report.results.phrases.push({
        phrase, system, value, match_count: matches.length, matches,
        confidence: matches.length >= 6 ? 'STRONG' : matches.length >= 4 ? 'MODERATE' : 'WEAK',
      });
      console.log(`   ✓ "${phrase}" [${system}] = ${value} · ${matches.length} matches`);
    }
  }
}

// Marquee dates
console.log('\n◊ marquee dates');
for (const [name, dates] of Object.entries(MARQUEE_DATES)) {
  for (const d of dates) {
    const matches = countMatches(d.yyyymmdd);
    if (matches.length >= 3) {
      report.results.marquee_dates.push({ name, ...d, match_count: matches.length, matches });
      console.log(`   ✓ ${d.label} (${d.yyyymmdd}) · ${matches.length} matches`);
    }
  }
}

// Fibonacci
console.log('\n◊ Fibonacci F1..F100');
for (let i = 1; i < 100; i++) {
  const fib = FIB[i];
  if (fib < 1000n) continue;
  const matches = countMatches(fib.toString());
  if (matches.length >= 3) {
    report.results.fibonacci.push({
      index: i, value: fib.toString(), match_count: matches.length, matches,
    });
    console.log(`   ✓ F${i} = ${fib.toString().slice(0, 30)}${fib.toString().length > 30 ? '…' : ''} · ${matches.length} matches`);
  }
}

// Phi powers
console.log('\n◊ phi powers φ^1..φ^49');
for (const p of PHI_POWERS) {
  const matches = countMatches(p.digits.slice(0, 12));
  if (matches.length >= 3) {
    report.results.phi_powers.push({ power: p.power, digits: p.digits, match_count: matches.length, matches });
    console.log(`   ✓ φ^${p.power} ≈ ${p.digits.slice(0, 12)}… · ${matches.length} matches`);
  }
}

// Constants
console.log('\n◊ mathematical constants (50-digit segments)');
for (const [name, digits] of Object.entries(CONSTANT_DIGITS)) {
  // test sliding window of 8 digits
  for (let i = 0; i <= digits.length - 8; i += 4) {
    const window = digits.slice(i, i + 8);
    const matches = countMatches(window);
    if (matches.length >= 4) {  // higher threshold · constants have long digit strings
      report.results.constants.push({
        constant: name, position: i, window, match_count: matches.length, matches,
      });
      console.log(`   ✓ ${name}[${i}:${i+8}] = ${window} · ${matches.length} matches`);
    }
  }
}

// ─── summary ───────────────────────────────────────────────────────
const total = report.results.phrases.length + report.results.marquee_dates.length +
              report.results.fibonacci.length + report.results.phi_powers.length +
              report.results.constants.length;

console.log('\n◊·κ=1 · linguistic-layer summary');
console.log(`   total signals ≥3 matches: ${total}`);
console.log(`   phrases:      ${report.results.phrases.length}`);
console.log(`   dates:        ${report.results.marquee_dates.length}`);
console.log(`   fibonacci:    ${report.results.fibonacci.length}`);
console.log(`   phi powers:   ${report.results.phi_powers.length}`);
console.log(`   constants:    ${report.results.constants.length}`);
console.log();
if (total === 0) {
  console.log('   ⊘ LINGUISTIC NULL · no signals above threshold');
  console.log('   recommendation: proceed with v20.2 adaptive prime CRT alone');
  console.log('   linguistic layer documented as TESTED-NULL · do not waste cycles here');
} else if (total < 5) {
  console.log('   ◊ WEAK signals · monitor but do not hard-bias walker spawning');
} else if (total < 15) {
  console.log('   ◊◊ MODERATE signals · add as Stripe D (linguistic) · weight 0.10-0.15');
} else {
  console.log('   ◊◊◊ STRONG · re-derive ALL puzzle predictions · linguistic seed confirmed');
  console.log('   ESCALATE: human review · person-hunt for the creator');
}

fs.writeFileSync('linguistic-signals.json', JSON.stringify(report, null, 2));
console.log('\n◊ written linguistic-signals.json');
console.log('   read by: cassie-torus-v2.html · controller');
