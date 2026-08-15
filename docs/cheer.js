/* ==========================================================================
   HANWHA EAGLES NOW — 응원가 & 등장곡 룸
   cheer-data.js 의 전역 데이터를 읽어 렌더링합니다.
   ========================================================================== */

(function () {
  "use strict";

  const DATA = window.EAGLES_CHEER_DATA || { songs: [] };
  const CATEGORY_LABEL = { team: "팀", batter: "타자", pitcher: "투수" };

  let currentCategory = "all";
  let currentSongId = DATA.songs.length ? DATA.songs[0].id : null;
  let isPlaying = false;

  const $meta = document.getElementById("ecMeta");
  const $search = document.getElementById("ecSearch");
  const $tabs = document.getElementById("ecTabs");
  const $list = document.getElementById("ecSongList");
  const $title = document.getElementById("ecViewTitle");
  const $target = document.getElementById("ecViewTarget");
  const $lyrics = document.getElementById("ecViewLyrics");
  const $trackName = document.getElementById("ecTrackName");
  const $playBtn = document.getElementById("ecPlayBtn");
  const $wave = document.getElementById("ecWave");

  const CATEGORIES = [
    { key: "all", label: "전체" },
    { key: "team", label: "팀 응원가" },
    { key: "batter", label: "타자 응원가" },
    { key: "pitcher", label: "투수 등장곡" },
  ];

  function renderTabs() {
    $tabs.innerHTML = CATEGORIES.map(
      (c) => `<button class="ec-tab${c.key === currentCategory ? " active" : ""}" data-cat="${c.key}">${c.label}</button>`
    ).join("");
  }

  function renderList() {
    const query = $search.value.trim().toLowerCase();
    const filtered = DATA.songs.filter((s) => {
      const matchCat = currentCategory === "all" || s.category === currentCategory;
      const matchQuery =
        !query ||
        s.title.toLowerCase().includes(query) ||
        s.target.toLowerCase().includes(query) ||
        s.lyrics.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    if (!filtered.length) {
      $list.innerHTML = `<div class="ec-empty">검색 결과가 없습니다.</div>`;
      return;
    }

    $list.innerHTML = filtered
      .map(
        (s) => `
      <div class="ec-song-item${s.id === currentSongId ? " active" : ""}" data-id="${s.id}">
        <div>
          <div class="ec-song-name">${s.title}</div>
          <div class="ec-song-sub">${s.target}</div>
        </div>
        <span class="ec-song-badge">${CATEGORY_LABEL[s.category] || s.category}</span>
      </div>`
      )
      .join("");
  }

  function selectSong(id) {
    const song = DATA.songs.find((s) => s.id === id);
    if (!song) return;
    currentSongId = id;

    $title.textContent = song.title;
    $target.textContent = song.target;
    $lyrics.textContent = song.lyrics;
    $trackName.textContent = `${song.title} (${song.target})`;

    renderList();
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    $playBtn.textContent = isPlaying ? "⏸" : "▶";
    $wave.classList.toggle("playing", isPlaying);
  }

  function bindEvents() {
    $search.addEventListener("input", renderList);
    $tabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".ec-tab");
      if (!btn) return;
      currentCategory = btn.dataset.cat;
      renderTabs();
      renderList();
    });
    $list.addEventListener("click", (e) => {
      const item = e.target.closest(".ec-song-item");
      if (!item) return;
      selectSong(Number(item.dataset.id));
    });
    $playBtn.addEventListener("click", togglePlay);
  }

  $meta.textContent = `총 ${DATA.songs.length}곡 수록`;
  renderTabs();
  renderList();
  if (currentSongId != null) selectSong(currentSongId);
  bindEvents();
})();
