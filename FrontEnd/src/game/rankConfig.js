import bronzeBadge from "../assets/badge/bronze.png";
import silverBadge from "../assets/badge/silver.png";
import goldBadge from "../assets/badge/gold.png";
import platinumBadge from "../assets/badge/platinum.png";
import diamondBadge from "../assets/badge/diamond.png";
import masterBadge from "../assets/badge/master.png";
import admiralBadge from "../assets/badge/admiral.png";

export const RANKS = [
  { id: "bronze", label: "Bronze", viLabel: "Đồng", minRp: 200, color: "#b7794b", badge: bronzeBadge },
  { id: "silver", label: "Silver", viLabel: "Bạc", minRp: 500, color: "#cfd8e3", badge: silverBadge },
  { id: "gold", label: "Gold", viLabel: "Vàng", minRp: 950, color: "#f7c948", badge: goldBadge },
  { id: "platinum", label: "Platinum", viLabel: "Bạch kim", minRp: 1500, color: "#4fd1c5", badge: platinumBadge },
  { id: "diamond", label: "Diamond", viLabel: "Kim cương", minRp: 2200, color: "#7dd3fc", badge: diamondBadge },
  { id: "master", label: "Master", viLabel: "Cao thủ", minRp: 3100, color: "#a78bfa", badge: masterBadge },
  { id: "admiral", label: "Admiral", viLabel: "Đô đốc", minRp: 4000, color: "#ff4d6d", badge: admiralBadge },
];

export const getRankMeta = (rankId = "bronze") => (
  RANKS.find((rank) => rank.id === rankId) || RANKS[0]
);

export const getRankForRp = (rankPoints = 0) => {
  const rp = Math.max(0, Number(rankPoints) || 0);
  return [...RANKS].reverse().find((rank) => rp >= rank.minRp) || RANKS[0];
};

export const getNextRank = (rankId = "bronze") => {
  const index = RANKS.findIndex((rank) => rank.id === rankId);
  return index >= 0 && index < RANKS.length - 1 ? RANKS[index + 1] : null;
};
