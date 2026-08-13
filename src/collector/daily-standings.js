import { chromium } from 'playwright';
import { parseTeamRankTable, validateTeamRankRows } from './standings-parser.js';

export const KBO_DAILY_RANK_URL='https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';

export async function collectDailyStandings({date, headless=true}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date: ${date}`);
  const browser=await chromium.launch({headless});
  try{
    const page=await browser.newPage();
    // NOTE: this page ignores a `?gameDate=` query string entirely and always renders
    // "today". The only working navigation is the hidden hfSearchDate field + the
    // (display:none) btnCalendarSelect postback that the site's own date-picker widget
    // uses, so that path is replicated here instead of relying on the URL.
    await page.goto(KBO_DAILY_RANK_URL,{waitUntil:'domcontentloaded',timeout:30000});
    const compact=date.replaceAll('-','');
    await page.evaluate((d)=>{
      document.getElementById('cphContents_cphContents_cphContents_hfSearchDate').value=d;
      document.getElementById('cphContents_cphContents_cphContents_btnCalendarSelect').click();
    },compact);
    await page.waitForLoadState('domcontentloaded');
    const table=page.locator('table').filter({hasText:'승률'}).first();
    await table.waitFor({state:'visible',timeout:10000});
    const confirmedDate=await page.locator('#cphContents_cphContents_cphContents_hfSearchDate').inputValue();
    if(confirmedDate!==compact) throw new Error(`KBO standings page did not navigate to ${date} (stayed on ${confirmedDate})`);
    const rows=parseTeamRankTable(await table.evaluate(el=>el.outerHTML),date);
    const validation=validateTeamRankRows(rows);
    if(validation.status!=='PASS') throw new Error(`Invalid KBO standings snapshot: ${JSON.stringify(validation.errors)}`);
    return rows;
  }finally{await browser.close();}
}
