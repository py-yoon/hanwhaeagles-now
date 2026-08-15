// Builds docs/badge.svg — a static, nightly-refreshed embed badge for community sites
// (디시/에펨/블로그 <img> 삽입용). Reads the same data/live/latest-report.json the real
// simulation engine (scripts/game-tree-forecast.mjs) already produces, instead of running a
// second, independent simulation just to draw a badge.
import fs from 'node:fs/promises';

const REPORT_PATH = 'data/live/latest-report.json';
const OUT_PATH = 'docs/badge.svg';

function svg({ probPct, rank }) {
  const probStr = `PS ${probPct.toFixed(2)}%`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="32" viewBox="0 0 220 32">
  <rect width="220" height="32" rx="6" fill="#0b0906" stroke="rgba(244,237,224,0.12)" stroke-width="1"/>
  <path d="M0 6C0 2.68629 2.68629 0 6 0H110V32H6C2.68629 32 0 29.3137 0 26V6Z" fill="#100d09"/>
  <path d="M110 0H214C217.314 0 220 2.68629 220 6V26C220 29.3137 217.314 32 214 32H110V0Z" fill="#ef5f1c"/>
  <text x="55" y="20" fill="#f4ede0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">🦅 HANWHA (${rank}위)</text>
  <text x="165" y="20" fill="#0b0906" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" text-anchor="middle">${probStr}</text>
</svg>
`;
}

async function main() {
  const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
  const probPct = report.summary.playoff_probability * 100;
  const rank = report.summary.most_likely_rank;
  await fs.writeFile(OUT_PATH, svg({ probPct, rank }));
  console.log(`Wrote ${OUT_PATH} — PS ${probPct.toFixed(2)}%, most likely rank ${rank}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
