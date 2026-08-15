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
    });
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
  renderRetired();
  renderCoaches();
})();
