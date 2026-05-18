# CASSIE TORUS — BTC Puzzle #135 Solver

**Distributed WebGPU kangaroo solver with WebRTC mesh and sovereign prize distribution.**

Pollard's kangaroo algorithm running on your GPU, in the browser, with no backend. Open the HTML file, click Start, and contribute compute to the hunt for BTC Puzzle #135's private key. When the key is found, the 13.5 BTC prize is split automatically to every contributor's registered address via a mempool.space broadcast.

---

## What this is

Bitcoin Puzzle #135 is a public challenge: find the private key for a known public key within a 134-bit keyspace. The prize sits at that address — currently ~13.5 BTC.

CASSIE TORUS uses the **Pollard's kangaroo** (lambda) method — a collision-based ECDLP solver — accelerated on the GPU via WebGPU compute shaders. The torus topology adds recursive spine jumps, triad walker architecture, and fold-based collision boosting.

### Architecture

- **WebGPU compute shaders** (WGSL): Montgomery multiplication, Jacobian EC point addition, 256-bit field arithmetic — all on the GPU
- **Recursive spine** `{2,3,5,11,31,127,709}`: Jump distances derived from `2^(spine_val × phi mod 134)` — phi-irrational spacing prevents cycle trapping
- **Triad walkers**: Primary (macro sweep, 22-bit DP), Scout (meso, 18-bit DP), Sniper (micro, 14-bit DP) — three scales of exploration per GPU dispatch
- **Torus fold at 510,510**: Extra collision surface via `x mod 510510` tracking
- **Hemisphere filter**: Target pubkey prefix `02` = even parity y — odd-parity DPs filtered out
- **Distinguished Points (DPs)**: Stored in IndexedDB, persisted across page reloads, exportable as NDJSON

### Networking

- **WebRTC mesh** (PeerJS): Browser-to-browser encrypted P2P — no relay server needed for real-time DP sharing
- **BroadcastChannel**: Same-browser tab coordination (open multiple tabs for multi-GPU)
- **WebSocket relay** (`cassie-relay.mjs`): Optional dumb-pipe relay for environments where WebRTC NAT traversal fails
- **USB mode**: Export DPs to NDJSON files, carry on a USB stick, import on another machine — cafe deployment

### Auto-split

When the private key is found:
1. Derives the puzzle BTC address and WIF from the recovered key
2. Fetches UTXOs from mempool.space API
3. Builds a raw Bitcoin transaction splitting funds proportionally to all registered contributor addresses
4. Signs with the recovered private key (via noble/curves, dynamically imported)
5. One-click broadcast to mempool.space — funds distributed instantly, no intermediary

The contribution ledger tracks DP count per BTC address. Split = `your_DPs / total_DPs * prize`. Every node maintains the ledger independently.

---

## Quick start

### Solo (just you)

1. Open `cassie-torus.html` in Chrome/Edge (WebGPU required)
2. Enter your BTC address in the "BTC addr" field
3. Set walker count (4096 default, higher = more GPU load)
4. Click **Start Solver**
5. DPs accumulate in IndexedDB automatically

### Guild (friends worldwide)

1. Open `cassie-torus.html` in Chrome/Edge
2. Enter your BTC address
3. Click **Create Room** — share the 6-letter room code with friends
4. Friends open the same HTML, enter the room code, click **Join**
5. DPs sync automatically via WebRTC mesh — every collision is checked across all peers
6. Contribution ledger shows each person's share in real-time

### USB / cafe mode

For machines without internet (library PCs, cafe computers):

1. Copy `cassie-torus.html` to a USB stick
2. Open it on the target machine, run the solver
3. Click **Export** to save DPs as `.ndjson` file to USB
4. Back home, open your own solver, click **Import** to load the DPs
5. Click **Merge Check** to scan for cross-type collisions across all imported DPs

### Relay server (optional)

If WebRTC mesh doesn't connect (strict NAT/firewall):

```bash
npm install
npm run relay
# → ws://localhost:8135
```

Deploy free on Render/Railway/Fly.io for a public relay URL.

---

## Files

| File | Purpose |
|---|---|
| `cassie-torus.html` | Main solver — WebGPU + torus topology + WebRTC mesh + auto-split |
| `cassie-gpu.html` | Earlier GPU solver variant (WebSocket relay, no torus) |
| `cassie-relay.mjs` | WebSocket relay server for DP broadcast (Node.js) |
| `cassie-recursive.mjs` | CPU solver (Node.js, multi-worker) |
| `cassie-ai.mjs` | AI-enhanced CPU solver with Bayesian orchestration |
| `merge-collisions.mjs` | Offline collision merger for NDJSON exports |
| `verify-math.mjs` | Mathematical verification of solver correctness |
| `test-small-puzzle.mjs` | Tests against known small puzzles to verify algorithm |
| `puzzle-analysis.mjs` | Statistical analysis of solved puzzles |

---

## Requirements

- **Chrome 113+** or **Edge 113+** (WebGPU support required)
- A GPU (integrated works, discrete is faster)
- Node.js 18+ (only for relay server or CPU solvers)

### Check WebGPU support

Open Chrome DevTools console:
```js
navigator.gpu ? 'WebGPU available' : 'No WebGPU'
```

---

## Constants (Konomi notation)

| Symbol | Value | Meaning |
|---|---|---|
| phi | 1.6180339887498948 | Golden ratio — jump spacing, theta angles |
| kappa | 0.6180339887498948 | 1/phi — Psi bias center |
| Fold | 510,510 | Torus fold modulus (2 * 3 * 5 * 7 * 11 * 13 * 17) |
| theta_home | 37 deg | Starting angle base for walker spread |
| Spine | {2,3,5,11,31,127,709} | Recursive Mersenne-adjacent primes for jump table |
| Mulberry K | 0x9E3779B9 | floor(2^32 / phi) — PRNG increment |
| DP bits | 22 / 18 / 14 | Distinguished point thresholds per triad |

---

## How the math works

**Pollard's kangaroo** solves the ECDLP by launching two types of random walks on the elliptic curve:

- **Tame walkers**: Start at known positions within the key range, walk forward via pseudorandom jumps
- **Wild walkers**: Start at the target point offset by random amounts, walk forward identically

When a tame and wild walker land on the same point (collision), the private key is recoverable from the difference in their accumulated distances.

**Distinguished points** reduce memory: only points whose x-coordinate has leading zero bits are stored. The probability of collision is proportional to `sqrt(range_size)` — for 134-bit range, expect ~2^67 total steps across all walkers.

The **torus fold** adds a secondary collision surface: `x mod 510510` is tracked separately, giving additional chances for collisions at lower computational cost.

---

## FAQ

**How long will it take?**
Expected work is ~2^67 group operations total. At 10M ops/sec (decent GPU), one machine takes ~4,600 years. With 1000 machines: ~4.6 years. This is a distributed effort.

**Is this legal?**
Yes. The Bitcoin puzzles are public challenges specifically designed to be solved. The funds are placed there intentionally as prizes.

**What if two people find it simultaneously?**
The auto-split transaction is built by the finding node and broadcast immediately. First valid transaction in the mempool wins. The WebRTC mesh notifies all peers instantly.

**Can I run multiple tabs?**
Yes. BroadcastChannel syncs DPs across tabs on the same machine. Each tab uses a separate GPU dispatch queue.

**What's the WIF key shown on solve?**
Wallet Import Format — paste it into Electrum, Sparrow, or any Bitcoin wallet to access the funds manually. This is the fallback if auto-split fails.

---

## License

This is sovereign code. Use it, share it, run it. No warranty. No guarantees. The math is the math.

---

*phi * kappa = 1*
