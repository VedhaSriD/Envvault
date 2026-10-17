import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import { easeOut, staggerContainer, staggerItem } from "../lib/motion.js";
import { useToast } from "../components/Toast.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import CommandBlock from "../components/CommandBlock.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

export default function TeamSecrets() {
  const { team, role } = useOutletContext();
  const toast = useToast();
  const isAdmin = role === "admin";

  const [secrets, setSecrets] = useState(null);
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [access, setAccess] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, people] = await Promise.all([api.listSecrets(team.id), api.listMembers(team.id)]);
      setSecrets(list);
      setMembers(people);
    } catch (err) {
      toast(err.message, "error");
      setSecrets([]);
    }
  }, [team.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (userId) =>
    members.find((member) => member.user_id === userId)?.full_name || "Removed member";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (secrets || []).filter((secret) => secret.name.toLowerCase().includes(needle));
  }, [secrets, query]);

  async function toggleAccess(secret) {
    if (openId === secret.id) {
      setOpenId(null);
      return;
    }
    setOpenId(secret.id);
    if (access[secret.id]) return;
    try {
      const rows = await api.listAccess(secret.id);
      setAccess((previous) => ({ ...previous, [secret.id]: { rows } }));
    } catch (err) {
      setAccess((previous) => ({ ...previous, [secret.id]: { error: err.message } }));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteSecret(pendingDelete.id);
      toast(`Deleted ${pendingDelete.name}`, "success");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="split">
        <Card>
          <p className="eyebrow">Encrypted on your machine</p>
          <h3 style={{ marginBottom: 10 }}>Secrets are managed from the CLI</h3>
          <p className="muted">
            Values are encrypted and decrypted locally. This page shows names, versions and who has
            access, but never a plaintext value.
          </p>
        </Card>
        <CommandBlock
          title="Team commands"
          lines={[
            `envvault push ${team.id} .env`,
            `envvault pull ${team.id} .env --out .env`,
            `envvault share ${team.id} .env teammate@example.com`,
            `envvault revoke ${team.id} .env teammate@example.com`,
          ]}
        />
      </div>

      <div className="toolbar" style={{ marginTop: 28 }}>
        <input
          className="search"
          type="search"
          placeholder="Filter secrets by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter secrets"
        />
        <span className="muted small">
          {secrets ? `${visible.length} of ${secrets.length} shown` : ""}
        </span>
      </div>

      {secrets === null ? (
        <SkeletonList rows={3} />
      ) : visible.length === 0 ? (
        <Card className="empty">
          <h3>{secrets.length === 0 ? "No secrets yet" : "No matches"}</h3>
          <p className="muted">
            {secrets.length === 0
              ? "Push one with the command above."
              : "Try a different filter."}
          </p>
        </Card>
      ) : (
        <motion.ul className="list" variants={staggerContainer} initial="hidden" animate="show">
          {visible.map((secret) => {
            const open = openId === secret.id;
            const entry = access[secret.id];
            return (
              <motion.li key={secret.id} variants={staggerItem}>
                <Card className="secret-card">
                  <div className="row-between">
                    <div>
                      <h3 className="mono">{secret.name}</h3>
                      <p className="muted small" style={{ marginTop: 4 }}>
                        Created by {nameOf(secret.created_by)} · updated {formatDate(secret.updated_at)}
                      </p>
                    </div>
                    <div className="row-actions">
                      <span className="pill pill-version">v{secret.version}</span>
                      <Button
                        variant="ghost"
                        className="btn-sm"
                        onClick={() => toggleAccess(secret)}
                        aria-expanded={open}
                      >
                        {open ? "Hide access" : "Access"}
                      </Button>
                      {isAdmin ? (
                        <Button variant="danger" className="btn-sm" onClick={() => setPendingDelete(secret)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key="panel"
                        className="access-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: easeOut }}
                      >
                        {!entry ? (
                          <SkeletonList rows={2} />
                        ) : entry.error ? (
                          <p className="muted small">You cannot view access for this secret: {entry.error}</p>
                        ) : entry.rows.length === 0 ? (
                          <p className="muted small">No one has access.</p>
                        ) : (
                          <ul className="access-list">
                            {entry.rows.map((row) => (
                              <li key={row.user_id}>
                                <span>{nameOf(row.user_id)}</span>
                                <span className="muted small">granted {formatDate(row.created_at)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="muted small">
                          To remove someone, use the CLI so the secret is rotated:
                        </p>
                        <code className="inline-cmd">
                          envvault revoke {team.id} {secret.name} teammate@example.com
                        </code>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Card>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <Modal open={Boolean(pendingDelete)} title="Delete this secret?" onClose={() => setPendingDelete(null)}>
        <p className="muted">
          <strong className="mono">{pendingDelete?.name}</strong> and all of its wrapped keys will be
          removed from the server. Local copies on people's machines are not affected.
        </p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            Delete permanently
          </Button>
        </div>
      </Modal>
    </>
  );
}