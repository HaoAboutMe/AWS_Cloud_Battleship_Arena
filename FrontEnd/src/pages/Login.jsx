import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthNotice, AuthShell, AuthSubmitButton } from "../components/AuthShell";
import SocialAuthButtons from "../components/SocialAuthButtons";
import { fetchUserAttributes } from "aws-amplify/auth";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getLoggedInUser, loginUser } from "../services/authService";
import { createUser } from "../services/userService";
import "./Login.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errorText = error?.key ? t(error.key) : error?.message;
  const returnTo = typeof location.state?.returnTo === "string" && location.state.returnTo.startsWith("/")
    ? location.state.returnTo
    : "/";
  const navigateAfterLogin = () => {
    navigate(returnTo, {
      replace: true,
      state: returnTo === "/" ? { authEvent: "signed-in" } : null,
    });
  };

  const successMessage = location.state?.passwordReset
    ? {
        title: t("login.passwordUpdated"),
        body: t("login.passwordUpdatedBody"),
      }
    : location.state?.accountVerified
      ? {
          title: t("login.verified"),
          body: t("login.verifiedBody"),
        }
      : null;

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      sessionStorage.removeItem("battleshipSocialAuthPending");
      
      const finalizeSocialLogin = async () => {
        try {
          const attrs = await fetchUserAttributes();
          await createUser({
            userId: attrs.sub,
            email: attrs.email,
            username: attrs.name || attrs.email.split("@")[0]
          });
        } catch (err) {
          console.error("Failed to process user data after social login:", err);
        } finally {
          window.dispatchEvent(new Event("battleship-auth-changed"));
          navigateAfterLogin();
        }
      };

      finalizeSocialLogin();
      return;
    }

    getLoggedInUser()
      .then((user) => {
        if (user) navigateAfterLogin();
      })
      .catch(() => {});
  }, [authLoading, isAuthenticated, navigate, returnTo]);

  const errors = useMemo(() => {
    const nextErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = t("auth.emailInvalid");
    if (password.length < 8) nextErrors.password = t("auth.passwordInvalid");
    return nextErrors;
  }, [email, password, t]);

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <span className="auth-field-error" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);

    try {
      await loginUser({ email: email.trim(), password });
      
      try {
        const attrs = await fetchUserAttributes();
        await createUser({
          userId: attrs.sub,
          email: attrs.email,
          username: attrs.name || attrs.email.split("@")[0]
        });
      } catch (err) {
        console.error("Failed to process user data after login:", err);
      }

      localStorage.setItem(
        "battleshipSession",
        JSON.stringify({ callsign: "Commander", email: email.trim(), remember }),
      );
      window.dispatchEvent(new Event("battleship-auth-changed"));
      navigateAfterLogin();
    } catch (err) {
      if (err.name === "UserNotConfirmedException") {
        navigate("/register", { state: { email: email.trim(), needsConfirmation: true } });
      } else if (err.name === "NotAuthorizedException" || err.name === "UserNotFoundException") {
        setError({ key: "login.invalidCredentials" });
      } else {
        setError({ key: "login.unavailable" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell pageClass="login-page" useCommandHeader={true}>
      <div className="auth-form-heading">
        <span className="auth-kicker">
          <span className="auth-live-dot" />
          {t("login.kicker")}
        </span>
        <h1>{t("login.title")}</h1>
        <p>{t("login.subtitle")}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {successMessage && (
          <AuthNotice type="success" title={successMessage.title}>
            {successMessage.body}
          </AuthNotice>
        )}
        {error && (
          <AuthNotice type="error" title={t("login.accessDenied")}>
            {errorText}
          </AuthNotice>
        )}

        <SocialAuthButtons onError={setError} />

        <label className="auth-field">
          <span>{t("common.email")}</span>
          <div className={`auth-input-shell ${touched.email && errors.email ? "is-invalid" : ""}`}>
            <span className="auth-glyph auth-input-glyph" aria-hidden="true">@</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              placeholder="commander@fleet.com"
              autoComplete="email"
            />
          </div>
          {renderError("email")}
        </label>

        <label className="auth-field">
          <span>{t("common.password")}</span>
          <div className={`auth-input-shell ${touched.password && errors.password ? "is-invalid" : ""}`}>
            <span className="auth-glyph auth-input-glyph" aria-hidden="true">●</span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              placeholder={t("common.minimumPassword")}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
            >
              <span className="auth-glyph" aria-hidden="true">{showPassword ? "◌" : "◉"}</span>
            </button>
          </div>
          {renderError("password")}
        </label>

        <div className="auth-form-options">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span aria-hidden="true"><span className="auth-glyph">✓</span></span>
            {t("login.remember")}
          </label>
          <Link to="/forgot-password" className="auth-text-link">{t("login.recover")}</Link>
        </div>

        <AuthSubmitButton loading={loading}>{t("login.submit")}</AuthSubmitButton>
      </form>

      <p className="auth-switch">
        {t("login.newUser")}
        <Link to="/register">{t("login.create")}</Link>
      </p>
    </AuthShell>
  );
}

export default Login;
