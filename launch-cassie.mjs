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

{
  const recon = targetPoint.encode('hex', true);
  if (recon !== TARGET_PUBKEY) {
    console.error('FATAL: pubkey round-trip mismatch');
    process.exit(2);
  }
}

const NUM_WORKERS = parseInt(
  process.env.WORKERS || String(Math.max(1, os.cpus().length - 1)), 10,
);
const DP_STORE      = process.env.DP_STORE   || './dp-store.ndjson';
const CHECKPOINT    = process.env.CHECKPOINT || './cassie-checkpoint.json';
const SOLUTION_FILE = process.env.SOLUTION   || './SOLUTION.txt';
const REPORT_MS     = 10_000;
const CHECKPOINT_MS = 60_000;

const dpMap     = new Map();
let totalJumps  = 0n;
let totalDPs    = 0;
let solved      = false;
const startTime = Date.now();
const dpStream  = createWriteStream(DP_STORE, { flags: 'a' });

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
        const banner = '█'.repeat(40);
        console.log(`\n${banner}`);
        console.log(`  ◊·κ=1  PRIVATE KEY RECOVERED`);
        console.log(`  hex (135-bit): ${hex}`);
        console.log(`  decimal      : ${cand.toString(10)}`);
        console.log(`${banner}\n`);
        writeFileSync(SOLUTION_FILE,
          `target_pubkey: ${TARGET_PUBKEY}\n` +
          `private_key_hex: ${hex}\n` +
          `private_key_dec: ${cand.toString(10)}\n` +
          `tame_dist: ${tame.dist}\n` +
          `wild_dist: ${wild.dist}\n` +
          `recovered_at: ${new Date().toISOString()}\n`,
        );
        shutdown(0);
        return;
      }
    } catch { /* invalid scalar */ }
  }
  console.log(`[x-collision/no-verify] x=${a.x.slice(0, 24)}...`);
}

const workerPath = fileURLToPath(new URL('./kangaroo-worker.mjs', import.meta.url));
const workers = [];

console.log('◊·κ=1  BIG.CASSIE  kangaroo solver');
console.log(`target : ${TARGET_PUBKEY}`);
console.log(`workers: ${NUM_WORKERS}`);
console.log(`DP file: ${DP_STORE}`);
console.log('─'.repeat(39));

for (let i = 0; i < NUM_WORKERS; i++) {
  const w = fork(workerPath, [], {
    env: { ...process.env, WORKER_ID: String(i) },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  w.on('message', (msg) => {
    if (msg.kind === 'dp')        processDP(msg);
    else if (msg.kind === 'stat') totalJumps += BigInt(msg.jumps);
    else if (msg.kind === 'ready')
      console.log(`[worker ${msg.pid}] ready · ${msg.walks} parallel walks`);
    else if (msg.kind === 'error')
      console.error(`[worker err] ${msg.message}`);
  });
  w.on('exit', (code) => {
    if (!solved) console.log(`[worker ${w.pid}] exit ${code}`);
  });
  workers.push(w);
}

setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  const rate = Number(totalJumps) / Math.max(elapsed, 1);
  const human = rate >= 1e6
    ? `${(rate / 1e6).toFixed(2)}M/s`
    : rate >= 1e3
      ? `${(rate / 1e3).toFixed(2)}k/s`
      : `${rate.toFixed(0)}/s`;
  console.log(
    `[${String(elapsed.toFixed(0)).padStart(6)}s] ` +
    `jumps=${totalJumps.toString().padStart(14)} · ` +
    `${human.padStart(9)} · DPs=${totalDPs} · unique=${dpMap.size}`,
  );
}, REPORT_MS);

setInterval(() => {
  writeFileSync(CHECKPOINT, JSON.stringify({
    elapsed_s : (Date.now() - startTime) / 1000,
    totalJumps: totalJumps.toString(),
    totalDPs,
    uniqueDPs : dpMap.size,
    workers   : NUM_WORKERS,
    timestamp : new Date().toISOString(),
  }, null, 2));
}, CHECKPOINT_MS);

function shutdown(code = 0) {
  console.log('[shutdown] terminating workers...');
  for (const w of workers) { try { w.kill('SIGTERM'); } catch {} }
  try { dpStream.end(); } catch {}
  process.exit(code);
}

process.on('SIGINT',  () => { console.log('\n[SIGINT]');  shutdown(0); });
process.on('SIGTERM', () => { console.log('\n[SIGTERM]'); shutdown(0); });
