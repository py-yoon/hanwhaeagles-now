/* 선수단 페이지용 하트(응원) — Supabase에 (익명세션, 날짜) 유니크 제약으로 하루
   선수단 전체 통틀어 한 번만 기록되고, 전체 하트 수는 그 테이블의 행 개수를 세서 구합니다. */
(function () {
  const SUPABASE_URL = 'https://wxjpctyotwstntunwvbs.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_hXj9vHN7LosFwIzHUkZSsw_jBcHlQ6o';
  const TABLE = 'hanwhaeagles_player_likes';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let sessionPromise;

  async function ensureSession() {
    if (!sessionPromise) {
      sessionPromise = (async () => {
        const { data: { session } } = await client.auth.getSession();
        if (session) return session;
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        return data.session;
      })();
    }
    return sessionPromise;
  }

  function kstDateStr() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  function dailyKey() {
    return `hem_daily_like_${kstDateStr()}`;
  }

  // 하루에 선수단 전체 통틀어 하트 한 번 — 특정 선수 한정이 아니라 "오늘 이미 썼는지"를
  // 하루 단위로 하나만 기록한다. 서버가 최종 판정이지만(유니크 제약), 새로고침할 때마다
  // 다시 물어보지 않도록 로컬에도 남겨서 바로 채워진/잠긴 상태로 보여준다.
  // 반환값: 오늘 하트를 준 선수 id, 아직 안 썼으면 null, 다른 기기 등에서 이미 썼지만
  // 어느 선수인지는 이 브라우저가 모르는 경우 '(unknown)'.
  function todaysLikedPlayer() {
    try { return localStorage.getItem(dailyKey()); } catch { return null; }
  }

  function markTodaysLikedPlayer(playerId) {
    try { localStorage.setItem(dailyKey(), playerId); } catch { /* 무시 */ }
  }

  async function loadCounts() {
    const { data, error } = await client.from(TABLE).select('player_id').limit(50000);
    if (error) {
      console.error('[player-likes] failed to load counts', error);
      return {};
    }
    const counts = {};
    for (const row of data) counts[row.player_id] = (counts[row.player_id] || 0) + 1;
    return counts;
  }

  async function like(playerId) {
    const already = todaysLikedPlayer();
    if (already) return { ok: false, reason: 'already', playerId: already === '(unknown)' ? null : already };
    try {
      await ensureSession();
      const { error } = await client.from(TABLE).insert({ player_id: playerId });
      if (error) {
        // 23505 = unique_violation. 같은 사용자가 오늘 이미 (다른 선수에게든) 하트를 남긴 경우다 —
        // 다른 기기/시크릿창처럼 로컬 기록은 없지만 서버 유니크 제약에 걸린 경우로, 에러가 아니라
        // "이미 오늘치를 씀"으로 취급한다. 이 브라우저는 어느 선수였는지 모르므로 '(unknown)'로 남긴다.
        if (error.code === '23505') {
          markTodaysLikedPlayer('(unknown)');
          return { ok: false, reason: 'already', playerId: null };
        }
        throw error;
      }
      markTodaysLikedPlayer(playerId);
      return { ok: true };
    } catch (err) {
      console.error('[player-likes] like failed', err);
      return { ok: false, reason: 'error' };
    }
  }

  window.PlayerLikes = { loadCounts, like, todaysLikedPlayer };
})();
