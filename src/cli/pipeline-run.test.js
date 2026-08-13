import test from 'node:test';
import assert from 'node:assert/strict';
import { runProductionCliPipeline } from './pipeline-run.js';

const BASE = {
  asOf: '2026-04-05',
  gamesFile: 'data/fixtures/production-run-demo-2026-04.json',
  officialFiles: ['data/fixtures/official-2026-04-05.json'],
  iterations: 1000,
};

test('rejects an invalid as-of date before touching any data', async () => {
  const result = await runProductionCliPipeline({ ...BASE, asOf: 'not-a-date' });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.stage, 'INPUT_VALIDATION');
});

test('fixture data is blocked by the production gate by default', async () => {
  const result = await runProductionCliPipeline(BASE);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.stage, 'PRODUCTION_GATE');
});

test('fixture data can run end-to-end with --allow-fixture and produces a valid report', async () => {
  const result = await runProductionCliPipeline({ ...BASE, allowFixture: true });
  assert.equal(result.status, 'PASS');
  assert.equal(result.report.schema_version, '1.0');
  assert.ok(Number.isFinite(result.report.summary.playoff_probability));
  assert.ok(result.report.summary.playoff_probability >= 0 && result.report.summary.playoff_probability <= 1);
  assert.ok(Array.isArray(result.report.important_games));
  assert.ok(result.report.important_games.length > 0);
  assert.equal(result.report.provenance.audit_status, 'PASS');
  assert.equal(result.report.provenance.reconciliation_status, 'PASS');
});

test('every Elo strength component stays on the same small differential scale', async () => {
  const result = await runProductionCliPipeline({ ...BASE, allowFixture: true });
  for (const g of result.artifacts.simulation.forecasts) {
    const sum = g.probabilities.HOME_WIN + g.probabilities.DRAW + g.probabilities.AWAY_WIN;
    assert.ok(Math.abs(sum - 1) < 1e-6);
    // A saturated sigmoid (raw ~1500 Elo fed in unscaled) collapses to ~0 or ~1;
    // a correctly scaled model keeps single-game probabilities within a sane band.
    assert.ok(g.probabilities.HOME_WIN > 0.02 && g.probabilities.HOME_WIN < 0.98);
  }
});

test('reconciliation mismatch blocks before any Monte Carlo simulation runs', async () => {
  const result = await runProductionCliPipeline({
    ...BASE,
    allowFixture: true,
    officialFiles: ['data/fixtures/official-2026-07-26.json'],
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.stage, 'RECONCILIATION');
  assert.equal(result.artifacts, undefined);
});

test('season audit failure (duplicate game_id) blocks before reconciliation', async () => {
  const result = await runProductionCliPipeline({
    ...BASE,
    allowFixture: true,
    gamesFile: 'data/fixtures/production-run-demo-2026-04-broken-audit.json',
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.stage, 'AUDIT');
  assert.equal(result.audit.status, 'FAIL');
});

test('opt-in --team-stats overrides neutral offense/bullpen components and is marked unvalidated in provenance', async () => {
  const withoutStats = await runProductionCliPipeline({ ...BASE, allowFixture: true });
  const withStats = await runProductionCliPipeline({ ...BASE, allowFixture: true, teamStatsFile: 'data/fixtures/team-stats-demo.json' });
  assert.equal(withStats.report.provenance.team_stats_source, 'data/fixtures/team-stats-demo.json');
  assert.equal(withStats.report.provenance.team_stats_validated, false);
  assert.equal(withoutStats.report.provenance.team_stats_source, null);
  // the fixture gives HANWHA a real batting/pitching edge, so its component values should move
  // away from the all-neutral (0) baseline once --team-stats is supplied.
  const hanwhaRow = (result) => result.artifacts.strength_snapshot.rows.find((r) => r.team === 'HANWHA');
  assert.equal(hanwhaRow(withoutStats).components.offense, 0);
  assert.notEqual(hanwhaRow(withStats).components.offense, 0);
});

test('deterministic seed produces identical playoff probability across runs', async () => {
  const a = await runProductionCliPipeline({ ...BASE, allowFixture: true, seed: 42 });
  const b = await runProductionCliPipeline({ ...BASE, allowFixture: true, seed: 42 });
  assert.equal(a.report.summary.playoff_probability, b.report.summary.playoff_probability);
});
