import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInnings, parseTeamStatTable, mergeTeamStats } from './team-stats-parser.js';

const HITTER1_HTML = `
<table class="tData tt">
<thead><tr><th>순위</th><th>팀명</th><th>AVG</th><th>G</th><th>PA</th><th>AB</th><th>R</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>TB</th><th>RBI</th><th>SAC</th><th>SF</th></tr></thead>
<tbody>
<tr><td>1</td><td>KT</td><td data-id="HRA_RT">0.281</td><td data-id="GAME_CN">99</td><td data-id="PA_CN">3980</td><td data-id="AB_CN">3440</td><td data-id="RUN_CN">551</td><td data-id="HIT_CN">966</td><td data-id="H2_CN">156</td><td data-id="H3_CN">15</td><td data-id="HR_CN">76</td><td data-id="TB_CN">1380</td><td data-id="RBI_CN">518</td><td data-id="SH_CN">50</td><td data-id="SF_CN">25</td></tr>
<tr><td>3</td><td>한화</td><td data-id="HRA_RT">0.275</td><td data-id="GAME_CN">101</td><td data-id="PA_CN">4099</td><td data-id="AB_CN">3566</td><td data-id="RUN_CN">585</td><td data-id="HIT_CN">982</td><td data-id="H2_CN">162</td><td data-id="H3_CN">15</td><td data-id="HR_CN">117</td><td data-id="TB_CN">1525</td><td data-id="RBI_CN">550</td><td data-id="SH_CN">52</td><td data-id="SF_CN">30</td></tr>
</tbody>
<tfoot><tr><td colspan="2">합계</td><td>0.268</td></tr></tfoot>
</table>`;

const HITTER2_HTML = `
<table class="tData tt">
<tbody>
<tr><td>1</td><td>KT</td><td data-id="HRA_RT">0.281</td><td data-id="BB_CN">408</td><td data-id="IB_CN">7</td><td data-id="HP_CN">57</td><td data-id="KK_CN">760</td><td data-id="GD_CN">73</td><td data-id="SLG_RT">0.401</td><td data-id="OBP_RT">0.364</td><td data-id="OPS_RT">0.765</td></tr>
<tr><td>3</td><td>한화</td><td data-id="HRA_RT">0.275</td><td data-id="BB_CN">420</td><td data-id="IB_CN">5</td><td data-id="HP_CN">40</td><td data-id="KK_CN">800</td><td data-id="GD_CN">60</td><td data-id="SLG_RT">0.428</td><td data-id="OBP_RT">0.360</td><td data-id="OPS_RT">0.788</td></tr>
</tbody>
</table>`;

const PITCHER1_HTML = `
<table class="tData tt">
<tbody>
<tr><td>1</td><td>두산</td><td data-id="ERA_RT">3.75</td><td data-id="GAME_CN">103</td><td data-id="W_CN">53</td><td data-id="L_CN">46</td><td data-id="SV_CN">24</td><td data-id="HOLD_CN">43</td><td data-id="WRA_RT">0.535</td><td data-id="INN2_CN">920 2/3</td><td data-id="HIT_CN">898</td><td data-id="HR_CN">76</td><td data-id="BB_CN">345</td><td data-id="HP_CN">59</td><td data-id="KK_CN">883</td><td data-id="R_CN">443</td><td data-id="ER_CN">384</td><td data-id="WHIP_RT">1.35</td></tr>
<tr><td>2</td><td>한화</td><td data-id="ERA_RT">4.50</td><td data-id="GAME_CN">101</td><td data-id="W_CN">44</td><td data-id="L_CN">50</td><td data-id="SV_CN">20</td><td data-id="HOLD_CN">40</td><td data-id="WRA_RT">0.468</td><td data-id="INN2_CN">900</td><td data-id="HIT_CN">920</td><td data-id="HR_CN">90</td><td data-id="BB_CN">400</td><td data-id="HP_CN">55</td><td data-id="KK_CN">750</td><td data-id="R_CN">500</td><td data-id="ER_CN">450</td><td data-id="WHIP_RT">1.47</td></tr>
</tbody>
</table>`;

test('parseInnings handles fractional-third notation', () => {
  assert.equal(parseInnings('920 2/3'), 920 + 2 / 3);
  assert.equal(parseInnings('900'), 900);
  assert.equal(parseInnings('1 1/3'), 1 + 1 / 3);
});

test('parseInnings handles a bare fraction with no leading whole number (short relief appearances)', () => {
  assert.equal(parseInnings('2/3'), 2 / 3);
  assert.equal(parseInnings('1/3'), 1 / 3);
  assert.equal(parseInnings('0'), 0);
});

test('parseTeamStatTable extracts rows by data-id, ignores header/footer rows', () => {
  const rows = parseTeamStatTable(HITTER1_HTML);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].team, 'KT');
  assert.equal(rows[1].team, 'HANWHA');
  assert.equal(rows[1].PA_CN, '4099');
});

test('mergeTeamStats builds the {batter,pitcher} shape teamFeatureVector expects', () => {
  const h1 = parseTeamStatTable(HITTER1_HTML);
  const h2 = parseTeamStatTable(HITTER2_HTML);
  const p1 = parseTeamStatTable(PITCHER1_HTML);
  const merged = mergeTeamStats(h1, h2, p1);
  assert.ok(merged.HANWHA);
  assert.equal(merged.HANWHA.batter.pa, 4099);
  assert.equal(merged.HANWHA.batter.ops, 0.788);
  assert.ok(Math.abs(merged.HANWHA.batter.hr_rate - 117 / 4099) < 1e-9);
  assert.equal(merged.HANWHA.pitcher.era, 4.50);
  assert.ok(Math.abs(merged.HANWHA.pitcher.k9 - (750 / 900) * 9) < 1e-9);
  assert.equal(merged.KT.pitcher, null);
});
