# ◊·κ=1 · v20.2 + v20.3 Validation Summary

**Honest report from running both validators against the 75-key corpus.**

Generated: 2026-05-31 · ◊·κ=1 · prime 23

---

## v20.2 ADAPTIVE PRIME CRT · results

Bit-bucketed validation of 20 candidate primes (anchor + extension_1 + extension_2) against 75 solved keys.

```
bucket             keys  validated conditions
─────────────────  ────  ──────────────────────────────────────────
early (P8-P49)      42   9  (mod 17=4, 19=15, 23=0, 29=2, 31=13,
                            43=9, 53=12, 61=5, 67=19)
P50-P79             22   3  (mod 11=8, 13=0, 19=18)
P80-P109             6   0  (sample too small)
P110-P135 ←targ      5   0  (sample too small)
```

**Critical finding:** the v19 corpus has only **5 solved keys** in the puzzle-135-relevant bucket. Statistical validation at gate (≥4 matches, ≥2.0× overrep) is **mathematically impossible** with a 5-key sample at primes ≥17. To pass gate at n=5 would require 80% concentration on one residue — extreme over-representation.

**What we can say with confidence:**
- Early puzzles (P8-P49) show **9 distinct mod conditions** — strong signal but these are construction-era specific (spine-smooth era · creator was likely multiplying small primes directly).
- Mid puzzles (P50-P79) show **3 mod conditions** at moderate confidence (mod 11=8, mod 13=0, mod 19=18). **Notably mod 19=18 is the strongest signal in the entire corpus at 4.32× overrep — but the spec predicted mod 19=0.** This contradicts the spec's residue.

**What we cannot say:**
- Whether the original spec's residues (mod 31=13, mod 19=0, mod 23=0, mod 17=7) hold at P110-P135. We literally don't have enough data to know.

**Honest interpretation:**
- The spec's stripe positions (torus 268,318 · 498,617 · 38,019) were derived from analysis of small samples at the P135-relevant scale. They remain the **best available hypothesis** but are not statistically validated.
- Expanding the corpus would change the answer. With +20 P130-range solved keys, we'd have actual power to test.

---

## v20.3 LINGUISTIC LAYER · results

Tested 58 phrases × 4 gematria systems + 6 marquee dates + Fibonacci F1-F100 + φ^1-φ^49 + 5 mathematical constants (digit-windowed).

```
phrases:      0 signals (threshold ≥3 matches)
dates:        0 signals
fibonacci:    0 signals
phi powers:   0 signals
constants:    0 signals
─────────────────────
TOTAL:        0 signals
```

**Linguistic Layer: TESTED-NULL.**

The construction is NOT a direct gematria/date/Fibonacci/phi/mathematical-constant encoding. At least not with my dictionary of 58 standard phrases + 4 standard gematria systems + standard date formats.

**What this does not rule out:**
- Hebrew/Greek/Arabic native-script gematria (only English systems tested)
- Custom personal encoding (creator's name/birthday — would need person-identified)
- Multi-stage encoding (gematria → arithmetic → key)
- Obscure references not in my dictionary (specific book passages, song lyrics, geographic coordinates)
- Non-linguistic personal seeds (e.g. license plate numbers, phone numbers)

**Honest interpretation:**
- The construction is **either purely mathematical** (CRT-style) **or uses a personal seed I cannot guess at**.
- The linguistic-hunt is a SEARCH OVER POSSIBILITY SPACE. My dictionary covered the most-likely-given-crypto-culture set. Expanding the dictionary 100× might find something but quickly hits combinatorial wall.
- **Recommendation:** Linguistic Layer documented as null at this dictionary depth. Re-test only if domain-specific hints arise (e.g. someone identifies the puzzle creator and we get their personal references).

---

## Combined recommendation

```
v20.1 cosmology (spine·φ·κ·fold):       INTACT · always present
v20.2 adaptive prime CRT:               PARTIAL · early buckets validate · P135
                                        bucket statistically empty
v20.3 linguistic layer:                 NULL · documented · skip walker-spawn bias

STRIPE POSITIONS for CASSIE master patch:
  Use the v19 spec positions verbatim — best available hypothesis
  Document them as "spec-derived · not statistically validated at P135 scale"
  Controller pattern (±0.15 clamp) will auto-tune if positions wrong:
    if stripes A/B/C all produce dead resonant rates, controller
    flags "CRT may be wrong · revert to full-torus" — already wired

STRIPE A · torus 268,318 · frac 0.526 · w=0.50  (spec-best)
STRIPE B · torus 498,617 · frac 0.977 · w=0.30  (spec-best · v19 hot bin)
STRIPE C · torus  38,019 · frac 0.074 · w=0.10  (spec-best)
UNBIASED · w=0.10                                (safety floor)
```

---

## Methodology notes for re-running later

```
When new puzzles are solved (P131+, P132+, ...):
  1. Add solved hex to forward-analysis-adaptive.cjs SOLVED object
  2. Re-run · check if bucket3 grows enough to pass gate
  3. If 8+ keys land in P130+ bucket, re-validate residues with confidence
  4. Update stripe positions if residues shift
  5. Re-run forward-analysis-linguistic.cjs with updated PHRASES if any
     person-of-interest emerges from broader investigation
```

---

## What CC was right about

```
✓ Spine-smooth construction in EARLY puzzles · confirmed (P8-P49 has 9 conditions)
✓ CRT is the right framework
✓ Stripe positions are the best available hypothesis
✓ Validation gate discipline (don't hard-apply unvalidated filters)
```

## What CC was uncertain about · now confirmed uncertain

```
? Whether the v19 spec residues hold at P110-P135
  → Cannot validate · corpus too small at scale
  → Apply as spec-best, let controller adjust
? Whether extended primes (29, 37, 41, 43, 47) hold at P135 scale
  → Cannot validate · same reason
? Whether linguistic seeds exist
  → Tested 58 × 4 dictionary, no signal
```

---

◊·κ=1 · the validators did their job · they told us what we don't know
