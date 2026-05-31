// ═══════════════════════════════════════════════════════════════════
//  recursive-cube.cjs · v20.2-RCNESTED
//  Thomas/Kelly's canonical RecursiveCube · adapted for CASSIE
//
//  The click: fold = 510510 = ∏ spine = leaf count of a 7-level tree
//             where level L branches by spine[L].
//
//      L1: 2-tree   (parity)
//      L2: 3-tree
//      L3: 5-tree
//      L4: 7-tree   (Schumann spine)
//      L5: 11-tree  (witness)
//      L6: 13-tree
//      L7: 17-tree
//
//      total leaves = 2·3·5·7·11·13·17 = 510510 = FOLD
//
//  Each node holds a probability mass · damping a leaf cascades UP
//  through parent nodes AND OUT through shared faces with siblings.
//
//  attribution: Kelly Hohman + Thomas Moore (teslasolar/LookingGlass)
// ═══════════════════════════════════════════════════════════════════

const { SPINE, FOLD, project1DtoND, crtTo1D } = require('./crt-nd-bridge.cjs');

// ─── path encoding ───────────────────────────────────────────────
// A leaf at coordinate [r2, r3, r5, r7, r11, r13, r17] maps to a tree path.
// Path = same residue tuple, but interpreted hierarchically.
function oneDToPath(x, primes = SPINE) {
  return primes.map(p => x % p);
}

function pathToOneD(path, primes = SPINE) {
  return crtTo1D(path, primes);
}

// ─── recursive cube class ────────────────────────────────────────
class RecursiveCube {
  constructor(primes = SPINE) {
    this.primes = primes;
    this.depth = primes.length;
    // Sparse tree: nodes stored by path-prefix string.
    // Each node has: mass, children (lazy), level
    this.nodes = new Map();
    this.nodes.set('', { mass: 1.0, level: 0, dampHits: 0 });
    this.steps = 0;
    this.faceUpdates = 0;
  }

  // Get-or-create node at prefix path
  _node(prefix) {
    let n = this.nodes.get(prefix);
    if (!n) {
      const level = prefix === '' ? 0 : prefix.split(',').length;
      n = { mass: 1.0, level, dampHits: 0 };
      this.nodes.set(prefix, n);
    }
    return n;
  }

  _prefixes(path) {
    // Returns ['', '0', '0,1', '0,1,3', ...] for path [0,1,3,...]
    const out = [''];
    for (let i = 0; i < path.length; i++) {
      out.push(path.slice(0, i + 1).join(','));
    }
    return out;
  }

  // Seed stripes (1D positions with weight)
  seedStripes(stripes) {
    for (const s of stripes) {
      if (s.torus === null || s.torus === undefined) continue;
      const path = oneDToPath(s.torus, this.primes);
      const prefixes = this._prefixes(path);
      // Boost every node along the path
      for (const pref of prefixes) {
        const n = this._node(pref);
        n.mass *= (1 + s.weight);
      }
    }
  }

  // Echo-on-miss: a walker missed at 1D position x.
  // Dampen the leaf path · cascade UP to parents · share-face siblings.
  dampenAtMiss(x, dampFactor = 0.55) {
    const path = oneDToPath(x, this.primes);
    const prefixes = this._prefixes(path);

    // 1) Damp every prefix node along the miss path (cascades up the tree)
    for (let i = 1; i < prefixes.length; i++) {
      const n = this._node(prefixes[i]);
      // Stronger damping at deeper levels (the actual miss is at the leaf)
      const levelFactor = 1 - ((1 - dampFactor) * (i / this.depth));
      n.mass *= levelFactor;
      n.dampHits++;
      this.faceUpdates++;
    }

    // 2) Shared-face propagation: at each level, all siblings of the missed
    //    node share a face with it · they get a SMALL dampening (the miss
    //    informs them probabilistically).
    //    Sibling damp = sqrt(damp) to preserve mass approximately
    const siblingDamp = Math.sqrt(dampFactor);
    for (let i = 1; i < prefixes.length; i++) {
      const parentPath = i === 1 ? '' : prefixes[i - 1];
      const myDigit = path[i - 1];
      const p = this.primes[i - 1];
      for (let sib = 0; sib < p; sib++) {
        if (sib === myDigit) continue;
        const sibPath = parentPath === '' ? `${sib}` : `${parentPath},${sib}`;
        const n = this._node(sibPath);
        n.mass *= siblingDamp;
        this.faceUpdates++;
      }
    }

    this.steps++;
    this._renormaliseLevels();
    return this.depth + this.primes.reduce((a, p) => a + (p - 1), 0);
  }

  // Renormalise each level so probabilities sum coherently
  _renormaliseLevels() {
    // Group nodes by parent · normalise children to sum=1
    const byParent = new Map();
    for (const [key, n] of this.nodes) {
      if (key === '') continue;
      const idx = key.lastIndexOf(',');
      const parent = idx === -1 ? '' : key.substring(0, idx);
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(key);
    }
    for (const [parent, children] of byParent) {
      let sum = 0;
      for (const ck of children) sum += this.nodes.get(ck).mass;
      if (sum > 0) {
        for (const ck of children) this.nodes.get(ck).mass /= sum;
      }
    }
  }

  // Effective search space via per-level Shannon entropy
  // (analogous to AxisSearch.ess in face-lattice.cjs)
  ess() {
    // For each level, compute the entropy of the mass distribution
    // over the p children at that level (averaged across parents).
    let totalH = 0;
    for (let lvl = 1; lvl <= this.depth; lvl++) {
      const p = this.primes[lvl - 1];
      // Collect masses for nodes at this level grouped by parent
      const byParent = new Map();
      for (const [key, n] of this.nodes) {
        if (n.level !== lvl) continue;
        const idx = key.lastIndexOf(',');
        const parent = idx === -1 ? '' : key.substring(0, idx);
        if (!byParent.has(parent)) byParent.set(parent, new Float64Array(p).fill(1 / p));
        const arr = byParent.get(parent);
        const digit = parseInt(key.substring(idx + 1), 10);
        arr[digit] = n.mass;
      }
      // Average entropy across parents at this level (weighted equally for now)
      let levelH = 0;
      let count = 0;
      for (const arr of byParent.values()) {
        let s = 0;
        for (let i = 0; i < p; i++) s += arr[i];
        if (s <= 0) continue;
        let H = 0;
        for (let i = 0; i < p; i++) {
          const q = arr[i] / s;
          if (q > 1e-12) H -= q * Math.log2(q);
        }
        levelH += H;
        count++;
      }
      if (count > 0) totalH += levelH / count;
    }
    return Math.pow(2, totalH);
  }

  // Argmax leaf (most-probable 1D position)
  argmax() {
    // Greedy descent: at each level pick the highest-mass child
    let prefix = '';
    const path = [];
    for (let lvl = 1; lvl <= this.depth; lvl++) {
      const p = this.primes[lvl - 1];
      let bestDigit = 0;
      let bestMass = -1;
      for (let d = 0; d < p; d++) {
        const key = prefix === '' ? `${d}` : `${prefix},${d}`;
        const n = this.nodes.get(key);
        const m = n ? n.mass : 1 / p;
        if (m > bestMass) { bestMass = m; bestDigit = d; }
      }
      path.push(bestDigit);
      prefix = prefix === '' ? `${bestDigit}` : `${prefix},${bestDigit}`;
    }
    return { path, oneD: pathToOneD(path, this.primes) };
  }

  summary() {
    return {
      steps: this.steps,
      total_nodes: this.nodes.size,
      face_updates: this.faceUpdates,
      avg_updates_per_step: this.steps > 0 ? this.faceUpdates / this.steps : 0,
      ess: this.ess(),
      argmax: this.argmax(),
    };
  }
}

// ─── tests ────────────────────────────────────────────────────────
if (require.main === module) {
  console.log('◊·κ=1 · recursive-cube · v20.2-RCNESTED');
  console.log('  spine: [' + SPINE.join(', ') + ']');
  console.log('  fold:  ' + FOLD);
  console.log('  depth: ' + SPINE.length);
  console.log();

  // Round-trip test
  const samples = [0, 1, 268318, 498617, 38019, 510509];
  console.log('  Path encoding roundtrip:');
  for (const x of samples) {
    const path = oneDToPath(x);
    const back = pathToOneD(path);
    console.log(`    ${back === x ? '✓' : '✗'} ${x} → [${path.join(',')}] → ${back}`);
  }

  // Build cube, seed stripes
  const STRIPES = [
    { torus: 268318, weight: 0.50, name: 'A' },
    { torus: 498617, weight: 0.30, name: 'B' },
    { torus:  38019, weight: 0.10, name: 'C' },
  ];
  const cube = new RecursiveCube();
  cube.seedStripes(STRIPES);
  console.log();
  console.log('  Seeded with 3 stripes · nodes: ' + cube.nodes.size);

  // Apply 100 random misses
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(Math.random() * FOLD);
    cube.dampenAtMiss(x, 0.55);
  }

  const s = cube.summary();
  console.log();
  console.log('  After 100 random misses:');
  console.log('    nodes:                ' + s.total_nodes);
  console.log('    face_updates total:   ' + s.face_updates);
  console.log('    avg updates/step:     ' + s.avg_updates_per_step.toFixed(1));
  console.log('    ess:                  ' + s.ess.toFixed(2));
  console.log('    argmax 1D:            ' + s.argmax.oneD);
  console.log('    argmax path:          [' + s.argmax.path.join(',') + ']');
}

module.exports = { RecursiveCube, oneDToPath, pathToOneD };
