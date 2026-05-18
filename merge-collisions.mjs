// ◊·κ=1 — BIG CASSIE Cross-Pool Collision Detector
// Claude-in-Claude-in-Claude: merges DP stores from all agent pools
// and checks for tame↔wild collisions across pools

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import elliptic from 'elliptic';
import BN from 'bn.js';

const { ec: EC } = elliptic;
const ec = new EC('secp256k1');
const n = ec.curve.n;
const G = ec.curve.g;

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = ec.keyFromPublic(TARGET_PUBKEY, 'hex').getPublic();

const POOLS = ['alpha', 'beta', 'gamma'];
const SOLUTION_FILE = './SOLUTION.txt';

// Load all DPs from all pools
const allDPs = new Map(); // x_hex → { type, dist, pool }
let totalLoaded = 0;
let collisions = 0;
let solved = false;
let foundKey = null;

console.log('◊·κ=1  Cross-Pool Collision Merger');
console.log('═'.repeat(50));

for (const pool of POOLS) {
  const dpFile = join('.', `dp-pool-${pool}.ndjson`);
  if (!existsSync(dpFile)) {
    console.log(`  pool-${pool}: no DP file yet`);
    continue;
  }
  const lines = readFileSync(dpFile, 'utf8').split('\n').filter(Boolean);
  let poolCount = 0;
  for (const line of lines) {
    try {
      const dp = JSON.parse(line);
      poolCount++;
      totalLoaded++;
      const existing = allDPs.get(dp.x);
      if (existing) {
        if (existing.type !== dp.type) {
          collisions++;
          console.log(`\n  ██ CROSS-POOL COLLISION ██`);
          console.log(`    pool ${existing.pool} (${existing.type}) ↔ pool ${pool} (${dp.type})`);
          console.log(`    x = ${dp.x.slice(0, 32)}...`);

          const tame = existing.type === 'tame' ? existing : dp;
          const wild = existing.type === 'wild' ? existing : dp;
          const tameLog = new BN(tame.dist, 16);
          const wildAcc = new BN(wild.dist, 16);

          const candidates = [
            tameLog.sub(wildAcc).umod(n),
            tameLog.neg().sub(wildAcc).umod(n),
          ];

          for (const cand of candidates) {
            if (cand.isZero()) continue;
            try {
              const test = G.mul(cand);
              if (test.eq(targetPoint)) {
                solved = true;
                foundKey = cand;
                const hex = cand.toString(16).padStart(34, '0');
                const banner = '█'.repeat(50);
                console.log(`\n${banner}`);
                console.log(`  ◊·κ=1  PRIVATE KEY RECOVERED (CROSS-POOL)`);
                console.log(`  hex (135-bit): ${hex}`);
                console.log(`  decimal      : ${cand.toString(10)}`);
                console.log(`${banner}\n`);
                writeFileSync(SOLUTION_FILE,
                  `target_pubkey: ${TARGET_PUBKEY}\n` +
                  `private_key_hex: ${hex}\n` +
                  `private_key_dec: ${cand.toString(10)}\n` +
                  `tame_pool: ${tame.pool || 'unknown'}\n` +
                  `wild_pool: ${wild.pool || 'unknown'}\n` +
                  `tame_dist: ${tame.dist}\n` +
                  `wild_dist: ${wild.dist}\n` +
                  `recovered_at: ${new Date().toISOString()}\n` +
                  `method: claude-in-claude-in-claude cross-pool collision\n`,
                );
                break;
              }
            } catch { /* invalid scalar */ }
          }
          if (!solved) {
            console.log(`    collision did not verify — same-side or hash artefact`);
          }
        }
        // Same type collision — just a DP appearing in multiple walks, skip
      } else {
        allDPs.set(dp.x, { type: dp.type, dist: dp.dist, pool });
      }
    } catch { /* skip malformed */ }
    if (solved) break;
  }
  console.log(`  pool-${pool}: ${poolCount} DPs loaded`);
  if (solved) break;
}

// Also check the main dp-store if it exists
const mainStore = './dp-store.ndjson';
if (existsSync(mainStore)) {
  const lines = readFileSync(mainStore, 'utf8').split('\n').filter(Boolean);
  let mainCount = 0;
  for (const line of lines) {
    try {
      const dp = JSON.parse(line);
      if (!dp.x) continue;
      mainCount++;
      totalLoaded++;
      const existing = allDPs.get(dp.x);
      if (existing && existing.type !== dp.type) {
        collisions++;
        console.log(`  collision: main ↔ pool-${existing.pool}`);
      }
      if (!existing) allDPs.set(dp.x, { type: dp.type, dist: dp.dist, pool: 'main' });
    } catch {}
  }
  if (mainCount > 0) console.log(`  main store: ${mainCount} DPs loaded`);
}

console.log('');
console.log(`  total DPs loaded: ${totalLoaded}`);
console.log(`  unique x-coords:  ${allDPs.size}`);
console.log(`  tame DPs: ${[...allDPs.values()].filter(d => d.type === 'tame').length}`);
console.log(`  wild DPs: ${[...allDPs.values()].filter(d => d.type === 'wild').length}`);
console.log(`  cross-type collisions: ${collisions}`);

if (solved) {
  console.log(`\n  ✓ SOLUTION WRITTEN TO ${SOLUTION_FILE}`);
} else {
  console.log(`\n  no solution yet — keep running pools`);
  // Estimate progress
  const uniqueDPs = allDPs.size;
  const neededDPs = Math.pow(2, 67 - 22); // √range / 2^DP_BITS
  const progress = uniqueDPs / neededDPs;
  console.log(`  estimated progress: ${(progress * 100).toExponential(2)}%`);
  console.log(`  DPs needed (est): ~2^${(67-22).toFixed(0)} = ${Math.round(neededDPs).toExponential(2)}`);
}

console.log('\n◊·κ=1');
