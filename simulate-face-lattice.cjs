// ═══════════════════════════════════════════════════════════════════
//  simulate-face-lattice.cjs · v20.2-MACCubeFACE127D
//  Empirical multiplier · 1D vs 7D-axis vs 127-face on synthetic targets
//
//  Method:
//    1. Pick a synthetic target position T in [0, 510510)
//    2. Run walkers that miss T (visiting random other positions)
//    3. Track ESS collapse rate for each of 3 search structures
//    4. Compute speedup multipliers · write face-lattice-speedup.json
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const { FOLD, SPINE } = require('./crt-nd-bridge.cjs');
const { FaceLattice, OneDTorus, AxisSearch } = require('./face-lattice.cjs');

const STRIPES = [
  { torus: 268318, weight: 0.50, name: 'A' },
  { torus: 498617, weight: 0.30, name: 'B' },
  { torus:  38019, weight: 0.10, name: 'C' },
];

function simulate(steps, target, structure) {
  // Generate `steps` random positions that are NOT the target
  // Apply dampenAtMiss for each · track ESS over time
  const trajectory = [];
  for (let s = 0; s < steps; s++) {
    let pos;
    do { pos = Math.floor(Math.random() * FOLD); } while (pos === target);
    structure.dampenAtMiss(pos, 0.55);
    if (s % 50 === 0 || s === steps - 1) {
      trajectory.push({ step: s, ess: structure.ess() });
    }
  }
  return trajectory;
}

function run() {
  const STEPS = 500;
  const TRIALS = 3;

  console.log('◊·κ=1 · v20.2-MACCubeFACE127D · empirical multiplier simulation');
  console.log(`  steps per trial: ${STEPS}`);
  console.log(`  trials:          ${TRIALS}`);
  console.log(`  spine:           [${SPINE.join(', ')}]`);
  console.log();

  const results = { trials: [] };

  for (let trial = 0; trial < TRIALS; trial++) {
    const target = Math.floor(Math.random() * FOLD);
    console.log(`◊ TRIAL ${trial + 1} · synthetic target = ${target}`);

    // Run each structure with same target
    const oneD = new OneDTorus();
    oneD.seedStripes(STRIPES);
    const oneDInitialESS = oneD.ess();
    const oneDTraj = simulate(STEPS, target, oneD);

    const axis = new AxisSearch();
    axis.seedStripes(STRIPES);
    const axisInitialESS = axis.ess();
    const axisTraj = simulate(STEPS, target, axis);

    const lattice = new FaceLattice();
    lattice.seedStripes(STRIPES);
    const latticeInitialESS = lattice.ess();
    const latticeTraj = simulate(STEPS, target, lattice);
    const latticeSummary = lattice.summary();

    const oneDFinal = oneDTraj[oneDTraj.length - 1].ess;
    const axisFinal = axisTraj[axisTraj.length - 1].ess;
    const latticeFinal = latticeTraj[latticeTraj.length - 1].ess;

    const oneDCollapse = oneDInitialESS / oneDFinal;
    const axisCollapse = axisInitialESS / axisFinal;
    const latticeCollapse = latticeInitialESS / latticeFinal;

    console.log(`   1D     ESS: ${oneDInitialESS.toFixed(0)} → ${oneDFinal.toFixed(1)}  (${oneDCollapse.toFixed(1)}× collapse)`);
    console.log(`   7D-axis ESS: ${axisInitialESS.toFixed(0)} → ${axisFinal.toFixed(1)}  (${axisCollapse.toFixed(1)}× collapse)`);
    console.log(`   127-face ESS: ${latticeInitialESS.toFixed(0)} → ${latticeFinal.toFixed(1)}  (${latticeCollapse.toFixed(1)}× collapse)`);
    console.log(`   face avg info units/step: ${latticeSummary.avg_units_per_step.toFixed(1)}`);
    console.log();

    results.trials.push({
      target,
      oneD: {
        ess_initial: oneDInitialESS,
        ess_final: oneDFinal,
        collapse_ratio: oneDCollapse,
      },
      axis_7d: {
        ess_initial: axisInitialESS,
        ess_final: axisFinal,
        collapse_ratio: axisCollapse,
        info_units_per_step: SPINE.length,
      },
      face_lattice_127: {
        ess_initial: latticeInitialESS,
        ess_final: latticeFinal,
        collapse_ratio: latticeCollapse,
        info_units_per_step: latticeSummary.avg_units_per_step,
        coherence: latticeSummary.coherence,
        consensus_position: latticeSummary.consensus_position,
        agreement_faces: lattice.coherence().agreement_faces,
      },
    });
  }

  // Aggregate
  const avg = (key) => results.trials.reduce((s, t) => s + t[key].collapse_ratio, 0) / results.trials.length;
  const avgOneD = avg('oneD');
  const avgAxis = avg('axis_7d');
  const avgLattice = avg('face_lattice_127');
  const speedupAxisVs1D = avgAxis / avgOneD;
  const speedupLatticeVs1D = avgLattice / avgOneD;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('◊·κ=1 · AGGREGATE MULTIPLIERS over ' + TRIALS + ' trials');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  1D baseline           collapse: ${avgOneD.toFixed(2)}× per ${STEPS} steps`);
  console.log(`  7D-axis search        collapse: ${avgAxis.toFixed(2)}×  ·  ${speedupAxisVs1D.toFixed(2)}× SPEEDUP vs 1D`);
  console.log(`  127-face lattice      collapse: ${avgLattice.toFixed(2)}×  ·  ${speedupLatticeVs1D.toFixed(2)}× SPEEDUP vs 1D`);
  console.log();
  console.log(`  Theoretical ceiling: 127× (face count)`);
  console.log(`  Realised vs ceiling:  ${(speedupLatticeVs1D / 127 * 100).toFixed(1)}%`);
  console.log();

  const verdict =
    speedupLatticeVs1D >= 30 ? 'STRONG · proceed to master patch (phases 5-8)' :
    speedupLatticeVs1D >= 10 ? 'MODERATE · proceed but expect actual gains < theoretical' :
    speedupLatticeVs1D >=  3 ? 'WEAK · investigate correlation effects before patching master' :
                               'NULL · face-lattice does not deliver claimed speedup · debug';
  console.log(`  Verdict: ${verdict}`);

  results.aggregate = {
    trials: TRIALS,
    steps_per_trial: STEPS,
    avg_1d_collapse: avgOneD,
    avg_axis_collapse: avgAxis,
    avg_lattice_collapse: avgLattice,
    speedup_axis_vs_1d: speedupAxisVs1D,
    speedup_lattice_vs_1d: speedupLatticeVs1D,
    theoretical_ceiling: 127,
    realised_pct: speedupLatticeVs1D / 127 * 100,
    verdict,
  };
  results.generated_at = new Date().toISOString();
  results.cosmology = 'v20.2-MACCubeFACE127D';
  results.doctrine = 'MACCubeFACE127D-ADDENDUM.md';

  fs.writeFileSync('face-lattice-speedup.json', JSON.stringify(results, null, 2));
  console.log();
  console.log('◊ written face-lattice-speedup.json');
}

run();
