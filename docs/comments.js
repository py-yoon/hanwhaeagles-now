/* 페이지 전체용 Supabase 댓글 UI */
(function () {
  const SUPABASE_URL = 'https://wxjpctyotwstntunwvbs.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_hXj9vHN7LosFwIzHUkZSsw_jBcHlQ6o';
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

  function dateText(value) {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = 'comment-message' + (type ? ' ' + type : '');
  }

  function makeComment(item) {
    const article = document.createElement('article');
    article.className = 'comment-item';
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const name = document.createElement('strong');
    name.textContent = item.nickname;
    const time = document.createElement('time');
    time.textContent = dateText(item.created_at);
    meta.append(name, time);
    const body = document.createElement('p');
    body.textContent = item.body;
    article.append(meta, body);
    return article;
  }

  async function loadComments(list, message) {
    showMessage(message, '댓글 불러오는 중…');
    const { data, error } = await client
      .from('hanwhaeagles_comments')
      .select('id, nickname, body, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      showMessage(message, '댓글 기능 아직 준비 중. 잠시 후 다시 확인해줘.', 'error');
      return;
    }

    list.replaceChildren();
    if (!data.length) showMessage(message, '아직 아무도 안 씀. 첫 댓글 가자.');
    else {
      message.textContent = data.length + '개의 댓글이 있습니다.';
      message.className = 'comment-message';
      data.forEach(item => list.appendChild(makeComment(item)));
    }
  }

  const MIN_SUBMIT_MS = 2500; // 사람이 폼을 열고 실제로 타이핑하는 데 걸리는 최소 시간. 이보다 빠르면 봇으로 간주.

  function mount(container) {
    container.innerHTML = `
      <section class="comment-box" aria-label="댓글">
        <div class="comment-head">
          <div><span>댓글</span><h3>오늘 경기, 한마디</h3></div>
          <p>숫자에 대한 반박이든 오늘 야구 감상이든 다 환영.</p>
        </div>
        <form class="comment-form">
          <label>닉네임<input name="nickname" maxlength="24" placeholder="익명" autocomplete="nickname"></label>
          <label>내용<textarea name="body" maxlength="800" required placeholder="확률이든 오늘 경기든, 하고 싶은 말 적어줘."></textarea></label>
          <label class="comment-hp" aria-hidden="true">웹사이트<input name="website" tabindex="-1" autocomplete="off"></label>
          <div class="comment-form-foot"><span>최대 800자</span><button type="submit">댓글 등록</button></div>
        </form>
        <p class="comment-message" aria-live="polite"></p>
        <div class="comment-list"></div>
      </section>`;

    const form = container.querySelector('.comment-form');
    const list = container.querySelector('.comment-list');
    const message = container.querySelector('.comment-message');
    const button = form.querySelector('button');
    const mountedAt = Date.now();
    loadComments(list, message);

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = new FormData(form);
      const body = String(values.get('body') || '').trim();
      const nickname = String(values.get('nickname') || '').trim() || '익명';
      if (!body) return;

      // 허니팟: 사람 눈에는 안 보이는 필드라 사람이라면 채울 수 없음. 채워져 있으면 봇으로 보고 조용히 무시.
      if (String(values.get('website') || '').trim()) {
        form.reset();
        showMessage(message, '등록 완료. 고마움.', 'success');
        return;
      }
      if (Date.now() - mountedAt < MIN_SUBMIT_MS) {
        showMessage(message, '너무 빨리 제출됐어. 잠시 후 다시 시도해줘.', 'error');
        return;
      }

      button.disabled = true;
      showMessage(message, '댓글 올리는 중…');
      try {
        await ensureSession();
        const { error } = await client.from('hanwhaeagles_comments').insert({ nickname, body });
        if (error) throw error;
        form.reset();
        showMessage(message, '등록 완료. 고마움.', 'success');
        await loadComments(list, message);
      } catch (error) {
        const tooFast = String(error && error.message || '').includes('rate_limited');
        showMessage(
          message,
          tooFast
            ? '20초에 한 번만 가능. 숨 좀 고르고 다시.'
            : '등록 실패. 잠시 후 다시 시도해줘.',
          'error'
        );
      } finally {
        button.disabled = false;
      }
    });
  }

  window.PageComments = { mount };
})();
