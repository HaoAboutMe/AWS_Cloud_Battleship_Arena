import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthNotice, AuthShell, AuthSubmitButton } from "../components/AuthShell";
import SocialAuthButtons from "../components/SocialAuthButtons";
import { useLanguage } from "../contexts/LanguageContext";
import { confirmRegister, registerUser, resendConfirmCode } from "../services/authService";
import "./Register.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [step, setStep] = useState(location.state?.needsConfirmation ? "confirm" : "register");
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(
    location.state?.needsConfirmation
      ? {
          titleKey: "register.verificationRequired",
          bodyKey: "register.verificationRequiredBody",
        }
      : null,
  );

  const isConfirmStep = step === "confirm";
  const errorText = error?.key ? t(error.key) : error?.message;

  const errors = useMemo(() => {
    const nextErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = t("auth.emailInvalid");

    if (isConfirmStep) {
      if (!confirmationCode.trim()) nextErrors.confirmationCode = t("auth.codeRequired");
    } else {
      if (password.length < 8) nextErrors.password = t("auth.passwordInvalid");
      if (confirmPassword !== password) nextErrors.confirmPassword = t("auth.passwordsMismatch");
      if (!terms) nextErrors.terms = t("register.termsRequired");
    }
    return nextErrors;
  }, [confirmPassword, confirmationCode, email, isConfirmStep, password, terms, t]);

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <span className="auth-field-error" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  const handleRegister = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true, terms: true });
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await registerUser({ email: email.trim(), password });
      setStep("confirm");
      setTouched({});
      setNotice({
        titleKey: "register.codeSent",
        bodyKey: "register.codeSentBody",
      });
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        setError({ key: "register.accountExists" });
      } else if (err.name === "InvalidPasswordException") {
        setError({ key: "register.policyError" });
      } else {
        setError({ key: "register.createError" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (event) => {
    event.preventDefault();
    setTouched({ confirmationCode: true });
    if (errors.confirmationCode) return;

    setLoading(true);
    setError(null);
    try {
      await confirmRegister({ email: email.trim(), code: confirmationCode.trim() });
      navigate("/login", { replace: true, state: { accountVerified: true } });
    } catch (err) {
      if (err.name === "CodeMismatchException") {
        setError({ key: "register.wrongCode" });
      } else if (err.name === "ExpiredCodeException") {
        setError({ key: "register.expiredCode" });
      } else {
        setError({ key: "register.verifyError" });
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
      await resendConfirmCode(email.trim());
      setNotice({
        titleKey: "register.newCode",
        bodyKey: "register.newCodeBody",
      });
    } catch {
      setError({ key: "register.resendError" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell pageClass="register-page">
      <div className="auth-form-heading">
        <span className="auth-kicker">
          <span className="auth-live-dot" />
          {isConfirmStep ? t("register.confirmKicker") : t("register.kicker")}
        </span>
        <h1>{isConfirmStep ? t("register.confirmTitle") : t("register.title")}</h1>
        <p>
          {isConfirmStep
            ? t("register.confirmSubtitle", { email })
            : t("register.subtitle")}
        </p>
      </div>

      <form className="auth-form" onSubmit={isConfirmStep ? handleConfirmation : handleRegister} noValidate>
        {notice && (
          <AuthNotice type="info" title={t(notice.titleKey)}>
            {t(notice.bodyKey)}
          </AuthNotice>
        )}
        {error && (
          <AuthNotice type="error" title={isConfirmStep ? t("register.verifyFailed") : t("register.enlistFailed")}>
            {errorText}
          </AuthNotice>
        )}

        {!isConfirmStep && <SocialAuthButtons onError={setError} />}

        <label className="auth-field">
          <span>{t("common.email")}</span>
          <div className={`auth-input-shell ${touched.email && errors.email ? "is-invalid" : ""}`}>
            <span className="auth-glyph auth-input-glyph" aria-hidden="true">@</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              placeholder="commander@fleet.com"
              autoComplete="email"
              disabled={isConfirmStep}
            />
          </div>
          {renderError("email")}
        </label>

        {isConfirmStep ? (
          <>
            <label className="auth-field">
              <span>{t("register.confirmationCode")}</span>
              <div className={`auth-input-shell ${touched.confirmationCode && errors.confirmationCode ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">#</span>
                <input
                  value={confirmationCode}
                  onChange={(event) => {
                    setConfirmationCode(event.target.value);
                    setError(null);
                  }}
                  onBlur={() => setTouched({ confirmationCode: true })}
                  placeholder={t("register.confirmCodePlaceholder")}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>
              {renderError("confirmationCode")}
            </label>

            <div className="auth-form-options auth-reset-options">
              <button type="button" className="auth-text-button" onClick={resendCode} disabled={loading}>
                {t("common.sendAnotherCode")}
              </button>
              <button
                type="button"
                className="auth-text-button"
                onClick={() => {
                  setStep("register");
                  setConfirmationCode("");
                  setTouched({});
                  setError("");
                  setNotice(null);
                }}
              >
                {t("common.changeEmail")}
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="auth-field">
              <span>{t("common.password")}</span>
              <div className={`auth-input-shell ${touched.password && errors.password ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">●</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
              <span>{t("register.confirmPassword")}</span>
              <div className={`auth-input-shell ${touched.confirmPassword && errors.confirmPassword ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">✓</span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                  placeholder={t("auth.repeatPassword")}
                  autoComplete="new-password"
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowConfirmPassword((current) => !current)}>
                  <span className="auth-glyph" aria-hidden="true">{showConfirmPassword ? "◌" : "◉"}</span>
                </button>
              </div>
              {renderError("confirmPassword")}
            </label>

            <label className="auth-check">
              <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
              <span aria-hidden="true"><span className="auth-glyph">✓</span></span>
              {t("register.terms")}
            </label>
            {renderError("terms")}
          </>
        )}

        <AuthSubmitButton loading={loading}>
          {isConfirmStep ? t("register.confirmSubmit") : t("register.submit")}
        </AuthSubmitButton>
      </form>

      <p className="auth-switch">
        {t("register.existing")}
        <Link to="/login">{t("common.signIn")}</Link>
      </p>
    </AuthShell>
  );
}

export default Register;
