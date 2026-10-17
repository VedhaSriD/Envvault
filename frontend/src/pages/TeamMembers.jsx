import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import { staggerContainer, staggerItem } from "../lib/motion.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Modal from "../components/Modal.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

const ROLES = ["admin", "member", "viewer"];

const ROLE_HELP = {
  admin: "Manage members, revoke access and rotate secrets, view the audit log",
  member: "Read, create, update and share secrets",
  viewer: "Read the secrets they were granted",
};

export default function TeamMembers() {
  const { team, role } = useOutletContext();
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = role === "admin";

  const [members, setMembers] = useState(null);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await api.listMembers(team.id));
    } catch (err) {
      toast(err.message, "error");
      setMembers([]);
    }
  }, [team.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(event) {
    event.preventDefault();
    setSaving(true);
    const target = email.trim().toLowerCase();
    try {
      await api.addMember(team.id, target, newRole);
      toast(`${target} added as ${newRole}`, "success");
      setEmail("");
      await load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await api.removeMember(team.id, pendingRemove.user_id);
      toast(`${pendingRemove.email} removed`, "success");
      setPendingRemove(null);
      await load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="split">
        <div>
          <h3 className="section-subtitle">Members</h3>
          {members === null ? (
            <SkeletonList rows={3} />
          ) : (
            <motion.ul className="list" variants={staggerContainer} initial="hidden" animate="show">
              {members.map((member) => {
                const isSelf = member.user_id === user.id;
                return (
                  <motion.li key={member.user_id} variants={staggerItem}>
                    <Card className="member-card">
                      <div className="avatar" aria-hidden="true">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="grow">
                        <strong>
                          {member.full_name}
                          {isSelf ? " (you)" : ""}
                        </strong>
                        <p className="muted small" style={{ marginTop: 2 }}>
                          {member.email} · joined {formatDate(member.joined_at)}
                        </p>
                      </div>
                      <span className={`badge badge-${member.role}`}>{member.role}</span>
                      {isAdmin && !isSelf ? (
                        <Button variant="danger" className="btn-sm" onClick={() => setPendingRemove(member)}>
                          Remove
                        </Button>
                      ) : null}
                    </Card>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>

        <div>
          {isAdmin ? (
            <Card>
              <h3 className="section-subtitle">Add a teammate</h3>
              <form className="form" onSubmit={handleAdd}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teammate@company.com"
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <select value={newRole} onChange={(event) => setNewRole(event.target.value)}>
                    {ROLES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted small">They must have registered with the CLI first.</p>
                <Button type="submit" loading={saving}>
                  Add to team
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <h3 className="section-subtitle">Read-only</h3>
              <p className="muted">Only admins can change membership.</p>
            </Card>
          )}

          <Card className="roles-card">
            <h3 className="section-subtitle">Roles</h3>
            {ROLES.map((item) => (
              <div key={item} className="role-row">
                <span className={`badge badge-${item}`}>{item}</span>
                <span className="muted small">{ROLE_HELP[item]}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(pendingRemove)}
        title={`Remove ${pendingRemove?.email ?? ""}?`}
        onClose={() => setPendingRemove(null)}
      >
        <p className="muted">
          They lose server access immediately. Secrets they already decrypted or copied stay exposed
          until you rotate each one with <code className="inline-cmd">envvault revoke</code>.
        </p>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setPendingRemove(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={removing} onClick={confirmRemove}>
            Remove member
          </Button>
        </div>
      </Modal>
    </>
  );
}