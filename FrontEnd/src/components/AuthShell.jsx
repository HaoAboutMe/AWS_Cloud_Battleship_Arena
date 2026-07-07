import shipCarrier from "../assets/ships/image/ship-10.webp";
import shipDestroyer from "../assets/ships/image/ship-6.webp";
import shipScout from "../assets/ships/image/ship-8.webp";
import { useLanguage } from "../contexts/LanguageContext";
import CommandHeader from "./CommandHeader";
import "./AuthShell.css";

export function AuthShell({ children, backTo = "/", backLabel, pageClass = "" }) {
  const { t } = useLanguage();

  return (
    <main className={`auth-page ${pageClass}`.trim()}>
      <div className="auth-ocean" aria-hidden="true" />
      <div className="auth-grid-overlay" aria-hidden="true" />

      <CommandHeader showReturnHome={true} backTo={backTo} backLabel={backLabel} />

      <section className="auth-layout">
        <div className="auth-form-panel">{children}</div>
        <aside className="auth-visual-panel" aria-label={t("auth.radarLabel")}>
          <div className="home-war-room" aria-label="Fleet tactical preview">
            <div className="home-map-board" aria-hidden="true">
              {Array.from({ length: 64 }).map((_, index) => (
                <span key={index} className={(index + Math.floor(index / 8)) % 2 === 0 ? "is-tide" : ""} />
              ))}
            </div>
            <img className="home-ship home-ship-carrier" src={shipCarrier} alt="" />
            <img className="home-ship home-ship-destroyer" src={shipDestroyer} alt="" />
            <img className="home-ship home-ship-scout" src={shipScout} alt="" />
            <div className="home-telemetry-panel">
              <small>{t("home.customFleet")}</small>
              <strong>{t("home.blocksCount", { count: 15 })}</strong>
              <span>{t("home.shipsOnDeck")}</span>
            </div>
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
