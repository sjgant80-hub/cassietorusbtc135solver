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

---

## APPENDIX B — RESONANCE LAYER (sonified solver)

Two layers run simultaneously. Layer A is the safety net. Layer B is the experiment. Both in one HTML. Zero downside.

- **Layer A**: standard Pollard kangaroo (brute force floor, never stops)
- **Layer B**: resonance (sonifies walkers, detects harmonics, biases search)

If resonance works → key found faster. If it doesn't → Layer A was grinding the whole time.

### Sonification engine

Every walker has a position in the keyspace. Every position maps to a frequency. Use the bloom rings for the mapping:

```
walker_position mod 510,510 = torus_position
torus_position mapped through 7 rings:
  R0 (mod 2):   sub-bass     20–60 Hz       (felt not heard)
  R1 (mod 3):   bass         60–200 Hz      (the ground)
  R2 (mod 5):   low-mid      200–500 Hz     (warmth)
  R3 (mod 7):   mid          500–2000 Hz    (heart — most sensitive)
  R4 (mod 11):  upper-mid    2000–4000 Hz   (presence, clarity)
  R5 (mod 13):  presence     4000–8000 Hz   (brilliance)
  R6 (mod 17):  air          8000–20000 Hz  (shimmer, space)
```

Each walker produces a 7-harmonic tone. Harmonics are weighted by triad:
- **primary** (macro): heavy R0–R2 (deep, continental)
- **scout** (meso): heavy R2–R4 (warm, regional)
- **sniper** (micro): heavy R4–R6 (bright, precise)

### Web Audio implementation

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.15;
masterGain.connect(audioCtx.destination);

let sonificationEnabled = false;
let sonificationVolume = 0.15;

const RING_FREQ_RANGES = [
  [20, 60], [60, 200], [200, 500], [500, 2000],
  [2000, 4000], [4000, 8000], [8000, 16000],
];

const walkerOscillators = new Map();

function sonifyWalker(walkerId, position, triad) {
  if (!sonificationEnabled) return;
  const torusPos = Number(position % 510510n);

  const freqs = RING_FREQ_RANGES.map(([lo, hi], ring) => {
    const prime = [2, 3, 5, 7, 11, 13, 17][ring];
    const ringPos = torusPos % prime;
    return lo + (ringPos / prime) * (hi - lo);
  });

  const weights = {
    0: [0.8, 0.6, 0.4, 0.2, 0.1, 0.05, 0.02],  // primary: heavy bass
    1: [0.1, 0.3, 0.6, 0.8, 0.6, 0.3, 0.1],    // scout: heavy mid
    2: [0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8],  // sniper: heavy treble
  }[triad];

  if (!walkerOscillators.has(walkerId)) {
    const bank = freqs.map((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = weights[i] * sonificationVolume / 127;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      return { osc, gain };
    });
    walkerOscillators.set(walkerId, bank);
  } else {
    const bank = walkerOscillators.get(walkerId);
    bank.forEach((node, i) => {
      node.osc.frequency.linearRampToValueAtTime(freqs[i], audioCtx.currentTime + 0.1);
      node.gain.gain.linearRampToValueAtTime(weights[i] * sonificationVolume / 127, audioCtx.currentTime + 0.1);
    });
  }
}

const SONIFY_INTERVAL = 10;
let dispatchCount = 0;

function onDispatchComplete(walkerStates) {
  dispatchCount++;
  if (dispatchCount % SONIFY_INTERVAL !== 0) return;
  const sample = walkerStates.filter((_, i) => i % 64 === 0);
  sample.forEach((state, i) => sonifyWalker(i, state.position, state.triad));
}
```

### Harmonic detection

When walkers converge on a region, their frequencies converge. Converging frequencies = increasing consonance. Consonance is measurable (frequency ratios approaching simple fractions).

```
DIVERGING:   spectral centroid variance HIGH    → walkers scattered → dissonance
CONVERGING:  spectral centroid variance LOW     → walkers clustering → consonance
RESONATING:  spectral centroid variance ≈ ZERO  → standing wave → KEY NEARBY
```

Also detect frequency ratios approaching φ. If `freq_a / freq_b → φ` (or 2/3, 3/5, 5/8, any Fibonacci ratio), that pair is in golden resonance — redirect nearby walkers toward that region.

```javascript
const spectralHistory = [];
const SPECTRAL_WINDOW = 100;

function detectResonance(walkerPositions) {
  const freqs = walkerPositions.map(pos => {
    const torusPos = Number(pos % 510510n);
    const ringPos = torusPos % 7;
    return 500 + (ringPos / 7) * 1500;
  });

  const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length;
  const variance = freqs.reduce((a, b) => a + (b - mean) ** 2, 0) / freqs.length;

  spectralHistory.push({ mean, variance, timestamp: Date.now() });
  if (spectralHistory.length > SPECTRAL_WINDOW) spectralHistory.shift();

  if (spectralHistory.length >= 10) {
    const recentVariance = spectralHistory.slice(-10).map(s => s.variance);
    const trend = recentVariance[9] - recentVariance[0];

    if (trend < -100) {
      return { status: 'CONVERGING', strength: Math.abs(trend), region: mean };
    }

    let goldenPairs = 0;
    for (let i = 0; i < freqs.length - 1; i += 10) {
      for (let j = i + 1; j < Math.min(i + 10, freqs.length); j++) {
        const ratio = Math.max(freqs[i], freqs[j]) / Math.min(freqs[i], freqs[j]);
        if (Math.abs(ratio - 1.618) < 0.05) goldenPairs++;
        if (Math.abs(ratio - 1.5) < 0.03) goldenPairs++;   // 3:2 perfect fifth
        if (Math.abs(ratio - 1.667) < 0.03) goldenPairs++; // 5:3
      }
    }

    if (goldenPairs > freqs.length * 0.1) {
      return { status: 'RESONATING', strength: goldenPairs, region: mean };
    }
  }

  return { status: 'SEARCHING', strength: 0, region: mean };
}
```

### Resonance-guided redirection

When detection returns CONVERGING or RESONATING:
- identify the convergence region on the torus
- compute the keyspace position that maps to that region
- bias a percentage of walkers toward that region
- percentage scales with strength:
  - **CONVERGING**: bias 10% of scouts
  - **RESONATING**: bias 30% of scouts + 10% of snipers

Never redirect *all* walkers. Layer A must keep grinding the full range. Resonance is a **bias**, not a replacement — same principle as the Ψ bias field.

Don't teleport walkers (breaks the kangaroo algorithm). Nudge them at DP boundaries:

```
jump_bias  = resonance_strength × (resonance_region − current_position) / range_size
next_jump  = standard_jump × (1 + jump_bias)
```

Statistical drift toward harmony. The kangaroo maths stays intact.

### UI — sonification panel

Collapsible bottom-right:

- **🔊 toggle** (off by default, requires user gesture per browser policy)
- **volume slider** (0–100%)
- **spectrum visualiser**: 7 bars, one per ring, ring-colour matched; bars converge during CONVERGING, pulse in sync with golden glow during RESONATING
- **resonance meter**: circular tuning gauge, centre = in tune, golden ring at φ position. When the needle parks at centre AND the φ-ring aligns: **RESONANCE LOCK** — key region identified, snipers deploy
- **status text**: `SEARCHING · CONVERGING · RESONATING · LOCKED`

Visual feedback works with audio muted — sonification is sensory amplification, not load-bearing.

### Konomi frequency table

```
SYMBOL → NUMBER → NOTE → FREQUENCY

◊ convergence   = 1    = do   = 261.63 Hz (C4, root, home)
β bloom         = 2    = re   = 293.66 Hz (D4)
ƒ function      = 3    = mi   = 329.63 Hz (E4)
κ compression   = φ⁻¹  = ◆    = 423.16 Hz (C4 × φ, microtonal)
Ω orchestrator  = 8    = do↑  = 523.25 Hz (C5, octave, the return)
ψ phase         = 6    = la   = 440.00 Hz (A4, universal tuning reference)
φ golden        = φ    = ◆    = 711.85 Hz (A4 × φ, microtonal)
● zero          = 0    = —    = 0 Hz (silence, rest, the gap)
θ theta         = 37   = mi·ti = 329.63 + 493.88 Hz (chord — the wheels house)

SPINE AS SCALE:
  2  = re        293.66
  3  = mi        329.63
  5  = sol       392.00
  7  = ti        493.88
  11 = do·do     261.63 × 2 (echo)
  13 = do·mi     dyad (the mirror is two notes)
  17 = do·sol·ti triad (the watcher sees three)

510,510 = sol·do·rest·sol·do·rest
Konomi  = do·rest·sol
Together = the infinite cadence (φ ensures it never repeats)
```

### The solver soundscape

127 walkers each producing a 7-harmonic tone. Mostly sub-bass and bass — felt as vibration. Like a room full of machines humming.

- **primary walkers**: deep, rumbling, slow pitch changes — a continental survey
- **scout walkers**: warm, mid-range, moderate pitch — a choir humming
- **sniper walkers**: bright, precise, fast pitch — crickets, birdsong

As the solver runs:
- *scattered* — chaotic, atonal
- *searching* — occasional consonance that dissolves
- *converging* — the hum becomes a chord
- *resonating* — clear harmonics, the pattern audible
- *locked* — a sustained tone, the standing wave

The moment of collision: all frequencies snap to harmonic alignment. Brief perfect chord. Then silence. Then the key on screen.

The solver found the note that was always playing.

### Implementation notes

- Web Audio API, zero external dependencies, all modern browsers
- AudioContext + OscillatorNode + GainNode + AnalyserNode (FFT for visualiser)
- LinearRampToValueAtTime for smooth transitions (no clicks)
- Don't sonify every walker every step — sample 127 representative walkers every 10 dispatches
- Audio on main thread; GPU solver stays on GPU; no interference
- Optional: record sonification as WAV/WebM, export frequency history as JSON, MIDI out to a DAW

### ƒ(build) additions

- [ ] Layer A (standard kangaroo): runs independently, unaffected by sonification
- [ ] Layer B (resonance): sonification + detection + nudging
- [ ] Audio toggle: off by default, user gesture required
- [ ] Volume control 0–100%
- [ ] Resonance meter + spectrum visualiser (work without audio enabled)
- [ ] Graceful degradation: no Web Audio → Layer B visual-only

---

◊·κ=1 · the solver SINGS while it searches
consonance = convergence · dissonance = scattered
the key is a standing wave · tune in to find it
Layer A grinds · Layer B listens · both run · zero downside
510,510 = sol·do·rest · the perfect cadence
Konomi = do·rest·sol · the perfect question
together they loop forever · φ ensures they never repeat
in the beginning was the Word · the Word was frequency
the frequency was always playing · you just have to tune in
◊
