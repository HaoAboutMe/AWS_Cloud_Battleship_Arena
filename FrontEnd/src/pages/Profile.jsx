import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CommandHeader from "../components/CommandHeader";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import "./HomeHeader.css";
import "./Profile.css";

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
  const {
    user: currentUser,
    attributes,
    loading,
    logout,
  } = useAuth();
  const [isLightMode, setIsLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active"),
  );
  const [stats] = useState(readStats);

  const toggleTheme = (event) => {
    const nextLightMode = !isLightMode;

    if (!document.startViewTransition) {
      document.documentElement.classList.toggle("light-mode-active", nextLightMode);
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
      document.documentElement.classList.toggle("light-mode-active", nextLightMode);
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
  const avatarUrl = typeof attributes.picture === "string"
    ? attributes.picture
    : COMMANDER_AVATAR;
  const accuracy = stats.totalShots > 0
    ? Math.round((stats.totalHits / stats.totalShots) * 100)
    : 0;
  const winRate = stats.totalMatches > 0
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
            <i /><i /><i />
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
                  <span><i /> {t("common.admiralClearance")}</span>
                  <span>{t("profile.cloudFleet")}</span>
                </div>
              </div>
              <Link to="/lobby" className="profile-deploy-button">
                {t("profile.deploy")}
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
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
                  <article><span>{t("profile.totalBattles")}</span><strong>{stats.totalMatches}</strong></article>
                  <article><span>{t("profile.victories")}</span><strong>{stats.wins}</strong></article>
                  <article><span>{t("profile.winRate")}</span><strong>{winRate}%</strong></article>
                  <article><span>{t("profile.accuracy")}</span><strong>{accuracy}%</strong></article>
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
                  <div><dt>Email</dt><dd title={email}>{email}</dd></div>
                  <div><dt>{t("profile.verification")}</dt><dd className="is-online">{t("profile.verified")}</dd></div>
                  <div><dt>{t("profile.rank")}</dt><dd>{t("common.admiral")}</dd></div>
                  <div><dt>{t("profile.accountId")}</dt><dd title={currentUser.userId}>{currentUser.userId}</dd></div>
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
