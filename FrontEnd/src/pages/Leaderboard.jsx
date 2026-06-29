import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getLeaderboard } from "../services/userService";
import { getAvatarCdnUrl } from "../utils/avatar";
import CommandHeader from "../components/CommandHeader";
import HomeSelect from "../components/HomeSelect";
import bronzeBadge from "../assets/badge/bronze.webp";
import silverBadge from "../assets/badge/silver.webp";
import goldBadge from "../assets/badge/gold.webp";
import platinumBadge from "../assets/badge/platinum.webp";
import diamondBadge from "../assets/badge/diamond.webp";
import masterBadge from "../assets/badge/master.webp";
import admiralBadge from "../assets/badge/admiral.webp";
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

const Leaderboard = () => {
  const { t } = useLanguage();
  const { user: currentUser, attributes, loading: authLoading, logout } = useAuth();
  const [rankFilter, setRankFilter] = useState("admiral");
  const [searchName, setSearchName] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [commanders, setCommanders] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Helper for navigation
  const handleNavigateRequest = (targetPath) => {
    navigate(targetPath);
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
        onLogout={logout}
        onNavigateRequest={handleNavigateRequest}
      />
      <main className="container mx-auto px-4 pb-12 flex flex-col items-center w-full">
        {/* --- Page Title --- */}
        <div className="w-full flex flex-col items-start mb-2 border-b border-white/10 pb-4">
          <h1 className="font-headline-lg text-3xl md:text-4xl text-on-surface uppercase tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-4xl">emoji_events</span>
            {t("common.leaderboard") || "GLOBAL LEADERBOARD"}
          </h1>
          <p className="text-on-surface-variant text-sm md:text-base mt-1 font-body-md uppercase tracking-wider">
            {t("home.topCommanders") || "Top Commanders in the Fleet"}
          </p>
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
                <div className="p-8 text-center text-on-surface-variant">{t("common.loading") || "Loading..."}</div>
              ) : filteredCommanders.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant">No commanders found.</div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="leaderboard-table min-w-[600px]">
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
                          <td className="table-rank">{index + 1}</td>
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

          {/* Right Column: 40% (Podium Sticky) - Hidden on Mobile */}
          <div className="leaderboard-right-col hidden lg:flex w-full lg:w-2/5 flex-col items-center">
            <div className="sticky top-[100px] w-full flex justify-center">
              {topThree.length > 0 && (
                <div className="podium-container">
                  {/* Top 2 */}
                  {topThree[1] && (
                    <div className="podium-item podium-2">
                      <div className="podium-avatar-wrapper">
                        <img src={getAvatarCdnUrl(topThree[1].avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"} alt={topThree[1].username} className="podium-avatar" />
                        <div className="podium-rank-badge">2</div>
                      </div>
                      <div className="podium-step">
                        <div className="podium-name" title={topThree[1].username}>
                          {renderUsernameWithTag(topThree[1].username)}
                        </div>
                        <div className="podium-pts">{topThree[1].rankPoints || 0} RP</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Top 1 */}
                  <div className="podium-item podium-1">
                    <div className="podium-avatar-wrapper">
                      <img src={getAvatarCdnUrl(topThree[0].avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"} alt={topThree[0].username} className="podium-avatar" />
                      <div className="podium-rank-badge">1</div>
                    </div>
                    <div className="podium-step">
                      <div className="podium-name" title={topThree[0].username}>
                        {renderUsernameWithTag(topThree[0].username)}
                      </div>
                      <div className="podium-pts">{topThree[0].rankPoints || 0} RP</div>
                    </div>
                  </div>

                  {/* Top 3 */}
                  {topThree[2] && (
                    <div className="podium-item podium-3">
                      <div className="podium-avatar-wrapper">
                        <img src={getAvatarCdnUrl(topThree[2].avatarUrl) || "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe"} alt={topThree[2].username} className="podium-avatar" />
                        <div className="podium-rank-badge">3</div>
                      </div>
                      <div className="podium-step">
                        <div className="podium-name" title={topThree[2].username}>
                          {renderUsernameWithTag(topThree[2].username)}
                        </div>
                        <div className="podium-pts">{topThree[2].rankPoints || 0} RP</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
