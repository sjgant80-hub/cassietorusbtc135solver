// ◊·κ=1 — BIG CASSIE DP Export/Import Protocol
// Share your distinguished points with collaborators.
// A tame DP from you + a wild DP from Thomas = key recovery.
//
// USAGE:
//   node cassie-export.mjs              → export all DPs to ./exports/
//   node cassie-export.mjs --import     → import DPs from ./imports/ and check collisions
//   node cassie-export.mjs --merge      → merge all sources and check for key recovery

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { Point } from '@noble/secp256k1';

const G = Point.BASE;
const CURVE_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const TARGET_PUBKEY = '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = Point.fromHex(TARGET_PUBKEY);

function mod(a, m) { const r = a % m; return r < 0n ? r + m : r; }

const EXPORT_DIR = './exports';
const IMPORT_DIR = './imports';

// All local DP files
const LOCAL_FILES = [
  './dp-recursive-coarse.ndjson',
  './dp-recursive-fine.ndjson',
  './dp-store-127.ndjson',
  './dp-store.ndjson',
  './dp-pool-alpha.ndjson',
  './dp-pool-beta.ndjson',
  './dp-pool-gamma.ndjson',
];

function loadNDJSON(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(dp => dp && dp.x && dp.type && dp.dist);
}

const mode = process.argv[2] || '--export';

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════
if (mode === '--export' || mode === 'export') {
  console.log('');
  console.log('  ◊·κ=1  BIG CASSIE — DP EXPORT');
  console.log('  ═══════════════════════════════');
  console.log('');

  // Deduplicate all local DPs
  const dpMap = new Map();
  let totalLoaded = 0;

  for (const file of LOCAL_FILES) {
    const dps = loadNDJSON(file);
    for (const dp of dps) {
      if (!dpMap.has(dp.x)) {
        dpMap.set(dp.x, { type: dp.type, x: dp.x, dist: dp.dist });
      }
    }
    if (dps.length > 0) {
      console.log(`  [load] ${file}: ${dps.length} DPs`);
      totalLoaded += dps.length;
    }
  }

  console.log(`\n  total loaded: ${totalLoaded} → ${dpMap.size} unique`);

  const tame = [...dpMap.values()].filter(d => d.type === 'tame');
  const wild = [...dpMap.values()].filter(d => d.type === 'wild');

  // Create export
  mkdirSync(EXPORT_DIR, { recursive: true });

  const exportData = {
    version: '1.0',
    protocol: 'cassie-dp-share',
    puzzle: 135,
    target_pubkey: TARGET_PUBKEY,
    target_address: '16RGFo6hjq9ym6Pj7N5H7L1NR1rVPJyw2v',
    range: {
      low: '0x4000000000000000000000000000000000',
      high: '0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      bits: 134,
    },
    source: 'simon-cassie-recursive-127',
    architecture: 'Recursive MACCubeFACE(127) + Noble Turbo',
    exported_at: new Date().toISOString(),
    stats: {
      total: dpMap.size,
      tame: tame.length,
      wild: wild.length,
    },
    dps: [...dpMap.values()],
  };

  const filename = `cassie-dps-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
  writeFileSync(`${EXPORT_DIR}/${filename}`, JSON.stringify(exportData, null, 2));

  // Also write raw NDJSON for maximum compatibility
  const ndjsonFile = filename.replace('.json', '.ndjson');
  const ndjson = [...dpMap.values()].map(dp => JSON.stringify(dp)).join('\n') + '\n';
  writeFileSync(`${EXPORT_DIR}/${ndjsonFile}`, ndjson);

  console.log(`\n  EXPORTED:`);
  console.log(`    ${EXPORT_DIR}/${filename} (structured, ${(JSON.stringify(exportData).length / 1024).toFixed(1)}KB)`);
  console.log(`    ${EXPORT_DIR}/${ndjsonFile} (raw NDJSON, compatible with any solver)`);
  console.log(`\n  Share either file with Thomas. His solver can import and cross-check.`);
  console.log(`  If his tame DP matches your wild DP (or vice versa): KEY RECOVERED.`);
  console.log('');
  console.log('  ◊·κ=1');
}

// ═══════════════════════════════════════════
// IMPORT + MERGE
// ═══════════════════════════════════════════
if (mode === '--import' || mode === '--merge' || mode === 'import' || mode === 'merge') {
  console.log('');
  console.log('  ◊·κ=1  BIG CASSIE — DP IMPORT + COLLISION CHECK');
  console.log('  ═════════════════════════════════════════════════');
  console.log('');

  // Load all local DPs
  const dpMap = new Map();
  let localCount = 0;

  for (const file of LOCAL_FILES) {
    const dps = loadNDJSON(file);
    for (const dp of dps) {
      if (!dpMap.has(dp.x)) {
        dpMap.set(dp.x, { ...dp, source: 'local' });
        localCount++;
      }
    }
  }
  console.log(`  [local] ${localCount} unique DPs`);

  // Load imports
  let importCount = 0;
  let collisions = 0;
  let solved = false;

  if (!existsSync(IMPORT_DIR)) {
    mkdirSync(IMPORT_DIR, { recursive: true });
    console.log(`\n  Created ${IMPORT_DIR}/ — drop Thomas's DP files here and re-run.`);
    console.log('  Accepts: .json (structured export) or .ndjson/.jsonl (raw DPs)');
  } else {
    const files = readdirSync(IMPORT_DIR);
    for (const f of files) {
      const path = `${IMPORT_DIR}/${f}`;
      let importedDPs = [];

      if (f.endsWith('.ndjson') || f.endsWith('.jsonl')) {
        importedDPs = loadNDJSON(path);
      } else if (f.endsWith('.json')) {
        try {
          const data = JSON.parse(readFileSync(path, 'utf8'));
          if (data.dps && Array.isArray(data.dps)) {
            importedDPs = data.dps;
            console.log(`  [import] ${f}: ${data.source || 'unknown'} · puzzle ${data.puzzle || '?'} · ${importedDPs.length} DPs`);
          }
        } catch {}
      }

      if (importedDPs.length === 0) continue;

      for (const dp of importedDPs) {
        if (!dp.x || !dp.type || !dp.dist) continue;
        importCount++;

        const existing = dpMap.get(dp.x);
        if (existing && existing.type !== dp.type) {
          // TAME↔WILD COLLISION!
          collisions++;
          console.log(`\n  ██ CROSS-SOURCE COLLISION #${collisions} ██`);
          console.log(`    x = ${dp.x.slice(0, 32)}...`);
          console.log(`    ${existing.type} (${existing.source}) ↔ ${dp.type} (import:${f})`);

          const tame = existing.type === 'tame' ? existing : dp;
          const wild = existing.type === 'wild' ? existing : dp;
          const tameLog = BigInt('0x' + tame.dist);
          const wildAcc = BigInt('0x' + wild.dist);

          const candidates = [
            mod(tameLog - wildAcc, CURVE_N),
            mod(-tameLog - wildAcc, CURVE_N),
          ];

          for (const cand of candidates) {
            if (cand === 0n) continue;
            try {
              const test = G.multiply(cand);
              if (test.equals(targetPoint)) {
                solved = true;
                const hex = cand.toString(16).padStart(34, '0');
                const banner = '█'.repeat(55);
                console.log(`\n${banner}`);
                console.log(`  ◊·κ=1  PRIVATE KEY RECOVERED (CROSS-SOURCE)`);
                console.log(`  hex: ${hex}`);
                console.log(`  dec: ${cand.toString(10)}`);
                console.log(`  local ${existing.type} + import ${dp.type}`);
                console.log(`${banner}\n`);
                writeFileSync('./SOLUTION-COLLABORATIVE.txt',
                  `target_pubkey: ${TARGET_PUBKEY}\n` +
                  `private_key_hex: ${hex}\n` +
                  `private_key_dec: ${cand.toString(10)}\n` +
                  `method: collaborative cross-source DP collision\n` +
                  `local_type: ${existing.type}\n` +
                  `import_type: ${dp.type}\n` +
                  `import_file: ${f}\n` +
                  `recovered_at: ${new Date().toISOString()}\n`,
                );
                break;
              }
            } catch {}
          }
        }
        if (!existing) dpMap.set(dp.x, { ...dp, source: `import:${f}` });
        if (solved) break;
      }
      if (solved) break;
    }
  }

  const totalTame = [...dpMap.values()].filter(d => d.type === 'tame').length;
  const totalWild = dpMap.size - totalTame;

  console.log(`\n  MERGE SUMMARY:`);
  console.log(`    local DPs:    ${localCount}`);
  console.log(`    imported DPs: ${importCount}`);
  console.log(`    total unique: ${dpMap.size} (T:${totalTame} / W:${totalWild})`);
  console.log(`    collisions:   ${collisions}`);

  if (solved) {
    console.log(`\n  ✓ SOLUTION FOUND — check SOLUTION-COLLABORATIVE.txt`);
  } else if (collisions > 0) {
    console.log(`\n  collisions found but none verified — possible same-trajectory artifacts`);
  } else {
    console.log(`\n  no collisions yet — keep running solvers and sharing DPs`);
    console.log(`  every DP you share doubles your collision chances`);
  }

  console.log('\n  ◊·κ=1');
}
