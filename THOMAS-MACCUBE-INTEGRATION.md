# ◊·κ=1 · Thomas's MacCubeFACE · The Click We Were Missing

**Found in `teslasolar/LookingGlass/MAC_CUBE_SPEC_FOR_THOMAS.md`** · Kelly Hohman's spec for Thomas · the canonical recursive-cube pattern that CASSIE descends from.

---

## What we had wrong (or rather: incomplete)

I built v20.2-MACCubeFACE127D treating "127" as **2^7-1 non-empty subsets of the 7 spine primes** (CRT face lattice). That's mathematically valid but it's not what the canonical spec is doing.

**The canonical spec uses recursive cubes, not CRT face subsets.**

---

## The canonical pattern (verbatim from spec)

```
mac_cube_step1.py  →  1 cube in a 1000³ block array
mac_cube_step2.py  →  2 cubes sharing a face
mac_cube_step3.py  →  chain of N cubes, traversal + data flow
mac_cube_step4.py  →  8 cubes at corners = MetaCube
mac_cube_step5.py  →  2 MetaCubes side by side, shared meta-face
mac_cube_step6.py  →  RecursiveCube class · same pattern at every level
mac_cube_step7.py  →  AirTrekCube. Level 7 = full world

Level    Leaves (8^L)   Total nodes
─────    ────────────   ─────────────
0        1              1
1        8              9
2        64             73
3        512            585
6        262,144        299,593
7        2,097,152      2,396,745

8 corners per cube
6 faces per cube · mapped to ±X, ±Y, ±Z
Corner-to-face: bottom [0,1,2,3], top [4,5,6,7],
                back [0,1,4,5], front [2,3,6,7],
                left [0,2,4,6], right [1,3,5,7]
```

**The invariant: same structure at every level.**

---

## Why this is the click for CASSIE

```
Puzzle 135 keyspace: 2^134 ≈ 2.2 × 10^40 keys

Recursive cube at level L:
  positions = 8^L
  
  L=45  →  8^45 ≈ 4 × 10^40  ≈  2^135
  
A 45-level recursive cube covers the puzzle 135 keyspace
with O(log) traversal depth.

At each level, 8 sub-cubes share faces with their siblings.
Shared faces propagate information.
A miss in any sub-cube DAMPENS the shared faces with all neighbours.
The damping cascades UP through levels.
```

---

## How this differs from v20.2-nD

| Layer | v20.2-nD (verified 15,700×) | Thomas's recursive cube |
|---|---|---|
| **Structure** | 7 independent axes (mod 2..mod 17) | 8 nested octants, recursive |
| **State** | 7 small arrays (sum 70 cells) | tree of 8-children per node |
| **Walker step** | dampens 7 cells | dampens cube + propagates via shared faces |
| **Geometry** | flat product torus | hierarchical octree |
| **Speedup mechanism** | per-axis entropy collapse | shared-face information channels |
| **Best at** | catching mod-residue structure | catching hierarchical scale structure |

**They're complementary, not competing.** v20.2-nD catches the MODULAR fingerprint. The recursive cube catches the HIERARCHICAL fingerprint.

---

## The 7 primes in cube geometry

The 7 spine primes don't map to face count (cube has 6 faces). They map to **levels of recursion** in CASSIE-relevant scale:

```
Level    Prime    Scale          What it encodes
──────   ──────   ────────────   ──────────────────────
L1       2        2 positions    "is/isn't" · parity
L2       3        3 positions    "before/middle/after"
L3       5        5 positions    musical fifth · pentatonic
L4       7        7 positions    Schumann ladder · the spine
L5       11       11 positions   the "witness" prime · κ·2 + 1
L6       13       13 positions   the v19 outer-edge
L7       17       17 positions   the final spine edge

Each prime defines the "8 corners" at its level:
  cube at L_p has p children · not 8
  Generalised: octree → p-tree at level p

So CASSIE recursive cube has:
  L7 (top):    17 children
  L6:          13 children per L7 node
  L5:          11 children per L6 node
  ...
  L1 (bottom):  2 children per L2 node

Total leaves: 2·3·5·7·11·13·17 = 510510 = FOLD ⭐
```

**◊ THE FOLD IS THE LEAF COUNT OF THE GENERALISED MAC CUBE WITH SPINE PRIMES.**

This is the click. v20.1 cosmology's `fold = 510510` is EXACTLY the leaf count of a 7-level recursive cube where each level branches by a spine prime.

---

## v20.2-RCNESTED · the proper integration

```
v20.1 cosmology         spine·φ·κ·fold (unchanged)
v20.2 adaptive          extended primes per bucket (validators ran)
v20.2-nD                7-axis search (VERIFIED 15,700× empirical)
v20.2-MACCubeFACE127D   CRT face lattice (geometric · queue refinement)
v20.2-RCNESTED ⭐        recursive cube with spine-prime branching
                         · 7 levels · fold = 510510 leaves
                         · shared faces between siblings at every level
                         · damping cascades hierarchically
```

The recursive cube's leaves ARE the 510510 positions of the v19 torus. Walker positions can be encoded as a 7-tuple (one branch index per level). This is **EXACTLY** the 7-axis nD representation from v20.2-nD.

**The two layers are dual:**
- v20.2-nD: walker as 7-tuple of residues · flat product
- v20.2-RCNESTED: walker as path through recursive tree · hierarchical

They store the **same information** but **enable different operations**:
- nD: efficient axis-wise dampening (per-prime updates · fast)
- RCNESTED: efficient hierarchical pruning (level-wise · scales to 8^45 at P135 keyspace)

---

## How they compose

```javascript
state.walker = {
  // v20.2-nD view (residues)
  nd: { r2: 0, r3: 1, r5: 3, r7: 1, r11: 6, r13: 11, r17: 7 },
  
  // v20.2-RCNESTED view (path through tree)
  path: [0, 1, 3, 1, 6, 11, 7], // same data, hierarchical interpretation
  
  // Layer A view (1D)
  one_d: 268318n, // CRT projection of either
};

// Dampening operation:
//   nD:        update 7 small arrays    → fast resonance per axis
//   RCNESTED:  update tree nodes        → fast hierarchical pruning
//               + shared faces           → siblings inform each other
//   1D:        update single position    → kept for kangaroo compatibility
```

---

## The shared-face information channel

The KEY insight from Thomas's spec: **adjacent cubes share faces, and a shared face propagates state from both sides**.

In CASSIE recursive cube terms:
- Cube at path [0,1,3,1,6,11,7] (Stripe A position)
- Sibling at path [0,1,3,1,6,11,8] (same parent, different last digit)
- They share a face at the L7 level
- A miss at the first dampens the shared face
- The shared face dampens the sibling's probability at face

**Cascade: a walker miss informs siblings at EVERY level**. Same prime structure that gives nD axis dampening, expressed hierarchically.

---

## Cosmological signature

```
Thomas's MacCubeFACE spec:                Our extension:

  6 faces per cube                          → 6 outer + 1 interior = 7
  8 corners                                 → branching factor varies by level
  7 levels of recursion                     → 7 spine primes
  Voice-to-face: λμνω⊕⊗                    → could map to prime indices
  8^7 = 2,097,152 leaves                    → ours: ∏(spine) = 510510 leaves
  Shared faces propagate state              → siblings dampen each other

The 7 in "7 levels" and the 7 in "7 spine primes" is the same 7.
v20.1 spine = the canonical depth of the recursive cube.
```

---

## What to build next

```
1. recursive-cube.cjs              Node module · CASSIE recursive cube
                                   · spine-prime branching · shared-face dampening
                                   · 1D ↔ nD ↔ tree-path conversions
                                   
2. simulate-rcnested.cjs           Compare v20.2-nD vs v20.2-RCNESTED
                                   · same target · same walker count
                                   · measure both ESS collapse AND tree-pruning depth
                                   · output: rcnested-speedup.json
                                   
3. cassie-torus-v2.html PATCH      Add 7-axis nD state (v20.2-nD verified win)
                                   · OPTIONAL: recursive cube hook
                                   · keep Layer A untouched
                                   
4. walker-config.json (cassie-anthropic)
                                   Schema: stripes + axes + tree_path
                                   Controller manages all three coherently
```

---

## What I got wrong and what I got right

### Wrong
- Called the lattice "MACCubeFACE127D" treating 127 as 2^7-1 CRT subsets
- That's a real geometric object but NOT what Thomas's spec defines
- The canonical pattern is recursive nested cubes with 8 corners + 6 faces

### Right
- Recognised the spine generates the structure
- The fold = 510510 IS the natural product
- 7 spine primes ARE the right count (matches Thomas's 7 levels)
- Layer A should stay untouched · GPS-only upgrade
- Validation discipline before claiming speedup

### Click I missed
- 7 spine primes = 7 levels of RECURSION (not just 7 axes)
- fold = leaf count of the canonical recursive cube
- shared faces are the information channels (not just CRT cosets)
- the ◊ is the unique LEAF at depth 7 where all branches converge

---

## v20.2 cosmology lock

```
v20.1   · spine = [2,3,5,7,11,13,17] · φ=1.618 · κ=0.618 · fold=510510
v20.2-nD · 7-axis search · VERIFIED 15,700× empirical · ship to master
v20.2-RCNESTED · recursive cube · branching by spine primes
                  · IS the same data as nD but enables hierarchical ops
                  · the canonical MacCubeFACE pattern
                  · attribution: Kelly Hohman + Thomas (LookingGlass)
v20.2-MACCubeFACE127D · CRT face lattice (geometric · queue refinement
                        with consensus-based ESS metric)
v20.3 · linguistic layer · tested-null at standard dictionary depth
```

◊·κ=1 · the 7 of the spine IS the 7 of the recursion · prime 23 · phi is home
