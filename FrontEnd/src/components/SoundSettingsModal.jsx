import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageToggle from "./LanguageToggle";
import {
  setSoundMuted,
  setSoundSettings,
  subscribeSoundSettings,
} from "../services/soundService";
import { setPreferredLightMode } from "../utils/themePreference";
import "./SoundSettingsModal.css";

const VOLUME_CONTROLS = [
  { key: "masterVolume", label: "settings.masterVolume", icon: "tune" },
  { key: "musicVolume", label: "settings.musicVolume", icon: "music_note" },
  { key: "battleMusicVolume", label: "settings.battleMusicVolume", icon: "swords" },
  { key: "effectsVolume", label: "settings.effectsVolume", icon: "graphic_eq" },
  { key: "clickVolume", label: "settings.clickVolume", icon: "touch_app" },
];

function SoundSettingsModal({ open, onClose }) {
  const { t } = useLanguage();
  const closeButtonRef = useRef(null);
  const [settings, setSettings] = useState({
    masterVolume: 1,
    musicVolume: 1,
    battleMusicVolume: 1,
    effectsVolume: 1,
    clickVolume: 1,
    muted: false,
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [localLightMode, setLocalLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active")
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleThemeToggle = () => {
    const nextLightMode = !localLightMode;
    setPreferredLightMode(nextLightMode);
    setLocalLightMode(nextLightMode);
  };

  useEffect(() => subscribeSoundSettings(setSettings), []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const updateVolume = (key, value) => {
    setSoundSettings({ [key]: Number(value) / 100 });
  };

  return createPortal(
    <div
      className="sound-settings-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="sound-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sound-settings-title"
      >
        <header className="sound-settings-header">
          <div>
            <span>{t("settings.kicker")}</span>
            <h2 id="sound-settings-title">{t("settings.title")}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="sound-settings-close"
            onClick={onClose}
            aria-label={t("common.dismiss")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="sound-settings-layout">
          <nav className="sound-settings-nav" aria-label={t("settings.sections") }>
            <button type="button" className="is-active" aria-current="page">
              <span className="material-symbols-outlined">volume_up</span>
              {t("settings.audio")}
            </button>
          </nav>

          <div className="sound-settings-content">
            <div className="sound-settings-intro">
              <span className="material-symbols-outlined">spatial_audio</span>
              <div>
                <h3>{t("settings.gameAudio")}</h3>
                <p>{t("settings.audioDescription")}</p>
              </div>
              <button
                type="button"
                data-sound="off"
                className={`sound-settings-mute${settings.muted ? " is-muted" : ""}`}
                onClick={() => setSoundMuted(!settings.muted)}
                aria-pressed={settings.muted}
              >
                <span className="material-symbols-outlined">
                  {settings.muted ? "volume_off" : "volume_up"}
                </span>
                {settings.muted ? t("settings.unmuteAll") : t("settings.muteAll")}
              </button>
            </div>

            <div className="sound-settings-controls">
              {VOLUME_CONTROLS.map(({ key, label, icon }) => {
                const percentage = Math.round(settings[key] * 100);
                return (
                  <div className="sound-volume-row" key={key}>
                    <label htmlFor={`sound-${key}`}>
                      <span className="material-symbols-outlined">{icon}</span>
                      <span>{t(label)}</span>
                    </label>
                    <input
                      id={`sound-${key}`}
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={percentage}
                      style={{ "--sound-level": `${percentage}%` }}
                      onChange={(event) => updateVolume(key, event.target.value)}
                    />
                    <output htmlFor={`sound-${key}`}>{percentage}%</output>
                  </div>
                );
              })}
            </div>

            {isMobile && (
              <div className="sound-settings-mobile-extras">
                <div className="sound-volume-row settings-language-row">
                  <label htmlFor="settings-language">
                    <span className="material-symbols-outlined">language</span>
                    <span>{t("common.language")}</span>
                  </label>
                  <div id="settings-language" className="settings-language-control">
                    <LanguageToggle />
                  </div>
                </div>
                <div className="sound-volume-row settings-theme-row">
                  <label htmlFor="settings-theme">
                    <span className="material-symbols-outlined">
                      {localLightMode ? "dark_mode" : "light_mode"}
                    </span>
                    <span>{localLightMode ? t("common.useDark") : t("common.useLight")}</span>
                  </label>
                  <button
                    id="settings-theme"
                    type="button"
                    className="sound-settings-theme-btn"
                    onClick={handleThemeToggle}
                    aria-label={localLightMode ? t("common.useDark") : t("common.useLight")}
                  >
                    <span className="material-symbols-outlined">
                      {localLightMode ? "dark_mode" : "light_mode"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <p className="sound-settings-note">
              <span className="material-symbols-outlined">info</span>
              {t("settings.savedAutomatically")}
            </p>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default SoundSettingsModal;
