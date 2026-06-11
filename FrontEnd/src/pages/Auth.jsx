import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import shipOne from "../assets/ships/image/ship-1.png";
import "./Auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Auth({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    callsign: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: true,
    terms: false,
  });
  const [touched, setTouched] = useState({});

  const errors = useMemo(() => {
    const nextErrors = {};

    if (isRegister && form.callsign.trim().length < 3) {
      nextErrors.callsign = "Callsign must contain at least 3 characters.";
    }

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.password.length < 8) {
      nextErrors.password = "Password must contain at least 8 characters.";
    }

    if (isRegister && form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (isRegister && !form.terms) {
      nextErrors.terms = "Accept the service terms to continue.";
    }

    return nextErrors;
  }, [form, isRegister]);

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const fields = isRegister
      ? ["callsign", "email", "password", "confirmPassword", "terms"]
      : ["email", "password"];

    setTouched(Object.fromEntries(fields.map((field) => [field, true])));

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError("");

    await new Promise((resolve) => window.setTimeout(resolve, 650));

    if (isRegister) {
      localStorage.setItem(
        "battleshipAccount",
        JSON.stringify({
          callsign: form.callsign.trim(),
          email: form.email.trim(),
        }),
      );
    }

    const savedAccount = JSON.parse(localStorage.getItem("battleshipAccount") || "null");
    localStorage.setItem(
      "battleshipSession",
      JSON.stringify({
        callsign: isRegister ? form.callsign.trim() : savedAccount?.callsign || "Commander",
        email: form.email.trim(),
        remember: isRegister || form.remember,
      }),
    );

    setIsSubmitting(false);
    navigate("/", { replace: true });
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
            <h1>{isRegister ? "Enlist as commander" : "Commander access"}</h1>
            <p>
              {isRegister
                ? "Create your fleet identity and enter the arena."
                : "Authenticate to resume command of your fleet."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {submitError && <div className="auth-submit-error">{submitError}</div>}

            {isRegister && (
              <label className="auth-field">
                <span>Callsign</span>
                <div className={`auth-input-shell ${touched.callsign && errors.callsign ? "is-invalid" : ""}`}>
                  <span className="auth-glyph auth-input-glyph" aria-hidden="true">ID</span>
                  <input
                    name="callsign"
                    value={form.callsign}
                    onChange={updateField}
                    onBlur={() => setTouched((current) => ({ ...current, callsign: true }))}
                    placeholder="e.g. Tidebreaker"
                    autoComplete="nickname"
                    aria-describedby={errors.callsign ? "callsign-error" : undefined}
                  />
                </div>
                {renderError("callsign")}
              </label>
            )}

            <label className="auth-field">
              <span>Email address</span>
              <div className={`auth-input-shell ${touched.email && errors.email ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">@</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  placeholder="commander@fleet.com"
                  autoComplete="email"
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {renderError("email")}
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div className={`auth-input-shell ${touched.password && errors.password ? "is-invalid" : ""}`}>
                <span className="auth-glyph auth-input-glyph" aria-hidden="true">●</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={updateField}
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

            {isRegister && (
              <label className="auth-field">
                <span>Confirm password</span>
                <div className={`auth-input-shell ${touched.confirmPassword && errors.confirmPassword ? "is-invalid" : ""}`}>
                  <span className="auth-glyph auth-input-glyph" aria-hidden="true">✓</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateField}
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

            <div className="auth-form-options">
              <label className="auth-check">
                <input
                  type="checkbox"
                  name={isRegister ? "terms" : "remember"}
                  checked={isRegister ? form.terms : form.remember}
                  onChange={updateField}
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
            {isRegister && renderError("terms")}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? (
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
                  <span>{isRegister ? "Create account" : "Enter command"}</span>
                  <span className="auth-submit-icon" aria-hidden="true">
                    <i />
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already enlisted?" : "New to the command network?"}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </p>
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
