import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthNotice, AuthShell, AuthSubmitButton } from "../components/AuthShell";
import { useLanguage } from "../contexts/LanguageContext";
import {
  completePasswordReset,
  requestPasswordReset,
} from "../services/authService";
import "./ForgotPassword.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const isConfirmStep = step === "confirm";
  const errorText = error?.key ? t(error.key) : error?.message;

  const errors = useMemo(() => {
    const nextErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = t("auth.emailInvalid");

    if (isConfirmStep) {
      if (!code.trim()) nextErrors.code = t("auth.resetCodeRequired");
      if (password.length < 8) nextErrors.password = t("auth.passwordInvalid");
      if (confirmPassword !== password) nextErrors.confirmPassword = t("auth.passwordsMismatch");
    }
    return nextErrors;
  }, [code, confirmPassword, email, isConfirmStep, password, t]);

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <span className="auth-field-error" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setTouched({ email: true });
    if (errors.email) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await requestPasswordReset(email.trim());
      setStep("confirm");
      setTouched({});
      setNotice({
        titleKey: "recovery.codeSent",
        bodyKey: "recovery.codeSentBody",
      });
    } catch (err) {
      if (err.name === "LimitExceededException") {
        setError({ key: "recovery.tooMany" });
      } else {
        setError({ key: "recovery.sendError" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (event) => {
    event.preventDefault();
    setTouched({ email: true, code: true, password: true, confirmPassword: true });
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await completePasswordReset({
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      if (err.name === "CodeMismatchException") {
        setError({ key: "recovery.wrongCode" });
      } else if (err.name === "ExpiredCodeException") {
        setError({ key: "recovery.expiredCode" });
      } else if (err.name === "InvalidPasswordException") {
        setError({ key: "recovery.passwordPolicy" });
      } else {
        setError({ key: "recovery.resetError" });
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await requestPasswordReset(email.trim());
      setNotice({
        titleKey: "recovery.newCode",
        bodyKey: "recovery.newCodeBody",
      });
    } catch {
      setError({ key: "recovery.resendError" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell backTo="/login" backLabel={t("auth.backSignIn")} pageClass="forgot-password-page">
      <div className="auth-form-heading">
        <span className="auth-kicker">
          <span className="auth-live-dot" />
          {t("recovery.kicker")}
        </span>
        <h1>{isConfirmStep ? t("recovery.confirmTitle") : t("recovery.title")}</h1>
        <p>
          {isConfirmStep
            ? t("recovery.confirmSubtitle", { email })
            : t("recovery.subtitle")}
        </p>
      </div>

      <form className="auth-form" onSubmit={isConfirmStep ? handleConfirmReset : handleRequestCode} noValidate>
        {notice && (
          <AuthNotice type="info" title={t(notice.titleKey)}>
            {t(notice.bodyKey)}
          </AuthNotice>
        )}
        {error && (
          <AuthNotice type="error" title={t("recovery.interrupted")}>
            {errorText}
          </AuthNotice>
        )}

        <label className="auth-field">
          <span>{t("common.email")}</span>
          <div className={`auth-input-shell ${touched.email && errors.email ? "is-invalid" : ""}`}>
            <span className="auth-glyph auth-input-glyph" aria-hidden="true">@</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              placeholder="commander@fleet.com"
              autoComplete="email"
              disabled={isConfirmStep}
            />
          </div>
          {renderError("email")}
        </label>

        {isConfirmStep && (
          <>
            <label className="auth-field">
              <span>{t("recovery.resetCode")}</span>
              <div className={`auth-input-shell ${touched.code && errors.code ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">#</span>
                <input
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError(null);
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, code: true }))}
                  placeholder={t("auth.codePlaceholder")}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>
              {renderError("code")}
            </label>

            <label className="auth-field">
              <span>{t("recovery.newPassword")}</span>
              <div className={`auth-input-shell ${touched.password && errors.password ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">●</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  placeholder={t("common.minimumPassword")}
                  autoComplete="new-password"
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((current) => !current)}>
                  <span className="auth-glyph" aria-hidden="true">{showPassword ? "◌" : "◉"}</span>
                </button>
              </div>
              {renderError("password")}
            </label>

            <label className="auth-field">
              <span>{t("recovery.confirmNewPassword")}</span>
              <div className={`auth-input-shell ${touched.confirmPassword && errors.confirmPassword ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">✓</span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError(null);
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                  placeholder={t("auth.repeatNewPassword")}
                  autoComplete="new-password"
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowConfirmPassword((current) => !current)}>
                  <span className="auth-glyph" aria-hidden="true">{showConfirmPassword ? "◌" : "◉"}</span>
                </button>
              </div>
              {renderError("confirmPassword")}
            </label>

            <div className="auth-form-options auth-reset-options">
              <button type="button" className="auth-text-button" onClick={resendCode} disabled={loading}>
                {t("common.sendAnotherCode")}
              </button>
              <button
                type="button"
                className="auth-text-button"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setPassword("");
                  setConfirmPassword("");
                  setTouched({});
                  setError(null);
                  setNotice(null);
                }}
              >
                {t("common.changeEmail")}
              </button>
            </div>
          </>
        )}

        <AuthSubmitButton loading={loading}>
          {isConfirmStep ? t("recovery.updatePassword") : t("recovery.sendCode")}
        </AuthSubmitButton>
      </form>

      <p className="auth-switch">
        {t("recovery.remembered")}
        <Link to="/login">{t("common.signIn")}</Link>
      </p>
    </AuthShell>
  );
}

export default ForgotPassword;
