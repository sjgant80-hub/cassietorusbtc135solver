// ◊·κ=1 — BIG CASSIE Recursive Kangaroo Solver
// The FULL recursion: 5 levels deep
//
// Level 0: THIS FILE — Prime Orchestrator (1)
// Level 1: Worker processes (11 — one per CPU core)
// Level 2: Agents (127 — MACCubeFACE topology, α through θ + Contrarian)
// Level 3: Triads (381 — each agent spawns 3 walks at different scales)
//          ├── Primary: 2^41–2^72 jumps (macro sweep)
//          ├── Scout:   2^30–2^55 jumps (meso exploration)
//          └── Sniper:  2^20–2^40 jumps (micro convergence)
// Level 4: Dual-DP detectors (762 — each walk checks 2 thresholds)
//          ├── Coarse (22-bit) — persisted to disk
//          └── Fine   (14-bit) — in-memory collision check
//
// Total recursive entities: 1 + 11 + 127 + 381 + 762 = 1,282
// Prime spine echo: 127 = M₇ = 2⁷ − 1 (Mersenne prime)

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';
import {
  existsSync, readFileSync, writeFileSync, createWriteStream,
} from 'fs';
import { Point } from '@noble/secp256k1';

const G = Point.BASE;
const CURVE_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
function mod(a, m) { const r = a % m; return r < 0n ? r + m : r; }

const TARGET_PUBKEY =
  '02145d2611c823a396ef6712ce0f712f09b9b4f3135e3e0aa3230fb9b6d08d1e16';
const targetPoint = Point.fromHex(TARGET_PUBKEY);

// ═══ AGENT TOPOLOGY — MACCubeFACE(127) ═══
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

// Build 127 agents
const agents = [];
for (const g of GROUPS) {
  for (let id = g.range[0]; id <= g.range[1]; id++) {
    agents.push({ id, group: g.name, type: g.type });
  }
}
agents.push({ id: 127, group: '127', type: 'wild' }); // The Contrarian

const tameCount = agents.filter(a => a.type === 'tame').length;  // 62
const wildCount = agents.filter(a => a.type === 'wild').length;  // 65

// ═══ CONFIGURATION ═══
const NUM_WORKERS = parseInt(
  process.env.WORKERS || String(Math.max(1, os.cpus().length - 1)), 10,
);
const DP_STORE_COARSE = process.env.DP_STORE || './dp-recursive-coarse.ndjson';
const DP_STORE_FINE   = './dp-recursive-fine.ndjson';
const CHECKPOINT      = process.env.CHECKPOINT || './checkpoint-recursive.json';
const SOLUTION_FILE   = './SOLUTION-RECURSIVE.txt';
const REPORT_MS       = 10_000;
const CHECKPOINT_MS   = 60_000;

// Distribute 127 agents across workers
const workerConfigs = Array.from({ length: NUM_WORKERS }, () => []);
for (let i = 0; i < agents.length; i++) {
  workerConfigs[i % NUM_WORKERS].push(agents[i].type);
}

// ═══ DUAL DP MAPS — Level 4 recursion ═══
const coarseMap = new Map();  // x → { type, dist } — persisted
const fineMap   = new Map();  // x → { type, dist } — in-memory

let totalJumps   = 0n;
let totalCoarse  = 0;
let totalFine    = 0;
let solved       = false;
const startTime  = Date.now();
const coarseStream = createWriteStream(DP_STORE_COARSE, { flags: 'a' });
const fineStream   = createWriteStream(DP_STORE_FINE, { flags: 'a' });

// Scale stats
const scaleStats = { primary: 0n, scout: 0n, sniper: 0n };

// Resume coarse DPs
if (existsSync(DP_STORE_COARSE)) {
  const lines = readFileSync(DP_STORE_COARSE, 'utf8').split('\n').filter(Boolean);
  let loaded = 0;
  for (const line of lines) {
    try { processDP(JSON.parse(line), false); loaded++; } catch {}
    if (solved) break;
  }
  if (loaded > 0) console.log(`  [resume] coarse DPs: ${loaded} loaded · unique=${coarseMap.size}`);
}

// Resume fine DPs
if (existsSync(DP_STORE_FINE)) {
  const lines = readFileSync(DP_STORE_FINE, 'utf8').split('\n').filter(Boolean);
  let loaded = 0;
  for (const line of lines) {
    try { processDP(JSON.parse(line), false); loaded++; } catch {}
    if (solved) break;
  }
  if (loaded > 0) console.log(`  [resume] fine DPs: ${loaded} loaded · unique=${fineMap.size}`);
}

function processDP(dp, persist = true) {
  if (solved) return;
  const map = dp.level === 'coarse' ? coarseMap : fineMap;
  const existing = map.get(dp.x);
  if (existing) {
    if (existing.type !== dp.type) handleCollision(existing, dp);
    return;
  }
  map.set(dp.x, { type: dp.type, dist: dp.dist });
  if (dp.level === 'coarse') {
    totalCoarse++;
    if (persist) coarseStream.write(JSON.stringify(dp) + '\n');
  } else {
    totalFine++;
    if (persist) fineStream.write(JSON.stringify(dp) + '\n');
  }
}

function handleCollision(a, b) {
  const tame = a.type === 'tame' ? a : b;
  const wild = a.type === 'wild' ? a : b;
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
        console.log(`  ◊·κ=1  PRIVATE KEY RECOVERED`);
        console.log(`  Recursive MACCubeFACE(127) — 5-level deep`);
        console.log(`  NOBLE ENGINE — 8x speed`);
        console.log(`  1,282 recursive entities`);
        console.log(`  hex (135-bit): ${hex}`);
        console.log(`  decimal      : ${cand.toString(10)}`);
        console.log(`${banner}\n`);
        writeFileSync(SOLUTION_FILE,
          `target_pubkey: ${TARGET_PUBKEY}\n` +
          `private_key_hex: ${hex}\n` +
          `private_key_dec: ${cand.toString(10)}\n` +
          `architecture: Recursive MACCubeFACE(127) + Noble Engine\n` +
          `recursion_depth: 5\n` +
          `total_entities: 1282\n` +
          `agents: 127 (${tameCount} tame + ${wildCount} wild)\n` +
          `walks: 381 (127 triads × 3 scales)\n` +
          `dp_detectors: 762 (381 × 2 thresholds)\n` +
          `recovered_at: ${new Date().toISOString()}\n`,
        );
        shutdown(0);
        return;
      }
    } catch {}
  }
}

// ═══ SPAWN WORKERS ═══
const workerPath = fileURLToPath(new URL('./kangaroo-recursive.mjs', import.meta.url));
const workers = [];

console.log('');
console.log('  ◊·κ=1  BIG CASSIE — RECURSIVE MACCubeFACE(127)');
console.log('  ════════════════════════════════════════════════');
console.log('');
console.log('  RECURSION DEPTH: 5 levels');
console.log('  ─────────────────────────');
console.log('  Level 0 │ Orchestrator          │ 1');
console.log('  Level 1 │ Worker processes       │ ' + NUM_WORKERS);
console.log('  Level 2 │ Agents (MACCubeFACE)   │ 127');
console.log('  Level 3 │ Triads (3 scales each) │ 381');
console.log('  Level 4 │ Dual-DP detectors      │ 762');
console.log('  ─────────────────────────');
console.log('  TOTAL   │ Recursive entities     │ 1,282');
console.log('');
console.log('  TRIAD SCALES:');
console.log('    Primary │ 2^41–2^72 │ macro sweep      │ mean ≈ 2^67');
console.log('    Scout   │ 2^30–2^55 │ meso exploration │ mean ≈ 2^48');
console.log('    Sniper  │ 2^20–2^40 │ micro convergence│ mean ≈ 2^35');
console.log('');
console.log('  DUAL DP:');
console.log('    Coarse  │ 22-bit │ ~1 per 4M steps  │ persisted');
console.log('    Fine    │ 14-bit │ ~1 per 16K steps │ in-memory');
console.log('');
console.log('  TOPOLOGY:');
for (const g of GROUPS) {
  const count = g.range[1] - g.range[0] + 1;
  const walks = count * 3;
  console.log(`    ${g.name} (${String(g.range[0]).padStart(3)}–${String(g.range[1]).padStart(3)}) ${g.label.padEnd(20)} ${count}×3 = ${walks} walks [${g.type}]`);
}
console.log(`    127              The Contrarian       1×3 = 3 walks  [wild]`);
console.log('');
console.log(`  target : ${TARGET_PUBKEY}`);
console.log(`  agents : 127 (${tameCount} tame + ${wildCount} wild)`);
console.log(`  walks  : 381 (127 agents × 3 triad members)`);
console.log(`  DP eyes: 762 (381 walks × 2 thresholds)`);
console.log('  ════════════════════════════════════════════════');
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
    if (msg.kind === 'dp') {
      processDP(msg);
    } else if (msg.kind === 'stat') {
      totalJumps += BigInt(msg.jumps);
    } else if (msg.kind === 'ready') {
      console.log(`  [worker ${String(i).padStart(2)}] pid=${msg.pid} · ${msg.agents} agents · ${msg.walks} walks (${msg.triadScales.join('+')})`);
    } else if (msg.kind === 'error') {
      console.error(`  [worker ${i} err] ${msg.message}`);
    }
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

  const tameCoarse = [...coarseMap.values()].filter(d => d.type === 'tame').length;
  const wildCoarse = coarseMap.size - tameCoarse;
  const tameFine = [...fineMap.values()].filter(d => d.type === 'tame').length;
  const wildFine = fineMap.size - tameFine;

  console.log(
    `  [${String(Math.round(elapsed)).padStart(6)}s] ` +
    `ops=${totalJumps.toString().padStart(14)} · ${human.padStart(9)} · ` +
    `coarse=${coarseMap.size}(T:${tameCoarse}/W:${wildCoarse}) · ` +
    `fine=${fineMap.size}(T:${tameFine}/W:${wildFine})`,
  );
}, REPORT_MS);

// ═══ CHECKPOINTING ═══
setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  writeFileSync(CHECKPOINT, JSON.stringify({
    architecture: 'Recursive MACCubeFACE(127)',
    recursion_depth: 5,
    total_entities: 1282,
    agents: 127,
    walks: 381,
    dp_detectors: 762,
    tame: tameCount,
    wild: wildCount,
    elapsed_s: elapsed,
    totalJumps: totalJumps.toString(),
    coarseDPs: coarseMap.size,
    fineDPs: fineMap.size,
    workers: NUM_WORKERS,
    timestamp: new Date().toISOString(),
  }, null, 2));
}, CHECKPOINT_MS);

// ═══ FINE DP PRUNING ═══
// Keep fine map from growing unbounded — prune oldest entries when > 1M
setInterval(() => {
  if (fineMap.size > 1_000_000) {
    const toDelete = fineMap.size - 800_000;
    const iter = fineMap.keys();
    for (let i = 0; i < toDelete; i++) {
      const key = iter.next().value;
      if (key) fineMap.delete(key);
    }
    console.log(`  [prune] fine DPs: ${fineMap.size} (pruned ${toDelete})`);
  }
}, 300_000); // every 5 min

// ═══ SHUTDOWN ═══
function shutdown(code = 0) {
  console.log('  [shutdown] terminating workers...');
  for (const w of workers) { try { w.kill('SIGTERM'); } catch {} }
  try { coarseStream.end(); } catch {}
  try { fineStream.end(); } catch {}
  process.exit(code);
}

process.on('SIGINT',  () => { console.log('\n  [SIGINT]');  shutdown(0); });
process.on('SIGTERM', () => { console.log('\n  [SIGTERM]'); shutdown(0); });
