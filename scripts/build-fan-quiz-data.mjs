import fs from 'node:fs/promises';

const SCRATCH_DIR = process.env.QUIZ_SOURCE_DIR;
const OUT_PATH = 'docs/fan-quiz-data.js';
const TIER_COUNT = 5;
const EXPECTED_PER_TIER = 60;

async function main() {
  if (!SCRATCH_DIR) throw new Error('set QUIZ_SOURCE_DIR to the directory holding quiz-tier-1.json .. quiz-tier-5.json');

  const all = [];
  for (let t = 1; t <= TIER_COUNT; t++) {
    const rows = JSON.parse(await fs.readFile(`${SCRATCH_DIR}/quiz-tier-${t}.json`, 'utf8'));
    if (rows.length !== EXPECTED_PER_TIER) throw new Error(`tier ${t}: expected ${EXPECTED_PER_TIER} questions, got ${rows.length}`);
    for (const q of rows) {
      if (q.tier !== t) throw new Error(`tier ${t}: question ${q.id} has tier=${q.tier}`);
      if (!Array.isArray(q.choices) || q.choices.length !== 4) throw new Error(`${q.id}: needs exactly 4 choices`);
      if (!(q.answerIndex >= 0 && q.answerIndex <= 3)) throw new Error(`${q.id}: answerIndex out of range`);
    }
    all.push(...rows);
  }

  const ids = all.map((q) => q.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate question ids across tiers');
  const questionTexts = all.map((q) => q.question);
  if (new Set(questionTexts).size !== questionTexts.length) throw new Error('duplicate question text across tiers');

  const payload = {
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      total: all.length,
      perTier: EXPECTED_PER_TIER,
    },
    questions: all,
  };

  const js = `window.EAGLES_QUIZ_BANK = ${JSON.stringify(payload, null, 2)};\n`;
  await fs.writeFile(OUT_PATH, js);
  console.log(`Wrote ${OUT_PATH} — ${all.length} questions across ${TIER_COUNT} tiers`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
