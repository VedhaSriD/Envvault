import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useGlobalHotkeys } from "../lib/hotkeys.js";

const SECTIONS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "CLI", href: "#cli" },
];

export default function Navbar() {
  const { user, ready, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const onLanding = location.pathname === "/";

  useGlobalHotkeys(navigate);

  function handleSignOut() {
    logout();
    navigate("/");
  }

  return (
    <motion.header
      className="navbar"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <nav className="navbar-inner container" aria-label="Main navigation">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          envvault
        </Link>

        <ul className="nav-links">
          {onLanding
            ? SECTIONS.map((section) => (
                <li key={section.href}>
                  <a className="nav-item" href={section.href}>
                    {section.label}
                  </a>
                </li>
              ))
            : null}
          {user ? (
            <li>
              <NavLink to="/dashboard" className="nav-item">
                Dashboard
              </NavLink>
            </li>
          ) : null}
        </ul>

        <div className="nav-actions">
          <span className="kbd-hint" aria-label="Keyboard shortcuts">
            <kbd>⌘K</kbd>
            <kbd>G</kbd>
            <kbd>D</kbd>
          </span>
          {ready && user ? (
            <>
              <span className="nav-user">{user.full_name}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : ready ? (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          ) : null}
        </div>
      </nav>
    </motion.header>
  );
}