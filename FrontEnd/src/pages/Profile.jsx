import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AvatarUpload from "../components/AvatarUpload";
import CommandHeader from "../components/CommandHeader";
import RankProgressionModal from "../components/RankProgressionModal";
import RankUpAnimation from "../components/RankUpAnimation";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { RANKS, getNextRank, getRankMeta } from "../game/rankConfig";
import { getMatchHistory, getUserProfile, updateUsername } from "../services/userService";
import "./HomeHeader.css";
import "./Profile.css";

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
  const { user: currentUser, attributes, loading, logout, checkAuth, customAvatarUrl, updateAvatar } = useAuth();
  const [isLightMode, setIsLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active"),
  );
  const [stats, setStats] = useState(EMPTY_STATS);
  const [rankLadderOpen, setRankLadderOpen] = useState(false);
  const [rankAnimation, setRankAnimation] = useState(null);
  const [selectedRankId, setSelectedRankId] = useState("unranked");
  const [matchHistory, setMatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
          });
        }
        const history = await getMatchHistory(userEmail);
        setMatchHistory(history);
        setLoadingHistory(false);
      }
    };
    if (currentUser) {
      fetchStats();
    }
  }, [attributes.email, currentUser]);

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
  const avatarUrl = customAvatarUrl || (typeof attributes.picture === "string"
      ? attributes.picture
      : COMMANDER_AVATAR);
  const winRate =
    stats.totalGames > 0
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
                <AvatarUpload currentAvatarUrl={avatarUrl} onAvatarUpdate={updateAvatar} />
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

            <section className="profile-riot-id-section" style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '32px',
              padding: '32px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {/* Cột Trái */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column' }}>
                <form onSubmit={handleUpdateUsername} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', marginBottom: '12px' }}>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)' }}>{t("profile.commanderName")}</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => {
                          setNewUsername(e.target.value);
                          setUpdateError("");
                          setUpdateSuccess("");
                        }}
                        disabled={!!cooldownMessage}
                        style={{ padding: '12px 16px', borderRadius: '6px', border: '2px solid rgba(255, 255, 255, 0.15)', background: 'rgba(0, 0, 0, 0.2)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', color: 'var(--text-main)', fontSize: '16px', outline: 'none', opacity: cooldownMessage ? 0.5 : 1, cursor: cooldownMessage ? 'not-allowed' : 'text', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      />
                    </div>
                    <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)' }}>{t("profile.tagline")}</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.2)', border: '2px solid rgba(255, 255, 255, 0.15)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', borderRadius: '6px', opacity: cooldownMessage ? 0.5 : 1, transition: 'border-color 0.2s' }}>
                        <span style={{ paddingLeft: '16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '16px' }}>#</span>
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
                          style={{ width: '100%', padding: '12px 16px 12px 8px', border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '16px', outline: 'none', cursor: cooldownMessage ? 'not-allowed' : 'text', boxSizing: 'border-box', boxShadow: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexGrow: 1 }}>
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
                      style={{
                        padding: '12px 24px', 
                        background: (isTaken || isChecking || newUsername.length < 3 || newTag.length === 0 || !!cooldownMessage || (attributes.preferred_username === fullUsername)) ? 'var(--surface-sunken)' : '#d32f2f', 
                        color: (isTaken || isChecking || newUsername.length < 3 || newTag.length === 0 || !!cooldownMessage || (attributes.preferred_username === fullUsername)) ? '#666' : 'white', 
                        borderRadius: '4px', 
                        fontWeight: 'bold', 
                        fontSize: '13px',
                        letterSpacing: '1px',
                        border: 'none',
                        cursor: (isTaken || isChecking || newUsername.length < 3 || newTag.length === 0 || !!cooldownMessage || (attributes.preferred_username === fullUsername)) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        alignSelf: 'flex-end',
                        marginTop: 'auto'
                      }}
                    >
                      {t("profile.saveChanges")}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section className="profile-content">
              <div className="profile-record">
                <div className="profile-section-heading">
                  <span className="material-symbols-outlined">monitoring</span>
                  <div>
                    <h2>{t("profile.serviceRecord")}</h2>
                    <p>{t("profile.serviceBody")}</p>
                  </div>
                </div>
                <div className="profile-stat-grid">
                  <article>
                    <span>{t("profile.totalBattles")}</span>
                    <strong>{stats.totalGames}</strong>
                  </article>
                  <article>
                    <span>{t("profile.victories")}</span>
                    <strong>{stats.wins}</strong>
                  </article>
                  <article>
                    <span>{t("home.defeats")}</span>
                    <strong>{stats.losses}</strong>
                  </article>
                  <article>
                    <span>{t("profile.winRate")}</span>
                    <strong>{winRate}%</strong>
                  </article>
                </div>
              </div>

              <aside className="profile-security">
                <div className="profile-section-heading">
                  <span className="material-symbols-outlined">
                    verified_user
                  </span>
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

            <section className="profile-history-section" style={{
              marginTop: '32px',
              padding: '32px',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div className="profile-section-heading" style={{ marginBottom: '24px' }}>
                <span className="material-symbols-outlined">history</span>
                <div>
                  <h2>{t("profile.matchHistory")}</h2>
                  <p>{t("profile.matchHistoryBody")}</p>
                </div>
              </div>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
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
                      <div key={match.matchId} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        background: isWin ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                        border: `1px solid ${isWin ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        {/* Title Bar */}
                        <div style={{
                          padding: '8px 16px',
                          background: isWin ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: `1px solid ${isWin ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}`
                        }}>
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
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px'
                        }}>
                          {/* Player 1 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <img 
                              src={match.player1Avatar ? `${match.player1Avatar}?t=${Date.now()}` : COMMANDER_AVATAR} 
                              alt="Player 1"
                              style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid var(--border)', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.src = COMMANDER_AVATAR; }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)' }}>
                                {match.player1Name || "Unknown"}
                                {isP1You && (
                                  <span className="profile-you-badge is-right">
                                    {t("profile.you")}
                                  </span>
                                )}
                                {match.leaverId === match.player1Id && <span style={{ color: '#f44336', fontSize: '11px', marginLeft: '6px', fontStyle: 'italic', display: 'inline-block' }}>{t("profile.surrendered")}</span>}
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
                          <div style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: 'bold', fontStyle: 'italic', fontSize: '14px' }}>
                            VS
                          </div>
                          
                          {/* Player 2 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)' }}>
                                {match.leaverId === match.player2Id && <span style={{ color: '#f44336', fontSize: '11px', marginRight: '6px', fontStyle: 'italic', display: 'inline-block' }}>{t("profile.surrendered")}</span>}
                                {isP2You && (
                                  <span className="profile-you-badge is-left">
                                    {t("profile.you")}
                                  </span>
                                )}
                                {match.player2Name || "Unknown"}
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
                              src={match.player2Avatar ? `${match.player2Avatar}?t=${Date.now()}` : COMMANDER_AVATAR} 
                              alt="Player 2"
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
        <RankUpAnimation
          oldRank={rankAnimation.oldRank}
          newRank={rankAnimation.newRank}
          onComplete={() => setRankAnimation(null)}
        />
      )}
    </div>
  );
}

export default Profile;
