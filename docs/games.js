/* ==========================================================================
   HANWHA EAGLES NOW — 경기기록
   games-2026.js 를 읽어 2026시즌 완료 경기 목록을 렌더링 (예정 경기는 다루지 않음).
   ========================================================================== */

(function () {
  "use strict";

  const TEAM_NAME = {
    HANWHA: "한화", KIWOOM: "키움", KT: "KT", LG: "LG", KIA: "KIA",
    DOOSAN: "두산", NC: "NC", LOTTE: "롯데", SSG: "SSG", SAMSUNG: "삼성",
  };
  const teamName = (code) => TEAM_NAME[code] || code;

  const FILTERS = [
    { key: "ALL", label: "전체" },
    { key: "WIN", label: "승" },
    { key: "LOSS", label: "패" },
    { key: "DRAW", label: "무" },
  ];

  let GAMES = [];
  let META = {};
  let activeFilter = "ALL";
  let query = "";

  const $body = document.getElementById("egBody");
  const $filter = document.getElementById("egFilter");
  const $search = document.getElementById("egSearch");
  const $record = document.getElementById("egRecord");
  const $meta = document.getElementById("egMeta");

  function loadData() {
    if (window.EAGLES_GAMES_2026) return Promise.resolve(window.EAGLES_GAMES_2026);
    return fetch("games-2026.json").then((r) => r.json());
  }

  loadData()
    .then((data) => {
      GAMES = data.games;
      META = data.meta || {};
      renderMeta();
      renderRecord();
      renderFilter();
      renderTable();
      bindEvents();
    })
    .catch((err) => {
      $body.innerHTML = `<tr><td colspan="8" class="eg-empty">경기 데이터를 불러오지 못했습니다. games.html과 같은 폴더에 games-2026.js 파일이 있는지 확인해주세요.</td></tr>`;
      console.error(err);
    });

  function renderMeta() {
    if (!$meta) return;
    const r = META.record || {};
    $meta.innerHTML = `기준일 ${META.generated || ""} · 완료 ${r.games ?? GAMES.length}경기`;
  }

  function renderRecord() {
    const r = META.record || {};
    const winRate = r.wins + r.losses > 0 ? (r.wins / (r.wins + r.losses)).toFixed(3) : "-";
    $record.innerHTML = `
      <div class="eg-stat"><div class="eg-stat-label">경기</div><div class="eg-stat-value">${r.games ?? GAMES.length}</div></div>
      <div class="eg-stat"><div class="eg-stat-label">승</div><div class="eg-stat-value eg-win">${r.wins ?? 0}</div></div>
      <div class="eg-stat"><div class="eg-stat-label">패</div><div class="eg-stat-value eg-loss">${r.losses ?? 0}</div></div>
      <div class="eg-stat"><div class="eg-stat-label">무</div><div class="eg-stat-value">${r.draws ?? 0}</div></div>
      <div class="eg-stat"><div class="eg-stat-label">승률</div><div class="eg-stat-value">${winRate}</div></div>
    `;
  }

  function renderFilter() {
    $filter.innerHTML = FILTERS.map((f) => {
      const count = f.key === "ALL" ? GAMES.length : GAMES.filter((g) => g.result === f.key).length;
      return `<button data-filter="${f.key}" class="${f.key === activeFilter ? "active" : ""}">${f.label} <span style="opacity:.55">${count}</span></button>`;
    }).join("");
  }

  function bindEvents() {
    $filter.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      activeFilter = btn.dataset.filter;
      renderFilter();
      renderTable();
    });
    $search.addEventListener("input", (e) => {
      query = e.target.value.trim().toLowerCase();
      renderTable();
    });
  }

  function matchesQuery(g) {
    if (!query) return true;
    return (
      teamName(g.opponent).toLowerCase().includes(query) ||
      g.opponent.toLowerCase().includes(query) ||
      (g.hanwhaStarter || "").toLowerCase().includes(query) ||
      (g.oppStarter || "").toLowerCase().includes(query)
    );
  }

  function swingHtml(g) {
    const d = g.probabilityDeltaPct;
    if (d == null) return `<span class="eg-swing unknown">—</span>`;
    const dir = d > 0 ? "up" : d < 0 ? "down" : "flat";
    const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "▬";
    const sign = d > 0 ? "+" : "";
    const title = g.probabilityBefore != null && g.probabilityAfter != null
      ? `이 경기만 실제 결과로 반영, 나머지는 전날 기준 시뮬레이션 · ${(g.probabilityBefore * 100).toFixed(2)}% → ${(g.probabilityAfter * 100).toFixed(2)}%`
      : "";
    return `<span class="eg-swing ${dir}" title="${title}">${arrow} ${sign}${d.toFixed(2)}p</span>`;
  }

  function rowHtml(g) {
    const resultLabel = { WIN: "승", LOSS: "패", DRAW: "무" }[g.result] || g.result;
    return `
      <tr>
        <td class="eg-date">${g.date}</td>
        <td class="eg-vs">${g.home ? "홈" : "원정"}</td>
        <td class="eg-opponent">${teamName(g.opponent)}</td>
        <td class="eg-score">${g.hanwhaScore} : ${g.oppScore}</td>
        <td class="eg-starter${g.hanwhaStarter ? "" : " unknown"}">${g.hanwhaStarter || "정보 없음"}</td>
        <td class="eg-starter${g.oppStarter ? "" : " unknown"}">${g.oppStarter || "정보 없음"}</td>
        <td><span class="eg-result ${g.result}">${resultLabel}</span></td>
        <td>${swingHtml(g)}</td>
      </tr>`;
  }

  function renderTable() {
    const list = GAMES.filter((g) => (activeFilter === "ALL" || g.result === activeFilter) && matchesQuery(g));
    $body.innerHTML = list.length
      ? list.map(rowHtml).join("")
      : `<tr><td colspan="8" class="eg-empty">"${query}"에 해당하는 경기를 찾을 수 없습니다.</td></tr>`;
  }
})();
