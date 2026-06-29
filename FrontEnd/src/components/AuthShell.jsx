import { Link } from "react-router-dom";
import shipOne from "../assets/ships/image/ship-1.webp";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import "./AuthShell.css";

export function AuthShell({ children, backTo = "/", backLabel, pageClass = "" }) {
  const { t } = useLanguage();

  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <div className="auth-ocean" aria-hidden="true" />
      <div className="auth-grid-overlay" aria-hidden="true" />

      <header className="auth-header">
        <Link to="/" className="auth-brand" aria-label="Cloud Battleship Arena home">
          <span className="material-symbols-outlined auth-brand-glyph" aria-hidden="true">radar</span>
          <span>
            <strong>Cloud Battleship</strong>
            <small>{t("auth.brandSub")}</small>
          </span>
        </Link>
        <div className="auth-header-actions">
          <LanguageToggle compact />
          <Link to={backTo} className="auth-home-link">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            {backLabel || t("auth.returnBase")}
          </Link>
        </div>
      </header>

      <section className="auth-layout">
        <div className="auth-form-panel">{children}</div>
        <aside className="auth-visual-panel" aria-label={t("auth.radarLabel")}>
          <div className="auth-radar">
            <span className="auth-radar-sweep" />
            <span className="auth-radar-contact contact-one" />
            <span className="auth-radar-contact contact-two" />
            <span className="auth-radar-contact contact-three" />
            <img src={shipOne} alt="" />
          </div>
        </aside>
      </section>
    </main>
  );
}

export function AuthNotice({ type = "info", title, children }) {
  return (
    <div className={`auth-notice auth-notice-${type}`} role={type === "error" ? "alert" : "status"}>
      <span className="auth-notice-icon" aria-hidden="true"><i /></span>
      <span className="auth-notice-copy">
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </div>
  );
}

export function AuthSubmitButton({ loading, children }) {
  const { t } = useLanguage();

  return (
    <button type="submit" className="auth-submit" disabled={loading}>
      {loading ? (
        <>
          <span className="auth-loading-bars" aria-hidden="true"><i /><i /><i /></span>
          {t("common.loading")}
        </>
      ) : (
        <>
          <span>{children}</span>
          <span className="auth-submit-icon" aria-hidden="true"><i /></span>
        </>
      )}
    </button>
  );
}
