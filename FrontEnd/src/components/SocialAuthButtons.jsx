import { useState } from "react";
import { isSocialAuthConfigured } from "../awsConfig";
import { useLanguage } from "../contexts/LanguageContext";
import { loginWithSocialProvider } from "../services/authService";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.48l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.01c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
      <path fill="#fff" d="m15.89 14.89.44-2.89h-2.77v-1.88c0-.79.39-1.56 1.63-1.56h1.25V6.11s-1.14-.2-2.23-.2c-2.28 0-3.77 1.39-3.77 3.89V12H7.9v2.89h2.54v6.99a10.2 10.2 0 0 0 3.12 0v-6.99h2.33Z" />
    </svg>
  );
}

export default function SocialAuthButtons({ onError }) {
  const { t } = useLanguage();
  const [loadingProvider, setLoadingProvider] = useState(null);

  const startSocialLogin = async (provider) => {
    onError?.(null);

    if (!isSocialAuthConfigured) {
      onError?.({ key: "login.socialConfigMissing" });
      return;
    }

    setLoadingProvider(provider);
    try {
      sessionStorage.setItem("battleshipSocialAuthPending", provider);
      await loginWithSocialProvider(provider);
    } catch {
      sessionStorage.removeItem("battleshipSocialAuthPending");
      setLoadingProvider(null);
      onError?.({ key: "login.socialUnavailable" });
    }
  };

  return (
    <div className="auth-social-section">
      <div className="auth-social-buttons">
        <button
          type="button"
          className="auth-social-button auth-social-google"
          onClick={() => startSocialLogin("Google")}
          disabled={Boolean(loadingProvider)}
        >
          <span className="auth-social-icon"><GoogleIcon /></span>
          <span>{loadingProvider === "Google" ? t("login.socialConnecting") : t("login.continueGoogle")}</span>
        </button>
        <button
          type="button"
          className="auth-social-button auth-social-facebook"
          onClick={() => startSocialLogin("Facebook")}
          disabled={Boolean(loadingProvider)}
        >
          <span className="auth-social-icon"><FacebookIcon /></span>
          <span>{loadingProvider === "Facebook" ? t("login.socialConnecting") : t("login.continueFacebook")}</span>
        </button>
      </div>
      <div className="auth-divider">
        <span>{t("login.orEmail")}</span>
      </div>
    </div>
  );
}
