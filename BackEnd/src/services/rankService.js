const RANKS = [
  { id: "bronze", label: "Bronze", minRp: 200 },
  { id: "silver", label: "Silver", minRp: 500 },
  { id: "gold", label: "Gold", minRp: 950 },
  { id: "platinum", label: "Platinum", minRp: 1500 },
  { id: "diamond", label: "Diamond", minRp: 2200 },
  { id: "master", label: "Master", minRp: 3100 },
  { id: "admiral", label: "Admiral", minRp: 4000 },
];

const UNRANKED = {
  id: "unranked",
  label: "Unranked",
  minRp: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeRp = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const getRankForRp = (rankPoints = 0) => {
  const rp = normalizeRp(rankPoints);
  return [...RANKS].reverse().find((rank) => rp >= rank.minRp) || UNRANKED;
};

const getRankIndex = (rankId) => {
  if (rankId === UNRANKED.id) return -1;
  const index = RANKS.findIndex((rank) => rank.id === rankId);
  return index === -1 ? -1 : index;
};

const calculateRankDelta = ({
  isWinner,
  playerStats = {},
  opponentRank = "bronze",
  playerRank = "bronze",
}) => {
  const shots = Number(playerStats.shots || 0);
  const hits = Number(playerStats.hits || 0);
  const turns = Number(playerStats.turns || 0);
  const shipsDestroyed = Number(playerStats.shipsDestroyed || 0);
  const accuracy = shots > 0 ? hits / shots : 0;
  const rankGap = getRankIndex(opponentRank) - getRankIndex(playerRank);

  if (isWinner) {
    let delta = 40;

    if (accuracy >= 0.6) delta += 10;
    else if (accuracy >= 0.45) delta += 6;
    else if (accuracy >= 0.3) delta += 3;

    if (turns > 0 && turns <= 25) delta += 10;
    else if (turns > 0 && turns <= 35) delta += 5;

    if (rankGap > 0) delta += clamp(rankGap * 5, 5, 15);
    if (rankGap < 0) delta -= clamp(Math.abs(rankGap) * 3, 0, 10);

    return clamp(delta, 25, 70);
  }

  let delta = -15;

  if (shipsDestroyed >= 3) delta += 5;
  if (accuracy >= 0.45) delta += 4;
  if (rankGap > 0) delta += 5;
  if (shipsDestroyed === 0) delta -= 5;
  if (rankGap < -1) delta -= 5;

  return clamp(delta, -30, -5);
};

const buildRankUpdate = ({ currentUser = {}, delta = 0, isWinner }) => {
  const oldRp = normalizeRp(currentUser.rankPoints);
  const oldRank = currentUser.rank || getRankForRp(oldRp).id;
  const newRp = normalizeRp(oldRp + delta);
  const newRank = getRankForRp(newRp).id;
  const oldPeakRank = currentUser.peakRank || oldRank;
  const peakRank = getRankIndex(newRank) > getRankIndex(oldPeakRank)
    ? newRank
    : oldPeakRank;

  return {
    oldRp,
    newRp,
    delta,
    oldRank,
    newRank,
    peakRank,
    promoted: getRankIndex(newRank) > getRankIndex(oldRank),
    demoted: getRankIndex(newRank) < getRankIndex(oldRank),
    nextWinStreak: isWinner ? Number(currentUser.winStreak || 0) + 1 : 0,
  };
};

module.exports = {
  RANKS,
  UNRANKED,
  calculateRankDelta,
  buildRankUpdate,
  getRankForRp,
};
