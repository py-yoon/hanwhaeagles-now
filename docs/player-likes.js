/* 선수단 페이지용 하트(응원) — Supabase에 (선수, 익명세션, 날짜) 유니크 제약으로
   하루 한 번만 기록되고, 전체 하트 수는 그 테이블의 행 개수를 세서 구합니다. */
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

  function likedKey(playerId) {
    return `hem_liked_${playerId}_${kstDateStr()}`;
  }

  // 서버가 최종 판정이지만(유니크 제약), 페이지를 새로고침할 때마다 다시 물어보지
  // 않도록 "오늘 이미 눌렀음"을 로컬에도 남겨서 하트를 바로 채워진 상태로 보여준다.
  function hasLikedToday(playerId) {
    try { return localStorage.getItem(likedKey(playerId)) === '1'; } catch { return false; }
  }

  function markLikedToday(playerId) {
    try { localStorage.setItem(likedKey(playerId), '1'); } catch { /* 무시 */ }
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
    if (hasLikedToday(playerId)) return { ok: false, reason: 'already' };
    try {
      await ensureSession();
      const { error } = await client.from(TABLE).insert({ player_id: playerId });
      if (error) {
        // 23505 = unique_violation. 같은 사용자가 같은 날 같은 선수에게 이미 하트를 남긴 경우다 —
        // 다른 기기/시크릿창처럼 로컬 기록은 없지만 서버 유니크 제약에 걸린 경우로, 에러가 아니라
        // "이미 눌렀음"으로 취급하고 로컬 상태를 서버와 맞춘다.
        if (error.code === '23505') {
          markLikedToday(playerId);
          return { ok: false, reason: 'already' };
        }
        throw error;
      }
      markLikedToday(playerId);
      return { ok: true };
    } catch (err) {
      console.error('[player-likes] like failed', err);
      return { ok: false, reason: 'error' };
    }
  }

  window.PlayerLikes = { loadCounts, like, hasLikedToday };
})();
