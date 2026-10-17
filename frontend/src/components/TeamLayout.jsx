import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../lib/api.js";
import { easeOut } from "../lib/motion.js";
import Card from "./Card.jsx";
import { SkeletonList } from "./Skeleton.jsx";

const TABS = [
  { to: "secrets", label: "Secrets" },
  { to: "members", label: "Members" },
  { to: "audit", label: "Audit log" },
];

export default function TeamLayout() {
  const { teamId } = useParams();
  const location = useLocation();
  const [team, setTeam] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setTeam(undefined);
    setError("");
    api
      .listTeams()
      .then((teams) => {
        if (active) setTeam(teams.find((item) => item.id === teamId) || null);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  if (error) {
    return (
      <div className="page container">
        <Card className="empty">
          <h3>Could not load the team</h3>
          <p className="muted">{error}</p>
        </Card>
      </div>
    );
  }

  if (team === undefined) {
    return (
      <div className="page container">
        <SkeletonList rows={4} />
      </div>
    );
  }

  if (team === null) {
    return (
      <div className="page container">
        <Card className="empty">
          <h3>Team not found</h3>
          <p className="muted">It may not exist, or you are not a member of it.</p>
          <div style={{ marginTop: 18 }}>
            <Link className="btn btn-ghost" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page container">
      <motion.header
        className="team-head"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
      >
        <div>
          <p className="eyebrow">Team</p>
          <h1>{team.name}</h1>
        </div>
        <span className={`badge badge-${team.role}`}>Your role: {team.role}</span>
      </motion.header>

      <nav className="tabs" aria-label="Team sections">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className="tab">
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="team-tab"
                    className="tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="tab-text">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="tab-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet context={{ team, role: team.role }} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}