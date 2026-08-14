/* ==========================================================================
   HANWHA EAGLES NOW — 선수단
   players-data.json 을 읽어 목록 + 상세(해시 라우팅 #배번-이름)를 렌더링.
   ========================================================================== */

(function () {
  "use strict";

  const DATA_URL = "players-data.json";
  // 큰 분류: 투수 / 타자. 타자 섹션 안에서는 포수·내야수·외야수 순으로 서브그룹핑.
  const SECTIONS = [
    { key: "투수", label: "투수", groups: ["투수"] },
    { key: "타자", label: "타자", groups: ["포수", "내야수", "외야수"] }
  ];

  // 포지션별 다이아몬드 좌표 (0~200 기준 SVG 좌표계)
  const POS_COORDS = {
    "투수": { x: 100, y: 132 },
    "포수": { x: 100, y: 190 },
    "1루수": { x: 148, y: 118 },
    "2루수": { x: 122, y: 84 },
    "유격수": { x: 78, y: 84 },
    "3루수": { x: 52, y: 118 },
    "좌익수": { x: 46, y: 46 },
    "중견수": { x: 100, y: 26 },
    "우익수": { x: 154, y: 46 },
    "내야수": { x: 100, y: 100 },
    "외야수": { x: 100, y: 40 },
    "포수/내야수/외야수": { x: 100, y: 100 }
  };

  let PLAYERS = [];
  let META = {};
  let query = "";

  const $sections = document.getElementById("epSections");
  const $jump = document.getElementById("epJump");
  const $search = document.getElementById("epSearch");
  const $overlay = document.getElementById("epOverlay");
  const $detail = document.getElementById("epDetail");
  const $meta = document.getElementById("epMeta");

  // players-data.js 에서 전역으로 미리 로드된 데이터를 사용합니다.
  // (fetch 대신 이 방식을 쓰는 이유: 파일을 서버 없이 file:// 로 직접 열어도
  //  CORS 제약 없이 바로 동작하게 하기 위함입니다.)
  function loadData() {
    if (window.EAGLES_PLAYERS_DATA) {
      return Promise.resolve(window.EAGLES_PLAYERS_DATA);
    }
    // players-data.js가 없는 경우 players-data.json을 fetch로 시도 (서버 환경 대비)
    return fetch(DATA_URL).then((r) => r.json());
  }

  loadData()
    .then((data) => {
      PLAYERS = data.players;
      META = data.meta || {};
      renderMeta();
      renderJump();
      renderSections();
      bindEvents();
      handleHash();
      window.addEventListener("hashchange", handleHash);
    })
    .catch((err) => {
      $sections.innerHTML = `<div class="ep-empty">선수 데이터를 불러오지 못했습니다. players.html과 같은 폴더에 players-data.js 파일이 있는지 확인해주세요.</div>`;
      console.error(err);
    });

  function renderMeta() {
    if (!$meta) return;
    $meta.innerHTML = `<span class="ep-dot"></span><span class="ep-live">LIVE ROSTER</span> · 기준일 ${META.updated || ""} · 전체 ${PLAYERS.length}명`;
  }

  function renderJump() {
    $jump.innerHTML = SECTIONS.map(
      (s) => `<button data-target="sec-${s.key}">${s.label} <span style="opacity:.55">${PLAYERS.filter((p) => s.groups.includes(p.group)).length}</span></button>`
    ).join("");
  }

  function bindEvents() {
    $jump.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $sections.addEventListener("click", (e) => {
      const card = e.target.closest(".ep-card");
      if (!card) return;
      location.hash = card.dataset.id;
    });

    $search.addEventListener("input", (e) => {
      query = e.target.value.trim().toLowerCase();
      renderSections();
    });

    $overlay.addEventListener("click", (e) => {
      if (e.target === $overlay) closeDetail();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDetail();
    });
  }

  function playerId(p) {
    return `${p.no}-${p.name}`;
  }

  function cardHtml(p) {
    const age = calcAge(p.birth);
    return `
      <div class="ep-card" data-id="${playerId(p)}">
        <div class="ep-no">No.${p.no}</div>
        <div class="ep-name">${p.name}</div>
        <div class="ep-tag">${p.role || p.group}</div>
        <div class="ep-sub">만 ${age}세 · ${p.throwBat}</div>
      </div>`;
  }

  function matchesQuery(p) {
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      p.no.toLowerCase().includes(query) ||
      (p.school || "").toLowerCase().includes(query) ||
      (p.role || "").toLowerCase().includes(query)
    );
  }

  function renderSections() {
    const blocks = SECTIONS.map((sec) => {
      const list = PLAYERS.filter((p) => sec.groups.includes(p.group) && matchesQuery(p));
      if (sec.groups.length === 1) {
        if (!list.length) return "";
        return `
          <section class="ep-section-block" id="sec-${sec.key}">
            <div class="ep-section-head">
              <h2>${sec.label}</h2>
              <div class="ep-section-count">${list.length}명</div>
            </div>
            <div class="ep-grid">${list.map(cardHtml).join("")}</div>
          </section>`;
      }
      // 타자: 포수/내야수/외야수 서브그룹으로 나눠서 표시
      const subHtml = sec.groups
        .map((g) => {
          const subList = list.filter((p) => p.group === g);
          if (!subList.length) return "";
          return `
            <div class="ep-subgroup-label">${g} · ${subList.length}명</div>
            <div class="ep-grid">${subList.map(cardHtml).join("")}</div>`;
        })
        .join("");
      if (!list.length) return "";
      return `
        <section class="ep-section-block" id="sec-${sec.key}">
          <div class="ep-section-head">
            <h2>${sec.label}</h2>
            <div class="ep-section-count">${list.length}명</div>
          </div>
          ${subHtml}
        </section>`;
    });

    const totalShown = SECTIONS.reduce(
      (sum, sec) => sum + PLAYERS.filter((p) => sec.groups.includes(p.group) && matchesQuery(p)).length,
      0
    );

    $sections.innerHTML = totalShown
      ? blocks.join("")
      : `<div class="ep-empty">"${query}"에 해당하는 선수를 찾을 수 없습니다.</div>`;
  }

  function handleHash() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id) {
      closeDetail();
      return;
    }
    const p = PLAYERS.find((pl) => playerId(pl) === id);
    if (!p) {
      closeDetail();
      return;
    }
    openDetail(p);
  }

  function closeDetail() {
    $overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function calcAge(birthStr) {
    const b = new Date(birthStr);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }

  function teamHistoryHtml(p) {
    const rows = [];
    if (p.proTeam) {
      const endYear = p.joinYear ? p.joinYear - 1 : "";
      rows.push(`${p.proTeam} (${p.proYear}${endYear ? "~" + endYear : "~"})`);
      rows.push(`한화 이글스 (${p.joinYear || p.proYear}~)`);
    } else {
      rows.push(`한화 이글스 (${p.proYear}~)${p.joinYear && p.joinYear !== p.proYear ? " ※ " + p.joinYear + "년 복귀" : ""}`);
    }
    return rows.join(" → ");
  }

  function positionKey(p) {
    if (p.group === "투수") return "투수";
    if (p.group === "포수") return "포수";
    if (p.role && POS_COORDS[p.role.split("/")[0]]) return p.role.split("/")[0];
    return p.group;
  }

  function diamondSvg(p) {
    const key = positionKey(p);
    const coord = POS_COORDS[key] || POS_COORDS[p.group] || { x: 100, y: 100 };
    const positions = [
      { k: "투수", ...POS_COORDS["투수"] },
      { k: "포수", ...POS_COORDS["포수"] },
      { k: "1루수", ...POS_COORDS["1루수"] },
      { k: "2루수", ...POS_COORDS["2루수"] },
      { k: "유격수", ...POS_COORDS["유격수"] },
      { k: "3루수", ...POS_COORDS["3루수"] },
      { k: "좌익수", ...POS_COORDS["좌익수"] },
      { k: "중견수", ...POS_COORDS["중견수"] },
      { k: "우익수", ...POS_COORDS["우익수"] }
    ];
    const dots = positions
      .map((pos) => {
        const active = pos.k === key || (p.group === "내야수" && ["1루수", "2루수", "유격수", "3루수"].includes(pos.k) && key === "내야수") || (p.group === "외야수" && ["좌익수", "중견수", "우익수"].includes(pos.k) && key === "외야수");
        return `<circle cx="${pos.x}" cy="${pos.y}" r="${active ? 7 : 3.5}" fill="${active ? "var(--eagle,#ff6a1a)" : "#3a4048"}" />`;
      })
      .join("");
    return `
      <svg viewBox="0 0 200 210" fill="none">
        <path d="M100 190 L38 128 L100 66 L162 128 Z" stroke="#2c323b" stroke-width="1.5" fill="none"/>
        <path d="M100 190 Q40 190 12 128" stroke="#22262d" stroke-width="1.5" fill="none"/>
        <path d="M100 190 Q160 190 188 128" stroke="#22262d" stroke-width="1.5" fill="none"/>
        ${dots}
      </svg>`;
  }

  function findSeasonStats(p) {
    const season = window.EAGLES_SEASON_2026;
    if (!season) return null;
    const byName = season.players[p.name];
    if (byName) return byName;
    // 외국인 선수는 박스스코어에 성(姓)만 기록되는 경우가 있음 (예: "오웬 화이트" → "화이트")
    const key = Object.keys(season.players).find((k) => k !== p.name && p.name.endsWith(k));
    return key ? season.players[key] : null;
  }

  function statRow(label, value) {
    return `<div class="ep-stat"><div class="ep-stat-label">${label}</div><div class="ep-stat-value">${value}</div></div>`;
  }

  function seasonStatsHtml(p) {
    const season = window.EAGLES_SEASON_2026;
    const stats = findSeasonStats(p);
    const meta = season?.meta;
    const heading = `${meta?.season || 2026}시즌 기록${meta?.generated ? ` <span class="ep-stat-asof">(${meta.generated} 기준)</span>` : ""}`;

    if (!stats || (!stats.batting && !stats.pitching)) {
      return `<div class="ep-section-title">${heading}</div><div class="ep-no-award">1군 출전 기록이 아직 없습니다.</div>`;
    }

    const blocks = [];
    if (stats.batting) {
      const b = stats.batting;
      // KBO 박스스코어는 타자 기록으로 타수·안타·타점만 제공합니다 (2루타/홈런/볼넷/삼진/도루 등은
      // 텍스트 플레이 로그 파싱이 필요해 이 파이프라인에서는 수집하지 않음 — 잘못 분류된 값을
      // 섞느니 아예 안 보여주는 쪽을 택함). 그래서 OPS 등은 계산하지 않고 타율만 제공합니다.
      blocks.push(`
        <div class="ep-stat-grid">
          ${statRow("경기", b.G)}
          ${statRow("타수", b.AB)}
          ${statRow("안타", b.H)}
          ${statRow("타점", b.RBI)}
          ${statRow("타율", b.avg.toFixed(3))}
        </div>`);
    }
    if (stats.pitching) {
      const pt = stats.pitching;
      blocks.push(`
        <div class="ep-stat-grid">
          ${statRow("등판", pt.G)}
          ${statRow("이닝", pt.ip)}
          ${statRow("평균자책", pt.era ?? "-")}
          ${statRow("WHIP", pt.whip ?? "-")}
          ${statRow("승-패", `${pt.W}-${pt.L}`)}
          ${statRow("세이브", pt.SV)}
          ${statRow("홀드", pt.HLD)}
          ${statRow("탈삼진", pt.SO)}
        </div>`);
    }
    return `<div class="ep-section-title">${heading}</div>${blocks.join("")}`;
  }

  function awardsHtml(p) {
    if (!p.awards || !p.awards.length) {
      return `<div class="ep-no-award">등록된 수상 기록이 아직 없습니다.</div>`;
    }
    return `<ul class="ep-awards">${p.awards
      .map(
        (a) => `
      <li class="ep-award">
        <div class="ep-award-year">${a.year}</div>
        <div class="ep-award-body">
          <div class="ep-award-title">${a.title}</div>
          ${a.detail ? `<div class="ep-award-detail">${a.detail}</div>` : ""}
        </div>
      </li>`
      )
      .join("")}</ul>`;
  }

  function openDetail(p) {
    const age = calcAge(p.birth);
    const [h, wt] = [p.height, p.weight];
    $detail.innerHTML = `
      <div class="ep-detail-head">
        <div>
          <div class="ep-no-big">No.${p.no} · ${p.group}</div>
          <h2>${p.name}</h2>
          <div class="ep-role-tag">${p.role || p.group}</div>
        </div>
        <button class="ep-close" id="epCloseBtn" aria-label="닫기">✕</button>
      </div>
      <div class="ep-detail-body">
        <div class="ep-diamond-wrap">
          ${diamondSvg(p)}
          <div class="ep-diamond-label">${p.role || p.group}</div>
        </div>
        <dl class="ep-bio">
          <dt>생년월일</dt><dd>${p.birth}</dd>
          <dt>현재 나이</dt><dd><span class="ep-age-num">만 ${age}세</span></dd>
          <dt>출신학교</dt><dd>${p.school || "정보 없음"}</dd>
          <dt>투타</dt><dd>${p.throwBat}</dd>
          <dt>신장·체중</dt><dd>${h ? h + "cm" : "-"}, ${wt ? wt + "kg" : "-"}</dd>
          <dt>프로 입단</dt><dd>${p.proYear}년${p.proTeam ? " (" + p.proTeam + ")" : ""}</dd>
          ${p.draftYear ? `<dt>드래프트</dt><dd>${p.draftYear}년 신인 드래프트 ${p.draftRound}라운드 (전체 ${p.draftPick}순위)</dd>` : ""}
          <dt>팀 이력</dt><dd>${teamHistoryHtml(p)}</dd>
        </dl>
      </div>
      ${p.note ? `<div class="ep-section"><div class="ep-note">${p.note}</div></div>` : ""}
      <div class="ep-section">
        ${seasonStatsHtml(p)}
      </div>
      <div class="ep-section">
        <div class="ep-section-title">시즌별 수상 실적</div>
        ${awardsHtml(p)}
      </div>
    `;
    $overlay.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("epCloseBtn").addEventListener("click", () => {
      history.pushState("", document.title, location.pathname + location.search);
      closeDetail();
    });
  }
})();
