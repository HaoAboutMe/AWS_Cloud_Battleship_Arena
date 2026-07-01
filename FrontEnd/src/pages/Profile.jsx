import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AvatarUpload from "../components/AvatarUpload";
import CommandHeader from "../components/CommandHeader";
import RankProgressionModal from "../components/RankProgressionModal";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { RANKS, getNextRank, getRankMeta } from "../game/rankConfig";
import { getMatchHistory, getUserProfile, updateUsername } from "../services/userService";
import { getAvatarCdnUrl } from "../utils/avatar";
import "./HomeHeader.css";
import "./Profile.css";
import HomeSelect from "../components/HomeSelect";

const RankUpAnimation = lazy(() => import("../components/RankUpAnimation"));

const COMMANDER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe";

const EMPTY_STATS = {
  totalGames: 0,
  wins: 0,
  losses: 0,
};

function Profile() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user: currentUser, attributes, loading, logout, checkAuth, customAvatarUrl, updateAvatar, sessionTimestamp } = useAuth();
  const [isLightMode, setIsLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active"),
  );
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [rankLadderOpen, setRankLadderOpen] = useState(false);
  const [rankAnimation, setRankAnimation] = useState(null);
  const [selectedRankId, setSelectedRankId] = useState("unranked");
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [recordMode, setRecordMode] = useState("all");

  useEffect(() => {
    const fetchStats = async () => {
      const userEmail = attributes.email || currentUser?.signInDetails?.loginId;
      if (userEmail) {
        const userProfile = await getUserProfile(userEmail);
        if (userProfile) {
          setStats({
            totalGames: userProfile.totalGames || 0,
            wins: userProfile.wins || 0,
            losses: userProfile.losses || 0,
            rankedMatches: userProfile.rankedMatches || 0,
            rankedWins: userProfile.rankedWins || 0,
            rankedLosses: userProfile.rankedLosses || 0,
          });
        }
      }
    };
    if (currentUser) {
      fetchStats();
    }
  }, [attributes.email, currentUser]);

  useEffect(() => {
    const fetchHistory = async () => {
      const userEmail = attributes.email || currentUser?.signInDetails?.loginId;
      if (userEmail) {
        setLoadingHistory(true);
        try {
          const history = await getMatchHistory(userEmail);
          setMatchHistory(history || []);
        } catch (e) {
          console.error("Failed to fetch match history:", e);
        } finally {
          setLoadingHistory(false);
        }
      }
    };

    if (currentUser && activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, attributes.email, currentUser]);

  // States for Username Edit
  const [newUsername, setNewUsername] = useState("");
  const [newTag, setNewTag] = useState("VIE");
  const [isChecking, setIsChecking] = useState(false);
  const [isTaken, setIsTaken] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  useEffect(() => {
    if (attributes.preferred_username && !newUsername) {
      const parts = attributes.preferred_username.split("#");
      if (parts.length === 2) {
        setNewUsername(parts[0]);
        setNewTag(parts[1]);
      } else {
        setNewUsername(attributes.preferred_username);
      }
    }
  }, [attributes.preferred_username]);

  const nextChangeDate = attributes.lastUsernameChange 
    ? new Date(new Date(attributes.lastUsernameChange).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const formattedNextChangeDate = nextChangeDate 
    ? `${(nextChangeDate.getMonth() + 1).toString().padStart(2, '0')}/${nextChangeDate.getDate().toString().padStart(2, '0')}/${nextChangeDate.getFullYear()}`
    : "";

  useEffect(() => {
    if (attributes.lastUsernameChange) {
      const daysSinceChange = (Date.now() - new Date(attributes.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceChange < 30) {
        setCooldownMessage(t("profile.cooldownMessageJs", { days: Math.ceil(30 - daysSinceChange) }));
      } else {
        setCooldownMessage("");
      }
    }
  }, [attributes.lastUsernameChange]);

  const fullUsername = `${newUsername}#${newTag}`;

  useEffect(() => {
    if (newUsername.length < 3 || attributes.preferred_username === fullUsername) {
      setIsChecking(false);
      setIsTaken(false);
      return;
    }

    setIsChecking(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/check-username?username=${encodeURIComponent(fullUsername)}`);
        if (response.ok) {
          const data = await response.json();
          setIsTaken(data.isTaken);
        }
      } catch (err) {
        console.error("Failed to check username:", err);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newUsername, newTag, fullUsername, attributes.preferred_username]);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (isTaken || isChecking || cooldownMessage || newUsername.length < 3 || newTag.length === 0) return;

    setUpdateError("");
    setUpdateSuccess("");
    try {
      const currentEmail = attributes.email || currentUser?.signInDetails?.loginId;
      await updateUsername(currentEmail, newUsername, newTag);
      setUpdateSuccess(t("profile.updateSuccess"));
      await checkAuth(); // Refresh UI
    } catch (err) {
      setUpdateError(err.message || t("profile.updateError"));
    }
  };

  const toggleTheme = (event) => {
    const nextLightMode = !isLightMode;

    if (!document.startViewTransition) {
      document.documentElement.classList.toggle(
        "light-mode-active",
        nextLightMode,
      );
      setIsLightMode(nextLightMode);
      return;
    }

    const x = event?.clientX || window.innerWidth / 2;
    const y = event?.clientY || 32;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle(
        "light-mode-active",
        nextLightMode,
      );
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
        },
      );
    });
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem("battleshipSession");
    navigate("/", { replace: true, state: { authEvent: "signed-out" } });
  };

  const email =
    attributes.email ||
    currentUser?.signInDetails?.loginId ||
    t("profile.emailUnavailable");
  const callsign =
    attributes.preferred_username ||
    attributes.name ||
    attributes.given_name ||
    attributes.nickname ||
    (attributes.email ? attributes.email.split("@")[0] : null) ||
    t("profile.commander");
  const avatarUrl = getAvatarCdnUrl(
    customAvatarUrl || (typeof attributes.picture === "string"
      ? `${attributes.picture}?t=${sessionTimestamp}`
      : COMMANDER_AVATAR)
  );
  const winRate =
    recordMode === "ranked"
      ? stats.rankedMatches > 0
        ? Math.round((stats.rankedWins / stats.rankedMatches) * 100)
        : 0
      : stats.totalGames > 0
        ? Math.round((stats.wins / stats.totalGames) * 100)
        : 0;
  const rankedMatches = Number(attributes.rankedMatches || 0);
  const rankPoints = Number(attributes.rankPoints || 0);
  const hasRank = rankedMatches > 0 && rankPoints >= RANKS[0].minRp;
  const rankMeta = getRankMeta(hasRank ? attributes.rank || "bronze" : "bronze");
  const getRankDisplayName = (rank) => {
    if (!rank) return t("profile.unranked");
    return language === "vi" ? rank.viLabel || rank.label : rank.label;
  };
  const nextRank = getNextRank(rankMeta.id);
  const rpToNextRank = nextRank ? Math.max(0, nextRank.minRp - rankPoints) : 0;
  const rankLabel = hasRank ? `${getRankDisplayName(rankMeta)} - ${rankPoints} RP` : t("profile.unranked");
  const selectedIsUnranked = selectedRankId === "unranked";
  const selectedRank = selectedIsUnranked ? null : getRankMeta(selectedRankId);
  const selectedTitle = selectedIsUnranked ? t("profile.unranked") : getRankDisplayName(selectedRank);
  const currentRankIndex = hasRank ? RANKS.findIndex((rank) => rank.id === rankMeta.id) : -1;
  const selectedNextRank = selectedRank ? getNextRank(selectedRank.id) : RANKS[0];
  const selectedRankUnlocked = !!selectedRank && hasRank && rankPoints >= selectedRank.minRp;
  const selectedRankCurrent = !!selectedRank && hasRank && selectedRank.id === rankMeta.id;
  const selectedProgressStart = selectedRank?.minRp || 0;
  const selectedProgressEnd = selectedNextRank?.minRp || selectedRank?.minRp || RANKS[0].minRp;
  const selectedProgressRange = Math.max(1, selectedProgressEnd - selectedProgressStart);
  const selectedProgressPercent = selectedIsUnranked
    ? Math.min(100, Math.max(0, (rankPoints / RANKS[0].minRp) * 100))
    : selectedRankCurrent
    ? Math.min(100, Math.max(0, ((rankPoints - selectedProgressStart) / selectedProgressRange) * 100))
    : selectedRankUnlocked
      ? 100
      : Math.min(100, Math.max(0, (rankPoints / selectedRank.minRp) * 100));
  const selectedProgressLabel = selectedIsUnranked
    ? `${Math.max(rankPoints, 0)} / ${RANKS[0].minRp} RP`
    : selectedRankCurrent && selectedNextRank
    ? `${Math.max(rankPoints, 0)} / ${selectedNextRank.minRp} RP`
    : selectedRankUnlocked
      ? t("profile.rpSecured", { points: selectedRank.minRp })
      : `${Math.max(rankPoints, 0)} / ${selectedRank.minRp} RP`;
  const rankRewards = {
    bronze: [t("profile.rewardBronze1"), t("profile.rewardBronze2"), t("profile.rewardBronze3")],
    silver: [t("profile.rewardSilver1"), t("profile.rewardSilver2"), t("profile.rewardSilver3")],
    gold: [t("profile.rewardGold1"), t("profile.rewardGold2"), t("profile.rewardGold3")],
    platinum: [t("profile.rewardPlatinum1"), t("profile.rewardPlatinum2"), t("profile.rewardPlatinum3")],
    diamond: [t("profile.rewardDiamond1"), t("profile.rewardDiamond2"), t("profile.rewardDiamond3")],
    master: [t("profile.rewardMaster1"), t("profile.rewardMaster2"), t("profile.rewardMaster3")],
    admiral: [t("profile.rewardAdmiral1"), t("profile.rewardAdmiral2"), t("profile.rewardAdmiral3")],
  };
  const unrankedRewards = [t("profile.rankRewardUnlockBronze"), t("profile.rankRewardEarnRp"), t("profile.rankRewardBeginLadder")];
  const testRankUp = () => {
    const currentRank = hasRank ? rankMeta.id : "bronze";
    const targetRank = getNextRank(currentRank)?.id || RANKS[0].id;
    setRankAnimation({ oldRank: currentRank, newRank: targetRank });
  };

  return (
    <div className="profile-page">
      <CommandHeader
        currentUser={currentUser}
        attributes={attributes}
        authLoading={loading}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <main className="profile-main">
        {loading ? (
          <div className="profile-loading" aria-label={t("profile.loading")}>
            <i />
            <i />
            <i />
          </div>
        ) : !currentUser ? (
          <section className="profile-empty">
            <div className="profile-empty-icon">
              <span className="material-symbols-outlined">shield_lock</span>
            </div>
            <span className="profile-empty-kicker">{t("profile.dossier")}</span>
            <h1>{t("profile.secureAccess")}</h1>
            <p>{t("profile.secureBody")}</p>
            <Link to="/login">
              {t("common.signIn")}
              <span className="material-symbols-outlined">login</span>
            </Link>
          </section>
        ) : (
          <>
            <section className="profile-identity">
              <div className="profile-avatar-frame">
                <img
                  src={avatarUrl}
                  alt={t("profile.avatarAlt")}
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.src = COMMANDER_AVATAR;
                  }}
                />
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  onAvatarUpdate={updateAvatar}
                  showToast={(title, message, type = "success") => {
                    setToast({ title, message, type });
                  }}
                />
              </div>
              <div className="profile-identity-copy">
                <span className="profile-eyebrow">{t("profile.dossier")}</span>
                <h1>{callsign}</h1>
                <p>{email}</p>
                <div className="profile-badges">
                  <button
                    type="button"
                    className={`profile-rank-pill ${hasRank ? "" : "is-unranked"}`}
                    onClick={() => {
                      setSelectedRankId(hasRank ? rankMeta.id : "unranked");
                      setRankLadderOpen(true);
                    }}
                  >
                    {hasRank ? (
                      <img src={rankMeta.badge} alt="" />
                    ) : (
                      <i className="profile-empty-rank-badge" />
                    )}
                    {rankLabel}
                  </button>
                  <button type="button" className="profile-rank-test" onClick={testRankUp}>
                    Test rank up
                  </button>
                  <span>{t("profile.cloudFleet")}</span>
                </div>
              </div>
              <Link to="/lobby" className="profile-deploy-button">
                {t("profile.deploy")}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </section>

            {/* Tab Navigation */}
            <div className="profile-tabs-nav">
              <button 
                type="button" 
                className={`profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <span className="material-symbols-outlined">monitoring</span>
                <span className="profile-tab-text-full">{t("profile.serviceRecord")}</span>
                <span className="profile-tab-text-short">{t("profile.serviceRecordShort")}</span>
              </button>
              <button 
                type="button" 
                className={`profile-tab-btn ${activeTab === 'id' ? 'active' : ''}`}
                onClick={() => setActiveTab('id')}
              >
                <span className="material-symbols-outlined">shield</span>
                <span className="profile-tab-text-full">{t("profile.battleshipIdTitle")}</span>
                <span className="profile-tab-text-short">{t("profile.battleshipIdTitleShort")}</span>
              </button>
              <button 
                type="button" 
                className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="material-symbols-outlined">history</span>
                <span className="profile-tab-text-full">{t("profile.matchHistory")}</span>
                <span className="profile-tab-text-short">{t("profile.matchHistoryShort")}</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <section className="profile-content">
                <div className="profile-record">
                  <div className="profile-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className="material-symbols-outlined">monitoring</span>
                      <div>
                        <h2>{t("profile.serviceRecord")}</h2>
                        <p>{t("profile.serviceBody")}</p>
                      </div>
                    </div>
                    <div className="w-44 flex-shrink-0">
                      <HomeSelect
                        value={recordMode}
                        onChange={(val) => setRecordMode(val)}
                        options={[
                          { value: "all", label: language === 'vi' ? 'Tất cả' : 'All Modes' },
                          { value: "ranked", label: language === 'vi' ? 'Xếp hạng' : 'Ranked' }
                        ]}
                      />
                    </div>
                  </div>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: hasRank ? '12px' : '0' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                        {t("profile.rank") || "Rank Tier"}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {hasRank && (
                          <img 
                            src={rankMeta.badge} 
                            alt={getRankDisplayName(rankMeta)} 
                            style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6))' }} 
                          />
                        )}
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)', textTransform: 'uppercase' }}>
                          {hasRank ? getRankDisplayName(rankMeta) : t("profile.unranked")}
                        </span>
                      </div>
                    </div>
                    {hasRank && nextRank && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                          <span>{rankPoints} RP</span>
                          <span>{nextRank.minRp} RP</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, #FFD700, #FFA500)', width: `${Math.min(100, Math.max(0, ((rankPoints - rankMeta.minRp) / (nextRank.minRp - rankMeta.minRp)) * 100))}%`, boxShadow: '0 0 8px rgba(255,215,0,0.8)', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    )}
                    {hasRank && !nextRank && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#FFD700', fontWeight: 'bold' }}>
                        <span>{rankPoints} RP (MAX)</span>
                      </div>
                    )}
                  </div>
                  <div className="profile-stat-grid" style={{ marginTop: '0' }}>
                    <article>
                      <span>{t("profile.totalBattles")}</span>
                      <strong>{recordMode === "ranked" ? stats.rankedMatches : stats.totalGames}</strong>
                    </article>
                    <article>
                      <span>{t("profile.victories")}</span>
                      <strong>{recordMode === "ranked" ? stats.rankedWins : stats.wins}</strong>
                    </article>
                    <article>
                      <span>{t("home.defeats")}</span>
                      <strong>{recordMode === "ranked" ? stats.rankedLosses : stats.losses}</strong>
                    </article>
                    <article>
                      <span>{t("profile.winRate")}</span>
                      <strong>{winRate}%</strong>
                    </article>
                  </div>
                </div>

                <aside className="profile-security">
                  <div className="profile-section-heading">
                    <span className="material-symbols-outlined">verified_user</span>
                    <div>
                      <h2>{t("profile.identity")}</h2>
                      <p>{t("profile.identityBody")}</p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd title={email}>{email}</dd>
                    </div>
                    <div>
                      <dt>{t("profile.verification")}</dt>
                      <dd className="is-online">{t("profile.verified")}</dd>
                    </div>
                    <div>
                      <dt>{t("profile.rank")}</dt>
                      <dd>
                        {rankLabel}
                        {hasRank && nextRank ? ` - ${t("profile.rpToRank", { points: rpToNextRank, rank: getRankDisplayName(nextRank) })}` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("profile.accountId")}</dt>
                      <dd title={currentUser.userId}>{currentUser.userId}</dd>
                    </div>
                  </dl>
                  <Link to="/forgot-password" className="profile-security-link">
                    <span className="material-symbols-outlined">key</span>
                    {t("profile.resetPassword")}
                  </Link>
                </aside>
              </section>
            )}

            {activeTab === 'id' && (
              <section className="profile-riot-id-section">
                {/* Cột Trái */}
                <div className="profile-riot-id-col-left">
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>{t("profile.battleshipIdTitle")}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                      {t("profile.battleshipIdBody")}
                    </p>
                  </div>
                  {cooldownMessage && (
                    <div style={{
                      display: 'flex', gap: '12px', background: 'rgba(255, 77, 77, 0.05)', border: '1px solid rgba(255, 77, 77, 0.3)', padding: '16px', borderRadius: '4px', color: '#ff4d4d', alignItems: 'flex-start'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
                      <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0, fontWeight: '600', letterSpacing: '0.5px' }}>
                        {t("profile.cooldownMessage", { date: formattedNextChangeDate })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Cột Phải */}
                <div className="profile-riot-id-col-right">
                  <form onSubmit={handleUpdateUsername} className="profile-riot-id-form">
                    <div className="profile-riot-id-inputs-row">
                      <div className="profile-riot-id-input-group">
                        <label className="profile-riot-id-label">{t("profile.commanderName")}</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => {
                            setNewUsername(e.target.value);
                            setUpdateError("");
                            setUpdateSuccess("");
                          }}
                          disabled={!!cooldownMessage}
                          className="profile-riot-id-input"
                          style={{
                            opacity: cooldownMessage ? 0.5 : 1,
                            cursor: cooldownMessage ? 'not-allowed' : 'text'
                          }}
                        />
                      </div>
                      <div className="profile-riot-id-input-group tag-group">
                        <label className="profile-riot-id-label">{t("profile.tagline")}</label>
                        <div className="profile-riot-id-tag-container" style={{ opacity: cooldownMessage ? 0.5 : 1 }}>
                          <span className="profile-riot-id-tag-prefix">#</span>
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              setNewTag(value);
                              setUpdateError("");
                              setUpdateSuccess("");
                            }}
                            maxLength={5}
                            disabled={!!cooldownMessage}
                            className="profile-riot-id-tag-input"
                            style={{ cursor: cooldownMessage ? 'not-allowed' : 'text' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="profile-riot-id-footer">
                      <div style={{ fontSize: '13px', color: isChecking ? '#888' : isTaken ? '#ff4d4d' : (newUsername.length < 3 || newTag.length === 0) ? '#ff4d4d' : '#4caf50' }}>
                        {newUsername.length > 0 && newUsername !== (attributes.preferred_username?.split("#")[0] || "") && (
                          isChecking ? t("profile.checking") : newUsername.length < 3 ? t("profile.nameTooShort") : newTag.length === 0 ? t("profile.tagEmpty") : isTaken ? t("profile.nameTaken") : t("profile.nameValid")
                        )}
                        {updateError && <div style={{ color: '#ff4d4d', marginTop: '4px' }}>{updateError}</div>}
                        {updateSuccess && <div style={{ color: '#4caf50', marginTop: '4px' }}>{updateSuccess}</div>}
                      </div>

                      <button 
                        type="submit" 
                        disabled={isTaken || isChecking || newUsername.length < 3 || newTag.length === 0 || !!cooldownMessage || (attributes.preferred_username === fullUsername)}
                        className="profile-riot-id-submit-btn"
                      >
                        {t("profile.saveChanges")}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            {activeTab === 'history' && (
              <section className="profile-history-section">
                <div className="profile-section-heading" style={{ marginBottom: '24px' }}>
                  <span className="material-symbols-outlined">history</span>
                  <div>
                    <h2>{t("profile.matchHistory")}</h2>
                    <p>{t("profile.matchHistoryBody")}</p>
                  </div>
                </div>
                
                {loadingHistory ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="profile-match-card skeleton-card" style={{ opacity: 0.7, pointerEvents: 'none' }}>
                        <div className="profile-match-header" style={{ opacity: 0.5 }}>
                          <div style={{ flex: 1, display: 'flex' }}><div className="skeleton-pulse" style={{ width: '60px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} /></div>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}><div className="skeleton-pulse" style={{ width: '80px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} /></div>
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <div className="skeleton-pulse" style={{ width: '70px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                            <div className="skeleton-pulse" style={{ width: '100px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                          </div>
                        </div>
                        <div className="profile-match-players">
                          <div className="profile-match-player is-p1" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <div className="skeleton-pulse" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div className="skeleton-pulse" style={{ width: '90px', height: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <div className="skeleton-pulse" style={{ width: '65px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <div className="skeleton-pulse" style={{ width: '65px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <div className="skeleton-pulse" style={{ width: '65px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                              </div>
                            </div>
                          </div>
                          <div className="profile-match-vs" style={{ width: '30px', display: 'flex', justifyContent: 'center' }}>
                            <div className="skeleton-pulse" style={{ width: '20px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', opacity: 0.3 }} />
                          </div>
                          <div className="profile-match-player is-p2" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                              <div className="skeleton-pulse" style={{ width: '90px', height: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <div className="skeleton-pulse" style={{ width: '65px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <div className="skeleton-pulse" style={{ width: '65px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <div className="skeleton-pulse" style={{ width: '65px', height: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                              </div>
                            </div>
                            <div className="skeleton-pulse" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matchHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    No match history found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {matchHistory.map((match) => {
                      const isWin = match.winnerId === match.userId;
                      const dateObj = new Date(match.endedAt);
                      const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : match.endedAt;
                      
                      const isP1You = match.player1Id === match.userId || (currentUser?.userId && match.player1Id === currentUser.userId);
                      const isP2You = match.player2Id === match.userId || (currentUser?.userId && match.player2Id === currentUser.userId);

                      const p1Acc = match.player1Shots > 0 ? Math.round(((match.player1Shots - (match.player1Misses || 0)) / match.player1Shots) * 100) : 0;
                      const p2Acc = match.player2Shots > 0 ? Math.round(((match.player2Shots - (match.player2Misses || 0)) / match.player2Shots) * 100) : 0;

                      return (
                        <div key={match.matchId} className={`profile-match-card ${isWin ? 'is-win' : 'is-loss'}`}>
                          {/* Title Bar */}
                          <div className="profile-match-header">
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                              <strong style={{
                                color: isWin ? '#4caf50' : '#f44336',
                                fontSize: '14px',
                                letterSpacing: '1px',
                                textTransform: 'uppercase'
                              }}>
                                {isWin ? t("profile.win") : t("profile.loss")}
                              </strong>
                            </div>
                            
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                              {match.mode && (
                                <span style={{ 
                                  fontSize: '10px', 
                                  padding: '2px 8px', 
                                  background: match.mode === 'rank' || match.mode === 'ranked' ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255,255,255,0.1)', 
                                  color: match.mode === 'rank' || match.mode === 'ranked' ? '#ffc107' : 'var(--text-muted)',
                                  borderRadius: '4px',
                                  letterSpacing: '1px',
                                  fontWeight: 'bold'
                                }}>
                                  {match.mode === 'rank' || match.mode === 'ranked' ? t("profile.rankedMode") : t("profile.normalMode")}
                                </span>
                              )}
                            </div>

                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                              <span className="profile-match-room-badge">
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>vpn_key</span>
                                {t("profile.room")}: {match.roomCode || "***"}
                              </span>
                              <span className="profile-match-time">
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                          
                          {/* Players Info */}
                          <div className="profile-match-players">
                            {/* Player 1 */}
                            <div className="profile-match-player is-p1" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              <img 
                                src={match.player1Avatar ? `${getAvatarCdnUrl(match.player1Avatar)}?t=${Date.now()}` : COMMANDER_AVATAR} 
                                alt="Player 1"
                                className="profile-match-player-avatar"
                                style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid var(--border)', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.src = COMMANDER_AVATAR; }}
                              />
                              <div className="profile-match-player-info" style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="profile-match-player-name" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)' }}>
                                  <span className="profile-name-text">{match.player1Name || "Unknown"}</span>
                                  {isP1You && (
                                    <span className="profile-you-badge is-right">
                                      {t("profile.you")}
                                    </span>
                                  )}
                                  {match.leaverId === match.player1Id && <span className="profile-surrender-text" style={{ color: '#f44336', fontSize: '11px', marginLeft: '6px', fontStyle: 'italic', display: 'inline-block' }}>{t("profile.surrendered")}</span>}
                                </span>
                                <div className="profile-match-stats-row">
                                  <span className="profile-match-stat-pill shots">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>gps_fixed</span>
                                    <span>{t("profile.shots")}: <strong className="val">{match.player1Shots || 0}</strong></span>
                                  </span>
                                  <span className="profile-match-stat-pill misses">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                                    <span>{t("profile.misses")}: <strong className="val">{match.player1Misses || 0}</strong></span>
                                  </span>
                                  <span className="profile-match-stat-pill accuracy">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>percent</span>
                                    <span>{t("profile.accuracy")}: <strong className="val">{p1Acc}%</strong></span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* VS */}
                            <div className="profile-match-vs" style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontStyle: 'italic', fontSize: '14px', textAlign: 'center' }}>
                              VS
                            </div>
                            
                            {/* Player 2 */}
                            <div className="profile-match-player is-p2" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
                              <div className="profile-match-player-info" style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="profile-match-player-name" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)' }}>
                                  {match.leaverId === match.player2Id && <span className="profile-surrender-text" style={{ color: '#f44336', fontSize: '11px', marginRight: '6px', fontStyle: 'italic', display: 'inline-block' }}>{t("profile.surrendered")}</span>}
                                  {isP2You && (
                                    <span className="profile-you-badge is-left">
                                      {t("profile.you")}
                                    </span>
                                  )}
                                  <span className="profile-name-text">{match.player2Name || "Unknown"}</span>
                                </span>
                                <div className="profile-match-stats-row is-right">
                                  <span className="profile-match-stat-pill accuracy">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>percent</span>
                                    <span>{t("profile.accuracy")}: <strong className="val">{p2Acc}%</strong></span>
                                  </span>
                                  <span className="profile-match-stat-pill misses">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                                    <span>{t("profile.misses")}: <strong className="val">{match.player2Misses || 0}</strong></span>
                                  </span>
                                  <span className="profile-match-stat-pill shots">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>gps_fixed</span>
                                    <span>{t("profile.shots")}: <strong className="val">{match.player2Shots || 0}</strong></span>
                                  </span>
                                </div>
                              </div>
                              <img 
                                src={match.player2Avatar ? `${getAvatarCdnUrl(match.player2Avatar)}?t=${Date.now()}` : COMMANDER_AVATAR} 
                                alt="Player 2"
                                className="profile-match-player-avatar"
                                style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid var(--border)', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.src = COMMANDER_AVATAR; }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <RankProgressionModal
        isOpen={rankLadderOpen}
        onClose={() => setRankLadderOpen(false)}
        selectedRankId={selectedRankId}
        selectedTitle={selectedTitle}
        selectedRank={selectedRank}
        selectedProgressLabel={selectedProgressLabel}
        selectedProgressPercent={selectedProgressPercent}
        rankRewards={rankRewards}
        unrankedRewards={unrankedRewards}
        hasRank={hasRank}
        rankPoints={rankPoints}
        rankMeta={rankMeta}
        currentRankIndex={currentRankIndex}
        getRankDisplayName={getRankDisplayName}
        setSelectedRankId={setSelectedRankId}
        t={t}
      />

      {rankAnimation && (
        <Suspense fallback={null}>
          <RankUpAnimation
            oldRank={rankAnimation.oldRank}
            newRank={rankAnimation.newRank}
            onComplete={() => setRankAnimation(null)}
          />
        </Suspense>
      )}

      {toast && (
        <div
          className={`command-toast ${toast.type === "error" ? "is-error" : ""}`}
          role="alert"
        >
          <span className="command-toast-icon" aria-hidden="true">
            <i />
          </span>
          <div>
            <strong>{toast.title}</strong>
            <small>{toast.message}</small>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label={t("common.dismiss")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Profile;
