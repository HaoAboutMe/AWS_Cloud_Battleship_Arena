const THEME_STORAGE_KEY = "battleshipTheme";

export const getPreferredLightMode = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(THEME_STORAGE_KEY) !== "dark";
};

export const applyPreferredTheme = () => {
  if (typeof document === "undefined") return true;
  const lightMode = getPreferredLightMode();
  document.documentElement.classList.toggle("light-mode-active", lightMode);
  return lightMode;
};

export const setPreferredLightMode = (lightMode) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, lightMode ? "light" : "dark");
  }

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("light-mode-active", lightMode);
  }

  return lightMode;
};
