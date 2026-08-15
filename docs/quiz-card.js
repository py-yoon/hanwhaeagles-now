/**
 * 찐팬 감별기 SNS 공유용 이미지 카드 생성 모듈
 * Hanwha Eagles Fan Quiz Result Card Generator
 */

const QuizCardGenerator = {
  // fan-quiz.js의 GRADES(0~60점, 티어 가중합)와 1:1로 맞춘 10단계 찐팬 등급.
  // 점수 구간이 어긋나면 결과 페이지 등급과 공유 카드 등급이 서로 달라지므로
  // 두 파일의 구간은 반드시 함께 바꿀 것.
  tiers: [
    { min: 54, max: 60, title: "Lv.10 불꽃의 영구결번 마스터", desc: "이글스 역사의 살아있는 산증인! 당신은 진정한 영구결번급 전설입니다.", badge: "👑" },
    { min: 48, max: 53, title: "Lv.9 이글스파크 1열 보살러", desc: "모든 경기와 선수를 꿰뚫고 있는 골수 팬! 웬만한 해설위원보다 정확합니다.", badge: "🦅" },
    { min: 42, max: 47, title: "Lv.8 대전의 아들·딸 독수리", desc: "응원가 전곡 암기는 기본, 2군 퓨처스 경기까지 챙겨보는 찐팬!", badge: "🔥" },
    { min: 36, max: 41, title: "Lv.7 비상하는 오렌지 불꽃", desc: "시즌권 구매는 필수! 이글스를 향한 뜨거운 열정을 지닌 팬입니다.", badge: "⚡" },
    { min: 30, max: 35, title: "Lv.6 주말 직관 개근러", desc: "대전 원정 불문, 주말마다 유니폼 입고 야구장으로 달려가는 열혈 팬!", badge: "⚾" },
    { min: 24, max: 29, title: "Lv.5 승리의 육성응원 주도자", desc: "8회 아파트와 승리의 함성을 누구보다 목청껏 부르는 든든한 팬!", badge: "📢" },
    { min: 18, max: 23, title: "Lv.4 행복야구 탐험가", desc: "선수단 주요 라인업과 명장면을 기억하며 직관을 즐기기 시작한 팬!", badge: "🌱" },
    { min: 12, max: 17, title: "Lv.3 입문 3년 차 아기 독수리", desc: "이글스의 매력에 푹 빠져 유니폼을 구매하고 직관을 배우는 단계!", badge: "🐣" },
    { min: 6,  max: 11, title: "Lv.2 주황색 유니폼 비기너", desc: "친구 따라 야구장 갔다가 류현진과 수리에 입덕한 야구 꿈나무!", badge: "✨" },
    { min: 0,  max: 5,  title: "Lv.1 순수 100% 입덕 대기자", desc: "이제 이글스파크의 낭만을 알아갈 시간입니다. 환영합니다!", badge: "🧡" }
  ],

  getTierInfo(score) {
    const matched = this.tiers.find(t => score >= t.min && score <= t.max);
    return matched || this.tiers[this.tiers.length - 1];
  },

  /**
   * Canvas에 공유용 카드 렌더링 (1080 x 1350 인스타그램 최적 규격)
   * score/maxScore: fan-quiz.js의 티어 가중합 점수 (0~60)
   * correctCount/totalQuestions: 실제 정답 개수 (0~20) — 정답률 표기에 사용
   */
  generateCard({ canvas, score = 0, maxScore = 60, correctCount = 0, totalQuestions = 20 }) {
    const ctx = canvas.getContext("2d");
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    const tier = this.getTierInfo(score);
    const gradeIndex = this.tiers.length - this.tiers.indexOf(tier);
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 1. 다크 배경 그라데이션 (사이트 기본 배경 #0a0c0f 기준)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#12151a");
    bgGrad.addColorStop(1, "#0a0c0f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 배경 오렌지 글로우 효과
    const radialGrad = ctx.createRadialGradient(width / 2, 380, 50, width / 2, 380, 500);
    radialGrad.addColorStop(0, "rgba(255, 106, 26, 0.18)");
    radialGrad.addColorStop(1, "rgba(255, 106, 26, 0)");
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. 외부 테두리 & 오렌지 라인
    ctx.strokeStyle = "#262b33";
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    ctx.fillStyle = "#ff6a1a";
    ctx.fillRect(40, 40, width - 80, 16);

    // 4. 헤더 브랜드
    ctx.fillStyle = "#edece6";
    ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HANWHA EAGLES 찐팬 감별기", width / 2, 130);

    ctx.fillStyle = "#ff6a1a";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("OFFICIAL FAN CERTIFICATE", width / 2, 180);

    // 구분선
    ctx.strokeStyle = "#262b33";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 220);
    ctx.lineTo(width - 100, 220);
    ctx.stroke();

    // 5. 등급 박스
    ctx.fillStyle = "#12151a";
    ctx.roundRect(100, 260, width - 200, 100, 20);
    ctx.fill();
    ctx.strokeStyle = "#262b33";
    ctx.stroke();

    ctx.fillStyle = "#9aa0ab";
    ctx.font = "26px sans-serif";
    ctx.fillText("이글스 찐팬 판정 결과", width / 2, 305);

    ctx.fillStyle = "#edece6";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(`등급 ${gradeIndex} / ${this.tiers.length}`, width / 2, 345);

    // 6. 점수 & 뱃지 메인 카드
    ctx.fillStyle = "#12151a";
    ctx.roundRect(100, 390, width - 200, 520, 24);
    ctx.fill();
    ctx.strokeStyle = "#ff6a1a";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 배지 이모지
    ctx.font = "90px sans-serif";
    ctx.fillText(tier.badge, width / 2, 490);

    // 타이틀 칭호
    ctx.fillStyle = "#ff6a1a";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(tier.title, width / 2, 570);

    // 설명 텍스트
    ctx.fillStyle = "#9aa0ab";
    ctx.font = "26px sans-serif";
    ctx.fillText(tier.desc, width / 2, 630);

    // 점수 & 정답률 뱃지
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.roundRect(160, 680, width - 320, 180, 18);
    ctx.fill();

    ctx.fillStyle = "#9aa0ab";
    ctx.font = "24px sans-serif";
    ctx.fillText("최종 획득 점수", 340, 740);
    ctx.fillText("정답률", 740, 740);

    ctx.fillStyle = "#edece6";
    ctx.font = "bold 60px sans-serif";
    ctx.fillText(`${score} / ${maxScore}`, 340, 815);

    ctx.fillStyle = "#34c98f";
    ctx.fillText(`${accuracy}%`, 740, 815);

    // 7. 하단 안내 & 링크 정보
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.roundRect(100, 950, width - 200, 220, 20);
    ctx.fill();

    ctx.fillStyle = "#edece6";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("당신도 진짜 이글스 팬인지 테스트해 보세요!", width / 2, 1020);

    ctx.fillStyle = "#ff6a1a";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("👉 https://hanwhaeagles.kr/fan-quiz.html", width / 2, 1080);

    ctx.fillStyle = "#9aa0ab";
    ctx.font = "22px sans-serif";
    ctx.fillText("300문항 풀 · 5단계 난이도 중 20문항 랜덤 출제", width / 2, 1130);

    // 8. 푸터 워터마크
    ctx.fillStyle = "#5c626d";
    ctx.font = "22px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HANWHA EAGLES NOW · 비공식 팬 데이터 포털", 100, 1260);

    const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    ctx.textAlign = "right";
    ctx.fillText(`인증일: ${todayStr}`, width - 100, 1260);
  },

  downloadPNG(canvas, filename = "hanwha_fan_quiz_result.png") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
};

// top-level const는 window에 자동으로 붙지 않으므로, 다른 스크립트(fan-quiz.js)에서
// window.QuizCardGenerator로 참조할 수 있도록 명시적으로 등록한다.
window.QuizCardGenerator = QuizCardGenerator;
