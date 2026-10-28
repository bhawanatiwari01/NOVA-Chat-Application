import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  MessageCircle,
  ArrowRight,
  Check,
  Phone,
} from "lucide-react";
import "./Auth.css";

/* ---------- helpers ---------- */

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const strengthLabel = ["Too short", "Weak", "Okay", "Good", "Strong"];

/* ---------- small reusable pieces ---------- */

function Field({ id, label, icon: Icon, error, right, ...inputProps }) {
  return (
    <div className={`au-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="au-input">
        <Icon size={18} />
        <input id={id} {...inputProps} />
        {right}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.span
            className="au-error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function PasswordField({ id, label, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <Field
      id={id}
      label={label}
      icon={Lock}
      error={error}
      type={show ? "text" : "password"}
      right={
        <button
          type="button"
          className="au-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.200 0 11.600-2 15.500-5.600l-7.500-5.800c-2.100 1.400-4.800 2.300-8 2.300-6.300 0-11.700-4.100-13.600-9.800l-7.800 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

/* ---------- main component ---------- */

const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  remember: true,
  terms: false,
};

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isRegister = mode === "register";
  const strength = getStrength(form.password);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setErrors({});
  }

  function validate() {
    const er = {};
    if (isRegister && form.name.trim().length < 2) er.name = "Enter your full name";
    if (!emailOk(form.email)) er.email = "Enter a valid email address";
    if (isRegister) {
      if (form.password.length < 8) er.password = "Use at least 8 characters";
      if (form.confirm !== form.password) er.confirm = "Passwords do not match";
      if (!form.terms) er.terms = "Accept the terms to continue";
    } else if (!form.password) {
      er.password = "Enter your password";
    }
    return er;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setLoading(true);
    // TODO: yahan apni real API call lagao (fetch/axios).
    // Example: await fetch("/api/login", { method: "POST", body: JSON.stringify(form) })
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
  }

  const displayName = form.name.trim() || form.email.split("@")[0];

  return (
    <div className="au-page">
      <div className="au-shell">
        {/* ---------- left: brand panel ---------- */}
        <aside className="au-side">
          <div className="au-brand">
            <span className="au-brand-icon">
              <MessageCircle size={22} />
            </span>
            Nova<span className="au-brand-dot">.</span>
          </div>

          <div className="au-side-body">
            <h2>Your conversations, all in one calm place.</h2>
            <p>Message friends, share moments and never lose a thread again.</p>

            <div className="au-bubbles" aria-hidden="true">
              {[
                { t: "Hey! Did you try Nova yet? 👋", mine: false, d: 0.2 },
                { t: "Just signing up 😊", mine: true, d: 0.7 },
                { t: "Welcome in! ✨", mine: false, d: 1.2 },
              ].map((b) => (
                <motion.div
                  key={b.t}
                  className={`au-bubble ${b.mine ? "mine" : ""}`}
                  initial={{ opacity: 0, y: 14, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: b.d, duration: 0.35 }}
                >
                  {b.t}
                </motion.div>
              ))}
            </div>
          </div>

          <small className="au-side-foot">Free to start. No card needed.</small>
        </aside>

        {/* ---------- right: form panel ---------- */}
        <section className="au-main">
          <div className="au-mobile-brand">
            <span className="au-brand-icon">
              <MessageCircle size={20} />
            </span>
            Nova<span className="au-brand-dot">.</span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div
                key="done"
                className="au-done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="au-done-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                >
                  <Check size={34} strokeWidth={3} />
                </motion.div>
                <h1>{isRegister ? "Account created" : "Welcome back"}, {displayName}</h1>
                <p>
                  {isRegister
                    ? "You're all set. Your chats are ready."
                    : "You're signed in. Pick up right where you left off."}
                </p>
                <button
                  className="au-submit"
                  onClick={() => onAuth?.({ name: displayName, email: form.email })}
                >
                  <span>Open Nova</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  className="au-link"
                  onClick={() => {
                    setDone(false);
                    setForm(emptyForm);
                  }}
                >
                  Use a different account
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="au-tabs" role="tablist">
                  {["login", "register"].map((m) => (
                    <button
                      key={m}
                      role="tab"
                      aria-selected={mode === m}
                      className={mode === m ? "active" : ""}
                      onClick={() => switchMode(m)}
                      type="button"
                    >
                      {mode === m && (
                        <motion.span
                          layoutId="au-pill"
                          className="au-pill"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="au-tab-text">{m === "login" ? "Log in" : "Sign up"}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: isRegister ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRegister ? -24 : 24 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
                    <p className="au-sub">
                      {isRegister
                        ? "It takes less than a minute."
                        : "Log in to continue to your chats."}
                    </p>

                    <button type="button" className="au-social">
                      <GoogleIcon />
                      Continue with Google
                    </button>
                    <button type="button" className="au-social">
                      <Phone size={18} />
                      Continue with phone number
                    </button>

                    <div className="au-divider">
                      <span>or use your email</span>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                      {isRegister && (
                        <Field
                          id="name"
                          label="Full name"
                          icon={User}
                          placeholder="Priya Sharma"
                          autoComplete="name"
                          value={form.name}
                          onChange={set("name")}
                          error={errors.name}
                        />
                      )}

                      <Field
                        id="email"
                        label="Email"
                        icon={Mail}
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={form.email}
                        onChange={set("email")}
                        error={errors.email}
                      />

                      <PasswordField
                        id="password"
                        label="Password"
                        placeholder={isRegister ? "At least 8 characters" : "Your password"}
                        autoComplete={isRegister ? "new-password" : "current-password"}
                        value={form.password}
                        onChange={set("password")}
                        error={errors.password}
                      />

                      {isRegister && form.password && (
                        <div className="au-meter" aria-live="polite">
                          <div className="au-meter-bars">
                            {[1, 2, 3, 4].map((i) => (
                              <span
                                key={i}
                                className={i <= strength ? `on s${strength}` : ""}
                              />
                            ))}
                          </div>
                          <small className={`s${strength}`}>{strengthLabel[strength]}</small>
                        </div>
                      )}

                      {isRegister && (
                        <PasswordField
                          id="confirm"
                          label="Confirm password"
                          placeholder="Type it again"
                          autoComplete="new-password"
                          value={form.confirm}
                          onChange={set("confirm")}
                          error={errors.confirm}
                        />
                      )}

                      {!isRegister ? (
                        <div className="au-row">
                          <label className="au-check">
                            <input
                              type="checkbox"
                              checked={form.remember}
                              onChange={set("remember")}
                            />
                            <span className="au-box"><Check size={13} strokeWidth={3.5} /></span>
                            Remember me
                          </label>
                          <button type="button" className="au-link">Forgot password?</button>
                        </div>
                      ) : (
                        <div className="au-terms">
                          <label className="au-check">
                            <input
                              type="checkbox"
                              checked={form.terms}
                              onChange={set("terms")}
                            />
                            <span className="au-box"><Check size={13} strokeWidth={3.5} /></span>
                            I agree to the Terms and Privacy Policy
                          </label>
                          {errors.terms && <span className="au-error show" role="alert">{errors.terms}</span>}
                        </div>
                      )}

                      <button className="au-submit" type="submit" disabled={loading}>
                        {loading ? (
                          <span className="au-spinner" aria-label="Please wait" />
                        ) : (
                          <>
                            <span>{isRegister ? "Create account" : "Log in"}</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="au-switch">
                      {isRegister ? "Already have an account?" : "New to Nova?"}{" "}
                      <button
                        type="button"
                        className="au-link"
                        onClick={() => switchMode(isRegister ? "login" : "register")}
                      >
                        {isRegister ? "Log in" : "Create an account"}
                      </button>
                    </p>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}