import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageToggle from "./LanguageToggle";

const COMMANDER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe";

function CommandHeader({
  currentUser,
  authLoading = false,
  isLightMode = false,
  onToggleTheme,
  onLogout,
}) {
  const location = useLocation();
  const { t } = useLanguage();
  const identity = currentUser?.signInDetails?.loginId || currentUser?.username || "Commander";

  return (
    <header className="command-header">
      <div className="command-header-inner">
        <Link to="/" className="command-brand" aria-label="Cloud Battleship Arena home">
          <span className="command-brand-mark" aria-hidden="true"><i /></span>
          <span className="command-brand-copy">
            <strong>Cloud Battleship</strong>
            <small>Arena Command Network</small>
          </span>
        </Link>

        <nav className="command-nav" aria-label="Primary navigation">
          <Link className={location.pathname === "/" ? "is-active" : ""} to="/">{t("common.home")}</Link>
          <Link to="/#leaderboard">{t("common.leaderboard")}</Link>
          <Link className={location.pathname === "/profile" ? "is-active" : ""} to="/profile">{t("common.profile")}</Link>
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
              <Link to="/register" className="command-enlist">{t("common.enlist")}</Link>
            </div>
          ) : currentUser ? (
            <>
              <button type="button" className="command-icon-button command-desktop-action" aria-label={t("common.notifications")}>
                <span className="material-symbols-outlined">notifications</span>
                <span className="command-alert-dot" />
              </button>
              <div className="command-account">
                <button type="button" className="command-account-trigger" aria-label={t("common.openAccount")}>
                  <img className="command-avatar" src={COMMANDER_AVATAR} alt="" />
                  <span className="command-account-copy">
                    <strong title={identity}>{identity}</strong>
                    <small><i /> {t("common.admiralClearance")}</small>
                  </span>
                  <span className="material-symbols-outlined command-account-chevron">expand_more</span>
                </button>
                <div className="command-account-menu">
                  <div>
                    <span className="command-menu-label">{t("common.accountControls")}</span>
                    <Link to="/profile">
                      <span className="material-symbols-outlined">person</span>
                      {t("common.viewProfile")}
                    </Link>
                    <button type="button" onClick={onLogout}>
                      <span className="material-symbols-outlined">logout</span>
                      {t("common.signOut")}
                    </button>
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
