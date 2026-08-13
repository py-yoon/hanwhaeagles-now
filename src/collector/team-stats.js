import { chromium } from 'playwright';
import { parseTeamStatTable, mergeTeamStats } from './team-stats-parser.js';

export const TEAM_HITTER_BASIC1_URL = 'https://www.koreabaseball.com/Record/Team/Hitter/Basic1.aspx';
export const TEAM_HITTER_BASIC2_URL = 'https://www.koreabaseball.com/Record/Team/Hitter/Basic2.aspx';
export const TEAM_PITCHER_BASIC1_URL = 'https://www.koreabaseball.com/Record/Team/Pitcher/Basic1.aspx';

/**
 * Collects current (as-of-today) team-level batting and pitching aggregates. These pages are
 * season-to-date cumulative totals with no historical date navigation (unlike the daily
 * standings page), so this is only usable as a "right now" snapshot, never for a point-in-time
 * historical backtest — feeding it into games from earlier in the season would be look-ahead
 * leakage.
 */
export async function collectTeamStats({ headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  try {
    const page = await browser.newPage();
    const fetchTable = async (url) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const table = page.locator('table.tData').first();
      await table.waitFor({ state: 'visible', timeout: 10000 });
      return parseTeamStatTable(await table.evaluate((el) => el.outerHTML));
    };
    const hitterBasic1 = await fetchTable(TEAM_HITTER_BASIC1_URL);
    const hitterBasic2 = await fetchTable(TEAM_HITTER_BASIC2_URL);
    const pitcherBasic1 = await fetchTable(TEAM_PITCHER_BASIC1_URL);
    if (hitterBasic1.length !== 10 || hitterBasic2.length !== 10 || pitcherBasic1.length !== 10) {
      throw new Error(`Expected 10 teams per table, got hitter1=${hitterBasic1.length} hitter2=${hitterBasic2.length} pitcher1=${pitcherBasic1.length}`);
    }
    return mergeTeamStats(hitterBasic1, hitterBasic2, pitcherBasic1);
  } finally {
    await browser.close();
  }
}
