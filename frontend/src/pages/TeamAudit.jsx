import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { ACTION_LABELS, formatDate } from "../lib/format.js";
import { staggerContainer, staggerItem } from "../lib/motion.js";
import { useToast } from "../components/Toast.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

function toneOf(action) {
  if (action.includes("revoke") || action.includes("remove") || action.includes("delete")) return "revoke";
  if (action.includes("share") || action.includes("add") || action.includes("create")) return "share";
  if (action.includes("update")) return "update";
  return "read";
}

function labelOf(entry) {
  if (entry.action === "secret.update" && entry.detail === "rotated") return "Secret rotated";
  return ACTION_LABELS[entry.action] || entry.action;
}

export default function TeamAudit() {
  const { team, role } = useOutletContext();
  const toast = useToast();
  const isAdmin = role === "admin";

  const [logs, setLogs] = useState(null);
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    try {
      const [entries, people] = await Promise.all([
        api.listAudit(team.id, 100),
        api.listMembers(team.id),
      ]);
      setLogs(entries);
      setMembers(people);
    } catch (err) {
      toast(err.message, "error");
      setLogs([]);
    }
  }, [team.id, toast]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <Card className="empty">
        <h3>Admins only</h3>
        <p className="muted">The audit log is visible to team admins.</p>
      </Card>
    );
  }

  const nameOf = (userId) => {
    const match = members.find((member) => member.user_id === userId);
    return match ? match.full_name : "a removed member";
  };

  // Replaces raw user ids in the detail text with readable names.
  const describeDetail = (detail) => {
    if (!detail) return "";
    return detail.replace(/(?:target_)?user_id=([0-9a-f-]{36})/g, (_, id) => nameOf(id));
  };

  return (
    <>
      <div className="toolbar">
        <span className="muted small">Newest first · up to 100 entries</span>
        <Button variant="ghost" className="btn-sm" onClick={load}>
          Refresh
        </Button>
      </div>

      {logs === null ? (
        <SkeletonList rows={4} />
      ) : logs.length === 0 ? (
        <Card className="empty">
          <h3>No activity yet</h3>
          <p className="muted">Actions in this team will appear here.</p>
        </Card>
      ) : (
        <motion.ul className="list" variants={staggerContainer} initial="hidden" animate="show">
          {logs.map((entry) => {
            const detail = describeDetail(entry.detail);
            return (
              <motion.li key={entry.id} variants={staggerItem} className="log-row">
                <span className={`log-dot log-${toneOf(entry.action)}`} aria-hidden="true" />
                <div className="log-body">
                  <strong>{labelOf(entry)}</strong>
                  <p className="muted small" style={{ marginTop: 4 }}>
                    by {entry.user_id ? nameOf(entry.user_id) : "system"}
                    {entry.secret_id ? ` · secret ${entry.secret_id.slice(0, 8)}` : ""}
                    {detail ? ` · ${detail}` : ""}
                  </p>
                </div>
                <time className="log-time">{formatDate(entry.created_at)}</time>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </>
  );
}