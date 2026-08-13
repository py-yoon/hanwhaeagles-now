import { chromium } from 'playwright';
import { parseScheduleTable } from './parser.js';
export const KBO_SCHEDULE_URL='https://www.koreabaseball.com/Schedule/Schedule.aspx';
export async function collectMonth({season,month,seriesValue='0,9,6',seriesType='REGULAR_SEASON',headless=true,timeout=30000,waitAfterSelectMs=500,launchOptions={}}){
  const browser=await chromium.launch({headless,...launchOptions});
  try{
    const page=await browser.newPage();
    await page.goto(KBO_SCHEDULE_URL,{waitUntil:'domcontentloaded',timeout});
    await page.locator('#ddlYear').selectOption(String(season));
    await page.locator('#ddlMonth').selectOption(String(month).padStart(2,'0'));
    await page.locator('#ddlSeries').selectOption(seriesValue);
    if(waitAfterSelectMs>0) await page.waitForTimeout(waitAfterSelectMs);
    const table=page.locator('#tblScheduleList');
    await table.waitFor({state:'visible',timeout:10000});
    const html=await table.innerHTML();
    const games=parseScheduleTable(html,season,seriesType,{monthHint:month});
    if(!games.length) throw new Error(`KBO schedule parser returned zero games for ${season}-${String(month).padStart(2,'0')}`);
    return games;
  }finally{await browser.close();}
}
export async function collectSeason({season,months=[3,4,5,6,7,8,9,10],...opts}){const games=[];for(const month of months){games.push(...await collectMonth({season,month,...opts}));}return games;}
