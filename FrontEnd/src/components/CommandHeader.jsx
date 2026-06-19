import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import LanguageToggle from "./LanguageToggle";
import { RANKS, getRankMeta } from "../game/rankConfig";

const COMMANDER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe";

function CommandHeader({
  currentUser,
  attributes = {},
  authLoading = false,
  isLightMode = false,
  onToggleTheme,
  onLogout,
  onNavigateRequest,
}) {
  const location = useLocation();
  const { t } = useLanguage();
  const identity =
    attributes.preferred_username ||
    attributes.name ||
    attributes.given_name ||
    attributes.nickname ||
    attributes.email ||
    currentUser?.signInDetails?.loginId ||
    "Commander";
  const { customAvatarUrl } = useAuth();
  const avatarUrl = customAvatarUrl || (typeof attributes.picture === "string"
    ? attributes.picture
    : COMMANDER_AVATAR);
  const rankPoints = Number(attributes.rankPoints || 0);
  const rankedMatches = Number(attributes.rankedMatches || 0);
  const hasRank = rankedMatches > 0 && rankPoints >= RANKS[0].minRp;
  const rankMeta = getRankMeta(hasRank ? attributes.rank || "bronze" : "bronze");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavigation = (event, targetPath) => {
    if (!onNavigateRequest) return;

    event.preventDefault();
    onNavigateRequest(targetPath);
  };

  return (
    <header className={`command-header ${currentUser ? "user-logged-in" : ""}`}>
      <div className="command-header-inner">
        <Link
          to="/"
          className="command-brand"
          aria-label="Cloud Battleship Arena home"
          onClick={(event) => handleNavigation(event, "/")}
        >
          <span className="command-brand-mark" aria-hidden="true"><i /></span>
          <span className="command-brand-copy">
            <strong>Cloud Battleship</strong>
            <small>Arena Command Network</small>
          </span>
        </Link>

        <nav className="command-nav" aria-label="Primary navigation">
          <Link
            className={location.pathname === "/" ? "is-active" : ""}
            to="/"
            onClick={(event) => handleNavigation(event, "/")}
          >
            {t("common.home")}
          </Link>
          <Link
            to="/#leaderboard"
            onClick={(event) => handleNavigation(event, "/#leaderboard")}
          >
            {t("common.leaderboard")}
          </Link>
          <Link
            className={location.pathname === "/profile" ? "is-active" : ""}
            to="/profile"
            onClick={(event) => handleNavigation(event, "/profile")}
          >
            {t("common.profile")}
          </Link>
        </nav>

        <div className="command-actions">
          <LanguageToggle />
          <button
            type="button"
            onClick={onToggleTheme}
            className="command-icon-button"
            aria-label={isLightMode ? t("common.useDark") : t("common.useLight")}
          >
            <span className="material-symbols-outlined">
              {isLightMode ? "dark_mode" : "light_mode"}
            </span>
          </button>

          {!authLoading && !currentUser ? (
            <div className="command-guest-actions">
              <Link to="/login" className="command-signin">{t("common.signIn")}</Link>
              <Link to="/register" className="command-enlist">
                <span className="command-enlist-desktop">{t("common.enlist")}</span>
                <span className="command-enlist-mobile">{t("common.getStarted")}</span>
              </Link>
            </div>
          ) : currentUser ? (
            <>
              <button type="button" className="command-icon-button command-desktop-action" aria-label={t("common.notifications")}>
                <span className="material-symbols-outlined">notifications</span>
                <span className="command-alert-dot" />
              </button>
              <div className={`command-account ${menuOpen ? "is-open" : ""}`} ref={menuRef}>
                <button
                  type="button"
                  className="command-account-trigger"
                  aria-label={t("common.openAccount")}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <img
                    className="command-avatar"
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.src = COMMANDER_AVATAR;
                    }}
                  />
                  <span className="command-account-copy">
                    <strong title={identity}>{identity}</strong>
                    <small className="command-account-rank">
                      {hasRank ? (
                        <img src={rankMeta.badge} alt="" className="command-rank-badge" />
                      ) : (
                        <i className="command-empty-rank-badge" />
                      )}
                      {hasRank ? `${rankMeta.label} - ${rankPoints} RP` : "Unranked"}
                    </small>
                  </span>
                  <span className="material-symbols-outlined command-account-chevron">expand_more</span>
                </button>
                <div className="command-account-menu">
                  <div>
                    <span className="command-menu-label">{t("common.accountControls")}</span>
                    <Link
                      to="/profile"
                      onClick={(event) => {
                        setMenuOpen(false);
                        handleNavigation(event, "/profile");
                      }}
                    >
                      <span className="material-symbols-outlined">person</span>
                      {t("common.viewProfile")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                    >
                      <span className="material-symbols-outlined">logout</span>
                      {t("common.signOut")}
                    </button>
                    
                    <div className="command-mobile-menu-actions">
                      <LanguageToggle compact={true} />
                      <button
                        type="button"
                        onClick={onToggleTheme}
                        className="command-icon-button"
                        aria-label={isLightMode ? t("common.useDark") : t("common.useLight")}
                      >
                        <span className="material-symbols-outlined">
                          {isLightMode ? "dark_mode" : "light_mode"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default CommandHeader;
