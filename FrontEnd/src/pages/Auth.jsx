import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import shipOne from "../assets/ships/image/ship-1.png";
import { registerUser, confirmRegister, loginUser, resendConfirmCode, getLoggedInUser } from "../services/authService";
import "./Auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Auth({ mode }) {
  const navigate = useNavigate();

  useEffect(() => {
    getLoggedInUser().then((user) => {
      if (user) navigate("/", { replace: true });
    }).catch(() => {});
  }, [navigate]);

  const [authMode, setAuthMode] = useState(mode || "login");
  // login | register | confirm

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Other form fields
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [remember, setRemember] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});

  const isRegister = authMode === "register";
  const isConfirm = authMode === "confirm";
  const isLogin = authMode === "login";

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!isConfirm && !EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!isConfirm && password.length < 8) {
      nextErrors.password = "Password must contain at least 8 characters.";
    }

    if (isRegister && confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (isRegister && !terms) {
      nextErrors.terms = "Accept the service terms to continue.";
    }

    if (isConfirm && confirmCode.trim().length === 0) {
      nextErrors.confirmCode = "Confirmation code is required.";
    }

    return nextErrors;
  }, [authMode, email, password, confirmPassword, terms, confirmCode, isRegister, isConfirm]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    let fields = [];
    if (isRegister) fields = ["email", "password", "confirmPassword", "terms"];
    else if (isConfirm) fields = ["confirmCode"];
    else fields = ["email", "password"];

    setTouched(Object.fromEntries(fields.map((field) => [field, true])));

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isRegister) {
        await registerUser({ email: email.trim(), password });
        setSuccess("Verification email sent.\nPlease check your inbox and spam folder.");
        setAuthMode("confirm");
        setTouched({});
      } else if (isConfirm) {
        await confirmRegister({ email: email.trim(), code: confirmCode.trim() });
        setSuccess("Email verified successfully! You can now log in.");
        setAuthMode("login");
        setTouched({});
      } else {
        await loginUser({ email: email.trim(), password });
        localStorage.setItem(
          "battleshipSession",
          JSON.stringify({
            callsign: "Commander",
            email: email.trim(),
            remember: remember,
          }),
        );
        window.dispatchEvent(new Event("battleship-auth-changed"));
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      if (err.name === "UsernameExistsException") {
        setError("User already exists.");
      } else if (err.name === "NotAuthorizedException" || err.name === "UserNotFoundException") {
        setError("Incorrect email or password.");
      } else if (err.name === "UserNotConfirmedException") {
        setError("User is not confirmed. Please verify your email.");
        setAuthMode("confirm");
      } else if (err.name === "CodeMismatchException") {
        setError("Invalid confirmation code.");
      } else if (err.name === "InvalidPasswordException") {
        setError("Password is not strong enough.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError("Email is missing. Cannot resend code.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await resendConfirmCode(email.trim());
      setSuccess("A new verification code has been sent.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <span className="auth-field-error" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;

  return (
    <main className="auth-page">
      <div className="auth-ocean" aria-hidden="true" />
      <div className="auth-grid-overlay" aria-hidden="true" />

      <header className="auth-header">
        <Link to="/" className="auth-brand" aria-label="Cloud Battleship Arena home">
          <span className="auth-glyph auth-brand-glyph" aria-hidden="true">◎</span>
          <span>
            <strong>Cloud Battleship</strong>
            <small>Arena Command Network</small>
          </span>
        </Link>
        <Link to="/" className="auth-home-link">
          <span className="auth-glyph" aria-hidden="true">←</span>
          Return to base
        </Link>
      </header>

      <section className="auth-layout">
        <div className="auth-form-panel">
          <div className="auth-form-heading">
            <span className="auth-kicker">
              <span className="auth-live-dot" />
              Secure channel online
            </span>
            <h1>{isRegister ? "Enlist as commander" : isConfirm ? "Verify your email" : "Commander access"}</h1>
            <p>
              {isRegister
                ? "Create your fleet identity and enter the arena."
                : isConfirm
                ? "Enter the code sent to your email."
                : "Authenticate to resume command of your fleet."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="auth-submit-error">{error}</div>}
            {success && <div className="auth-submit-success" style={{ color: '#4ade80', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

            {!isConfirm && (
              <label className="auth-field">
                <span>Email address</span>
                <div className={`auth-input-shell ${touched.email && errors.email ? "is-invalid" : ""}`}>
                  <span className="auth-glyph auth-input-glyph" aria-hidden="true">@</span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); setSuccess(""); }}
                    onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                    placeholder="commander@fleet.com"
                    autoComplete="email"
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                </div>
                {renderError("email")}
              </label>
            )}

            {!isConfirm && (
              <label className="auth-field">
                <span>Password</span>
                <div className={`auth-input-shell ${touched.password && errors.password ? "is-invalid" : ""}`}>
                  <span className="auth-glyph auth-input-glyph" aria-hidden="true">●</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); setSuccess(""); }}
                    onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                    placeholder="Minimum 8 characters"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="auth-glyph" aria-hidden="true">{showPassword ? "◌" : "◉"}</span>
                  </button>
                </div>
                {renderError("password")}
              </label>
            )}

            {isRegister && (
              <label className="auth-field">
                <span>Confirm password</span>
                <div className={`auth-input-shell ${touched.confirmPassword && errors.confirmPassword ? "is-invalid" : ""}`}>
                  <span className="auth-glyph auth-input-glyph" aria-hidden="true">✓</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); setSuccess(""); }}
                    onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                  >
                    <span className="auth-glyph" aria-hidden="true">{showConfirmPassword ? "◌" : "◉"}</span>
                  </button>
                </div>
                {renderError("confirmPassword")}
              </label>
            )}

            {isConfirm && (
              <label className="auth-field">
                <span>Confirmation Code</span>
                <div className={`auth-input-shell ${touched.confirmCode && errors.confirmCode ? "is-invalid" : ""}`}>
                  <span className="auth-glyph auth-input-glyph" aria-hidden="true">#</span>
                  <input
                    type="text"
                    name="confirmCode"
                    value={confirmCode}
                    onChange={(e) => { setConfirmCode(e.target.value); setError(""); setSuccess(""); }}
                    onBlur={() => setTouched((current) => ({ ...current, confirmCode: true }))}
                    placeholder="Enter the code from your email"
                    aria-describedby={errors.confirmCode ? "confirmCode-error" : undefined}
                  />
                </div>
                {renderError("confirmCode")}
              </label>
            )}

            {isConfirm && (
              <div className="auth-form-options" style={{ justifyContent: 'flex-end', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                <button type="button" className="auth-text-button" onClick={handleResendCode} disabled={loading}>
                  Resend Verification Code
                </button>
              </div>
            )}

            {!isConfirm && (
              <div className="auth-form-options">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    name={isRegister ? "terms" : "remember"}
                    checked={isRegister ? terms : remember}
                    onChange={(e) => {
                      if (isRegister) setTerms(e.target.checked);
                      else setRemember(e.target.checked);
                      setError("");
                      setSuccess("");
                    }}
                  />
                  <span aria-hidden="true">
                    <span className="auth-glyph">✓</span>
                  </span>
                  {isRegister ? "I accept the service terms" : "Keep me signed in"}
                </label>
                {!isRegister && (
                  <button type="button" className="auth-text-button">
                    Recover access
                  </button>
                )}
              </div>
            )}
            {isRegister && renderError("terms")}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-loading-bars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Establishing link
                </>
              ) : (
                <>
                  <span>{isRegister ? "Create account" : isConfirm ? "Verify code" : "Enter command"}</span>
                  <span className="auth-submit-icon" aria-hidden="true">
                    <i />
                  </span>
                </>
              )}
            </button>
          </form>

          {!isConfirm && (
            <p className="auth-switch">
              {isRegister ? "Already enlisted?" : "New to the command network?"}
              <button 
                type="button" 
                className="auth-text-button"
                style={{ marginLeft: '0.5rem', fontWeight: 500 }}
                onClick={() => {
                  setAuthMode(isRegister ? "login" : "register");
                  setError("");
                  setSuccess("");
                  setTouched({});
                }}
              >
                {isRegister ? "Sign in" : "Create account"}
              </button>
            </p>
          )}
        </div>

        <aside className="auth-visual-panel" aria-label="Fleet network status">
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

export default Auth;
