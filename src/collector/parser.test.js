import test from 'node:test';import assert from 'node:assert/strict';import {parseScheduleTable} from './parser.js';
test('parses grouped dates and final score',()=>{const html=`<table><tbody><tr><td class="day">03.28(토)</td><td class="time">14:00</td><td class="play"><span>한화</span><span>키움</span><em><span>5</span></em><em><span>2</span></em></td><td>TVING</td><td>대전</td><td>-</td></tr><tr><td></td><td class="time">18:30</td><td class="play"><span>두산</span><span>NC</span><em><span>1</span></em><em><span>3</span></em></td><td>TV</td><td>잠실</td><td>-</td></tr></tbody></table>`;const g=parseScheduleTable(html,2026);assert.equal(g.length,2);assert.deepEqual(g[0],{game_id:'20260328-HANWHA-KIWOOM-1',kbo_game_id:null,date:'2026-03-28',time:'14:00',home:'KIWOOM',away:'HANWHA',home_score:2,away_score:5,status:'FINAL',stadium:'대전',series_type:'REGULAR_SEASON'});assert.equal(g[1].date,'2026-03-28');});

test('extracts KBO\'s own game id from the 게임센터/리뷰 link when a review is published', () => {
  const html = `<tr><td class="day">08.01(토)</td><td class="time">18:00</td><td class="play"><span>LG</span><em><span>2</span></em><em><span>2</span></em><span>두산</span></td><td class="relay"><a href="/Schedule/GameCenter/Main.aspx?gameDate=20260801&amp;gameId=20260801LGOB0&amp;section=REVIEW" class="btn2 mr5" id="btnReview">리뷰</a></td><td>잠실</td></tr>`;
  const g = parseScheduleTable(html, 2026, 'REGULAR_SEASON', { monthHint: 8 });
  assert.equal(g[0].kbo_game_id, '20260801LGOB0');
});

test('leaves kbo_game_id null for games with no review link yet (future/live games)', () => {
  const html = `<tr><td class="day">08.12(수)</td><td class="time">19:00</td><td class="play"><span>한화</span><span>두산</span></td><td>잠실</td></tr>`;
  const g = parseScheduleTable(html, 2026, 'REGULAR_SEASON', { monthHint: 8 });
  assert.equal(g[0].kbo_game_id, null);
});
test('skips empty rows',()=>{assert.equal(parseScheduleTable('<tr><td>데이터가 없습니다.</td></tr>',2026).length,0);});
test('parses cancellation and postponed states without fabricating scores',()=>{
  const html=`<table><tbody>
  <tr><td class="day">08.05(수)</td><td class="time">18:30</td><td class="play"><span>한화</span><span>삼성</span></td><td>우천취소</td><td>대구</td></tr>
  <tr><td></td><td class="time">18:30</td><td class="play"><span>한화</span><span>삼성</span></td><td>경기 연기</td><td>대구</td></tr>
  </tbody></table>`;
  const g=parseScheduleTable(html,2026,'REGULAR_SEASON',{monthHint:8});
  assert.equal(g.length,2); assert.equal(g[0].status,'CANCELLED'); assert.equal(g[1].status,'POSTPONED');
  assert.equal(g[0].home_score,null); assert.equal(g[1].away_score,null);
});


test('parses bare grouped day when monthHint is supplied',()=>{
  const html=`<tr><td class="day">12(수)</td><td class="time">19:00</td><td class="play"><span>한화</span><span>두산</span></td><td>잠실</td></tr>`;
  const g=parseScheduleTable(html,2026,'REGULAR_SEASON',{monthHint:8});
  assert.equal(g[0].date,'2026-08-12');
  assert.equal(g[0].status,'SCHEDULED');
});

test('does not treat LIVE numeric inning data as a final score',()=>{
  const html=`<tr><td class="day">08.12(수)</td><td class="time">19:00</td><td class="play"><span>한화</span><span>두산</span><span>경기중</span></td><td>잠실</td></tr>`;
  const g=parseScheduleTable(html,2026,'REGULAR_SEASON',{monthHint:8});
  assert.equal(g[0].status,'LIVE');
  assert.equal(g[0].home_score,null);
  assert.equal(g[0].away_score,null);
});
