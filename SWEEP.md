# ◊·κ SWEEP PROCEDURE — sub-60-second key→funds

## Setup (do this BEFORE starting CASSIE)

1. Open `cassie-torus-v2.html`
2. In the PRIME WALLET row at the top:
   - Paste your COLD wallet destination address (P2PKH `1...` or P2WPKH `bc1q...` or P2SH `3...`)
   - Click **Prime**
3. Optional: tick **AUTO-BROADCAST** for zero-click sweep on key find
4. Status row should read: `✓ primed → <addr>… · libs ready · N UTXOs cached`
5. Click **Start Solver**
6. On Start the sweep stack auto-warms:
   - `@noble/curves` + `@noble/hashes` imported and cached
   - UTXOs at puzzle address pre-fetched
   - Fastest fee rate cached
   - All refreshed every 30s / 60s while running

## What happens when CASSIE finds the key

1. `onCollisionFound(privateKey, puzzleId)` fires
2. `fastSweep(privateKey)` called immediately:
   - Derives addresses from key (compressed first — BTC puzzle convention)
   - Verifies funded UTXOs (uses cached if recent, else live fetch)
   - Computes fee at fastest rate (floor 30 sat/vB)
   - Builds **single-output transaction** to your primed wallet
   - Signs with the private key
3. If **AUTO-BROADCAST** ticked: posts to `mempool.space/api/tx` immediately, logs the txid
4. Otherwise: shows a green **BROADCAST NOW** button — one click sends it

Typical timing on a warm connection: **500-1500ms** key→broadcast.

## Backup: standalone Node script

If the browser dies AFTER finding the key but BEFORE sweeping, paste the key from the log into `sweep.js`:

```bash
npm install @noble/curves@1.7.0 @noble/hashes@1.5.0
node sweep.js <private-key-hex> <destination-btc-address>
```

Example:
```bash
node sweep.js 4d33e7665705359f04f28b88cf897c603c9 bc1qyour-cold-wallet-here
```

The script:
1. Derives all 4 address formats from the key
2. Queries mempool.space for UTXOs (compressed P2PKH first — canonical for BTC puzzles)
3. Fetches fastest fee
4. Builds + signs single-output tx to destination
5. Broadcasts to mempool.space
6. Prints txid + mempool.space URL

Wall-clock ~3-5 seconds on warm internet.

## Threat model

The biggest risk is **mempool sniping**: bots watch known BTC puzzle addresses for ANY outgoing transaction. The moment you broadcast a tx with a low fee, a sniper can:
1. See your tx in mempool
2. Submit a competing tx (using YOUR exposed private key, since signing reveals it)
3. Pay a higher fee → wins the block

**Defence:**
- We sign with `fastestFee` from mempool.space (floored at 30 sat/vB)
- Single-output tx → smallest possible size → highest fee/vB ratio
- Pre-warmed crypto → no import lag at the critical moment
- Auto-broadcast option → zero click latency

There is NO defence against an attacker who has been continuously monitoring the puzzle address with a higher fee budget. Fast is the only defence.

## Validation done

Sweep derivation verified against:
- Puzzle 1 (priv `0x1`) → compressed `1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH` ✓
- Puzzle 130 (priv `0x33e7665...c603c9`) → compressed `1Fo65aKq8s8iquMt6weF1rku1moWVEd5Ua` ✓

Both BTC puzzle reference addresses match the **compressed** P2PKH derivation. The sweep flow defaults to compressed → uncompressed fallback.

## Key safety

Your destination address is persisted to `localStorage` under `cassie_sweep_dest`. It does NOT leave your browser. Mempool API calls go directly from your tab to `mempool.space` — no intermediary.

The private key, once found, is logged to console **only** and used for signing. It never leaves the tab via network except inside the signed transaction.

## Manual fallback chain

Even if everything fails:
1. Key is in the in-browser log: `COLLISION / puzzle 135 SOLVED / key 4d33...`
2. Copy the hex, open Electrum or Sparrow
3. Import as **compressed WIF** (CASSIE shows the WIF in the address dump)
4. Sweep to your address manually

CASSIE has been engineered so that even the worst-case path (browser crashes mid-sweep) gives you the key for manual recovery.

◊·κ=1 · prepared mind · sub-60-second window held open
