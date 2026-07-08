import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthNotice, AuthShell, AuthSubmitButton } from "../components/AuthShell";
import SocialAuthButtons from "../components/SocialAuthButtons";
import { useLanguage } from "../contexts/LanguageContext";
import { confirmRegister, registerUser, resendConfirmCode } from "../services/authService";
import "./Register.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const getPasswordChecks = (value) => ({
  length: value.length >= 8,
  upper: /[A-Z]/.test(value),
  lower: /[a-z]/.test(value),
  number: /\d/.test(value),
  symbol: /[^A-Za-z0-9]/.test(value),
});

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [step, setStep] = useState(location.state?.needsConfirmation ? "confirm" : "register");
  const [email, setEmail] = useState(location.state?.email || "");
  const [username, setUsername] = useState("");
  const [tag, setTag] = useState("VIE");
  const [isChecking, setIsChecking] = useState(false);
  const [isTaken, setIsTaken] = useState(false);
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

  const fullUsername = `${username}#${tag}`;
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const shouldShowPasswordChecklist =
    !isConfirmStep && (password.length > 0 || touched.password);
  const passwordRules = [
    { key: "length", label: t("auth.passwordRuleLength") },
    { key: "upper", label: t("auth.passwordRuleUpper") },
    { key: "lower", label: t("auth.passwordRuleLower") },
    { key: "number", label: t("auth.passwordRuleNumber") },
    { key: "symbol", label: t("auth.passwordRuleSymbol") },
  ];

  useEffect(() => {
    if (isConfirmStep || username.length < 3) {
      const tId = setTimeout(() => {
        setIsChecking(false);
        setIsTaken(false);
      }, 0);
      return () => clearTimeout(tId);
    }

    const tId = setTimeout(() => {
      setIsChecking(true);
    }, 0);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/check-username?username=${encodeURIComponent(fullUsername)}`);
        if (response.ok) {
          const data = await response.json();
          setIsTaken(data.isTaken);
        }
      } catch (err) {
        console.error("Failed to check username:", err);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => {
      clearTimeout(tId);
      clearTimeout(timeoutId);
    };
  }, [username, tag, isConfirmStep, fullUsername]);


  const errors = useMemo(() => {
    const nextErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = t("auth.emailInvalid");

    if (isConfirmStep) {
      if (!confirmationCode.trim()) nextErrors.confirmationCode = t("auth.codeRequired");
    } else {
      if (!PASSWORD_POLICY_PATTERN.test(password)) {
        nextErrors.password = t("auth.passwordInvalid");
      }
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
    if (Object.keys(errors).length > 0 || isTaken || username.length < 3 || tag.length === 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await registerUser({ email: email.trim(), password, attributes: { preferred_username: fullUsername } });
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
    <AuthShell pageClass="register-page" useCommandHeader={true}>
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

        {!isConfirmStep && (
          <label className="auth-field">
            <span>{t("common.username")}</span>
            <div className="auth-input-shell">
              <span className="auth-glyph auth-input-glyph" aria-hidden="true">*</span>
              <div className="auth-username-tag-container">
                <input
                  type="text"
                  className="auth-username-input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Commander"
                  disabled={isConfirmStep}
                />
                <span className="auth-input-hash">#</span>
                <input
                  type="text"
                  className="auth-tag-input"
                  value={tag}
                  onChange={(event) => setTag(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={5}
                  disabled={isConfirmStep}
                />
              </div>
            </div>
            {username.length > 0 && (
              <div className={`auth-validation-msg ${isChecking ? "is-checking" : (isTaken || username.length < 3 || tag.length === 0) ? "is-error" : "is-valid"}`}>
                {isChecking ? t("profile.checking") : username.length < 3 ? t("profile.nameTooShort") : tag.length === 0 ? t("profile.tagEmpty") : isTaken ? t("profile.nameTaken") : t("profile.nameValid")}
              </div>
            )}
          </label>
        )}

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
              {shouldShowPasswordChecklist && (
                <div className="auth-password-rules" aria-live="polite">
                  {passwordRules.map((rule) => {
                    const isMet = passwordChecks[rule.key];
                    return (
                      <span
                        key={rule.key}
                        className={isMet ? "is-met" : "is-missing"}
                      >
                        <i aria-hidden="true">{isMet ? "✓" : "•"}</i>
                        {rule.label}
                      </span>
                    );
                  })}
                </div>
              )}
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
