import fs from 'node:fs';
import { buildEloTimeline, eloSnapshotAtDate } from '../engine/elo.js';
import { filterRemainingGames, attachEloProbabilities, validateRemainingSchedule } from '../engine/remaining-schedule.js';
import { simulateFinalStandings, gameImpact } from '../engine/forecast.js';

const official=JSON.parse(fs.readFileSync('data/fixtures/official-2026-07-26.json','utf8'));
const games=JSON.parse(fs.readFileSync('data/fixtures/season-2026-early-april.json','utf8')).games;
const future=[
 {game_id:'demo-1',date:'2026-07-27',home:'HANWHA',away:'DOOSAN',status:'SCHEDULED'},
 {game_id:'demo-2',date:'2026-07-28',home:'DOOSAN',away:'HANWHA',status:'SCHEDULED'},
 {game_id:'demo-3',date:'2026-07-29',home:'HANWHA',away:'NC',status:'SCHEDULED'},
 {game_id:'demo-4',date:'2026-07-30',home:'NC',away:'HANWHA',status:'SCHEDULED'}
];
const teams=official.official_standings.map(x=>x.team);
const timeline=buildEloTimeline(games,{teams});
const snap=eloSnapshotAtDate(timeline,'2026-07-26');
const remaining=filterRemainingGames(future,'2026-07-26');
const health=validateRemainingSchedule(remaining,teams);
const rated=attachEloProbabilities(remaining,snap.ratings,{kFactor:40,homeAdvantage:0,drawProbability:.06});
const forecast=simulateFinalStandings(official.official_standings,rated,{iterations:50000,focusTeam:'HANWHA',seed:20260811});
const impacts=rated.map(g=>gameImpact(official.official_standings,rated,g.game_id,{iterations:3000,focusTeam:'HANWHA',seed:20260811}));
console.log(JSON.stringify({as_of:'2026-07-26',schedule_health:health,remaining_games:remaining.length,forecast,game_impacts:impacts},null,2));
