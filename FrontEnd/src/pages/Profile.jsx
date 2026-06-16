import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CommandHeader from "../components/CommandHeader";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import "./HomeHeader.css";
import "./Profile.css";
import { updateUsername } from "../services/userService";

const COMMANDER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe";

const EMPTY_STATS = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  totalShots: 0,
  totalHits: 0,
};

function readStats() {
  try {
    return JSON.parse(localStorage.getItem("battleshipStats")) || EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}

function Profile() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user: currentUser, attributes, loading, logout, checkAuth } = useAuth();
  const [isLightMode, setIsLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active"),
  );
  const [stats] = useState(readStats);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setCooldownMessage(`Bạn cần chờ ${Math.ceil(30 - daysSinceChange)} ngày nữa để đổi tên.`);
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
    if (isTaken || isChecking || cooldownMessage || newUsername.length < 3) return;

    setUpdateError("");
    setUpdateSuccess("");
    try {
      const currentEmail = attributes.email || currentUser?.signInDetails?.loginId;
      await updateUsername(currentEmail, newUsername, newTag);
      setUpdateSuccess("Đổi tên thành công!");
      await checkAuth(); // Refresh UI
    } catch (err) {
      setUpdateError(err.message || "Lỗi khi đổi tên.");
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
  const avatarUrl =
    typeof attributes.picture === "string"
      ? attributes.picture
      : COMMANDER_AVATAR;
  const accuracy =
    stats.totalShots > 0
      ? Math.round((stats.totalHits / stats.totalShots) * 100)
      : 0;
  const winRate =
    stats.totalMatches > 0
      ? Math.round((stats.wins / stats.totalMatches) * 100)
      : 0;

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
                <span>{t("profile.operational")}</span>
              </div>
              <div className="profile-identity-copy">
                <span className="profile-eyebrow">{t("profile.dossier")}</span>
                <h1>{callsign}</h1>
                <p>{email}</p>
                <div className="profile-badges">
                  <span>
                    <i /> {t("common.admiralClearance")}
                  </span>
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
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>Battleship ID</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                    Your Battleship ID is used by other commanders to search for you in the system.
                  </p>
                </div>
                {cooldownMessage && (
                  <div style={{
                    display: 'flex', gap: '12px', background: 'rgba(255, 77, 77, 0.05)', border: '1px solid rgba(255, 77, 77, 0.3)', padding: '16px', borderRadius: '4px', color: '#ff4d4d', alignItems: 'flex-start'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
                    <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0, fontWeight: '600', letterSpacing: '0.5px' }}>
                      BATTLESHIP ID CAN BE CHANGED EVERY 30 DAYS. YOU WILL BE ABLE TO CHANGE IT AGAIN ON {formattedNextChangeDate}.
                    </p>
                  </div>
                )}
              </div>

              {/* Cột Phải */}
              <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column' }}>
                <form onSubmit={handleUpdateUsername} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', marginBottom: '12px' }}>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)' }}>COMMANDER NAME</label>
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
                      <label style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--text-muted)' }}>TAGLINE</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.2)', border: '2px solid rgba(255, 255, 255, 0.15)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', borderRadius: '6px', opacity: cooldownMessage ? 0.5 : 1, transition: 'border-color 0.2s' }}>
                        <span style={{ paddingLeft: '16px', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '16px' }}>#</span>
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => {
                            setNewTag(e.target.value.toUpperCase());
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
                    <div style={{ fontSize: '13px', color: isChecking ? '#888' : isTaken ? '#ff4d4d' : newUsername.length >= 3 ? '#4caf50' : '#ff4d4d' }}>
                      {newUsername.length > 0 && newUsername !== (attributes.preferred_username?.split("#")[0] || "") && (
                        isChecking ? "Checking..." : newUsername.length < 3 ? "Tên phải có ít nhất 3 ký tự" : isTaken ? "Tên đã bị trùng" : "Tên hợp lệ"
                      )}
                      {updateError && <div style={{ color: '#ff4d4d', marginTop: '4px' }}>{updateError}</div>}
                      {updateSuccess && <div style={{ color: '#4caf50', marginTop: '4px' }}>{updateSuccess}</div>}
                    </div>

                    <button 
                      type="submit" 
                      disabled={isTaken || isChecking || newUsername.length < 3 || !!cooldownMessage || (attributes.preferred_username === fullUsername)}
                      style={{
                        padding: '12px 24px', 
                        background: (isTaken || isChecking || newUsername.length < 3 || !!cooldownMessage || (attributes.preferred_username === fullUsername)) ? 'var(--surface-sunken)' : '#d32f2f', 
                        color: (isTaken || isChecking || newUsername.length < 3 || !!cooldownMessage || (attributes.preferred_username === fullUsername)) ? '#666' : 'white', 
                        borderRadius: '4px', 
                        fontWeight: 'bold', 
                        fontSize: '13px',
                        letterSpacing: '1px',
                        border: 'none',
                        cursor: (isTaken || isChecking || newUsername.length < 3 || !!cooldownMessage || (attributes.preferred_username === fullUsername)) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        alignSelf: 'flex-end',
                        marginTop: 'auto'
                      }}
                    >
                      SAVE CHANGES
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
                    <strong>{stats.totalMatches}</strong>
                  </article>
                  <article>
                    <span>{t("profile.victories")}</span>
                    <strong>{stats.wins}</strong>
                  </article>
                  <article>
                    <span>{t("profile.winRate")}</span>
                    <strong>{winRate}%</strong>
                  </article>
                  <article>
                    <span>{t("profile.accuracy")}</span>
                    <strong>{accuracy}%</strong>
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
                    <dd>{t("common.admiral")}</dd>
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
          </>
        )}
      </main>
    </div>
  );
}

export default Profile;
