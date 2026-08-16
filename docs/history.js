/* ==========================================================================
   HANWHA EAGLES NOW — 구단 역사 / 역대 성적
   history-data.js 의 전역 데이터를 읽어 렌더링합니다.
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.EAGLES_HISTORY_DATA;
  let currentEra = "all";

  const $meta = document.getElementById("ehMeta");
  const $hero = document.getElementById("ehHero");
  const $timeline = document.getElementById("ehTimeline");
  const $tabs = document.getElementById("ehTabs");
  const $tableBody = document.getElementById("ehTableBody");
  const $retired = document.getElementById("ehRetired");
  const $coaches = document.getElementById("ehCoaches");
  const $chart = document.getElementById("ehChart");
  const $chartTip = document.getElementById("ehChartTip");

  let chartPoints = [];
  let chartLayout = null;

  // KBO 참가팀 수 변천사: 1986년 빙그레(7구단) → 1991년 쌍방울(8구단) →
  // 2013년 NC(9구단) → 2015년 kt(10구단). 이후 2026시즌까지 10구단 유지.
  function teamsInSeason(year) {
    if (year <= 1990) return 7;
    if (year <= 2012) return 8;
    if (year <= 2014) return 9;
    return 10;
  }

  // "매직리그 2위 · 전체 4위"처럼 분할시즌 표기가 섞인 해(1999·2000)는
  // "전체 N위"를 우선하고, 그 외에는 처음 나오는 "N위"를 순위로 읽는다.
  function parseRankNumber(text) {
    if (!text) return null;
    const overall = text.match(/전체\s*(\d+)\s*위/);
    if (overall) return Number(overall[1]);
    const plain = text.match(/(\d+)\s*위/);
    return plain ? Number(plain[1]) : null;
  }

  function seasonRank(season) {
    const fromRegular = parseRankNumber(season.regular);
    return fromRegular !== null ? fromRegular : parseRankNumber(season.final);
  }

  function fmtPct(p) {
    if (p === null || p === undefined) return "-";
    return p.toFixed(3).replace(/^0/, "");
  }

  function rowClass(season) {
    if (season.final === "우승") return "champ";
    if (season.final === "준우승") return "runner";
    if (season.result && season.result.length) return "ps";
    return "na";
  }

  function finalTagClass(season) {
    if (season.final === "우승") return "eh-final-tag champ";
    if (season.final === "준우승") return "eh-final-tag runner";
    return "eh-final-tag";
  }

  // 2026시즌(진행 중) 행은 하드코딩 스냅샷 대신, 사이트 전역에서 매일 밤 갱신되는
  // games-2026.js 실데이터로 덮어써서 항상 최신 전적을 반영한다.
  function applyLiveCurrentSeason() {
    const live = window.EAGLES_GAMES_2026;
    if (!live || !live.meta || !live.meta.record) return;
    const current = DATA.seasons.find((s) => s.year === live.meta.season);
    if (!current) return;

    const before = { wins: current.wins || 0, ties: current.ties || 0, losses: current.losses || 0 };
    const r = live.meta.record;
    current.wins = r.wins;
    current.ties = r.draws;
    current.losses = r.losses;
    current.pct = r.wins + r.losses > 0 ? r.wins / (r.wins + r.losses) : null;
    current.regular = `${r.games}경기 진행 중`;
    current.result = "시즌 진행 중 (매일 자동 갱신)";

    DATA.meta.careerWins += current.wins - before.wins;
    DATA.meta.careerTies += current.ties - before.ties;
    DATA.meta.careerLosses += current.losses - before.losses;
    DATA.meta.careerWinPct = DATA.meta.careerWins / (DATA.meta.careerWins + DATA.meta.careerLosses);
    DATA.meta.updated = live.meta.generated || DATA.meta.updated;
    DATA.meta.isLive = true;
  }

  function renderMeta() {
    const foundedYear = new Date(DATA.meta.founded).getFullYear();
    const liveTag = DATA.meta.isLive
      ? `<span class="eh-dot"></span><span class="eh-live">LIVE</span> · `
      : "";
    $meta.innerHTML = `${liveTag}기준일 ${DATA.meta.updated} · ${foundedYear}년 창단`;
  }

  function renderHero() {
    const m = DATA.meta;
    const cards = [
      { num: `${m.championships}회`, label: "한국시리즈 우승" },
      { num: `${m.runnerUps}회`, label: "한국시리즈 준우승" },
      { num: `${m.postseasonAppearances}회`, label: "포스트시즌 진출" },
      { num: fmtPct(m.careerWinPct), label: "통산 승률" },
      { num: `${m.careerWins}승 ${m.careerTies}무 ${m.careerLosses}패`, label: "통산 전적" }
    ];
    $hero.innerHTML = cards
      .map((c) => `<div class="eh-hero-card"><div class="eh-hero-num">${c.num}</div><div class="eh-hero-label">${c.label}</div></div>`)
      .join("");
  }

  function renderTimeline() {
    $timeline.innerHTML = DATA.timeline
      .map(
        (t) => `
      <div class="eh-tl-item">
        <div class="eh-tl-date">${t.date}</div>
        <div>
          <div class="eh-tl-title">${t.title}</div>
          ${t.note ? `<div class="eh-tl-note">${t.note}</div>` : ""}
        </div>
      </div>`
      )
      .join("");
  }

  function renderTabs() {
    $tabs.innerHTML = DATA.eras
      .map((e) => `<button class="eh-tab${e.key === currentEra ? " active" : ""}" data-era="${e.key}">${e.label}</button>`)
      .join("");
    $tabs.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".eh-tab");
      if (!btn) return;
      currentEra = btn.dataset.era;
      renderTabs();
      renderTable();
      renderChart();
    });
  }

  function renderChart() {
    const era = DATA.eras.find((e) => e.key === currentEra) || DATA.eras[0];
    const [start, end] = era.range;
    const points = DATA.seasons
      .filter((s) => s.year >= start && s.year <= end)
      .map((s) => ({ year: s.year, rank: seasonRank(s), teams: teamsInSeason(s.year), final: s.final, season: s }))
      .filter((p) => p.rank !== null)
      .sort((a, b) => a.year - b.year);

    if (points.length < 2) {
      $chart.parentElement.style.display = "none";
      chartPoints = [];
      chartLayout = null;
      return;
    }
    $chart.parentElement.style.display = "";

    // SVG 텍스트는 viewBox 스케일을 그대로 따라간다 — viewBox를 920으로 고정한 채
    // 좁은 화면에서 폭만 줄이면 축 라벨 글자가 실제 화면에서 몇 px로 짜부라져 읽을 수
    // 없어진다. 그래서 viewBox 폭 자체를 실제 렌더링 폭에 맞춰, 글자 크기가 항상
    // 선언한 그대로(9px 등) 찍히게 한다.
    const containerWidth = $chart.clientWidth || 920;
    const W = Math.max(280, Math.round(containerWidth)), H = 220, ML = 30, MR = 12, MT = 14, MB = 26;
    const plotW = W - ML - MR, plotH = H - MT - MB;
    const minYear = points[0].year, maxYear = points[points.length - 1].year;
    const yearSpan = Math.max(1, maxYear - minYear);
    const x = (yr) => ML + ((yr - minYear) / yearSpan) * plotW;
    const y = (rank) => MT + ((Math.min(rank, 10) - 1) / 9) * plotH;

    // 리그 참가팀 수(=그 해 최하위 순위) 계단선
    const steps = [];
    points.forEach((p) => {
      if (!steps.length || steps[steps.length - 1].teams !== p.teams) steps.push({ year: p.year, teams: p.teams });
    });
    let stepPath = "";
    steps.forEach((s, i) => {
      const endYear = steps[i + 1] ? steps[i + 1].year : maxYear;
      const x1 = x(s.year).toFixed(1), x2 = x(endYear).toFixed(1), sy = y(s.teams).toFixed(1);
      stepPath += `${stepPath ? "L" : "M"}${x1},${sy} L${x2},${sy} `;
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.rank).toFixed(1)}`).join(" ");

    const yTicks = [1, 3, 5, 7, 10];
    const yGridSvg = yTicks
      .map((t) => `
      <line x1="${ML}" y1="${y(t).toFixed(1)}" x2="${W - MR}" y2="${y(t).toFixed(1)}" class="eh-chart-grid"></line>
      <text x="${ML - 6}" y="${(y(t) + 3).toFixed(1)}" class="eh-chart-axis" text-anchor="end">${t}</text>`)
      .join("");

    // 라벨이 겹치지 않도록, 실제 폭에 맞춰 연도 눈금 간격을 동적으로 고른다 —
    // 좁은 화면에서 5년 간격을 그대로 쓰면 "1986 1990 1995 ..." 라벨이 겹친다.
    const pxPerYear = plotW / yearSpan;
    const yearStep = [5, 10, 20].find((step) => pxPerYear * step >= 34) || 20;

    const seenX = new Set();
    const xTickSvg = points
      .filter((p) => p.year === minYear || p.year === maxYear || p.year % yearStep === 0)
      .filter((p) => (seenX.has(p.year) ? false : (seenX.add(p.year), true)))
      .map((p) => `<text x="${x(p.year).toFixed(1)}" y="${H - 8}" class="eh-chart-axis" text-anchor="middle">${p.year}</text>`)
      .join("");

    const dotsSvg = points
      .map((p) => {
        const cls = p.final === "우승" ? "champ" : p.final === "준우승" ? "runner" : "normal";
        const r = cls === "normal" ? 3 : 4.5;
        return `<circle cx="${x(p.year).toFixed(1)}" cy="${y(p.rank).toFixed(1)}" r="${r}" class="eh-chart-dot ${cls}"></circle>`;
      })
      .join("");

    $chart.setAttribute("viewBox", `0 0 ${W} ${H}`);
    $chart.innerHTML = `
      ${yGridSvg}
      <path d="${stepPath.trim()}" class="eh-chart-step"></path>
      <path d="${linePath}" class="eh-chart-line"></path>
      ${dotsSvg}
      ${xTickSvg}
      <line id="ehChartCrosshair" x1="0" y1="${MT}" x2="0" y2="${H - MB}" class="eh-chart-crosshair" style="display:none"></line>`;

    chartPoints = points;
    chartLayout = { W, x, y };
  }

  function nearestChartPoint(clientX) {
    if (!chartPoints.length || !chartLayout) return null;
    const rect = $chart.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * chartLayout.W;
    let best = chartPoints[0], bestDist = Infinity;
    chartPoints.forEach((p) => {
      const d = Math.abs(chartLayout.x(p.year) - svgX);
      if (d < bestDist) { bestDist = d; best = p; }
    });
    return best;
  }

  function showChartTip(p, clientX, clientY) {
    const crosshair = document.getElementById("ehChartCrosshair");
    if (crosshair) {
      const cx = chartLayout.x(p.year).toFixed(1);
      crosshair.setAttribute("x1", cx);
      crosshair.setAttribute("x2", cx);
      crosshair.style.display = "";
    }
    const extra = p.final && p.final !== "-" && p.final !== `${p.rank}위` ? ` · ${p.final}` : "";
    $chartTip.innerHTML = `<b>${p.year}</b> · ${p.season.team}<br>${p.rank}위 · ${p.teams}팀 중${extra}`;
    $chartTip.style.display = "block";
    const wrapRect = $chart.parentElement.getBoundingClientRect();
    const tipW = $chartTip.offsetWidth || 140;
    let left = clientX - wrapRect.left + 14;
    if (left + tipW > wrapRect.width) left = clientX - wrapRect.left - tipW - 14;
    $chartTip.style.left = `${Math.max(0, left)}px`;
    $chartTip.style.top = `${Math.max(0, clientY - wrapRect.top - 48)}px`;
  }

  function hideChartTip() {
    $chartTip.style.display = "none";
    const crosshair = document.getElementById("ehChartCrosshair");
    if (crosshair) crosshair.style.display = "none";
  }

  function bindChartEvents() {
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderChart, 150);
    });

    const wrap = $chart.parentElement;
    wrap.addEventListener("pointermove", (ev) => {
      const p = nearestChartPoint(ev.clientX);
      if (p) showChartTip(p, ev.clientX, ev.clientY);
    });
    wrap.addEventListener("pointerdown", (ev) => {
      const p = nearestChartPoint(ev.clientX);
      if (p) showChartTip(p, ev.clientX, ev.clientY);
    });
    wrap.addEventListener("pointerleave", hideChartTip);
  }

  function renderTable() {
    const era = DATA.eras.find((e) => e.key === currentEra) || DATA.eras[0];
    const [start, end] = era.range;
    const rows = DATA.seasons.filter((s) => s.year >= start && s.year <= end).sort((a, b) => b.year - a.year);

    $tableBody.innerHTML = rows
      .map((s) => {
        const wlt = s.wins === null ? `<span class="eh-unconfirmed">미확인</span>` : `<span class="eh-wlt">${s.wins}-${s.ties}-${s.losses}</span>`;
        const flag = s.wins === null ? `<span class="eh-note-flag" title="정확한 승-무-패 숫자는 아직 확인되지 않았습니다. 순위와 포스트시즌 결과는 확인된 정보입니다.">?</span>` : "";
        return `
        <tr class="${rowClass(s)}">
          <td class="eh-year">${s.year}</td>
          <td class="eh-team-tag">${s.team}</td>
          <td>${s.regular}</td>
          <td class="eh-team-tag">${teamsInSeason(s.year)}팀</td>
          <td><span class="${finalTagClass(s)}">${s.final}</span></td>
          <td>${wlt}${flag}</td>
          <td class="eh-pct">${fmtPct(s.pct)}</td>
          <td class="eh-wrap-cell eh-result-text">${s.result || "-"}</td>
        </tr>`;
      })
      .join("");
  }

  function renderRetired() {
    $retired.innerHTML = DATA.retiredNumbers
      .map(
        (r) => `
      <div class="eh-retired-card">
        <div class="eh-retired-no">${r.no}</div>
        <div>
          <div class="eh-retired-name">${r.name}</div>
          <div class="eh-retired-note">${r.note}</div>
        </div>
      </div>`
      )
      .join("");
  }

  function renderCoaches() {
    $coaches.innerHTML = DATA.coaches
      .map(
        (c) => `
      <div class="eh-coach-row">
        <div class="eh-coach-period">${c.period}</div>
        <div class="eh-coach-name">${c.name}</div>
        <div class="eh-coach-note">${c.note || ""}</div>
      </div>`
      )
      .join("");
  }

  applyLiveCurrentSeason();
  renderMeta();
  renderHero();
  renderTimeline();
  renderTabs();
  renderTable();
  renderChart();
  bindChartEvents();
  renderRetired();
  renderCoaches();
})();
