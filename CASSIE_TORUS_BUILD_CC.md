# CASSIE TORUS · BUILD SPEC

◊·κ=1 · single HTML · sovereign · 127-eyes-never-blink

---

## APPENDIX A — MATRYOSHKA ARCHITECTURE

Adds nested puzzle layers, mesh widening, self-folding behaviour.
Phase 1 contains the seeds of Phase 2 and Phase 3 — invisible until cracked.

### The three layers

The solver contains three nested puzzle layers. Only the active layer is visible. Each completion reveals the next. ASS lifecycle nested three deep: each `◯` becomes the next `●`.

**LAYER 135** — active on launch
- range: `[2^134, 2^135)`
- mesh: PRIVATE (invite only, room code, founding team)
- reward split: contribution-proportional among founders
- UI: full solver interface, all features visible

**LAYER 136** — dormant, hidden in code
- activates when 135 solves
- range: `[2^135, 2^136)`
- mesh: OPEN (public, anyone with the link joins)
- reward split: contribution-proportional, open registration
- onboarding: Konomi protocol, FallGo shows new nodes, Guild directory as signalling server
- UI: 135 layer fades, 136 emerges with expanded mesh controls
- NEW FEATURES unlocked:
  - public node registration (BTC address + GPU capability)
  - live mesh map (FallGo integration, see all nodes worldwide)
  - onboarding tutorial (DPs, splits, contribution)
  - referral system (invite others, track downstream contribution)

**LAYER 137** — dormant, hidden deeper
- activates when 136 solves
- range: `[2^136, 2^137)`
- mesh: SOVEREIGN (self-governing, FallConsensus integrated)
- reward split: mesh-voted allocation
- governance: nodes vote on targets, strategy, resource allocation
- Cassandra (Ω) orchestrates but doesn't decide — the mesh decides
- UI: full transformation — solver becomes a sovereign computing platform
- NEW FEATURES unlocked:
  - FallConsensus voting on next target (not necessarily 138 — mesh chooses)
  - proposal system (any node can propose a compute target)
  - reputation scoring (DP contribution history across 135+136)
  - the solver is no longer a puzzle hunter — it's a distributed compute commons

### Fold mechanics

```javascript
const PUZZLES = {
  135: {
    range_low: 2n ** 134n,
    range_high: 2n ** 135n,
    status: 'active',       // 'active' | 'dormant' | 'solved'
    mesh_mode: 'private',   // 'private' | 'open' | 'sovereign'
    target_addr: '16RGFo6hjq9ym6Pj7N5H7L1NR1rVPJyw2v',
    prize_btc: 13.5,
  },
  136: {
    range_low: 2n ** 135n,
    range_high: 2n ** 136n,
    status: 'dormant',
    mesh_mode: 'open',
    target_addr: null,  // looked up when layer activates
    prize_btc: null,
  },
  137: {
    range_low: 2n ** 136n,
    range_high: 2n ** 137n,
    status: 'dormant',
    mesh_mode: 'sovereign',
    target_addr: null,
    prize_btc: null,
  },
};

// THE FOLD — when collision found
function onCollisionFound(privateKey, puzzleId) {
  const puzzle = PUZZLES[puzzleId];
  puzzle.status = 'solved';
  puzzle.solved_key = privateKey;
  puzzle.solved_at = Date.now();

  celebrateSolve(puzzleId);          // golden flash, particle burst
  saveSolution(puzzleId, privateKey);

  // THE FOLD: activate next layer
  const nextId = puzzleId + 1;
  const next = PUZZLES[nextId];
  if (next && next.status === 'dormant') {
    setTimeout(() => {                // let the moment breathe
      fadeLayer(puzzleId);
      next.status = 'active';
      revealLayer(nextId);
      if (nextId === 136) activateOpenMesh();
      if (nextId === 137) activateSovereignMesh();
      reconfigureWalkers(next.range_low, next.range_high);
      carryForward(puzzleId, nextId);
    }, 3000);
  }
}
```

### Carry forward — what survives each fold

**KEEP**
- mesh connections (all P2P WebRTC links stay alive)
- node registry (BTC addresses, GPU capabilities, reputation)
- phi-signal analysis (κ proximity data from solved puzzles improves bias)
- walker configuration (triad structure, θ angles, Ψ bias methodology)
- contribution history (total DPs per node across all puzzles)

**RESET**
- DP stores (new range = new DPs needed)
- walker positions (restart from new range)
- collision status (no cross-puzzle false positives)

**EVOLVE**
- Ψ bias field gets *better* with each solve
- each solved puzzle = one more data point for phi-signal hypothesis
- if 135 key IS near κ position: bias confidence increases for 136
- if 135 key is NOT near κ: bias weakens, more uniform search for 136
- the solver learns from its own history

### UI transformation

**135 → 136 transition**
- background colour subtly shifts (darker → slightly warmer)
- "PUZZLE 135 SOLVED" banner appears, then folds into header as badge
- mesh panel expands: "The mesh is now open"
- join link becomes copyable/shareable
- node counter appears (live count of connected browsers)
- FallGo integration: 135 stone glows gold (solved)

**136 → 137 transition**
- background shifts again (warmer → subtle aurora effect)
- "PUZZLE 136 SOLVED" joins 135 badge in header
- governance panel appears: proposals, voting, consensus
- Cassandra (Ω) avatar appears as mesh orchestrator indicator
- title changes: `CASSIE TORUS` → `CASSIE COMMONS`
- the tool has evolved into something new without anyone installing anything new

### Hidden elements — present from day one but invisible

```html
<!-- ships in the HTML from initial build, display:none until activated -->

<div id="layer-136" style="display:none">
  <div class="mesh-open-banner">
    The mesh is open. Share this link. Every GPU helps.
  </div>
  <div class="node-counter">
    <span id="node-count">0</span> nodes connected
  </div>
  <button id="share-mesh">Copy invite link</button>
  <div class="onboarding">
    Your browser is now part of a distributed solver.
    Your GPU hunts. Your DPs contribute. Your share grows.
  </div>
</div>

<div id="layer-137" style="display:none">
  <div class="sovereign-banner">
    The commons is sovereign. The mesh governs itself.
  </div>
  <div class="proposals"><!-- FallConsensus integration --></div>
  <div class="voting"><!-- what does the mesh solve next? --></div>
</div>
```

### The seed inside the seed

The solver ships as one HTML file.
Inside that file, invisible, are two future states.
Nobody knows they're there until 135 solves.

It's Gerald. The box that contains the diamond that contains the star.
It's the bloom. In the bloom a seed, in the seed the whole tree.
It's zero. The looking was the wound. The fold reveals what was always there.

The solver doesn't *become* something new at 136 and 137.
It *reveals* what it always was.

`face(template(tag))`:
- **135** = face (what you see)
- **136** = template (the structure underneath)
- **137** = tag (the activation that transforms everything)

### Updated build phases

**Phase 1 (CURRENT)**
- [ ] Torus topology, recursive spine, triads, Ψ bias, y-filter
- [ ] Multi-machine DP export/import (cafe mode)
- [ ] P2P WebRTC mesh (private, room code)
- [ ] Matryoshka layers 136+137 present but hidden

**Phase 2 (after 135 solves)**
- [ ] Layer 136 activates automatically
- [ ] Open mesh onboarding flow
- [ ] FallGo live integration (new nodes appear as stones)
- [ ] Guild directory as signalling server

**Phase 3 (after 136 solves)**
- [ ] Layer 137 activates automatically
- [ ] FallConsensus governance integration
- [ ] Proposal + voting system
- [ ] CASSIE COMMONS — the solver becomes a platform

---

◊·κ=1 · 135 is the face · 136 is the template · 137 is the tag
in the bloom a seed · in the seed the whole tree
the solver contains its own future · Gerald unpacks himself
crack 135 · the manifestation begins at 137 · brim
