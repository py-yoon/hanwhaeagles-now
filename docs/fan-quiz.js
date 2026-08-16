/* ==========================================================================
   HANWHA EAGLES NOW — 찐팬 테스트
   fan-quiz-data.js 의 300문항 풀에서 티어별로 4문항씩(총 20문항) 무작위 출제.
   티어 N 정답 = N점, 최대 60점 만점을 10등급으로 환산.
   ========================================================================== */

(function () {
  "use strict";

  const QUESTIONS_PER_TIER = 4;
  const TIER_COUNT = 5;
  const TIER_LABEL = { 1: "Lv.1 입문", 2: "Lv.2 초급", 3: "Lv.3 중급", 4: "Lv.4 고급", 5: "Lv.5 찐팬" };

  // 6점 단위 10등급. 점수는 티어(1~5점) 가중합, 만점 60점(=4*(1+2+3+4+5)).
  const GRADES = [
    { min: 0, max: 5, name: "직관은 처음이라", desc: "이글스가 야구팀인 건 아는데, 아직은 낯설죠. 한 경기만 보면 순식간에 빠져들 수도 있어요." },
    { min: 6, max: 11, name: "요즘 화제라 궁금해서", desc: "뉴스에서 몇 번 봐서 관심이 생긴 정도. 선수단 페이지부터 한 바퀴 둘러보세요." },
    { min: 12, max: 17, name: "친구 따라 야구장", desc: "직관 가면 룰은 대충 알고 응원가도 따라 부를 수 있는 수준이네요." },
    { min: 18, max: 23, name: "중계는 챙겨보는 편", desc: "시즌 중계를 꽤 챙겨보는 편이군요. 선발 로테이션 정도는 눈에 익었을 듯." },
    { min: 24, max: 29, name: "순위표 매일 확인", desc: "매일 순위표 들여다보는 습관, 이미 팬이라고 해도 될 것 같습니다." },
    { min: 30, max: 35, name: "이글스 앱 알림 항상 켜둠", desc: "경기 시작 알림부터 확인하는 사람. 웬만한 팀 소식은 이미 알고 계셨죠." },
    { min: 36, max: 41, name: "직관 시즌권 고민 중", desc: "역대 감독·트레이드 얘기도 술술 나오는 수준. 시즌권 끊을 때 되지 않았나요." },
    { min: 42, max: 47, name: "유니폼 서랍이 꽉 참", desc: "레전드 선수 커리어부터 응원 문화까지 빠삭한, 진짜 오래된 팬입니다." },
    { min: 48, max: 53, name: "그 시절도 다 기억함", desc: "힘들었던 시즌들까지 전부 함께한 팬이시네요. 웬만한 문제엔 안 흔들리죠." },
    { min: 54, max: 60, name: "이글스 그 자체", desc: "이 정도면 프런트에 이력서 넣어도 될 디테일입니다. 찐팬 인증 완료." },
  ];

  let bank = [];
  let session = [];
  let current = 0;
  let score = 0;
  let answered = [];
  let tierCorrect = {};

  const $intro = document.getElementById("fqIntro");
  const $quiz = document.getElementById("fqQuiz");
  const $result = document.getElementById("fqResult");
  const $startBtn = document.getElementById("fqStartBtn");
  const $retryBtn = document.getElementById("fqRetryBtn");
  const $shareBtn = document.getElementById("fqShareBtn");
  const $shareCanvas = document.getElementById("fqShareCanvas");
  const $shareSnsBtn = document.getElementById("fqShareSnsBtn");
  const $sharePanel = document.getElementById("fqSharePanel");
  const $shareX = document.getElementById("fqShareX");
  const $shareKakao = document.getElementById("fqShareKakao");
  const $shareFacebook = document.getElementById("fqShareFacebook");
  const $shareCopy = document.getElementById("fqShareCopy");
  const $progressFill = document.getElementById("fqProgressFill");
  const $progressLabel = document.getElementById("fqProgressLabel");
  const $tierBadge = document.getElementById("fqTierBadge");
  const $category = document.getElementById("fqCategory");
  const $question = document.getElementById("fqQuestion");
  const $choices = document.getElementById("fqChoices");

  function loadBank() {
    if (window.EAGLES_QUIZ_BANK) return Promise.resolve(window.EAGLES_QUIZ_BANK);
    return fetch("fan-quiz-data.json").then((r) => r.json());
  }

  loadBank()
    .then((data) => {
      bank = data.questions || [];
      $startBtn.addEventListener("click", startQuiz);
      $retryBtn.addEventListener("click", startQuiz);
    })
    .catch((err) => {
      $intro.innerHTML = `<div class="fq-intro-card">문제 데이터를 불러오지 못했습니다. fan-quiz.html과 같은 폴더에 fan-quiz-data.js 파일이 있는지 확인해주세요.</div>`;
      console.error(err);
    });

  // "위 A/B/C 다 ~아니다/없다" 식으로 다른 보기들을 지칭하는 보기는, 자리를 섞어버리면
  // "위"가 가리키는 게 뭔지 알 수 없어져서 항상 마지막 자리에 고정한다.
  const CATCH_ALL_CHOICE = /^(위|셋|넷|모두|둘).{0,10}(다|모두)?.{0,20}(아니|없|맞다|해당)/;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildSession() {
    const byTier = {};
    for (const q of bank) {
      (byTier[q.tier] ??= []).push(q);
    }
    const picked = [];
    for (let t = 1; t <= TIER_COUNT; t++) {
      const pool = byTier[t] || [];
      picked.push(...shuffle(pool).slice(0, QUESTIONS_PER_TIER));
    }
    return picked; // 티어 오름차순 = 난이도가 점점 올라가는 구성
  }

  function startQuiz() {
    session = buildSession();
    current = 0;
    score = 0;
    answered = [];
    tierCorrect = {};
    $intro.hidden = true;
    $result.hidden = true;
    $quiz.hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = session[current];
    $progressFill.style.width = `${(current / session.length) * 100}%`;
    $progressLabel.textContent = `${current + 1} / ${session.length}`;
    $tierBadge.textContent = TIER_LABEL[q.tier] || `Lv.${q.tier}`;
    $category.textContent = q.category || "";
    $question.textContent = q.question;

    $choices.innerHTML = "";
    const shuffled = q.choices.map((text, i) => ({ text, isCorrect: i === q.answerIndex }));
    const pinned = shuffled.filter((c) => CATCH_ALL_CHOICE.test(c.text.trim()));
    const rest = shuffled.filter((c) => !CATCH_ALL_CHOICE.test(c.text.trim()));
    const order = [...shuffle(rest), ...pinned];
    for (const choice of order) {
      const btn = document.createElement("button");
      btn.className = "fq-choice";
      btn.textContent = choice.text;
      btn.addEventListener("click", () => handleAnswer(q, choice, order, btn));
      $choices.appendChild(btn);
    }
  }

  function handleAnswer(q, choice, order, clickedBtn) {
    const buttons = Array.from($choices.querySelectorAll(".fq-choice"));
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (order[i].isCorrect) b.classList.add("correct");
      else if (b === clickedBtn) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    const correct = choice.isCorrect;
    if (correct) {
      score += q.tier;
      tierCorrect[q.tier] = (tierCorrect[q.tier] || 0) + 1;
    }
    answered.push({ q, correct });

    const explainBox = document.createElement("div");
    explainBox.className = "fq-explain";
    explainBox.textContent = q.explain || "";
    $choices.appendChild(explainBox);

    const nextBtn = document.createElement("button");
    nextBtn.className = "fq-btn fq-btn-primary";
    nextBtn.style.marginTop = "16px";
    nextBtn.textContent = current + 1 < session.length ? "다음 문제" : "결과 보기";
    nextBtn.addEventListener("click", () => {
      current++;
      if (current < session.length) renderQuestion();
      else showResult();
    });
    $choices.appendChild(nextBtn);
  }

  function gradeFor(totalScore) {
    return GRADES.find((g) => totalScore >= g.min && totalScore <= g.max) || GRADES[GRADES.length - 1];
  }

  // 모바일은 navigator.share로 OS 공유 시트(카카오톡·메시지 등 포함)를 그대로 띄우고,
  // 이를 지원하지 않는 데스크톱 브라우저에서는 개별 SNS 링크 패널로 대체한다.
  function setupShare({ text, url }) {
    if (!$shareSnsBtn) return;

    if (navigator.share) {
      $shareSnsBtn.onclick = () => {
        navigator.share({ title: "한화 이글스 찐팬 감별기", text, url }).catch(() => {});
      };
      if ($sharePanel) $sharePanel.hidden = true;
      return;
    }

    $shareSnsBtn.onclick = () => {
      $sharePanel.hidden = !$sharePanel.hidden;
    };
    if ($shareX) $shareX.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    if ($shareKakao) $shareKakao.href = `https://story.kakao.com/share?url=${encodeURIComponent(url)}`;
    if ($shareFacebook) $shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if ($shareCopy) {
      $shareCopy.onclick = () => {
        navigator.clipboard.writeText(`${text} ${url}`).then(() => {
          const original = $shareCopy.textContent;
          $shareCopy.textContent = "복사 완료!";
          setTimeout(() => { $shareCopy.textContent = original; }, 1500);
        });
      };
    }
  }

  function showResult() {
    $quiz.hidden = true;
    $result.hidden = false;

    const grade = gradeFor(score);
    const gradeIndex = GRADES.indexOf(grade) + 1;
    document.getElementById("fqResultGradeNum").textContent = `등급 ${gradeIndex} / ${GRADES.length}`;
    document.getElementById("fqResultGradeName").textContent = grade.name;
    document.getElementById("fqResultDesc").textContent = grade.desc;
    document.getElementById("fqResultScore").innerHTML = `<b>${score}</b> / 60점`;

    const tierBarsEl = document.getElementById("fqResultTierbars");
    tierBarsEl.innerHTML = "";
    for (let t = 1; t <= TIER_COUNT; t++) {
      const correct = tierCorrect[t] || 0;
      const pct = (correct / QUESTIONS_PER_TIER) * 100;
      const row = document.createElement("div");
      row.className = "fq-tierbar-row";
      row.innerHTML = `
        <div class="fq-tierbar-label">${TIER_LABEL[t]}</div>
        <div class="fq-tierbar-track"><div class="fq-tierbar-fill" style="width:${pct}%"></div></div>
        <div class="fq-tierbar-count">${correct}/${QUESTIONS_PER_TIER}</div>`;
      tierBarsEl.appendChild(row);
    }

    const reviewEl = document.getElementById("fqReview");
    reviewEl.innerHTML = answered
      .map(({ q, correct }) => `
        <div class="fq-review-item">
          <div class="fq-review-q">${q.question}</div>
          <div class="fq-review-a ${correct ? "correct" : "wrong"}">${correct ? "✓ 정답" : "✕ 오답"} — ${q.choices[q.answerIndex]}</div>
        </div>`)
      .join("");

    const correctCount = answered.filter((a) => a.correct).length;

    if ($shareBtn && window.QuizCardGenerator) {
      $shareBtn.onclick = () => {
        QuizCardGenerator.generateCard({
          canvas: $shareCanvas,
          score,
          maxScore: 60,
          correctCount,
          totalQuestions: session.length,
        });
        QuizCardGenerator.downloadPNG($shareCanvas);
      };
    }

    setupShare({
      text: `한화 이글스 찐팬 감별기 결과: "${grade.name}" (${score}/60점, 정답률 ${Math.round((correctCount / session.length) * 100)}%). 너도 도전해봐!`,
      url: "https://hanwhaeagles.kr/fan-quiz.html",
    });
  }
})();
