// ◊·κ=1 — BIG CASSIE 127-Agent Kangaroo Solver
// MACCubeFACE(127) — Mersenne prime M₇ = 2⁷ − 1
// 135 − gap(8) = 127 kangaroo agents
//
// Architecture:
//   α (1–16)    Inbound scouts    — 16 wild kangaroos (explore from target)
//   β (17–32)   Pursuit pack      — 16 tame kangaroos (anchor from known points)
//   γ (33–48)   Flanking squad    — 16 wild kangaroos
//   δ (49–64)   Pincer team       — 16 tame kangaroos
//   ε (65–80)   Sweep unit        — 16 wild kangaroos
//   ζ (81–96)   Convergence corps — 16 tame kangaroos
//   η (97–112)  Encirclement ring — 16 wild kangaroos
//   θ (113–126) Pattern hunters   — 14 tame kangaroos
//   Agent 127   The Contrarian    — 1 wild kangaroo (adversarial check)
//
// Tame: β, δ, ζ, θ = 62 agents (known starting scalars)
// Wild: α, γ, ε, η, 127 = 65 agents (offsets from target pubkey)
// Total: 127 agents
//
// Distributed across N worker processes (one per CPU core minus one).
// Each worker runs ceil(127/N) kangaroo walks.

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import {
  existsSync, readFileSync, writeFileSync, createWriteStream,
} from 'fs';
import elliptic from 'elliptic';
import BN from 'bn.js';

const { ec: EC } = elliptic;
const ec = new EC('secp256k1');
const n = ec.curve.n;
const G = ec.curve.g;

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = ec.keyFromPublic(TARGET_PUBKEY, 'hex').getPublic();

// Verify pubkey
{
  const recon = targetPoint.encode('hex', true);
  if (recon !== TARGET_PUBKEY) {
    console.error('FATAL: pubkey round-trip mismatch');
    process.exit(2);
  }
}

// ═══ AGENT TOPOLOGY ═══
const GROUPS = [
  { name: 'α', label: 'Inbound scouts',      range: [1, 16],   type: 'wild' },
  { name: 'β', label: 'Pursuit pack',         range: [17, 32],  type: 'tame' },
  { name: 'γ', label: 'Flanking squad',       range: [33, 48],  type: 'wild' },
  { name: 'δ', label: 'Pincer team',          range: [49, 64],  type: 'tame' },
  { name: 'ε', label: 'Sweep unit',           range: [65, 80],  type: 'wild' },
  { name: 'ζ', label: 'Convergence corps',    range: [81, 96],  type: 'tame' },
  { name: 'η', label: 'Encirclement ring',    range: [97, 112], type: 'wild' },
  { name: 'θ', label: 'Pattern hunters',      range: [113, 126],type: 'tame' },
];
const CONTRARIAN = { id: 127, name: '127', label: 'The Contrarian', type: 'wild' };

// Build full agent manifest: 127 agents with their types
const agents = [];
for (const g of GROUPS) {
  for (let id = g.range[0]; id <= g.range[1]; id++) {
    agents.push({ id, group: g.name, type: g.type });
  }
}
agents.push({ id: 127, group: '127', type: CONTRARIAN.type });

const tameCount = agents.filter(a => a.type === 'tame').length;
const wildCount = agents.filter(a => a.type === 'wild').length;

// ═══ CONFIGURATION ═══
const NUM_WORKERS = parseInt(
  process.env.WORKERS || String(Math.max(1, os.cpus().length - 1)), 10,
);
const DP_STORE      = process.env.DP_STORE   || './dp-store-127.ndjson';
const CHECKPOINT    = process.env.CHECKPOINT || './checkpoint-127.json';
const SOLUTION_FILE = process.env.SOLUTION   || './SOLUTION-127.txt';
const REPORT_MS     = 10_000;
const CHECKPOINT_MS = 60_000;

// Distribute 127 agents across workers
// Each worker gets a WALK_CONFIG: JSON array of { type: 'tame'|'wild' }
const workerConfigs = Array.from({ length: NUM_WORKERS }, () => []);
for (let i = 0; i < agents.length; i++) {
  workerConfigs[i % NUM_WORKERS].push(agents[i].type);
}

// ═══ DP COLLISION DETECTION ═══
const dpMap     = new Map();
let totalJumps  = 0n;
let totalDPs    = 0;
let solved      = false;
const startTime = Date.now();
const dpStream  = createWriteStream(DP_STORE, { flags: 'a' });

// Group stats
const groupStats = {};
for (const g of GROUPS) groupStats[g.name] = { jumps: 0n, dps: 0 };
groupStats['127'] = { jumps: 0n, dps: 0 };

// Resume from existing DP store
if (existsSync(DP_STORE)) {
  const lines = readFileSync(DP_STORE, 'utf8').split('\n').filter(Boolean);
  let loaded = 0;
  for (const line of lines) {
    try {
      processDP(JSON.parse(line), false);
      loaded++;
    } catch {/* skip malformed */}
    if (solved) break;
  }
  if (loaded > 0) console.log(`[resume] loaded ${loaded} DPs · unique=${dpMap.size}`);
}

function processDP(dp, persist = true) {
  if (solved) return;
  const existing = dpMap.get(dp.x);
  if (existing) {
    if (existing.type !== dp.type) handleCollision(existing, dp);
    return;
  }
  dpMap.set(dp.x, { type: dp.type, dist: dp.dist });
  totalDPs++;
  if (persist) dpStream.write(JSON.stringify(dp) + '\n');
}

function handleCollision(a, b) {
  const tame = a.type === 'tame' ? a : b;
  const wild = a.type === 'wild' ? a : b;
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
        const hex = cand.toString(16).padStart(34, '0');
        const banner = '█'.repeat(50);
        console.log(`\n${banner}`);
        console.log(`  ◊·κ=1  PRIVATE KEY RECOVERED`);
        console.log(`  MACCubeFACE(127) — 127 agents`);
        console.log(`  hex (135-bit): ${hex}`);
        console.log(`  decimal      : ${cand.toString(10)}`);
        console.log(`${banner}\n`);
        writeFileSync(SOLUTION_FILE,
          `target_pubkey: ${TARGET_PUBKEY}\n` +
          `private_key_hex: ${hex}\n` +
          `private_key_dec: ${cand.toString(10)}\n` +
          `tame_dist: ${tame.dist}\n` +
          `wild_dist: ${wild.dist}\n` +
          `recovered_at: ${new Date().toISOString()}\n` +
          `architecture: MACCubeFACE(127)\n` +
          `agents: 127 (${tameCount} tame + ${wildCount} wild)\n`,
        );
        shutdown(0);
        return;
      }
    } catch { /* invalid scalar */ }
  }
  console.log(`[x-collision/no-verify] x=${a.x?.slice(0, 24) || '?'}...`);
}

// ═══ SPAWN WORKERS ═══
const workerPath = fileURLToPath(new URL('./kangaroo-worker-127.mjs', import.meta.url));
const workers = [];

console.log('');
console.log('  ◊·κ=1  BIG CASSIE — MACCubeFACE(127)');
console.log('  ═══════════════════════════════════════');
console.log(`  target : ${TARGET_PUBKEY}`);
console.log(`  agents : 127 (${tameCount} tame + ${wildCount} wild)`);
console.log(`  workers: ${NUM_WORKERS} (one per core)`);
console.log(`  DP file: ${DP_STORE}`);
console.log('');
console.log('  TOPOLOGY:');
for (const g of GROUPS) {
  const count = g.range[1] - g.range[0] + 1;
  console.log(`    ${g.name} (${String(g.range[0]).padStart(3)}–${String(g.range[1]).padStart(3)}) ${g.label.padEnd(20)} ${count} ${g.type}`);
}
console.log(`    127              The Contrarian       1 ${CONTRARIAN.type}`);
console.log('  ═══════════════════════════════════════');
console.log('');

for (let i = 0; i < NUM_WORKERS; i++) {
  const config = workerConfigs[i];
  const w = fork(workerPath, [], {
    env: {
      ...process.env,
      WORKER_ID: String(i),
      WALK_CONFIG: JSON.stringify(config),
    },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  w.on('message', (msg) => {
    if (msg.kind === 'dp')        processDP(msg);
    else if (msg.kind === 'stat') totalJumps += BigInt(msg.jumps);
    else if (msg.kind === 'ready')
      console.log(`  [worker ${i}] pid=${msg.pid} · ${msg.walks} walks`);
    else if (msg.kind === 'error')
      console.error(`  [worker ${i} err] ${msg.message}`);
  });
  w.on('exit', (code) => {
    if (!solved) console.log(`  [worker ${i}] exit ${code}`);
  });
  workers.push(w);
}

// ═══ REPORTING ═══
setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = Number(totalJumps) / Math.max(elapsed, 1);
  const human = rate >= 1e6
    ? `${(rate / 1e6).toFixed(2)}M/s`
    : rate >= 1e3
      ? `${(rate / 1e3).toFixed(1)}k/s`
      : `${rate.toFixed(0)}/s`;

  // Estimate: expected DPs for collision ≈ 2^(67-DP_BITS)
  // With DP_BITS=22, need ~2^45 ≈ 3.5e13 DPs
  const dpBits = parseInt(process.env.DP_BITS || '22', 10);
  const neededDPs = Math.pow(2, 67 - dpBits);
  const progressPct = (dpMap.size / neededDPs * 100);

  const tameStored = [...dpMap.values()].filter(d => d.type === 'tame').length;
  const wildStored = dpMap.size - tameStored;

  console.log(
    `  [${String(Math.round(elapsed)).padStart(6)}s] ` +
    `ops=${totalJumps.toString().padStart(14)} · ` +
    `${human.padStart(9)} · ` +
    `DPs=${dpMap.size} (T:${tameStored}/W:${wildStored}) · ` +
    `${progressPct.toExponential(2)}%`,
  );
}, REPORT_MS);

// ═══ CHECKPOINTING ═══
setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  writeFileSync(CHECKPOINT, JSON.stringify({
    architecture: 'MACCubeFACE(127)',
    agents: 127,
    tame: tameCount,
    wild: wildCount,
    elapsed_s: elapsed,
    totalJumps: totalJumps.toString(),
    totalDPs,
    uniqueDPs: dpMap.size,
    workers: NUM_WORKERS,
    timestamp: new Date().toISOString(),
  }, null, 2));
}, CHECKPOINT_MS);

// ═══ SHUTDOWN ═══
function shutdown(code = 0) {
  console.log('  [shutdown] terminating workers...');
  for (const w of workers) { try { w.kill('SIGTERM'); } catch {} }
  try { dpStream.end(); } catch {}
  process.exit(code);
}

process.on('SIGINT',  () => { console.log('\n  [SIGINT]');  shutdown(0); });
process.on('SIGTERM', () => { console.log('\n  [SIGTERM]'); shutdown(0); });
