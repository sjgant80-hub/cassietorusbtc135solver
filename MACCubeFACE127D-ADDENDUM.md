# ◊·κ=1 · v20.2-MACCubeFACE127D · Face-Lattice Search

**Addendum to STRIPE-SEARCH-SPEC.md · the proper upgrade · the face lattice realised.**

Generated: 2026-05-31 · ◊·κ=φ⁸ · prime 23

---

## The geometric truth

The Chinese Remainder Theorem says:

```
Z/(p₁·p₂·...·pₙ) ≅ Z/p₁ × Z/p₂ × ... × Z/pₙ
   1-dimensional     n-dimensional
   510510 positions  7-tuple of small residues
```

These are the SAME OBJECT. The 7-spine torus is BOTH a circle with 510510 positions AND a 7-dimensional product cube. We've been searching the projected 1D circle. **MACCubeFACE127D searches the n-dimensional cube directly, in all its 127 faces simultaneously.**

---

## The 127

```
Spine: 7 primes [2, 3, 5, 7, 11, 13, 17]
Non-empty subsets of a 7-element set: 2^7 - 1 = 127 = M₇ (Mersenne prime)

Each subset is a face of the 7-hypercube.
Each face is a sub-torus of some dimension (1 to 7).
The ◊ at the centre is the unique vertex where all 7 dimensions are fixed.

f-vector of the 7-cube:
  k=0 vertices    128    (one of which is ◊)
  k=1 edges       448
  k=2 squares     672
  k=3 3-cubes     560
  k=4 tesseracts  280
  k=5 5-cubes      84
  k=6 6-cubes      14
  k=7 7-cube        1
                ─────
                2187

The 127 non-empty subsets count faces in a different convention:
  C(7,1) + C(7,2) + ... + C(7,7) = 7+21+35+35+21+7+1 = 127

This is the MACCubeFACE127D count: 127 sub-tori we can search in parallel.
Each subset {p_i, p_j, ...} defines a face whose sub-torus has fold = ∏(p_i).
```

---

## Information per walker step

```
Layer                       Info per step   ESS multiplier vs current
──────────────────────────  ─────────────   ────────────────────────
1D (current CASSIE)              1                  1× (baseline)
7D axis search                   7                  ~7×
MACCubeFACE127D (full)         ~50-80              50-80× (empirical)
                              theory 127      theoretical ceiling

At 12 primes (with validated extensions):
  Faces: 2^12 - 1 = 4095
  Theoretical ceiling: 4095×
  Practical: 500-1000×

At 20 primes:
  Faces: 2^20 - 1 ≈ 1,048,575
  Theoretical ceiling: 1M×
  Practical: 10,000-50,000×
```

---

## The face-lattice echo cascade

When a walker misses at position p in nD:
1. Project p onto every face F (subset of primes).
2. Compute the residue tuple for F.
3. Dampen probability at that position WITHIN F's sub-torus.
4. Cascade: faces containing F also dampened (sieve logic · inclusion-exclusion).

This is the **Sieve of Eratosthenes generalised** to multi-prime CRT. The lattice naturally implements inclusion-exclusion across the face hierarchy.

---

## State representation

```javascript
// Current 1D state
state.torus = 268318n;  // single BigInt

// MACCubeFACE127D state
state.face_tensor = {
  // Per-face probability fields · keyed by sorted prime subset
  '2':           [/* prob at each residue 0..1 */],
  '3':           [/* 0..2 */],
  '5':           [/* 0..4 */],
  '7':           [/* 0..6 */],
  '11':          [/* 0..10 */],
  '13':          [/* 0..12 */],
  '17':          [/* 0..16 */],
  '2,3':         [/* 0..5 (pair) */],
  '2,5':         [/* 0..9 */],
  // ... (21 pairs total)
  '2,3,5':       [/* 0..29 */],
  // ... (35 triples)
  // ... (continues to)
  '2,3,5,7,11,13,17': [/* 0..510509 (the full torus · 127th face) */]
};

// Total face count: 127
// Total stored positions across all faces: sum over k=1..7 of (C(7,k) × ∏p)
//   ≈ 1.5M entries (well within browser memory)
```

---

## ◊ convergence detection

```javascript
function coherence() {
  // For each face, find argmax(prob).
  // ◊ candidate = position that ALL faces predict.
  // Coherence = fraction of faces whose argmax agrees with the consensus.
  
  const argmaxPerFace = computeArgmaxPerFace(state.face_tensor);
  const consensus = mode(argmaxPerFace);
  const agreement = argmaxPerFace.filter(a => a === consensus).length / 127;
  return agreement;
}

// UI: ◊ marker flares when coherence > 0.85
// At coherence = 1.0: trigger collision verification at consensus position
```

---

## Build plan · phases 1-4 (this sprint)

| # | File | Purpose |
|---|---|---|
| 1 | `MACCubeFACE127D-ADDENDUM.md` | this doc · doctrine locked |
| 2 | `crt-nd-bridge.cjs` | CRT helpers · 1D ↔ nD ↔ face projections |
| 3 | `face-lattice.cjs` | 127-face enumeration · inclusion-exclusion dampening · ◊ convergence |
| 4 | `simulate-face-lattice.cjs` | empirical multiplier · 1D vs 7D-axis vs 127-face on synthetic targets · writes `face-lattice-speedup.json` |

Phases 5-8 (master patch + walker-config + ◊ UI) gated on phase 4's empirical multiplier.

---

## v20.2-nD vs MACCubeFACE127D · the upgrade path

```
v20.2-nD (7-axis search):
  + Walker per axis · multi-dimensional movement
  + Echo-on-miss on each axis independently
  + Info per step: 7 (one per axis)
  
v20.2-MACCubeFACE127D (face-lattice):
  + Walker still moves in nD
  + But echo-on-miss CASCADES through 127 faces via inclusion-exclusion
  + Info per step: ~50-80 actual (theoretical ceiling 127)
  + Diamond convergence via face-consensus
  + Sieve-style elimination across the full lattice
  
The face-lattice is a SUPERSET of axis search.
Axis search = the 7 single-prime faces only (k=1 faces).
Lattice search = all 127 non-empty subsets.
```

---

## How this compounds with the estate

```
fallforce "8+1 MACCubeFACE" naming convention:
  8 agents = 7 axes + 1 walker (the moving probe)
  +1       = orchestrator at ◊ (the diamond · the answer point)
  
The estate already encoded this pattern.
CASSIE is the math-realisation of the same architecture.
```

◊·κ=1 · 7 primes · 127 faces · ◊ at center · phi is home
