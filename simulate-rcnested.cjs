// ═══════════════════════════════════════════════════════════════════
//  simulate-rcnested.cjs · v20.2-RCNESTED
//  Compare 1D / 7D-axis / 127-face / RCNESTED on synthetic targets
//
//  The 7D-axis was already EMPIRICALLY VERIFIED 15,700× over 1D.
//  This sim adds RCNESTED to see whether hierarchical structure
//  delivers additional gain over flat 7-axis.
// ═══════════════════════════════════════════════════════════════════

const fs = require('fs');
const { FOLD, SPINE } = require('./crt-nd-bridge.cjs');
const { FaceLattice, OneDTorus, AxisSearch } = require('./face-lattice.cjs');
const { RecursiveCube } = require('./recursive-cube.cjs');

const STRIPES = [
  { torus: 268318, weight: 0.50, name: 'A' },
  { torus: 498617, weight: 0.30, name: 'B' },
  { torus:  38019, weight: 0.10, name: 'C' },
];

function runStructure(name, structure, target, steps) {
  const initial = structure.ess();
  for (let s = 0; s < steps; s++) {
    let pos;
    do { pos = Math.floor(Math.random() * FOLD); } while (pos === target);
    structure.dampenAtMiss(pos, 0.55);
  }
  const final = structure.ess();
  return { name, initial, final, collapse: initial / final };
}

function run() {
  const STEPS = 500;
  const TRIALS = 3;

  console.log('◊·κ=1 · v20.2-RCNESTED · empirical comparison · 4 structures');
  console.log(`  steps per trial: ${STEPS}`);
  console.log(`  trials:          ${TRIALS}`);
  console.log(`  spine:           [${SPINE.join(', ')}]`);
  console.log();

  const results = { trials: [] };

  for (let trial = 0; trial < TRIALS; trial++) {
    const target = Math.floor(Math.random() * FOLD);
    console.log(`◊ TRIAL ${trial + 1} · target = ${target}`);

    const oneD = new OneDTorus();    oneD.seedStripes(STRIPES);
    const axis = new AxisSearch();   axis.seedStripes(STRIPES);
    const lat  = new FaceLattice();  lat.seedStripes(STRIPES);
    const rc   = new RecursiveCube(); rc.seedStripes(STRIPES);

    const r1 = runStructure('1D',       oneD, target, STEPS);
    const r2 = runStructure('7D-axis',  axis, target, STEPS);
    const r3 = runStructure('127-face', lat,  target, STEPS);
    const r4 = runStructure('RCNESTED', rc,   target, STEPS);

    console.log(`   1D       ESS ${r1.initial.toFixed(0).padStart(8)} → ${r1.final.toFixed(1).padStart(10)}  (${r1.collapse.toFixed(2).padStart(8)}× collapse)`);
    console.log(`   7D-axis  ESS ${r2.initial.toFixed(0).padStart(8)} → ${r2.final.toFixed(1).padStart(10)}  (${r2.collapse.toFixed(2).padStart(8)}× collapse)`);
    console.log(`   127-face ESS ${r3.initial.toFixed(0).padStart(8)} → ${r3.final.toFixed(1).padStart(10)}  (${r3.collapse.toFixed(2).padStart(8)}× collapse)`);
    console.log(`   RCNESTED ESS ${r4.initial.toFixed(0).padStart(8)} → ${r4.final.toFixed(1).padStart(10)}  (${r4.collapse.toFixed(2).padStart(8)}× collapse)`);
    console.log();

    results.trials.push({ target, oneD: r1, axis: r2, lattice: r3, rcnested: r4 });
  }

  const avg = (key) => results.trials.reduce((s, t) => s + t[key].collapse, 0) / results.trials.length;
  const a1 = avg('oneD'), a2 = avg('axis'), a3 = avg('lattice'), a4 = avg('rcnested');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AGGREGATE collapse over ' + TRIALS + ' trials');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  1D baseline:        ${a1.toFixed(2)}×`);
  console.log(`  7D-axis search:     ${a2.toFixed(2)}×    speedup vs 1D: ${(a2 / a1).toFixed(2)}×`);
  console.log(`  127-face lattice:   ${a3.toFixed(2)}×    speedup vs 1D: ${(a3 / a1).toFixed(2)}×`);
  console.log(`  RCNESTED:           ${a4.toFixed(2)}×    speedup vs 1D: ${(a4 / a1).toFixed(2)}×`);
  console.log();

  results.aggregate = {
    avg_1d: a1, avg_axis: a2, avg_lattice: a3, avg_rcnested: a4,
    speedup_axis_vs_1d: a2 / a1,
    speedup_lattice_vs_1d: a3 / a1,
    speedup_rcnested_vs_1d: a4 / a1,
    speedup_rcnested_vs_axis: a4 / a2,
  };
  results.generated_at = new Date().toISOString();
  results.cosmology = 'v20.2-RCNESTED';
  results.attribution = 'Kelly Hohman + Thomas Moore (teslasolar/LookingGlass)';

  fs.writeFileSync('rcnested-speedup.json', JSON.stringify(results, null, 2));
  console.log('◊ written rcnested-speedup.json');
}

run();
