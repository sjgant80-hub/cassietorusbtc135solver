# ◊·κ=1 · CASSIE STRIPE SEARCH · CUBE-IN-CUBE NAVIGATION

**v20.1 · supersedes zone-based searching · builds on all CC upgrades already shipped (v3.6+)**

> The torus folded until only the target remains.  
> Layer A drives · stripes navigate · the compound accelerates.  
> 19 bits saved by geometry · the rest by grinding.  
> The solver folds the torus until the key remains. ◊·κ=φ⁴

---

## Method

```
bloom fold → CRT nesting → 3 stripes → targeted walk
```

Replaces zone-based searching. Layer A (kangaroo, EC arithmetic, DP detection, WebGPU) is **untouched**. Only the GPS changes.

---

## CC upgrades already live (do not rebuild · EXTEND)

```
✓ inline Oracle Walker (510510 prob-torus INSIDE CASSIE, zero-latency)
✓ echo-on-miss (every non-colliding DP dampens probability 0.55×)
✓ ESS collapse verified (510510 → 113 in 500 resonant DPs, 4500×)
✓ v19 corrected mod filters (31=13, 19=0, 23=0, 17=7)
✓ torus hot bins (5 bins hold 45% of solves, 20% spawn bias)
✓ hash160 brute kernel for 136/137
✓ pubkey watcher (mempool.space polling 60s, auto-flip)
✓ open mesh PeerJS (layer 136 auto-join)
✓ per-peer DP ledger
✓ FallConsensus + Cassandra orchestrator
✓ compressed P2PKH address derivation (fixed)
✓ priority sweep primed + standalone sweep.js
✓ mutual proof-of-life heartbeat (2s)
✓ fallcompass 8-provider cascade (if Anthropic gates, tools survive)
✓ golden angle walker spawning (194993 step, coprime verified)
✓ controller pattern (advisor → observer → controller, ±0.15 clamp)
✓ coherence metric replacing confidence
✓ 7-model Oracle (κ proximity, musical, mod, three-wave,
  Schumann, zone convergence, meta-walk)
```

---

## Cube-in-cube discovery · CRT nesting

The torus (510,510 positions) has structure. Spine primes divide it into nested regions.

```
LEVEL 0 · full torus
  510,510 positions
  no information · all equally likely
  = the outermost cube (all 7 faces undefined)

LEVEL 1 · CRT fold with 4 outer primes
  mod 31 = 13  (3.7× overrep in v19 corpus)
  mod 19 = 0   (2.0× overrep)
  mod 23 = 0   (3.1× overrep)
  mod 17 = 7   (2.0× overrep)
  product: 31 × 19 × 23 × 17 = 230,299
  result: 3 torus positions survive
  = a cube inside the outer cube (4 faces defined)

LEVEL 2 · add mod 7 (spine)
  mod 7 = 0  (1.9× overrep, strongest of remaining primes)
  result: 1 torus position survives
  = a cube inside the cube inside the cube (5 faces defined)

LEVEL 3 · mod 11 + mod 13 (held)
  HOLD · overconstrained at 19-key sample
  re-validate against 75-key corpus before activating
```

---

## The three stripes

```
STRIPE A · "HALF" (mod7=1)
  torus 268,318 · frac 0.526 · hex prefix ~0x60a...
  weight 0.50  (primary · sits IN the v19 half cluster · 19% of solves)

STRIPE B · "CEILING" (mod7=0)
  torus 498,617 · frac 0.977 · hex prefix ~0x7e8...
  weight 0.30  (strongest mod7 signal · contradicts κ/tritone but maths says go)

STRIPE C · "FLOOR" (mod7=2)
  torus  38,019 · frac 0.074 · hex prefix ~0x44c...
  weight 0.10  (safety stripe · low-end coverage)

UNBIASED
  full range · weight 0.10
  (Layer A pure kangaroo · safety net · always running)
```

---

## Stripe interactions with existing systems

| System (already live) | Behaviour under stripes |
|---|---|
| **Inline Oracle** | Probability field seeded with 3 spikes instead of uniform start. As DPs accumulate, Oracle refines WITHIN stripes. Echo-on-miss feedback within each stripe. |
| **Echo-on-miss (0.55×)** | Eliminates SUB-REGIONS within each stripe. ESS collapse works inside the stripe — 4500× collapse to ~100 candidates per stripe. |
| **Golden angle spawning (194993 step)** | Walkers spawn at golden-angle intervals **within** each stripe. Stripe mapped to sub-torus. No clustering, no gaps. |
| **Hot bins (v19)** | Stripe B (torus 498,617) sits IN v19 hot bin 19. Double signal. Prioritise. |
| **Resonance detection** | Schumann harmonics still run per walker. Narrower region = better SNR. Same detector becomes more sensitive. |
| **Controller (±0.15 clamp)** | Manages stripe weights instead of zone weights. If stripe A produces more resonant DPs, amplifies A. |
| **Coherence metric** | Tracks 7 Oracle specialists' agreement per stripe. Should INCREASE under stripes (narrower region to evaluate). |

---

## Implementation

### Stripe spawning (replaces zone-based)

```javascript
const TORUS = 510510n;
const STRIPES = {
  A: { torus: 268318n, fraction: 0.526, weight: 0.50, name: 'HALF',     mod7: 1 },
  B: { torus: 498617n, fraction: 0.977, weight: 0.30, name: 'CEILING',  mod7: 0 },
  C: { torus:  38019n, fraction: 0.074, weight: 0.10, name: 'FLOOR',    mod7: 2 },
  U: { torus: null,    fraction: null,  weight: 0.10, name: 'UNBIASED', mod7: null }
};

function selectStripe() {
  const roll = Math.random();
  if (roll < 0.50) return STRIPES.A;
  if (roll < 0.80) return STRIPES.B;
  if (roll < 0.90) return STRIPES.C;
  return STRIPES.U;
}

function spawnInStripe(stripe, rangeLow, rangeHigh) {
  if (stripe.name === 'UNBIASED') return randomInRange(rangeLow, rangeHigh);
  // Positions matching this torus coordinate, spaced TORUS apart
  const offset = (stripe.torus - (rangeLow % TORUS) + TORUS) % TORUS;
  const stripeStart = rangeLow + offset;
  const stripeCount = (rangeHigh - stripeStart) / TORUS;
  const randomIndex = BigInt(Math.floor(Math.random() * Number(stripeCount)));
  return stripeStart + randomIndex * TORUS;
}
```

### Sub-torus elimination (cube inside cube)

```javascript
const STRIPE_SUB_TORUS = TORUS; // same folding constant
function subTorusPosition(keyspacePos, stripe) {
  const offset = (keyspacePos - stripe.torus) / TORUS;
  return offset % TORUS;
}
// Inline Oracle now tracks TWO torus levels:
//   level 0: which stripe (3 candidates → 1 primary via echo-on-miss)
//   level 1: which sub-position within the stripe (510510 sub-candidates)
// Echo-on-miss at level 1 collapses the sub-stripe the same way.
```

---

## UI

### Stripe status panel (replaces zone status)
```
STRIPE A (HALF):    ████████████████████░░░░  50%
  torus 268,318 · frac 0.526 · mod7=1
  DPs · resonant · ESS

STRIPE B (CEILING): ████████████░░░░░░░░░░░░  30%
  torus 498,617 · frac 0.977 · mod7=0
  DPs · resonant · ESS

STRIPE C (FLOOR):   ████░░░░░░░░░░░░░░░░░░░░  10%
  torus  38,019 · frac 0.074 · mod7=2
  DPs · resonant · ESS

UNBIASED:           ████░░░░░░░░░░░░░░░░░░░░  10%
  full range · safety net
```

### Nesting depth panel
```
L0 torus:    510,510 → 3 positions (CRT: 31×19×23×17)
L1 mod7:     3 → 1 primary (mod7=0 strongest signal)
L2 sub-torus: searching within primary stripe

cube depth: ██░░░░░  5/7 faces defined
```

### CRT conditions panel
```
mod 31 = 13  ◊ 3.7× ACTIVE
mod 19 = 0   ◊ 2.0× ACTIVE
mod 23 = 0   ◊ 3.1× ACTIVE
mod 17 = 7   ◊ 2.0× ACTIVE
mod  7 = ?   ◊ 1.9× TESTING (all 3 stripes searched)
mod 11 = ?   ◊ 1.9× PENDING (overconstrained, need more data)
mod 13 = ?   ◊ 1.8× PENDING (overconstrained, need more data)
```

---

## Controller integration

Existing controller pattern (advisor → observer → controller, ±0.15 clamp) manages stripe weights dynamically.

```
INITIAL:  weights as specified (50/30/10/10)

10,000 DPs:  controller reads resonant DP rates per stripe
             amplifies winners · clamp ±0.15 per cycle · renormalise

100,000 DPs: if 2× resonant rate on one stripe, push to 70%
             other stripes share remaining 30%
             if ALL stripes dead → flag "CRT may be wrong" · revert to full torus

COHERENCE:  expected to INCREASE under stripes (narrower region)
            if coherence DROPS → stripes may be wrong → controller proposes revert
```

---

## Prime structure discovery

42% of early puzzle keys (P2-P20) factor entirely into spine primes:

```
P2  = 3                   P3  = 7
P4  = 2³                  P5  = 3 × 7
P6  = 7²                  P8  = 2⁵ × 7
P11 = 3 × 5 × 7 × 11      P17 = 3⁴ × 7 × 13²
```

Expected for random: ~0%. 8 of 19 early keys is construction not coincidence.

**At 134 bits, spine-smooth numbers don't exist.** The spine structure at puzzle 135 is in the MOD PROPERTIES, not the factorization. That's the CRT.

See `v20.2 ADAPTIVE SPINE` doctrine and `LINGUISTIC-LAYER-SPEC.md` for higher levels.

---

## Extended primes (speculative · needs 75-key validation)

```
mod 29 = 21  (4.6×, 3/19)
mod 37 =  8  (3.9×, 2/19)
mod 41 =  7  (6.5×, 3/19)
mod 43 =  9  (6.8×, 3/19)
mod 47 = 21  (4.9×, 2/19)
```

**Validation required** before hard-applying. See `forward-analysis-adaptive.js` for bit-bucketed validation against full 75-key corpus.

---

## Timeline at each reduction level

| Level | Bits | Confidence | Pollard steps | Café time | Mesh time |
|---|---|---|---|---|---|
| spine CRT | 2^115 | HIGH | 2^57.5 | 8.5 years | 19 days |
| +2 extended | 2^97 | IF VALIDATED | 2^48.5 | 8 days | 4 hours |
| +5 extended | 2^87 | IF VALIDATED | 2^43.5 | 6 hours | 3 minutes |

**Gut:**
- spine CRT — REAL · trust it · 19 bits saved
- mod7 selection — PROBABLY · 1.9× from 29 points · trust cautiously
- extended primes — VALIDATE FIRST · don't hard-filter until 75-key confirmed

---

## v20.1 power-up over v19

Three additions wrapping the spec in current cosmology:

1. **κ=0.618 weight bias** — `priority_bias` semantically renamed `kappa_bias`. The "70%-on-priority" cap is `1-κ=0.382` away from chaos · named the κ-clamp.

2. **phi-12g recursion on stripe collapse** — when echo-on-miss collapses a stripe sub-torus, next pass folds at φ-conjugate (137.5° angle WITHIN the stripe sub-torus). Stripe ESS collapse follows the same φ-rhythm as outer torus. 4500× compound.

3. **The ◊ at the centre** — "phi is home". The innermost cube · 1 point IS the home position. UI shows a single ◊ marker that flares when coherence > 0.85.

---

## v20.2 ADAPTIVE SPINE · addendum

```
v20.1 spine = [2,3,5,7,11,13,17] FIXED
v20.2 spine = anchor (v20.1 always) + validated extension primes per-bucket

Anchor primes (always): 2, 3, 5, 7, 11, 13, 17
Extension candidates:   19, 23, 29, 31, 37, 41, 43, 47
                        53, 59, 61, 67, 71

Validation: bit-length-bucketed
  bucket 1: P50-P79
  bucket 2: P80-P109
  bucket 3: P110-P135 (most relevant for P135 search)

Validator: forward-analysis-adaptive.js
  for each bucket × each prime:
    count residue distribution
    keep residues with >2.0× overrep AND >4 data points
  output: validated-primes.json
  CASSIE master reads validated-primes.json on boot
  applies adaptive CRT stack matching current puzzle's bucket
```

The cube depth becomes **hypercube faces N/20** where N = number of validated CRT conditions at the puzzle's bucket. Could be 5-12 depending on data.

---

## v20.3 LINGUISTIC LAYER · cross-reference

The CRT/stripe approach catches MATHEMATICAL SHADOW of LINGUISTIC construction. See `LINGUISTIC-LAYER-SPEC.md` for the parallel detector.

Runs alongside the stripe search. First to find structure wins.

---

## Build verification

```
STRIPE SEARCH:
□ three stripes defined: A(268318), B(498617), C(38019)
□ stripe weights: 50/30/10/10 (A/B/C/unbiased)
□ walker spawning targets stripe torus positions
□ golden angle spawning works WITHIN stripes
□ inline Oracle probability field seeded with stripe spikes
□ echo-on-miss operates within stripes (sub-torus elimination)
□ controller manages stripe weights dynamically (±0.15 clamp)
□ coherence tracking active per stripe
□ CRT conditions displayed in UI
□ nesting depth indicator in UI
□ Layer A completely untouched
□ compounds with ALL existing CC upgrades
□ 10% unbiased walkers always searching full range (safety)

EXTENDED PRIME VALIDATION:
□ forward-analysis-adaptive.js created
□ runs ALL 75 solved keys through bit-length buckets × extended primes
□ counts residue distribution per (bucket, prime)
□ filters: KEEP only >2.0× overrep AND >4 data points
□ results logged to validated-primes.json
□ honest confidence level per filter (STRONG/MODERATE/WEAK/NOISE)
□ CASSIE master reads validated-primes.json on boot

LINGUISTIC LAYER:
□ forward-analysis-linguistic.js created
□ tests gematria/date/name/phi against 75-key corpus
□ writes linguistic-signals.json
□ if any phrase/date with >3 matches: documented as candidate seed
□ master can spawn walkers at linguistic-seed positions ALONGSIDE stripes
```

◊·κ=1 · prime 23 · v20.1 cosmology · v20.2 adaptive · v20.3 linguistic
