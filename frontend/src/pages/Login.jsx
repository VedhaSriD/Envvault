import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition.jsx";
import Button from "../components/Button.jsx";
import VaultDoor from "../components/backdrops/VaultDoor.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { easeOut } from "../lib/motion.js";

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  if (user) {
    return <Navigate to={location.state?.from || "/dashboard"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast("Signed in", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition className="auth-page">
      <div className="container auth-wrap">
        <div className="bd-wrap auth-stage">
          <div className="bd-layer" aria-hidden="true">
            <VaultDoor open={focused} />
          </div>
          <div className="bd-content">
            <motion.div
              className="card auth-card"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: easeOut }}
            >
              <p className="eyebrow">Welcome back</p>
              <h1>Sign in to Envvault</h1>
              <p className="muted">
                Signing in gives you the dashboard and your team's metadata. Your keys stay on your
                machine.
              </p>

              <form className="form" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="you@company.com"
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                </label>
                {error ? (
                  <motion.p
                    role="alert"
                    className="form-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.p>
                ) : null}
                <Button type="submit" loading={busy}>
                  Sign in
                </Button>
              </form>

              <p className="muted small" style={{ marginTop: 22 }}>
                No account yet? Create one in the terminal with{" "}
                <code className="inline-cmd">envvault register</code>. Keys are generated on your
                machine, so registration happens in the CLI.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}