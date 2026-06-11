import { useLanguage } from "../contexts/LanguageContext";
import "./LanguageToggle.css";

function LanguageToggle({ compact = false }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className={`language-toggle ${compact ? "is-compact" : ""}`}
      data-language={language}
      role="group"
      aria-label={t("common.language")}
    >
      <span className="material-symbols-outlined language-toggle-icon" aria-hidden="true">
        language
      </span>
      <button
        type="button"
        className={language === "en" ? "is-active" : ""}
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        title={t("common.english")}
      >
        EN
      </button>
      <button
        type="button"
        className={language === "vi" ? "is-active" : ""}
        onClick={() => setLanguage("vi")}
        aria-pressed={language === "vi"}
        title={t("common.vietnamese")}
      >
        VI
      </button>
    </div>
  );
}

export default LanguageToggle;
