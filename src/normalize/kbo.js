const TEAM_ALIASES = new Map([
  ['한화','HANWHA'],['한화 이글스','HANWHA'],['HANWHA','HANWHA'],
  ['두산','DOOSAN'],['두산 베어스','DOOSAN'],['DOOSAN','DOOSAN'],
  ['삼성','SAMSUNG'],['삼성 라이온즈','SAMSUNG'],['SAMSUNG','SAMSUNG'],
  ['LG','LG'],['LG 트윈스','LG'],['KT','KT'],['KT 위즈','KT'],
  ['KIA','KIA'],['KIA 타이거즈','KIA'],['NC','NC'],['NC 다이노스','NC'],
  ['롯데','LOTTE'],['롯데 자이언츠','LOTTE'],['SSG','SSG'],['SSG 랜더스','SSG'],
  ['키움','KIWOOM'],['키움 히어로즈','KIWOOM']
]);
export function normalizeTeamName(name){const key=String(name??'').replace(/\s+/g,' ').trim();const team=TEAM_ALIASES.get(key);if(!team)throw new Error(`Unknown KBO team: ${name}`);return team;}
export function normalizeGame(g){return {...g,home:normalizeTeamName(g.home),away:normalizeTeamName(g.away)};}
