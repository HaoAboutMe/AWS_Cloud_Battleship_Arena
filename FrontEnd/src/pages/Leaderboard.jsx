import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getLeaderboard } from "../services/userService";
import { getAvatarCdnUrl } from "../utils/avatar";
import { setPreferredLightMode } from "../utils/themePreference";
import CommandHeader from "../components/CommandHeader";
import HomeSelect from "../components/HomeSelect";
import bronzeBadge from "../assets/badge/bronze.webp";
import silverBadge from "../assets/badge/silver.webp";
import goldBadge from "../assets/badge/gold.webp";
import platinumBadge from "../assets/badge/platinum.webp";
import diamondBadge from "../assets/badge/diamond.webp";
import masterBadge from "../assets/badge/master.webp";
import admiralBadge from "../assets/badge/admiral.webp";
import "./HomeHeader.css";
import "./Leaderboard.css";

const getRankIcon = (rank) => {
  const rankStr = (rank || "unranked").toLowerCase();
  switch (rankStr) {
    case "bronze": return bronzeBadge;
    case "silver": return silverBadge;
    case "gold": return goldBadge;
    case "platinum": return platinumBadge;
    case "diamond": return diamondBadge;
    case "master": return masterBadge;
    case "admiral": return admiralBadge;
    default: return bronzeBadge;
  }
};

const LaurelWreath = ({ rank }) => {
  let color = "#ffd700"; // gold
  if (rank === 2) color = "#b0c0d0"; // silver
  if (rank === 3) color = "#cd7f32"; // bronze
  
  return (
    <svg className="laurel-wreath" viewBox="0 0 140 140" style={{ color }}>
      {/* Symmetrical Left Branch */}
      <g transform="translate(70, 70)">
        <path d="M -5,55 A 58,58 0 0,1 -55,-15 A 58,58 0 0,1 -40,-40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d="M -15,53 Q -25,58 -30,50 Q -23,45 -12,48 Z" fill="currentColor" />
        <path d="M -28,45 Q -38,48 -41,39 Q -33,36 -25,40 Z" fill="currentColor" />
        <path d="M -40,33 Q -50,34 -51,25 Q -42,24 -36,29 Z" fill="currentColor" />
        <path d="M -49,18 Q -58,17 -57,8 Q -48,9 -45,14 Z" fill="currentColor" />
        <path d="M -53,1 Q -60,-2 -57,-11 Q -49,-8 -49,-1 Z" fill="currentColor" />
        <path d="M -52,-16 Q -57,-21 -52,-29 Q -45,-25 -48,-17 Z" fill="currentColor" />
        <path d="M -45,-31 Q -48,-38 -41,-44 Q -35,-39 -41,-32 Z" fill="currentColor" />
        <path d="M -34,-44 Q -35,-52 -27,-56 Q -23,-50 -30,-44 Z" fill="currentColor" />
      </g>
      
      {/* Symmetrical Right Branch */}
      <g transform="translate(70, 70) scale(-1, 1)">
        <path d="M -5,55 A 58,58 0 0,1 -55,-15 A 58,58 0 0,1 -40,-40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d="M -15,53 Q -25,58 -30,50 Q -23,45 -12,48 Z" fill="currentColor" />
        <path d="M -28,45 Q -38,48 -41,39 Q -33,36 -25,40 Z" fill="currentColor" />
        <path d="M -40,33 Q -50,34 -51,25 Q -42,24 -36,29 Z" fill="currentColor" />
        <path d="M -49,18 Q -58,17 -57,8 Q -48,9 -45,14 Z" fill="currentColor" />
        <path d="M -53,1 Q -60,-2 -57,-11 Q -49,-8 -49,-1 Z" fill="currentColor" />
        <path d="M -52,-16 Q -57,-21 -52,-29 Q -45,-25 -48,-17 Z" fill="currentColor" />
        <path d="M -45,-31 Q -48,-38 -41,-44 Q -35,-39 -41,-32 Z" fill="currentColor" />
        <path d="M -34,-44 Q -35,-52 -27,-56 Q -23,-50 -30,-44 Z" fill="currentColor" />
      </g>

      {/* One star at the bottom */}
      <g transform="translate(70, 70)">
        <polygon points="0,52 3,59 11,59 5,64 7,72 0,67 -7,72 -5,64 -11,59 -3,59" fill="currentColor" />
      </g>
    </svg>
  );
};

const Leaderboard = () => {
  const { t } = useLanguage();
  const { user: currentUser, attributes, loading: authLoading, logout } = useAuth();
  const [rankFilter, setRankFilter] = useState("admiral");
  const [searchName, setSearchName] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [commanders, setCommanders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLightMode, setIsLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active")
  );

  const navigate = useNavigate();

  const toggleTheme = (event) => {
    const nextLightMode = !isLightMode;

    if (!document.startViewTransition) {
      setPreferredLightMode(nextLightMode);
      setIsLightMode(nextLightMode);
      return;
    }

    const x = event?.clientX || window.innerWidth / 2;
    const y = event?.clientY || 32;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setPreferredLightMode(nextLightMode);
      setIsLightMode(nextLightMode);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 700,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  // Helper for navigation
  const handleNavigateRequest = (targetPath) => {
    navigate(targetPath);
  };

  const handleLogout = async () => {
    localStorage.removeItem("battleshipSession");
    navigate("/", { replace: true, state: { authEvent: "signed-out" } });
    await logout();
  };

  useEffect(() => {
    document.title = `${t("common.leaderboard") || "Leaderboard"} | Cloud Battleship`;
  }, [t]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const data = await getLeaderboard(rankFilter, 50);
      setCommanders(data);
      setLoading(false);
    };
    fetchStats();
  }, [rankFilter]);

  const filteredCommanders = commanders.filter((c) => {
    const full = c.username || "";
    const [namePart, tagPart] = full.split("#");
    const nameMatch = (namePart || full).toLowerCase().includes(searchName.toLowerCase());
    const tagMatch = searchTag ? (tagPart || "").toLowerCase().includes(searchTag.toLowerCase()) : true;
    return nameMatch && tagMatch;
  });

  const renderUsernameWithTag = (fullUsername) => {
    if (!fullUsername) return <span className="player-name-main">Unknown</span>;
    const parts = fullUsername.split("#");
    if (parts.length > 1) {
      return (
        <>
          <span className="player-name-main">{parts[0]}</span>
          <span className="player-name-tag">#{parts[1]}</span>
        </>
      );
    }
    return <span className="player-name-main">{fullUsername}</span>;
  };

  const topThree = filteredCommanders.slice(0, 3);

  return (
    <div className="leaderboard-page">
      <CommandHeader
        currentUser={currentUser}
        attributes={attributes}
        authLoading={authLoading}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onNavigateRequest={handleNavigateRequest}
      />
      <main className="container mx-auto px-4 pb-12 flex flex-col items-center w-full">
        {/* --- Page Title --- */}
        <div className="leaderboard-page-header">
          <h1 className="leaderboard-title">
            <span className="leaderboard-title-icon material-symbols-outlined">emoji_events</span>
            {t("common.leaderboard") || "Leaderboard"}
          </h1>
          <p className="leaderboard-subtitle">
            {t("home.topCommanders") || "Top commanders"}
          </p>
          <div className="leaderboard-title-divider" />
        </div>

        <div className="leaderboard-content-wrapper flex flex-col lg:flex-row w-full gap-8 mt-4">

          {/* Left Column: 100% on Mobile, 60% on Desktop */}
          <div className="leaderboard-left-col w-full lg:w-3/5 flex flex-col min-w-0">
            <div className="leaderboard-controls">
              <div className="leaderboard-dual-search">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-name-input"
                  placeholder={t("profile.commanderName") || "Commander Name"}
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
                <span className="search-hash">#</span>
                <input
                  type="text"
                  className="search-tag-input"
                  placeholder={t("profile.tagline") || "TAG"}
                  maxLength={5}
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value.toUpperCase())}
                />
              </div>
              <div className="w-full md:w-48 flex-shrink-0">
                <HomeSelect
                  value={rankFilter}
                  onChange={(val) => setRankFilter(val)}
                  options={[
                    { value: "bronze", label: t("common.bronze") || "Bronze" },
                    { value: "silver", label: t("common.silver") || "Silver" },
                    { value: "gold", label: t("common.gold") || "Gold" },
                    { value: "platinum", label: t("common.platinum") || "Platinum" },
                    { value: "diamond", label: t("common.diamond") || "Diamond" },
                    { value: "master", label: t("common.master") || "Master" },
                    { value: "admiral", label: t("common.admiral") || "Admiral" },
                  ]}
                />
              </div>
            </div>

            <div className="leaderboard-table-container">
              {loading ? (
                <div className="leaderboard-empty-state">
                  <span className="material-symbols-outlined">radar</span>
                  {t("common.loading") || "Loading..."}
                </div>
              ) : filteredCommanders.length === 0 ? (
                <div className="leaderboard-empty-state">
                  <span className="material-symbols-outlined">search_off</span>
                  {t("home.noCommandersFound") || "No commanders found."}
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th className="text-center">#</th>
                        <th className="text-center">{t("profile.commanderName") || "Commander"}</th>
                        <th>{t("home.rankTier") || "Tier"}</th>
                        <th>{t("home.winRate") || "Win Rate"}</th>
                        <th>{t("home.totalEngagements") || "Matches"}</th>
                        <th>RP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCommanders.map((commander, index) => {
                        const rankedMatches = commander.rankedMatches || 0;
                        const rankedWins = commander.rankedWins || 0;
                        const winRate = rankedMatches > 0 ? Math.round((rankedWins / rankedMatches) * 100) : 0;
                        const rowClass = index === 0 ? "table-row-rank-1" : index === 1 ? "table-row-rank-2" : index === 2 ? "table-row-rank-3" : "";

                        return (
                          <tr key={commander.userId} className={rowClass}>
                            <td className="table-rank">
                              {index === 0 ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#ffd700', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.7))' }}>military_tech</span>
                                  <span>1</span>
                                </span>
                              ) : index + 1}
                            </td>
                            <td>
                              <div className="table-player">
                                <img
                                  src={getAvatarCdnUrl(commander.avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuAS3z6urK3fvR8xGr9Kiy9fDPlYG-F9al9-KmluBpXOzu-QMVa2cJjM8WubGwh014LQ2Ht813nBgJBwedr_YjpSelFZ5zVMxrPdwCgagH5NSUoCwmTVTdH3caaVlXgU6nEZm4VkHM_HDNM93d7ohZjAEuSwzNahcKHym93fnxz9pDvj6tOPU28Az03dcaXYmzdj9tHJIhng4wDDS7eWm7a9lkL7Z_aGua4YtsBpUpuYISfyBDDDYbHiFSaDXGGxGRjpgsqk6AvWlN_x"}
                                  alt={commander.username}
                                  className="table-avatar"
                                />
                                <span className="table-username">
                                  {renderUsernameWithTag(commander.username)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="table-rank-badge">
                                <img src={getRankIcon(commander.rank)} alt={commander.rank} />
                                <span>{t(`common.${(commander.rank || "unranked").toLowerCase()}`) || commander.rank}</span>
                              </div>
                            </td>
                            <td className="table-stat">{winRate}%</td>
                            <td className="table-stat">{rankedMatches}</td>
                            <td className="table-pts">{commander.rankPoints || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: 3 Badge Floating Podium - Always visible on Desktop */}
          <div className="leaderboard-right-col hidden lg:flex w-full lg:w-2/5 flex-col items-center">
            <div className="sticky top-[120px] w-full flex flex-col items-center">
              <div className="podium-header-label">
                <span className="material-symbols-outlined">stars</span>
                {t("home.topCommanders") || "Top Commanders"}
              </div>
              <div className="badge-podium">
                
                {/* Rank 2 (Silver) */}
                <div className={`badge-podium-item badge-rank-2${!topThree[1] ? ' badge-rank-empty' : ''}`}>
                  <div className="badge-crown">
                    <span className="material-symbols-outlined">military_tech</span>
                  </div>
                  <div className="badge-avatar-container">
                    <LaurelWreath rank={2} />
                    <div className="badge-avatar-ring">
                      {topThree[1] ? (
                        <img 
                          src={getAvatarCdnUrl(topThree[1].avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"} 
                          alt={topThree[1].username} 
                          className="badge-avatar-img" 
                        />
                      ) : (
                        <div className="badge-avatar-placeholder">
                          <span className="material-symbols-outlined">lock</span>
                        </div>
                      )}
                    </div>
                    <div className="badge-rank-number">2</div>
                  </div>
                  <div className="badge-details">
                    <div className="badge-name">
                      {topThree[1] ? renderUsernameWithTag(topThree[1].username) : <span className="badge-empty-label">{t("home.emptySlot") || "Empty"}</span>}
                    </div>
                    <div className="badge-pts">{topThree[1] ? `${topThree[1].rankPoints || 0} RP` : '0 RP'}</div>
                  </div>
                </div>

                {/* Rank 1 (Gold) */}
                <div className={`badge-podium-item badge-rank-1${!topThree[0] ? ' badge-rank-empty' : ''}`}>
                  <div className="badge-crown">
                    <span className="material-symbols-outlined">military_tech</span>
                  </div>
                  <div className="badge-avatar-container">
                    <LaurelWreath rank={1} />
                    <div className="badge-avatar-ring">
                      {topThree[0] ? (
                        <img 
                          src={getAvatarCdnUrl(topThree[0].avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"} 
                          alt={topThree[0].username} 
                          className="badge-avatar-img" 
                        />
                      ) : (
                        <div className="badge-avatar-placeholder">
                          <span className="material-symbols-outlined">lock</span>
                        </div>
                      )}
                    </div>
                    <div className="badge-rank-number">1</div>
                  </div>
                  <div className="badge-details">
                    <div className="badge-name">
                      {topThree[0] ? renderUsernameWithTag(topThree[0].username) : <span className="badge-empty-label">{t("home.emptySlot") || "Empty"}</span>}
                    </div>
                    <div className="badge-pts">{topThree[0] ? `${topThree[0].rankPoints || 0} RP` : '0 RP'}</div>
                  </div>
                </div>

                {/* Rank 3 (Bronze) */}
                <div className={`badge-podium-item badge-rank-3${!topThree[2] ? ' badge-rank-empty' : ''}`}>
                  <div className="badge-crown">
                    <span className="material-symbols-outlined">military_tech</span>
                  </div>
                  <div className="badge-avatar-container">
                    <LaurelWreath rank={3} />
                    <div className="badge-avatar-ring">
                      {topThree[2] ? (
                        <img 
                          src={getAvatarCdnUrl(topThree[2].avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"} 
                          alt={topThree[2].username} 
                          className="badge-avatar-img" 
                        />
                      ) : (
                        <div className="badge-avatar-placeholder">
                          <span className="material-symbols-outlined">lock</span>
                        </div>
                      )}
                    </div>
                    <div className="badge-rank-number">3</div>
                  </div>
                  <div className="badge-details">
                    <div className="badge-name">
                      {topThree[2] ? renderUsernameWithTag(topThree[2].username) : <span className="badge-empty-label">{t("home.emptySlot") || "Empty"}</span>}
                    </div>
                    <div className="badge-pts">{topThree[2] ? `${topThree[2].rankPoints || 0} RP` : '0 RP'}</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
