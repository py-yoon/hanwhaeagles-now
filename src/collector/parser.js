import { normalizeTeamName } from '../normalize/kbo.js';

function text(value){
  return String(value??'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#39;|&#x27;/gi,"'")
    .replace(/&quot;/gi,'"')
    .replace(/\s+/g,' ').trim();
}
function cells(row){return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>({html:m[0],body:m[1]}));}
function cls(cell,name){return new RegExp(`class=["'][^"']*\\b${name}\\b[^"']*["']`,'i').test(cell.html);}
function innerSpans(html){return [...String(html).matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map(m=>text(m[1])).filter(Boolean);}
function extractDate(value, season, monthHint=null){
  const s=text(value);
  let m=s.match(/(\d{1,2})[./-](\d{1,2})/);
  if(m) return `${season}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  m=s.match(/(?:^|\s)(\d{1,2})(?:\([^)]*\)|일)?(?:\s|$)/);
  if(m && monthHint) return `${season}-${String(monthHint).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  const dayOnly=s.match(/^(\d{1,2})(?:\([^)]*\)|일)?$/);
  if(dayOnly && monthHint) return `${season}-${String(monthHint).padStart(2,'0')}-${String(dayOnly[1]).padStart(2,'0')}`;
  return null;
}
function extractScores(playHtml){
  const em=[...String(playHtml).matchAll(/<em\b[^>]*>([\s\S]*?)<\/em>/gi)].map(m=>text(m[1]));
  const vals=[];
  for(const e of em){ const m=e.match(/^(\d+)$/); if(m) vals.push(Number(m[1])); }
  if(vals.length>=2) return vals.slice(0,2);
  const nums=[...String(playHtml).replace(/<[^>]+>/g,' ').matchAll(/(?:^|\s)(\d{1,3})(?=\s|$)/g)].map(m=>Number(m[1]));
  return nums.slice(0,2);
}
function statusFromCell(row, playBody, scores){
  const raw=text(row);
  if(/우천취소|폭염취소|취소|경기취소|CANCELLED/i.test(raw)) return 'CANCELLED';
  if(/연기|순연|편성|POSTPONED|RESCHEDULED/i.test(raw) && scores.length<2) return 'POSTPONED';
  if(/경기중|진행중|LIVE|경기현황/i.test(raw) && scores.length<2) return 'LIVE';
  if(scores.length>=2) return 'FINAL';
  return 'SCHEDULED';
}

export function parseScheduleTable(html,season,seriesType='REGULAR_SEASON',{monthHint=null}={}){
  const rows=[...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
  const out=[]; const counts=new Map(); let currentDate=null;
  for(const row of rows){
    const cs=cells(row); const play=cs.find(c=>cls(c,'play')); if(!play) continue;
    const day=cs.find(c=>cls(c,'day')); const parsedDate=day ? extractDate(day.body,season,monthHint) : null;
    if(parsedDate) currentDate=parsedDate;
    if(!currentDate) continue;
    const timeCell=cs.find(c=>cls(c,'time'));
    const time=text(timeCell?.body).match(/\b\d{1,2}:\d{2}\b/)?.[0]??null;
    const spans=innerSpans(play.body);
    const teams=[];
    for(const value of spans){
      try { const t=normalizeTeamName(value); if(!teams.includes(t)) teams.push(t); } catch {}
      if(teams.length===2) break;
    }
    if(teams.length<2) continue;
    const [away,home]=teams;
    const scores=extractScores(play.body);
    const awayScore=scores[0]??null, homeScore=scores[1]??null;
    const status=statusFromCell(row,play.body,scores);
    const nonClassCells=cs.filter(c=>!/<td[^>]*class=/i.test(c.html));
    const texts=nonClassCells.map(c=>text(c.body)).filter(Boolean);
    const stadium=texts.find(v=>/(잠실|고척|문학|수원|대전|광주|대구|사직|창원)/.test(v)) ?? null;
    const base=`${currentDate.replaceAll('-','')}-${away}-${home}`;
    const n=counts.get(base)??1; counts.set(base,n+1);
    out.push({game_id:`${base}-${n}`,date:currentDate,time,home,away,home_score:homeScore,away_score:awayScore,status,stadium,series_type:seriesType});
  }
  return out;
}
