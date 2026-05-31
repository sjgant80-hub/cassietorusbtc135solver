// ═══════════════════════════════════════════════════════════════════
//  face-lattice.cjs · v20.2-MACCubeFACE127D
//  127-face probability tensor · inclusion-exclusion dampening cascade
//  ◊ convergence via face consensus
// ═══════════════════════════════════════════════════════════════════

const { SPINE, FOLD, enumerateFaces, project1DtoND, crtTo1D, faceFold } = require('./crt-nd-bridge.cjs');

class FaceLattice {
  constructor(primes = SPINE) {
    this.primes = primes;
    this.faces = enumerateFaces(primes);
    // probability tensor: face.key → array of probabilities (one per position in face's sub-torus)
    this.tensor = {};
    for (const face of this.faces) {
      this.tensor[face.key] = new Float32Array(face.fold).fill(1.0);
    }
    this.totalSteps = 0;
    this.cascadeMultiplier = 0; // running sum of "info units" delivered per step
  }

  // Seed the tensor with stripe priors (the 3 v19-derived hot positions)
  seedStripes(stripes) {
    // stripes = array of { torus: <1D pos>, weight: <0..1> }
    for (const stripe of stripes) {
      if (stripe.torus === null) continue;
      // Boost probability at this stripe's 1D position across all faces
      for (const face of this.faces) {
        const pos = faceFold(stripe.torus, face);
        this.tensor[face.key][pos] *= (1 + stripe.weight);
      }
    }
    this.normaliseAll();
  }

  normaliseAll() {
    for (const face of this.faces) {
      const t = this.tensor[face.key];
      let sum = 0;
      for (let i = 0; i < t.length; i++) sum += t[i];
      if (sum > 0) {
        const inv = 1 / sum;
        for (let i = 0; i < t.length; i++) t[i] *= inv;
      }
    }
  }

  // Echo-on-miss: a walker missed at 1D position `x`.
  // Cascade dampening through all 127 faces.
  // Returns the number of "info units" propagated (face count touched).
  dampenAtMiss(x, dampFactor = 0.55) {
    let infoUnits = 0;
    for (const face of this.faces) {
      const pos = faceFold(x, face);
      this.tensor[face.key][pos] *= dampFactor;
      infoUnits++;
    }
    // Renormalise each face
    for (const face of this.faces) {
      const t = this.tensor[face.key];
      let sum = 0;
      for (let i = 0; i < t.length; i++) sum += t[i];
      if (sum > 0) {
        const inv = 1 / sum;
        for (let i = 0; i < t.length; i++) t[i] *= inv;
      }
    }
    this.totalSteps++;
    this.cascadeMultiplier += infoUnits;
    return infoUnits;
  }

  // ◊ convergence detection: compute argmax of full-torus face
  // and check how many sub-faces agree with that position's projections.
  coherence() {
    // The 127th face is the full torus (k=7 · all spine primes)
    const fullKey = this.primes.join(',');
    const full = this.tensor[fullKey];

    // Argmax of full torus
    let bestIdx = 0, bestVal = full[0];
    for (let i = 1; i < full.length; i++) {
      if (full[i] > bestVal) { bestVal = full[i]; bestIdx = i; }
    }

    // For each face, does its argmax project to a position consistent with bestIdx?
    let agree = 0;
    for (const face of this.faces) {
      const t = this.tensor[face.key];
      let faceArgmax = 0, faceMax = t[0];
      for (let i = 1; i < t.length; i++) {
        if (t[i] > faceMax) { faceMax = t[i]; faceArgmax = i; }
      }
      const expectedFromBest = faceFold(bestIdx, face);
      if (faceArgmax === expectedFromBest) agree++;
    }
    return {
      consensus_position: bestIdx,
      consensus_prob: bestVal,
      agreement_faces: agree,
      total_faces: this.faces.length,
      coherence: agree / this.faces.length,
    };
  }

  // Effective Search Space at the full-torus face
  ess() {
    const fullKey = this.primes.join(',');
    const full = this.tensor[fullKey];
    // Shannon entropy → effective size
    let H = 0;
    for (let i = 0; i < full.length; i++) {
      if (full[i] > 1e-12) H -= full[i] * Math.log2(full[i]);
    }
    return Math.pow(2, H); // effective size (positions)
  }

  // Stats summary
  summary() {
    const c = this.coherence();
    return {
      steps: this.totalSteps,
      cascade_units_total: this.cascadeMultiplier,
      avg_units_per_step: this.totalSteps > 0 ? this.cascadeMultiplier / this.totalSteps : 0,
      ess: this.ess(),
      coherence: c.coherence,
      consensus_position: c.consensus_position,
      consensus_prob: c.consensus_prob,
    };
  }
}

// Baseline 1D probability field (for comparison with face-lattice)
class OneDTorus {
  constructor(fold = FOLD) {
    this.fold = fold;
    this.prob = new Float32Array(fold).fill(1.0 / fold);
    this.steps = 0;
  }
  seedStripes(stripes) {
    for (const s of stripes) {
      if (s.torus === null) continue;
      this.prob[s.torus] *= (1 + s.weight);
    }
    this.normalise();
  }
  normalise() {
    let sum = 0;
    for (let i = 0; i < this.fold; i++) sum += this.prob[i];
    if (sum > 0) for (let i = 0; i < this.fold; i++) this.prob[i] /= sum;
  }
  dampenAtMiss(x, dampFactor = 0.55) {
    this.prob[x % this.fold] *= dampFactor;
    this.normalise();
    this.steps++;
    return 1; // 1 info unit per step
  }
  ess() {
    let H = 0;
    for (let i = 0; i < this.fold; i++) {
      if (this.prob[i] > 1e-12) H -= this.prob[i] * Math.log2(this.prob[i]);
    }
    return Math.pow(2, H);
  }
}

// 7D axis search (intermediate level · just 7 axes, no full lattice)
class AxisSearch {
  constructor(primes = SPINE) {
    this.primes = primes;
    this.axes = {};
    for (const p of primes) {
      this.axes[p] = new Float32Array(p).fill(1.0 / p);
    }
    this.steps = 0;
  }
  seedStripes(stripes) {
    for (const s of stripes) {
      if (s.torus === null) continue;
      for (const p of this.primes) {
        this.axes[p][s.torus % p] *= (1 + s.weight);
      }
    }
    for (const p of this.primes) {
      let sum = 0;
      for (let i = 0; i < p; i++) sum += this.axes[p][i];
      if (sum > 0) for (let i = 0; i < p; i++) this.axes[p][i] /= sum;
    }
  }
  dampenAtMiss(x, dampFactor = 0.55) {
    for (const p of this.primes) {
      this.axes[p][x % p] *= dampFactor;
      let sum = 0;
      for (let i = 0; i < p; i++) sum += this.axes[p][i];
      if (sum > 0) for (let i = 0; i < p; i++) this.axes[p][i] /= sum;
    }
    this.steps++;
    return this.primes.length;
  }
  ess() {
    // Combined ESS = product of per-axis ESS
    let totalH = 0;
    for (const p of this.primes) {
      const t = this.axes[p];
      let H = 0;
      for (let i = 0; i < p; i++) {
        if (t[i] > 1e-12) H -= t[i] * Math.log2(t[i]);
      }
      totalH += H;
    }
    return Math.pow(2, totalH);
  }
}

module.exports = { FaceLattice, OneDTorus, AxisSearch };
