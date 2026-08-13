function calculateGamesBehind(standings) { const top = standings[0]; return standings.map(t => ({...t, games_behind: Number((((top.wins-t.wins)+(t.losses-top.losses))/2).toFixed(1))})); }

export function buildTeamSnapshot({ ratings, officialStandings, date, gamesProcessed }) {
  const official = new Map(officialStandings.map(x => [x.team, x]));
  const teams = [...new Set([...Object.keys(ratings), ...official.keys()])];
  const eloRows = teams.map(team => ({ team, elo: Number((ratings[team] ?? 1500).toFixed(3)) }))
    .sort((a,b) => b.elo - a.elo || a.team.localeCompare(b.team));
  const eloRank = new Map();
  eloRows.forEach((x, i) => eloRank.set(x.team, i + 1));
  const calculatedOfficial = officialStandings.map(x => ({...x}));
  const withGb = calculateGamesBehind(calculatedOfficial);
  const officialMap = new Map(withGb.map(x => [x.team, x]));
  const rows = teams.map(team => {
    const o = officialMap.get(team);
    const elo = ratings[team] ?? 1500;
    return {
      team,
      elo: Number(elo.toFixed(3)),
      elo_rank: eloRank.get(team),
      official_rank: o?.rank ?? null,
      rank_gap: o ? o.rank - eloRank.get(team) : null,
      games: o?.games ?? null,
      wins: o?.wins ?? null,
      losses: o?.losses ?? null,
      draws: o?.draws ?? null,
      win_rate: o?.win_rate ?? null,
      games_behind: o?.games_behind ?? null,
    };
  }).sort((a,b) => (a.official_rank ?? 99) - (b.official_rank ?? 99));
  return { date, games_processed: gamesProcessed, rows };
}

export function snapshotHealth(snapshot) {
  const teams = snapshot.rows;
  return {
    status: teams.length === 10 && teams.every(x => Number.isFinite(x.elo)) ? 'PASS' : 'FAIL',
    teams_checked: teams.length,
    missing_official: teams.filter(x => x.official_rank == null).map(x => x.team),
    missing_elo: teams.filter(x => !Number.isFinite(x.elo)).map(x => x.team),
  };
}
