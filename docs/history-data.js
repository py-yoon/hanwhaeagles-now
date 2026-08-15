window.EAGLES_HISTORY_DATA = {
  meta: {
    founded: "1986-03-08",
    nameChanged: "1993-11-01",
    updated: "2026-08-14",
    // 야구나라 통산 기록(2026년 기준)
    careerWins: 2429,
    careerTies: 114,
    careerLosses: 2795,
    careerWinPct: 0.465,
    championships: 1,
    runnerUps: 4,
    postseasonAppearances: 14
  },

  // 시대 구분 탭
  eras: [
    { key: "all", label: "전체", range: [1986, 2026] },
    { key: "binggrae", label: "빙그레 시대", range: [1986, 1993] },
    { key: "rebuild", label: "리빌딩기", range: [1994, 2007] },
    { key: "dark", label: "암흑기", range: [2008, 2017] },
    { key: "revival", label: "부흥기", range: [2018, 2026] }
  ],

  // 시즌별 성적. wins/ties/losses가 null이면 순위·결과만 확인되고
  // 정확한 승-무-패 숫자는 아직 확인되지 않은 시즌입니다.
  seasons: [
    { year: 1986, team: "빙그레 이글스", regular: "7위", final: "7위", wins: 31, ties: 1, losses: 76, pct: 0.290, result: "" },
    { year: 1987, team: "빙그레 이글스", regular: "6위", final: "6위", wins: 47, ties: 4, losses: 57, pct: 0.454, result: "" },
    { year: 1988, team: "빙그레 이글스", regular: "2위", final: "준우승", wins: 62, ties: 1, losses: 45, pct: 0.579, result: "한국시리즈 준우승 (vs 해태)" },
    { year: 1989, team: "빙그레 이글스", regular: "1위", final: "준우승", wins: 71, ties: 3, losses: 46, pct: 0.604, result: "한국시리즈 준우승 (vs 해태)" },
    { year: 1990, team: "빙그레 이글스", regular: "3위", final: "4위", wins: 68, ties: 2, losses: 50, pct: 0.575, result: "준플레이오프 탈락 (vs 삼성)" },
    { year: 1991, team: "빙그레 이글스", regular: "2위", final: "준우승", wins: 72, ties: 5, losses: 49, pct: 0.591, result: "한국시리즈 준우승 (vs 해태)" },
    { year: 1992, team: "빙그레 이글스", regular: "1위", final: "준우승", wins: 81, ties: 2, losses: 43, pct: 0.651, result: "한국시리즈 준우승 (vs 롯데) · 구단 역대 최고 승률" },
    { year: 1993, team: "빙그레 이글스", regular: "5위", final: "5위", wins: 61, ties: 4, losses: 61, pct: 0.500, result: "" },
    { year: 1994, team: "한화 이글스", regular: "3위(공동)", final: "3위", wins: 65, ties: 2, losses: 59, pct: 0.524, result: "플레이오프 탈락 (vs 태평양) · 구단명 변경 후 첫 시즌" },
    { year: 1995, team: "한화 이글스", regular: "6위", final: "6위", wins: 55, ties: 0, losses: 71, pct: 0.437, result: "" },
    { year: 1996, team: "한화 이글스", regular: "3위", final: "3위", wins: 70, ties: 1, losses: 55, pct: 0.560, result: "플레이오프 탈락 (vs 현대)" },
    { year: 1997, team: "한화 이글스", regular: "7위", final: "7위", wins: 51, ties: 2, losses: 73, pct: 0.411, result: "" },
    { year: 1998, team: "한화 이글스", regular: "7위", final: "7위", wins: 55, ties: 5, losses: 66, pct: 0.455, result: "" },
    { year: 1999, team: "한화 이글스", regular: "매직리그 2위 · 전체 4위", final: "우승", wins: null, ties: null, losses: null, pct: null, result: "한국시리즈 우승 (vs 롯데, 4승 1패) · 구단 첫 통합 우승" },
    { year: 2000, team: "한화 이글스", regular: "매직리그 3위 · 전체 7위", final: "7위", wins: null, ties: null, losses: null, pct: null, result: "" },
    { year: 2001, team: "한화 이글스", regular: "4위", final: "4위", wins: null, ties: null, losses: null, pct: null, result: "준플레이오프 탈락 (vs 두산, 0승 2패)" },
    { year: 2002, team: "한화 이글스", regular: "7위", final: "7위", wins: 59, ties: 5, losses: 69, pct: 0.461, result: "" },
    { year: 2003, team: "한화 이글스", regular: "5위", final: "5위", wins: 63, ties: 0, losses: 65, pct: 0.492, result: "" },
    { year: 2004, team: "한화 이글스", regular: "7위", final: "7위", wins: null, ties: null, losses: null, pct: null, result: "" },
    { year: 2005, team: "한화 이글스", regular: "4위", final: "4위", wins: null, ties: null, losses: null, pct: null, result: "포스트시즌 진출" },
    { year: 2006, team: "한화 이글스", regular: "3위", final: "준우승", wins: 67, ties: 2, losses: 57, pct: 0.540, result: "한국시리즈 준우승 (vs 삼성)" },
    { year: 2007, team: "한화 이글스", regular: "3위", final: "3위", wins: 67, ties: 2, losses: 57, pct: 0.540, result: "플레이오프 탈락 (vs 두산)" },
    { year: 2008, team: "한화 이글스", regular: "5위", final: "5위", wins: 64, ties: 0, losses: 62, pct: 0.508, result: "" },
    { year: 2009, team: "한화 이글스", regular: "8위", final: "8위", wins: 46, ties: 3, losses: 84, pct: 0.346, result: "" },
    { year: 2010, team: "한화 이글스", regular: "8위", final: "8위", wins: 49, ties: 2, losses: 82, pct: 0.368, result: "" },
    { year: 2011, team: "한화 이글스", regular: "7위", final: "7위", wins: 59, ties: 2, losses: 72, pct: 0.450, result: "" },
    { year: 2012, team: "한화 이글스", regular: "8위", final: "8위", wins: 53, ties: 3, losses: 77, pct: 0.408, result: "" },
    { year: 2013, team: "한화 이글스", regular: "9위", final: "9위", wins: 42, ties: 1, losses: 85, pct: 0.331, result: "" },
    { year: 2014, team: "한화 이글스", regular: "9위", final: "9위", wins: 49, ties: 2, losses: 77, pct: 0.389, result: "" },
    { year: 2015, team: "한화 이글스", regular: "6위", final: "6위", wins: 68, ties: 0, losses: 76, pct: 0.472, result: "" },
    { year: 2016, team: "한화 이글스", regular: "7위", final: "7위", wins: 66, ties: 3, losses: 75, pct: 0.468, result: "" },
    { year: 2017, team: "한화 이글스", regular: "8위", final: "8위", wins: 61, ties: 2, losses: 81, pct: 0.430, result: "" },
    { year: 2018, team: "한화 이글스", regular: "3위", final: "3위", wins: 77, ties: 0, losses: 67, pct: 0.535, result: "준플레이오프 탈락 · 10년 만의 포스트시즌" },
    { year: 2019, team: "한화 이글스", regular: "9위", final: "9위", wins: 58, ties: 0, losses: 86, pct: 0.403, result: "" },
    { year: 2020, team: "한화 이글스", regular: "10위", final: "10위", wins: 46, ties: 3, losses: 95, pct: 0.326, result: "" },
    { year: 2021, team: "한화 이글스", regular: "10위", final: "10위", wins: 49, ties: 12, losses: 83, pct: 0.371, result: "" },
    { year: 2022, team: "한화 이글스", regular: "10위", final: "10위", wins: 46, ties: 2, losses: 96, pct: 0.324, result: "" },
    { year: 2023, team: "한화 이글스", regular: "9위", final: "9위", wins: 58, ties: 6, losses: 80, pct: 0.420, result: "" },
    { year: 2024, team: "한화 이글스", regular: "8위", final: "8위", wins: 66, ties: 2, losses: 76, pct: 0.465, result: "" },
    { year: 2025, team: "한화 이글스", regular: "2위", final: "준우승", wins: 83, ties: 4, losses: 57, pct: 0.593, result: "한국시리즈 준우승 · 19년 만의 한국시리즈 진출 · 구단 첫 100만 관중" },
    { year: 2026, team: "한화 이글스", regular: "6위(진행 중)", final: "-", wins: 44, ties: 3, losses: 46, pct: 0.489, result: "시즌 진행 중" }
  ],

  retiredNumbers: [
    { no: 35, name: "장종훈", note: "KBO 최초 40홈런 타자, 통산 340홈런 · 구단 최초 영구결번" },
    { no: 21, name: "송진우", note: "KBO 최초 통산 200승 투수, 원클럽맨" },
    { no: 23, name: "정민철", note: "통산 161승, 1999년 우승 에이스" },
    { no: 52, name: "김태균", note: "통산 311홈런 1,358타점, 통산 타율 .320" }
  ],

  coaches: [
    { period: "1986~1987", name: "배성서", note: "창단 감독" },
    { period: "1987~1993", name: "김영덕", note: "4번의 한국시리즈 진출(88·89·91·92)을 이끈 '다이너마이트 타선' 시대" },
    { period: "1993~1998", name: "강병철", note: "1994년 구단명 한화 이글스로 변경 후 첫 감독" },
    { period: "1998~2000", name: "이희수", note: "1999년 구단 첫 한국시리즈 우승" },
    { period: "2001~2002", name: "이광환", note: "" },
    { period: "2003~2004", name: "유승안", note: "" },
    { period: "2005~2009", name: "김인식", note: "2006년 한국시리즈 준우승" },
    { period: "2009~2012", name: "한대화", note: "" },
    { period: "2012~2014", name: "김응용", note: "" },
    { period: "2015~2017", name: "김성근", note: "" },
    { period: "2018~2020", name: "한용덕", note: "2018년 10년 만의 포스트시즌 진출(3위)" },
    { period: "2021~2023", name: "카를로스 수베로", note: "" },
    { period: "2023~2024", name: "최원호", note: "" },
    { period: "2024~현재", name: "김경문", note: "2025년 한국시리즈 준우승" }
  ],

  timeline: [
    { date: "1986-03-08", title: "빙그레 이글스 창단", note: "충청도 연고 7구단, 한국화약그룹(현 한화그룹) 소유" },
    { date: "1993-11-01", title: "한화 이글스로 구단명 변경", note: "모기업 지주 재편에 따라 '빙그레'에서 '한화'로" },
    { date: "1999", title: "구단 첫 한국시리즈 우승", note: "롯데 자이언츠를 4승 1패로 꺾고 창단 첫 통합 우승" },
    { date: "2015", title: "한밭 야구장 → 한화생명 이글스파크 명칭 변경", note: "" },
    { date: "2025", title: "대전 한화생명 볼파크 이전", note: "신구장 개장과 함께 구단 첫 100만 관중 돌파, 19년 만의 한국시리즈 진출" }
  ]
};
