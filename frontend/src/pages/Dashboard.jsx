import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { ACTION_LABELS, formatDate, parseDate } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import PageTransition from "../components/PageTransition.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import CommandBlock from "../components/CommandBlock.jsx";
import Typewriter from "../components/Typewriter.jsx";
import PixelSprite from "../components/PixelArt.jsx";
import Identicon from "../components/dashboard/Identicon.jsx";
import Sparkline from "../components/dashboard/Sparkline.jsx";
import Heartbeat from "../components/dashboard/Heartbeat.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";
import PulseGrid from "../components/backdrops/PulseGrid.jsx";
import { staggerContainer, staggerItem, easeOut } from "../lib/motion.js";

const EMPTY_DETAIL = { loading: false, secrets: [], members: [], audit: null };
const DAY_MS = 24 * 60 * 60 * 1000;
const ROTATION_WINDOW_DAYS = 3;

function labelOf(entry) {
  if (entry.action === "secret.update" && entry.detail === "rotated") return "Secret rotated";
  return ACTION_LABELS[entry.action] || entry.action;
}

function toneOf(action) {
  if (action.includes("revoke") || action.includes("remove") || action.includes("delete")) return "log-revoke";
  if (action.includes("share") || action.includes("add") || action.includes("create")) return "log-share";
  if (action.includes("update")) return "log-update";
  return "";
}

// Last 7 days as counts, oldest first. Used for sparklines and the bar chart.
function countsByDay(entries) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    return { key: day.toDateString(), label: day.toLocaleDateString(undefined, { weekday: "short" }), count: 0 };
  });
  (entries || []).forEach((entry) => {
    const when = parseDate(entry.created_at);
    if (!when) return;
    const match = days.find((day) => day.key === when.toDateString());
    if (match) match.count += 1;
  });
  return days;
}

// A secret needs attention when it was rotated recently (version bumped in the last few days).
function isRecentlyRotated(secret) {
  const updated = parseDate(secret.updated_at);
  if (!updated) return false;
  return Date.now() - updated.getTime() < ROTATION_WINDOW_DAYS * DAY_MS && secret.version > 1;
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [teams, setTeams] = useState(null);
  const [secretCounts, setSecretCounts] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listTeams();
      setTeams(list);
      setError("");
      setSelectedId((current) => {
        if (list.some((team) => team.id === current)) return current;
        return list.length > 0 ? list[0].id : null;
      });
      const counts = await Promise.all(
        list.map(async (team) => {
          try {
            const secrets = await api.listSecrets(team.id);
            return [team.id, secrets.length];
          } catch {
            return [team.id, 0];
          }
        })
      );
      setSecretCounts(Object.fromEntries(counts));
    } catch (err) {
      setError(err.message);
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    api
      .health()
      .then(() => active && setOnline(true))
      .catch(() => active && setOnline(false));
    return () => {
      active = false;
    };
  }, []);

  const selected = teams ? teams.find((team) => team.id === selectedId) || null : null;
  const selectedTeamId = selected ? selected.id : null;
  const isAdmin = selected ? selected.role === "admin" : false;

  useEffect(() => {
    if (!selectedTeamId) {
      setDetail(EMPTY_DETAIL);
      return undefined;
    }
    let active = true;
    setDetail({ ...EMPTY_DETAIL, loading: true });
    Promise.all([
      api.listSecrets(selectedTeamId),
      api.listMembers(selectedTeamId),
      isAdmin ? api.listAudit(selectedTeamId, 100) : Promise.resolve(null),
    ])
      .then(([secrets, members, audit]) => {
        if (active) setDetail({ loading: false, secrets, members, audit });
      })
      .catch(() => {
        if (active) setDetail({ ...EMPTY_DETAIL });
      });
    return () => {
      active = false;
    };
  }, [selectedTeamId, isAdmin]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (teams || []).filter((team) => team.name.toLowerCase().includes(needle));
  }, [teams, query]);

  const totalSecrets = Object.values(secretCounts).reduce((sum, count) => sum + count, 0);
  const adminTeams = teams ? teams.filter((team) => team.role === "admin").length : 0;

  const week = useMemo(() => countsByDay(detail.audit), [detail.audit]);
  const weekTotal = week.reduce((sum, day) => sum + day.count, 0);
  const weekCounts = week.map((day) => day.count);
  const recent = (detail.audit || []).slice(0, 7);

  const rotatedCount = detail.secrets.filter(isRecentlyRotated).length;
  const staleAudit = detail.audit !== null && detail.audit.length === 0;

  async function handleCreate(event) {
    event.preventDefault();
    const name = teamName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      const team = await api.createTeam(name);
      toast(`Team "${team.name}" created`, "success");
      setCreating(false);
      setTeamName("");
      setSelectedId(team.id);
      await load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="container bd-wrap dash-bg">
        <div className="bd-layer" aria-hidden="true">
          <PulseGrid />
        </div>
        <div className="bd-content">
          <div className="status-bar" role="status">
            <span className="status-item">
              <span className="pulse-dot" aria-hidden="true" />
              Encrypted on this machine
            </span>
            <span className="status-item">
              <Heartbeat online={online} />
              Server {online === null ? "checking" : online ? "online" : "offline"}
            </span>
            <span className="status-item">Signed in as {user.email}</span>
          </div>

          <header className="page-head">
            <div>
              <p className="eyebrow">Overview</p>
              <h1>
                <Typewriter text={`Hello, ${user.full_name}`} speed={42} />
              </h1>
            </div>
            <Button onClick={() => setCreating(true)}>New team</Button>
          </header>

          {error ? (
            <Card style={{ marginBottom: 20 }}>
              <p className="muted">Could not load your teams: {error}</p>
            </Card>
          ) : null}

          <div className="stats-grid four">
            <Card className="stat">
              <span className="stat-label">Teams</span>
              <span className="stat-value">{teams ? teams.length : "—"}</span>
              <Sparkline values={[0, 0, 0, 0, 0, 0, teams ? teams.length : 0]} label="Teams" />
            </Card>
            <Card className="stat">
              <span className="stat-label">Teams you administer</span>
              <span className="stat-value">{teams ? adminTeams : "—"}</span>
              <span className="stat-note">admin role</span>
            </Card>
            <Card className="stat">
              <span className="stat-label">Secrets you can read</span>
              <span className="stat-value">{teams ? totalSecrets : "—"}</span>
              <span className="stat-note">across all teams</span>
            </Card>
                      <Card className={`stat ${rotatedCount > 0 ? "is-alert" : ""}`.trim()}>
              <span className="stat-label">Events this week</span>
              <span className="stat-value">{isAdmin && detail.audit ? weekTotal : "—"}</span>
              <Sparkline
                values={weekCounts}
                color={rotatedCount > 0 ? "var(--danger)" : "var(--accent)"}
                label="Events per day, last 7 days"
              />
            </Card>
          </div>

          <div className="split-view">
            <Card className="pane">
              <p className="eyebrow">Teams</p>
              <input
                data-search
                type="search"
                className="search"
                placeholder="Filter teams  ( Ctrl K )"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Filter teams"
              />

              {teams === null ? (
                <div style={{ marginTop: 14 }}>
                  <SkeletonList rows={3} />
                </div>
              ) : visible.length === 0 ? (
                <p className="muted small pad">{teams.length === 0 ? "No teams yet." : "No matches."}</p>
              ) : (
                <motion.ul className="team-list" variants={staggerContainer} initial="hidden" animate="show">
                  {visible.map((team) => {
                    const active = team.id === selectedId;
                    return (
                      <motion.li key={team.id} variants={staggerItem}>
                        <button
                          type="button"
                          className={`team-row ${active ? "is-active" : ""}`.trim()}
                          onClick={() => setSelectedId(team.id)}
                          aria-pressed={active}
                        >
                          <span className="row-left">
                            <PixelSprite name="shield" size={2} color={active ? "var(--accent)" : "var(--muted)"} />
                            <span className="team-row-name">{team.name}</span>
                          </span>
                          <span className={`badge badge-${team.role}`}>{team.role}</span>
                        </button>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </Card>

            <Card className="pane">
              {teams === null ? (
                <SkeletonList rows={3} />
              ) : !selected ? (
                <div className="empty">
                  <h3>No team selected</h3>
                  <p className="muted">Create a team here, or from the terminal with the command below.</p>
                  <div style={{ marginTop: 18, textAlign: "left" }}>
                    <CommandBlock title="Terminal" lines={["envvault team create Backend"]} />
                  </div>
                </div>
              ) : (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  <p className="eyebrow">Team</p>
                  <h2 className="detail-title">{selected.name}</h2>
                  <div className="row-actions">
                    <span className={`badge badge-${selected.role}`}>Your role: {selected.role}</span>
                    <span className="small muted mono">{selected.id.slice(0, 8)}</span>
                  </div>

                  <div className="detail-stats">
                    <div className="stat">
                      <span className="stat-label">Secrets</span>
                      <span className="stat-value">{detail.loading ? "—" : detail.secrets.length}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Needs rotation</span>
                      <span className={`stat-value ${rotatedCount > 0 ? "is-alert" : ""}`.trim()}>
                        {detail.loading ? "—" : rotatedCount}
                      </span>
                    </div>
                  </div>

                  <p className="eyebrow" style={{ marginTop: 6 }}>Members</p>
                  {detail.loading ? (
                    <SkeletonList rows={1} />
                  ) : detail.members.length === 0 ? (
                    <p className="muted small">No members loaded.</p>
                  ) : (
                    <div className="member-faces">
                      {detail.members.map((member) => (
                        <span key={member.user_id} className="member-face" title={`${member.full_name} · ${member.role}`}>
                          <Identicon seed={member.user_id} size={4} color={member.role === "admin" ? "var(--accent)" : "var(--text)"} />
                          <span className="member-face-name">{member.full_name}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="eyebrow" style={{ marginTop: 18 }}>Secrets</p>
                  {detail.loading ? (
                    <SkeletonList rows={2} />
                  ) : detail.secrets.length === 0 ? (
                    <p className="muted small">No secrets yet. Push one from the terminal.</p>
                  ) : (
                    <ul className="secret-preview">
                      {detail.secrets.slice(0, 5).map((secret) => {
                        const rotated = isRecentlyRotated(secret);
                        return (
                          <li key={secret.id}>
                            <span className="row-left">
                              <PixelSprite
                                name={rotated ? "key" : "lock"}
                                size={2}
                                color={rotated ? "var(--danger)" : "var(--accent)"}
                              />
                              <span>{secret.name}</span>
                            </span>
                            <span className="pill">v{secret.version}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="row-actions" style={{ marginTop: 20 }}>
                    <Link className="btn btn-primary" to={`/teams/${selected.id}`}>
                      Open team
                    </Link>
                  </div>
                </motion.div>
              )}
            </Card>
          </div>

          <div className="two-col">
            <Card>
              <p className="eyebrow">Activity · last 7 days</p>
              {!selected ? (
                <p className="muted small">Select a team to see its activity.</p>
              ) : !isAdmin ? (
                <p className="muted small">Activity charts are visible to team admins.</p>
              ) : detail.loading || detail.audit === null ? (
                <SkeletonList rows={2} />
              ) : (
                <div className="bars" role="img" aria-label={`${weekTotal} events in the last 7 days`}>
                  {week.map((day) => {
                    const pct = Math.round((day.count / Math.max(1, ...weekCounts)) * 100);
                    return (
                      <div key={day.key} className="bar-col">
                        <span className="bar-count">{day.count}</span>
                        <motion.div
                          className={`bar ${day.count === 0 ? "is-empty" : ""}`.trim()}
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(pct, 3)}%` }}
                          transition={{ duration: 0.6, ease: easeOut }}
                        />
                        <span className="bar-label">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <p className="eyebrow">Recent activity</p>
              {!selected ? (
                <p className="muted small">Select a team to see its activity.</p>
              ) : !isAdmin ? (
                <p className="muted small">The audit log is visible to team admins.</p>
              ) : detail.loading || detail.audit === null ? (
                <SkeletonList rows={3} />
              ) : staleAudit ? (
                <p className="muted small">No activity yet in this team.</p>
              ) : (
                <div>
                  {recent.map((entry) => (
                    <div key={entry.id} className="activity-item">
                      <span className={`log-dot ${toneOf(entry.action)}`.trim()} aria-hidden="true" />
                      <div className="grow">
                        <strong>{labelOf(entry)}</strong>
                        <div className="activity-meta">{formatDate(entry.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  <div className="detail-divider" />
                  <Link className="small" to={`/teams/${selected.id}/audit`}>
                    View full audit log →
                  </Link>
                </div>
              )}
            </Card>
          </div>

          <Card style={{ marginTop: 24, marginBottom: 40 }}>
            <p className="eyebrow">Quick start</p>
            <h3 style={{ marginBottom: 14 }}>Work from the terminal</h3>
            <CommandBlock
              title="Common commands"
              lines={[
                "envvault team list",
                "envvault member add TEAM_ID teammate@example.com --role member",
                "envvault push TEAM_ID .env",
                "envvault pull TEAM_ID .env --out .env",
              ]}
            />
          </Card>
        </div>
      </div>

      <Modal open={creating} title="Create a team" onClose={() => setCreating(false)}>
        <form className="form" onSubmit={handleCreate}>
          <label className="field">
            <span>Team name</span>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              maxLength={100}
              required
              autoFocus
              placeholder="Backend"
            />
          </label>
          <p className="muted small">You become the team admin. Add teammates from the Members tab.</p>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create team
            </Button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}